# SETUP GUIDE: GitHub Integration for Cross-Device File Sync

## Issues Fixed ✅

1. **File Upload Working**: Admin users can now upload files successfully
2. **File Viewing Fixed**: No more "Bad Request Error 400" when viewing files
3. **Local Storage Fallback**: Files are stored locally when GitHub API is unavailable
4. **Improved Error Handling**: Better error messages and fallback mechanisms

## GitHub Integration Setup (For Cross-Device Sync)

To enable files to sync across all devices, you need to configure GitHub integration:

### Option 1: GitHub Personal Access Token (Recommended)

1. **Create GitHub Token**:
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a descriptive name: "Mechanics Best Friend Upload Token"
   - Select scopes: ✅ `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Configure the Application**:
   - Edit the `.env` file in your application directory
   - Replace the mock token with your real token:
   ```
   GITHUB_TOKEN=your_actual_github_token_here
   ```
   - Restart the application

### Option 2: SSH Deploy Key Setup

1. **Add Deploy Key to GitHub**:
   - Go to Repository Settings → Deploy keys → Add deploy key
   - Title: "Mechanics Best Friend Upload Key"  
   - Key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILKc3/ik6xjFpcuhfTShY/qmaWzthNjl9cqcFcPe20Zm uploads@mechanicsbestfriend.app`
   - ✅ Check "Allow write access"
   - Click "Add key"

2. **Configure SSH on Server**:
   - Place the corresponding private key on your server
   - Update `.env` file:
   ```
   GIT_REPO=git@github.com:BrianLovegrove/Mechanics-Best-Friend.git
   GIT_SSH_PRIVATE_KEY_PATH=/path/to/your/private/key
   ```

## File Organization

Files are stored in the repository under `/library/` structure:
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

## Testing

1. Login as ADMIN (username: ADMIN, password: 1234)
2. Navigate to any equipment folder
3. Upload files using the upload interface
4. View files without errors
5. Files will be available across all devices once GitHub integration is configured

## Benefits After Setup

- ✅ Files upload successfully to GitHub repository
- ✅ Files sync automatically across all devices
- ✅ File viewing works without 400 errors
- ✅ Version control and backup through GitHub
- ✅ Multiple upload methods with automatic fallback
- ✅ Admin-only upload permissions maintained