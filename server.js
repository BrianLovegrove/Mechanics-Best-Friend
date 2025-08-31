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

// GitHub API client setup
let octokit = null;
if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'development_mode_no_token_required') {
  octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
}

// For admin users, try to configure GitHub API with repository context if in GitHub Actions
if (!octokit && process.env.GITHUB_ACTIONS && process.env.GITHUB_TOKEN) {
  try {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    console.log('✅ GitHub API configured from GitHub Actions environment');
  } catch (error) {
    console.warn('Failed to configure GitHub API from Actions environment:', error.message);
  }
}

// Git SSH configuration for file uploads
const GIT_CONFIG = {
  repo: process.env.GIT_REPO,
  branch: process.env.GIT_BRANCH || 'main',
  authorName: process.env.GIT_AUTHOR_NAME || 'MBF Upload Bot',
  authorEmail: process.env.GIT_AUTHOR_EMAIL || 'uploads@mechanicsbestfriend.app',
  sshKeyPath: process.env.GIT_SSH_PRIVATE_KEY_PATH
};

// Upload concurrency control - prevent overlapping Git operations
const uploadLocks = new Map();

// Git utilities
async function createWorkingDirectory() {
  const workDir = path.join(__dirname, '.tmp-git-uploads', uuidv4());
  await fs.mkdir(workDir, { recursive: true });
  return workDir;
}

