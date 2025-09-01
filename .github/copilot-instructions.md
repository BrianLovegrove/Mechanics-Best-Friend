# Mechanic's Best Friend - Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Application Overview

Mechanic's Best Friend is a static web application that serves as a document management system for Refresco-Tempe factory equipment. It displays a hierarchical navigation tree for three production lines (Line 2, Line 3, Line 4) and supporting equipment (Steam Generator, Batching, Can Crusher, RO System, VFD). Each equipment item contains document categories like Electrical Schematics, Machine Manual, Troubleshooting, PM Procedures, Recipes, Adjustment Guide, and Mechanic Notes.

## Working Effectively

### Initial Setup and Testing
- Start local web server: `python3 -m http.server 8080` - runs instantly, no timeout needed
- Navigate to `http://localhost:8080` in browser for testing
- Login credentials: Username `MECH`, Password `1234`
- NEVER skip authentication testing - it's required for all application functionality

### Essential Validation Steps
- Always test the complete user workflow after making changes:
  1. Start web server: `python3 -m http.server 8080`
  2. Load application in browser: `http://localhost:8080` 
  3. Login with credentials: `MECH` / `1234`
  4. Navigate through equipment tree: Line 2 → Depal → Electrical Schematics
  5. Test back navigation and breadcrumb navigation
  6. Verify error handling for missing file folders

### Build and Test Requirements
- No build process required - this is a static web application
- No package managers or dependencies to install
- Validate JavaScript syntax: `node -c app.js` - completes in under 1 second
- NEVER CANCEL: Testing takes approximately 2-3 minutes for complete user scenario validation

### File Structure and Key Components
- `index.html` - Main entry point with embedded CSS and login form
- `app.js` - Main application logic including navigation and GitHub API integration
- `auth.js` - UNUSED authentication file (authentication is handled in app.js)
- `styles.css` - External stylesheet for application styling
- `service-worker.js` - PWA caching functionality
- `manifest.json` & `manifest.webmanifest` - Progressive Web App configuration
- `data/tree.json` - Navigation hierarchy structure (automatically loaded)
- `data/structure.json` - Alternative structure format (not actively used)
- `assets/icons/` - Application icons for PWA

### JavaScript Architecture
- Uses vanilla JavaScript with no external frameworks
- Global variables: `tree`, `stack`, `OWNER`, `REPO`, `BRANCH`, `USERNAME`, `PASSWORD`
- Navigation stack system for hierarchical browsing
- GitHub API integration for file listing (may be blocked in some environments)
- Authentication stored in sessionStorage with key `refresco_auth_ok`

## Validation and Testing

### Manual User Scenario Testing
Always execute this complete validation scenario after making changes:

1. **Server Setup**: `python3 -m http.server 8080`
2. **Authentication**: Login with `MECH` / `1234`
3. **Navigation Test**: Navigate Line 2 → Depal → Electrical Schematics
4. **File Display**: Verify "Folder not found yet" message displays correctly
5. **Back Navigation**: Test Back button functionality
6. **Breadcrumb Navigation**: Click Home and intermediate breadcrumb links
7. **Error Handling**: Confirm GitHub API errors are handled gracefully

### Common Issues and Solutions
- **Syntax Error "missing ) after argument list"**: Check `app.js` line 58 for malformed `openFile()` calls
- **Navigation buttons not working**: Event handlers may need manual debugging via browser console
- **Authentication failure**: Verify credentials exactly match `MECH` / `1234` (case sensitive)
- **Missing tree data**: Ensure `data/tree.json` is accessible and valid JSON

### GitHub Integration
- Application attempts to list files from GitHub repository paths like `library/line_2/depalletizer/electrical_schematics/`
- GitHub API calls may be blocked in testing environments - this is expected behavior
- File listing functionality depends on actual files being uploaded to the repository
- Supports file types: images (PNG, JPG, etc.), PDFs, text files, and Office documents

## Repository Context

### Navigation Structure
```
Mechanic's Best Friend/
├── Line 2/
│   ├── Depal/
│   ├── Empty Can Line/
│   ├── Filler/
│   ├── Pasteurizer/
│   ├── Full Can Line/
│   ├── Variopack/
│   ├── Full Case Line/
│   ├── Palletizer/
│   └── Full Pallet Conveyor / Wrapper/
├── Line 3/ (similar structure with Douglas Packer instead of Variopack)
├── Line 4/ (similar structure with Douglas Packer instead of Variopack)
├── Steam Generator/
├── Batching/
├── Can Crusher/
├── RO System/
└── VFD/
    ├── Powerflex 40/
    └── Powerflex 525/
```

### Document Categories (for each equipment item)
- Electrical Schematics
- Machine Manual  
- Troubleshooting
- PM Procedures
- Recipes
- Adjustment Guide
- Mechanic Notes

### Progressive Web App Features
- Service worker for offline caching
- Installable as mobile/desktop app
- Responsive design for mobile devices
- Cache includes core files: index.html, styles.css, app.js, manifest.json, data/tree.json

## Development Guidelines

### Making Changes
- Always validate JavaScript syntax: `node -c app.js`
- Test authentication flow completely before assuming other functionality works
- Check browser console for JavaScript errors
- Verify navigation state management (stack variable) works correctly
- Test both successful and error scenarios for GitHub API integration

### File Modification Workflow
1. Make changes to HTML/CSS/JavaScript files
2. Validate syntax: `node -c app.js`
3. Start test server: `python3 -m http.server 8080`
4. Complete user scenario testing (authentication → navigation → file display)
5. Verify Progressive Web App functionality still works
6. Check service worker caching behavior if modifying core files

### Authentication Notes
- Hardcoded credentials: `MECH` / `1234`
- Session-based authentication using sessionStorage
- No server-side authentication required
- Login state persists across browser sessions until storage is cleared

## Performance and Timing

- Application startup: Instant (static files)
- Authentication: Under 1 second
- Navigation response: Instant (client-side JavaScript)
- GitHub API calls: 2-5 seconds (when successful)
- Full user scenario test: 2-3 minutes
- JavaScript syntax validation: Under 1 second

## Important File Paths

- Repository root: `/home/runner/work/Refresco-Tempe/Refresco-Tempe`
- Main application: `index.html`
- Core logic: `app.js`
- Configuration: `data/tree.json`
- Progressive Web App: `manifest.json` + `service-worker.js`

Always ensure you're working in the correct repository path when making modifications.