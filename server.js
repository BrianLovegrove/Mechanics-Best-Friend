const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
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

// Routes

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
    if (!targetPath || !targetPath.startsWith('/library/')) {
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

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!octokit) {
      return res.status(500).json({ 
        error: 'GitHub integration not configured. Please set GITHUB_TOKEN.' 
      });
    }

    const results = [];
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

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

    res.json({
      success: true,
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
    
    if (!octokit) {
      console.warn('⚠️  GitHub integration disabled. Set GITHUB_TOKEN to enable file uploads.');
    } else {
      console.log('✅ GitHub integration enabled');
    }
  });
}

startServer().catch(console.error);