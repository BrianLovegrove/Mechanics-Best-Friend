const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Load users from JSON file
let users = [];
async function loadUsers() {
  try {
    const data = await fs.readFile('users.json', 'utf8');
    users = JSON.parse(data);
    console.log('Users loaded successfully');
  } catch (error) {
    console.error('Error loading users:', error);
    process.exit(1);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
    files: 10 // Maximum 10 files per upload
  }
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-not-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: false // Set to true in production with HTTPS
  }
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.', {
  index: false, // Don't serve index.html automatically
  dotfiles: 'ignore'
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Admin role middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GitHub API client setup - DISABLED for GitHub Pages mode
// File uploads are now handled client-side via GitHub Contents API
let octokit = null;

// Git utilities
// Sanitize and validate repository paths
function sanitizeRepoPath(targetPath) {
  // Remove leading/trailing slashes and normalize
  let cleanPath = targetPath.replace(/^\/+/, '').replace(/\/+$/, '');
  
  // Security validation
  if (cleanPath.includes('..') || 
      cleanPath.includes('\\') || 
      cleanPath.match(/[<>:"|?*\x00-\x1f]/) ||
      path.isAbsolute(cleanPath)) {
    throw new Error('Invalid path: contains illegal characters or path traversal');
  }
  
  // Ensure path starts with allowed roots
  const allowedRoots = ['library', 'docs', 'assets'];
  const pathRoot = cleanPath.split('/')[0];
  if (!allowedRoots.includes(pathRoot)) {
    throw new Error(`Invalid path: must start with one of: ${allowedRoots.join(', ')}`);
  }
  
  return cleanPath;
}


// Git upload workflow
async function uploadFilesWithGit(files, targetPath, username) {
  const lockKey = `upload-${targetPath}`;
  
  // Check for concurrent uploads to same path
  if (uploadLocks.has(lockKey)) {
    throw new Error('Another upload is in progress for this path. Please wait and try again.');
  }
  
  uploadLocks.set(lockKey, true);
  let workDir = null;
  
  try {
    // Validate Git configuration
    if (!GIT_CONFIG.repo || !GIT_CONFIG.sshKeyPath) {
      throw new Error('Git SSH configuration incomplete. Check GIT_REPO and GIT_SSH_PRIVATE_KEY_PATH environment variables.');
    }
    
    // Create working directory
    workDir = await createWorkingDirectory();
    console.log(`Git upload: Using working directory ${workDir}`);
    
    // Initialize Git and configure SSH
    const git = configureGitSSH(simpleGit(workDir), workDir);
    
    // Clone repository
    console.log(`Git upload: Cloning ${GIT_CONFIG.repo}`);
    await git.clone(GIT_CONFIG.repo, '.');
    
    // Configure git user
    await git.addConfig('user.name', GIT_CONFIG.authorName);
    await git.addConfig('user.email', GIT_CONFIG.authorEmail);
    
    // Pull latest changes to avoid conflicts
    console.log(`Git upload: Pulling latest changes from ${GIT_CONFIG.branch}`);
    await git.pull('origin', GIT_CONFIG.branch);
    
    // Sanitize target path
    const cleanPath = sanitizeRepoPath(targetPath);
    const targetDir = path.join(workDir, cleanPath);
    
    // Create target directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });
    
    const results = [];
    const commitFiles = [];
    
    // Process each file
    for (const file of files) {
      try {
        // Validate file size (GitHub limit is 100MB)
        if (file.size > 100 * 1024 * 1024) {
          results.push({
            filename: file.originalname,
            error: 'File too large. Maximum size is 100MB. Consider using Git LFS for large files.'
          });
          continue;
        }
        
        // Handle filename collisions
        let filename = file.originalname;
        let filePath = path.join(targetDir, filename);
        let version = 1;
        
        while (true) {
          try {
            await fs.access(filePath);
            // File exists, create versioned filename
            version++;
            const ext = path.extname(filename);
            const base = path.basename(filename, ext);
            const versionedName = `${base}-v${version}${ext}`;
            filePath = path.join(targetDir, versionedName);
            filename = versionedName;
          } catch (error) {
            // File doesn't exist, we can use this path
            break;
          }
        }
        
        // Write file to working directory
        await fs.writeFile(filePath, file.buffer);
        
        // Add to git
        const repoFilePath = path.posix.join(cleanPath, filename);
        await git.add(repoFilePath);
        commitFiles.push(repoFilePath);
        
        console.log(`Git upload: Added file ${repoFilePath}`);
        
        results.push({
          filename,
          path: repoFilePath,
          size: file.size
        });
        
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        results.push({
          filename: file.originalname,
          error: fileError.message || 'Failed to process file'
        });
      }
    }
    
    // Check if we have files to commit
    if (commitFiles.length === 0) {
      throw new Error('No files were successfully processed for upload');
    }
    
    // Create commit
    const fileList = commitFiles.length === 1 ? commitFiles[0] : `${commitFiles.length} files`;
    const commitMessage = `feat(upload): ${fileList} uploaded by ${username} via app

Files uploaded:
${commitFiles.map(f => `- ${f}`).join('\n')}

Uploaded by: ${username}
Upload time: ${new Date().toISOString()}`;
    
    console.log(`Git upload: Creating commit with ${commitFiles.length} files`);
    await git.commit(commitMessage);
    
    // Get commit info
    const log = await git.log(['-1']);
    const commitSha = log.latest.hash;
    
    // Try to push to main branch
    try {
      console.log(`Git upload: Pushing to ${GIT_CONFIG.branch}`);
      await git.push('origin', GIT_CONFIG.branch);
      
      // Update results with GitHub URLs
      for (const result of results) {
        if (!result.error) {
          const owner = GIT_CONFIG.repo.split(':')[1].split('/')[0];
          const repo = GIT_CONFIG.repo.split('/')[1].replace('.git', '');
          result.html_url = `https://github.com/${owner}/${repo}/blob/${GIT_CONFIG.branch}/${result.path}`;
          result.download_url = `https://raw.githubusercontent.com/${owner}/${repo}/${GIT_CONFIG.branch}/${result.path}`;
          result.commit_sha = commitSha;
          result.branch = GIT_CONFIG.branch;
        }
      }
      
      console.log(`Git upload: Successfully pushed commit ${commitSha} to ${GIT_CONFIG.branch}`);
      
      return {
        success: true,
        message: `Successfully uploaded ${commitFiles.length} file(s) to ${GIT_CONFIG.branch}`,
        committed: results.filter(r => !r.error),
        errors: results.filter(r => r.error),
        commit_sha: commitSha,
        branch: GIT_CONFIG.branch
      };
      
    } catch (pushError) {
      console.warn('Git upload: Failed to push to main branch, trying fallback branch:', pushError.message);
      
      // Create fallback branch for branch protection
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.getTime().toString();
      const fallbackBranch = `uploads/${dateStr}/${timeStr}`;
      
      // Create and push to fallback branch
      await git.checkoutLocalBranch(fallbackBranch);
      await git.push('origin', fallbackBranch);
      
      // Update results with fallback branch info
      for (const result of results) {
        if (!result.error) {
          const owner = GIT_CONFIG.repo.split(':')[1].split('/')[0];
          const repo = GIT_CONFIG.repo.split('/')[1].replace('.git', '');
          result.html_url = `https://github.com/${owner}/${repo}/blob/${fallbackBranch}/${result.path}`;
          result.download_url = `https://raw.githubusercontent.com/${owner}/${repo}/${fallbackBranch}/${result.path}`;
          result.commit_sha = commitSha;
          result.branch = fallbackBranch;
        }
      }
      
      console.log(`Git upload: Successfully pushed commit ${commitSha} to fallback branch ${fallbackBranch}`);
      
      return {
        success: true,
        message: `Successfully uploaded ${commitFiles.length} file(s) to fallback branch (requires review)`,
        committed: results.filter(r => !r.error),
        errors: results.filter(r => r.error),
        commit_sha: commitSha,
        branch: fallbackBranch,
        fallback_branch: true,
        fallback_reason: 'Branch protection prevents direct push to main'
      };
    }
    
  } finally {
    uploadLocks.delete(lockKey);
    if (workDir) {
      await cleanupWorkingDirectory(workDir);
    }
  }
}

// Routes

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve uploaded files from local storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'ignore',
  index: false
}));

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.user = {
      username: user.username,
      role: user.role
    };

    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.session.user.username,
    role: req.session.user.role
  });
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true });
  });
});

