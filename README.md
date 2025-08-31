# Mechanic's Best Friend - File Upload System

A document management system for Refresco-Tempe factory equipment with role-based file upload functionality.

## Features

- **Role-based Authentication**: ADMIN and MECH users with different permissions
- **File Upload**: ADMIN users can upload files directly to GitHub repository
- **Hierarchical Navigation**: Browse equipment documentation by production line
- **GitHub Integration**: Files are uploaded directly to the repository with automatic versioning
- **Session Management**: 7-day session expiry with secure authentication

## User Roles

### ADMIN (username: ADMIN, password: 1234)
- ✅ Full navigation access to all equipment folders
- ✅ Upload files to any folder in the /library/ path
- ✅ Drag-and-drop file upload interface
- ✅ Progress tracking and GitHub commit links
- ✅ Automatic filename collision handling (v2, v3, etc.)

### MECH (username: MECH, password: 1234)
- ✅ Full navigation access to all equipment folders
- ✅ View and download existing files
- ❌ No upload capabilities (UI hidden, server blocks with 403)

## Quick Start

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open http://localhost:3000

### Production Setup

1. **Set environment variables:**
   ```bash
   export GITHUB_TOKEN=your_github_token_with_contents_write_permission
   export GITHUB_OWNER=BrianLovegrove
   export GITHUB_REPO=Mechanics-Best-Friend
   export SESSION_SECRET=your_secure_secret_key
   export PORT=3000
   ```

2. **GitHub Token Requirements:**
   - Classic Personal Access Token with `repo` scope, OR
   - Fine-grained Personal Access Token with `Contents: write` permission

## File Upload Process

1. **Login as ADMIN** (ADMIN/1234)
2. **Navigate** to the desired equipment folder (e.g., Line 2 → Depalletizer → Electrical Schematics)
3. **Upload files** using:
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