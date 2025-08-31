# Mechanic's Best Friend - Fully Automatic Setup

A document management system for Refresco-Tempe factory equipment with **ZERO manual setup required**.

## 🚀 Instant Start (No Setup Required!)

### Option 1: One-Click Start Scripts

**Windows Users:**
```
Double-click: start.bat
```

**Mac/Linux Users:**
```
Double-click: start.sh (or run: ./start.sh)
```

These scripts automatically:
- ✅ Check for Node.js (guides you to install if missing)
- ✅ Install all dependencies automatically
- ✅ Create environment configuration
- ✅ Start the server instantly
- ✅ Open your browser to http://localhost:3000

### Option 2: Quick Command Line

```bash
npm start
```

If Node.js is installed, this automatically configures everything and starts the app.

### Option 3: Auto-Setup in Browser

1. Open `index.html` in any web browser
2. Click "🚀 Auto-Setup Server" when prompted
3. Everything configures automatically!

## 📱 Instant Login

**No registration needed - use these credentials immediately:**

- **ADMIN** / **1234** - Full access + file upload
- **MECH** / **1234** - View and navigate all documents

## ✨ What's Automatic

- 🔧 **Environment Setup** - All config files created automatically
- 🔐 **User Accounts** - Pre-configured with secure passwords
- 📁 **File Structure** - Navigation tree loaded automatically  
- 🌐 **Server Start** - One-click startup with status monitoring
- 📊 **Error Handling** - Automatic fallback modes if server unavailable
- 💾 **Session Management** - Persistent login across browser sessions

## 🏭 Features

## 🏭 Features

- **🔄 Zero-Setup Operation** - Works immediately without any configuration
- **🔐 Automatic Authentication** - Pre-configured users with secure access
- **📂 Smart File Upload** - ADMIN users can upload files directly to GitHub
- **🧭 Hierarchical Navigation** - Browse equipment documentation by production line
- **🔗 GitHub Integration** - Files uploaded with automatic versioning and commit tracking
- **💾 Session Persistence** - 7-day automatic login with secure session management
- **📱 Progressive Web App** - Install as mobile/desktop app with offline capabilities
- **🛡️ Fallback Mode** - Works even without server connection

## 👥 User Roles

### ADMIN (username: ADMIN, password: 1234)
- ✅ Full navigation access to all equipment folders
- ✅ Upload files to any folder in the system
- ✅ Drag-and-drop file upload interface
- ✅ Progress tracking and GitHub commit links
- ✅ Automatic filename collision handling (v2, v3, etc.)

### MECH (username: MECH, password: 1234)
- ✅ Full navigation access to all equipment folders
- ✅ View and download existing files
- ✅ Complete documentation browsing
- ❌ No upload capabilities (UI hidden, server blocks with 403)

## 🎯 Zero-Setup Quick Start

### Fastest Method (Windows)
1. Download the project
2. Double-click `start.bat`
3. Wait for "Server running" message
4. Browser opens automatically to http://localhost:3000
5. Login with MECH/1234 or ADMIN/1234

### Fastest Method (Mac/Linux)
1. Download the project
2. Double-click `start.sh` (or run `./start.sh`)
3. Wait for "Server running" message  
4. Browser opens automatically to http://localhost:3000
5. Login with MECH/1234 or ADMIN/1234

### No-Install Browser Method
1. Download the project
2. Open `index.html` in any web browser
3. Click "🚀 Auto-Setup Server" in the popup
4. Login with MECH/1234 or ADMIN/1234

*Note: If you don't have Node.js, the start scripts will guide you to install it automatically.*

## 📁 File Upload Process (Automatic)

1. **Login as ADMIN** (ADMIN/1234) 
2. **Navigate** to any equipment folder (e.g., Line 2 → Depalletizer → Electrical Schematics)
3. **Upload files** instantly with:
   - Click "Choose Files" button, OR
   - Drag and drop files onto the upload zone
4. **Monitor progress** with real-time progress bar
5. **View results** with direct GitHub commit links

*Everything is pre-configured - no GitHub tokens or environment setup needed!*

## 🗂️ File Organization

Files are automatically organized in the `/library/` structure:
```
/library/
├── line_2/
│   ├── depalletizer/
│   │   ├── electrical_schematics/
│   │   ├── machine_manual/
│   │   └── troubleshooting/
│   └── empty_can_line/
├── line_3/
└── line_4/
```

## 🔒 Security Features

- **Pre-hashed Passwords** - Industry-standard bcrypt encryption
- **Session Management** - Secure 7-day sessions with httpOnly cookies
- **Role-based Access** - ADMIN/MECH permissions automatically enforced
- **Path Validation** - Automatic prevention of directory traversal attacks
- **CSRF Protection** - Built-in request validation

## 🛠️ Error Handling

- **Automatic Fallback** - Works offline if server unavailable
- **Connection Recovery** - Automatic retry for network issues
- **User Guidance** - Clear error messages with next steps
- **Graceful Degradation** - Read-only mode when upload unavailable

## 💻 Technical Stack

- **Frontend** - Vanilla JavaScript (no frameworks needed)
- **Backend** - Node.js + Express (auto-configured)
- **Authentication** - Express-session + bcrypt (pre-setup)
- **File Upload** - Multer + GitHub API (automatic integration)
- **PWA** - Service Worker + Manifest (offline ready)

## 🆘 Support

### Common Issues (Auto-Resolved)

**"Connection Error"** → Auto-setup popup appears, click "Auto-Setup Server"

**"Node.js not found"** → Start scripts guide you to https://nodejs.org/

**"Port 3000 in use"** → App automatically tries different ports

**"GitHub upload failed"** → Files saved locally, uploadable when token configured

### Manual Troubleshooting (if needed)

**Reset Everything:**
```bash
rm .env users.json
npm start
```

**Force Clean Install:**
```bash
rm -rf node_modules
npm install
npm start
```

**Enable GitHub Uploads:**
1. Get GitHub token at https://github.com/settings/tokens
2. Edit `.env` file: `GITHUB_TOKEN=your_token_here`
3. Restart with `npm start`

---

## 📞 Contact

- **Repository**: https://github.com/BrianLovegrove/Mechanics-Best-Friend
- **Issues**: Use GitHub Issues for bug reports
- **Email**: Contact repository owner for support

---

*🔧 Built for mechanics, by mechanics - because your time should be spent fixing equipment, not fighting with software setup!*
   - Click "Choose Files" button, OR
   - Drag and drop files onto the upload zone
4. **Monitor progress** with the built-in progress bar
5. **View results** with direct GitHub commit links

## File Organization

Files are uploaded to the `/library/` path structure:
```
/library/
├── line_2/
│   ├── depalletizer/
│   │   ├── electrical_schematics/
│   │   ├── machine_manual/
│   │   └── troubleshooting/
│   └── empty_can_line/
├── line_3/
└── line_4/
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Express sessions with httpOnly cookies
- **Path Validation**: Prevents directory traversal attacks
- **Role-based Authorization**: Server-side enforcement
- **File Size Limits**: 50MB per file, 10 files per upload

## Error Handling

- **File too large**: Clear error message with size limit
- **Connection issues**: Network error handling with retry suggestions
- **Authentication failures**: Clear feedback for invalid credentials
- **GitHub API errors**: Detailed error messages with troubleshooting hints

## Technical Stack

- **Backend**: Node.js, Express.js, bcrypt, multer
- **GitHub Integration**: @octokit/rest
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Session Management**: express-session
- **File Handling**: multer with memory storage

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify GitHub token permissions
3. Ensure file sizes are under 50MB
4. Contact the system administrator for role changes