async function cleanupWorkingDirectory(workDir) {
  try {
    if (workDir && workDir.includes('.tmp-git-uploads')) {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Failed to cleanup working directory:', error.message);
  }
}

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

// Configure Git with SSH key
function configureGitSSH(git, workDir) {
  if (!GIT_CONFIG.sshKeyPath) {
    throw new Error('GIT_SSH_PRIVATE_KEY_PATH environment variable not configured');
  }
  
  // Set up SSH command to use the deploy key
  const sshCommand = `ssh -i "${GIT_CONFIG.sshKeyPath}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
  
  return git.env({
    ...process.env,
    GIT_SSH_COMMAND: sshCommand
  });
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

// File upload endpoint
app.post('/upload', requireAdmin, upload.array('files'), async (req, res) => {
  try {
    const { targetPath } = req.body;
    const files = req.files;

    // Validation
    if (!targetPath) {
      return res.status(400).json({ 
        error: 'Target path is required' 
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (files.length > 10) {
      return res.status(400).json({ 
        error: 'Too many files. Maximum is 10 files per upload.' 
      });
    }

    // Log the upload attempt
    console.log(`Upload attempt by ${req.session.user.username}: ${files.length} file(s) to ${targetPath}`);
    
    // For admin users, prioritize GitHub repository uploads over local storage
    if (req.session.user.role === 'admin' && !octokit) {
      console.warn('Admin user attempting upload but GitHub API not configured. Files will be stored locally.');
      console.warn('To enable GitHub uploads, set GITHUB_TOKEN environment variable.');
    }

    // Try Git SSH upload first if configured, otherwise fallback to other methods
    if (GIT_CONFIG.repo && GIT_CONFIG.sshKeyPath) {
      try {
        const result = await uploadFilesWithGit(files, targetPath, req.session.user.username);
        
        // Log successful upload
        console.log(`Git upload successful: ${result.committed.length} files committed to ${result.branch}`);
        
        res.json(result);
        return;
        
      } catch (gitError) {
        console.error('Git upload failed:', gitError);
        // Log the error but continue to fallback methods
        console.log('Falling back to GitHub API or local storage...');
      }
    }

    // Fallback to GitHub API if Git SSH fails
    const results = [];
    
    if (octokit) {
      console.log('Using GitHub API fallback for upload');
      const owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || 'BrianLovegrove';
      const repo = process.env.GITHUB_REPO || 'Mechanics-Best-Friend';
      const branch = process.env.GITHUB_BRANCH || process.env.GITHUB_REF_NAME || 'main';

      // Validate target path for GitHub API
      if (!targetPath.startsWith('/library/')) {
        return res.status(400).json({ 
          error: 'Invalid target path. Must start with /library/' 
        });
      }

      // Check for path traversal
      if (targetPath.includes('..')) {
        return res.status(400).json({ 
          error: 'Invalid path. Path traversal not allowed.' 
        });
      }

      for (const file of files) {
        try {
          let filename = file.originalname;
          const cleanPath = targetPath.replace(/^\/+/, '').replace(/\/+$/, '');
          let fullPath = `${cleanPath}/${filename}`;

          // Check if file exists and handle collisions
          let version = 1;
          while (true) {
            try {
              await octokit.repos.getContent({
                owner,
                repo,
                path: fullPath,
                ref: branch
              });
              
              // File exists, create versioned filename
              version++;
              const ext = path.extname(filename);
              const base = path.basename(filename, ext);
              const versionedName = `${base}-v${version}${ext}`;
              fullPath = `${cleanPath}/${versionedName}`;
              filename = versionedName;
            } catch (error) {
              // File doesn't exist, we can use this path
              break;
            }
          }

          // Upload file to GitHub
          const content = file.buffer.toString('base64');
          const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: fullPath,
            message: `Upload ${filename} to ${targetPath} (by ${req.session.user.username})`,
            content,
            branch
          });

          results.push({
            filename,
            path: fullPath,
            html_url: response.data.content.html_url,
            download_url: response.data.content.download_url
          });

        } catch (fileError) {
          console.error(`Error uploading ${file.originalname}:`, fileError);
          results.push({
            filename: file.originalname,
            error: fileError.message || 'Upload failed'
          });
        }
      }
    } else {
      // Final fallback: Use local file storage when Git and GitHub API are not available
      console.log('Using local file storage fallback for upload');
      
      for (const file of files) {
        try {
          let filename = file.originalname;
          const cleanPath = targetPath.replace(/^\/+/, '').replace(/\/+$/, '');
          
          // Create directory structure
          const uploadDir = path.join(__dirname, 'uploads', cleanPath);
          await fs.mkdir(uploadDir, { recursive: true });
          
          // Handle file collisions
          let version = 1;
          let filePath = path.join(uploadDir, filename);
          
          while (true) {
            try {
              await fs.access(filePath);
              // File exists, create versioned filename
              version++;
              const ext = path.extname(filename);
              const base = path.basename(filename, ext);
              const versionedName = `${base}-v${version}${ext}`;
              filePath = path.join(uploadDir, versionedName);
              filename = versionedName;
            } catch (error) {
              // File doesn't exist, we can use this path
              break;
            }
          }
          
          // Write file to local storage
          await fs.writeFile(filePath, file.buffer);
          
          results.push({
            filename,
            path: `${cleanPath}/${filename}`,
            html_url: `#local-file-${filename}`,
            download_url: `/uploads/${cleanPath}/${filename}`,
            storage: 'local'
          });

        } catch (fileError) {
          console.error(`Error storing ${file.originalname} locally:`, fileError);
          results.push({
            filename: file.originalname,
            error: fileError.message || 'Local storage failed'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${results.filter(r => !r.error).length} file(s) using fallback method`,
      committed: results.filter(r => !r.error),
      errors: results.filter(r => r.error)
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
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
    
    // Check Git SSH configuration
    if (GIT_CONFIG.repo && GIT_CONFIG.sshKeyPath) {
      console.log('✅ Git SSH upload enabled');
      console.log(`   Repository: ${GIT_CONFIG.repo}`);
      console.log(`   Branch: ${GIT_CONFIG.branch}`);
      console.log(`   Author: ${GIT_CONFIG.authorName} <${GIT_CONFIG.authorEmail}>`);
    } else {
      console.warn('⚠️  Git SSH upload disabled. Set GIT_REPO and GIT_SSH_PRIVATE_KEY_PATH to enable.');
    }
    
    if (!octokit) {
      console.warn('⚠️  GitHub API integration disabled. Set GITHUB_TOKEN to enable fallback uploads.');
    } else {
      console.log('✅ GitHub API fallback enabled');
    }
    
    if (!GIT_CONFIG.repo && !octokit) {
      console.warn('⚠️  No upload methods configured. Files will only be stored locally.');
    }
  });
}

startServer().catch(console.error);