// File upload endpoint - DISABLED for GitHub Pages mode
// Uploads are now handled client-side via GitHub Contents API
app.post('/upload', requireAdmin, upload.array('files'), async (req, res) => {
  res.status(501).json({ 
    error: 'Server-side uploads disabled. Use GitHub Pages client-side upload instead.',
    message: 'This application now uses client-side GitHub API uploads. Please configure your GitHub Personal Access Token in the admin settings.'
  });
});

// File listing endpoint for local storage
app.get('/api/files/*', async (req, res) => {
  try {
    const requestPath = req.params[0]; // Get the path after /api/files/
    const uploadPath = path.join(__dirname, 'uploads', requestPath);
    
    // Security check: ensure path is within uploads directory
    const resolvedPath = path.resolve(uploadPath);
    const uploadsDir = path.resolve(__dirname, 'uploads');
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory()) {
        // List directory contents
        const files = await fs.readdir(resolvedPath);
        const fileList = [];
        
        for (const filename of files) {
          const filePath = path.join(resolvedPath, filename);
          const fileStats = await fs.stat(filePath);
          
          if (fileStats.isFile()) {
            const downloadPath = path.posix.join('/uploads', requestPath, filename);
            fileList.push({
              name: filename,
              type: 'file',
              size: fileStats.size,
              download_url: downloadPath,
              storage: 'local'
            });
          }
        }
        
        res.json(fileList);
      } else {
        res.status(400).json({ error: 'Path is not a directory' });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json([]); // Directory doesn't exist, return empty list
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('File listing error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 1GB per file.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum is 10 files per upload.' 
      });
    }
  }

  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  await loadUsers();
  
  app.listen(PORT, () => {
    console.log(`Mechanic's Best Friend server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to access the application`);
    console.log('NOTE: Server-side uploads disabled - using client-side GitHub API uploads');
    console.log('SECURITY: Configure GitHub Personal Access Token in admin settings for uploads');
  });
}

startServer().catch(console.error);