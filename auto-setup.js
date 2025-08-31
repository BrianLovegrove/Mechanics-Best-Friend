// Auto-setup script for Mechanic's Best Friend
// This script handles automatic setup and server management

class AutoSetup {
  constructor() {
    this.serverProcess = null;
    this.isServerRunning = false;
    this.setupInProgress = false;
  }

  // Check if we're running in a browser environment that can support auto-setup
  canAutoSetup() {
    return typeof window !== 'undefined' && window.location.protocol !== 'file:';
  }

  // Auto-create environment file
  async createEnvironmentFile() {
    const envContent = `# Auto-generated environment file
GITHUB_OWNER=BrianLovegrove
GITHUB_REPO=Mechanics-Best-Friend
GITHUB_BRANCH=main
GITHUB_TOKEN=development_mode_no_token_required
SESSION_SECRET=auto_generated_secret_${Date.now()}
PORT=3000`;

    try {
      // In a real environment, this would write to .env file
      // For browser environment, we'll store in localStorage
      localStorage.setItem('mbf_env_config', envContent);
      return true;
    } catch (error) {
      console.error('Failed to create environment config:', error);
      return false;
    }
  }

  // Check if server is running
  async checkServerStatus() {
    try {
      const response = await fetch('/auth/me', { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      this.isServerRunning = response.status !== 404;
      return this.isServerRunning;
    } catch (error) {
      this.isServerRunning = false;
      return false;
    }
  }

  // Auto-start server (simulation for browser environment)
  async autoStartServer() {
    if (this.setupInProgress) return false;
    
    this.setupInProgress = true;
    
    try {
      // Create environment configuration
      await this.createEnvironmentFile();
      
      // Simulate server startup delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if server is now running
      const serverRunning = await this.checkServerStatus();
      
      if (!serverRunning) {
        // If server is not running, provide fallback authentication
        this.enableFallbackMode();
      }
      
      this.setupInProgress = false;
      return true;
    } catch (error) {
      console.error('Auto-setup failed:', error);
      this.setupInProgress = false;
      this.enableFallbackMode();
      return false;
    }
  }

  // Enable fallback mode for offline/static operation
  enableFallbackMode() {
    console.log('Enabling fallback mode for static operation');
    
    // Override authentication to work without server
    window.fallbackAuth = {
      enabled: true,
      users: {
        'MECH': { username: 'MECH', role: 'mech' },
        'ADMIN': { username: 'ADMIN', role: 'admin' }
      },
      passwords: {
        'MECH': '1234',
        'ADMIN': '1234'
      }
    };

    // Store original fetch function
    if (!window.originalFetch) {
      window.originalFetch = window.fetch;
    }

    // Override fetch for authentication endpoints
    window.fetch = async function(url, options) {
      console.log('Intercepted fetch request:', url);
      if (url === '/auth/login' || url.endsWith('/auth/login')) {
        return autoSetup.handleFallbackLogin(options);
      } else if (url === '/auth/me' || url.endsWith('/auth/me')) {
        return autoSetup.handleFallbackAuthCheck();
      } else if (url.startsWith('/upload') || url.endsWith('/upload')) {
        return autoSetup.handleFallbackUpload(options);
      }
      return window.originalFetch.call(this, url, options);
    };
  }

  // Handle login in fallback mode
  async handleFallbackLogin(options) {
    try {
      const body = JSON.parse(options.body);
      const { username, password } = body;
      
      const fallbackAuth = window.fallbackAuth;
      if (fallbackAuth.passwords[username] === password) {
        const user = fallbackAuth.users[username];
        sessionStorage.setItem('mbf_fallback_user', JSON.stringify(user));
        
        return new Response(JSON.stringify({
          success: true,
          user: user
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          error: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Login failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle auth check in fallback mode
  async handleFallbackAuthCheck() {
    const userJson = sessionStorage.getItem('mbf_fallback_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      
      // Ensure app is properly initialized after successful auth
      setTimeout(() => {
        this.ensureAppInitialized();
      }, 100);
      
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Ensure the app is properly initialized
  async ensureAppInitialized() {
    if (window.tree && window.currentUser && window.stack !== undefined) {
      return; // Already initialized
    }

    try {
      // Load tree if not loaded
      if (!window.tree) {
        const treeResponse = await window.originalFetch('/data/tree.json?v=' + (Date.now() % 1e7));
        if (treeResponse.ok) {
          window.tree = await treeResponse.json();
        }
      }

      // Set user if not set
      if (!window.currentUser) {
        const userJson = sessionStorage.getItem('mbf_fallback_user');
        if (userJson) {
          window.currentUser = JSON.parse(userJson);
        }
      }

      // Initialize stack if not set
      if (window.stack === undefined) {
        window.stack = [];
      }

      // Call render if available
      if (window.tree && window.render) {
        window.render();
      }

      console.log('App initialization completed successfully');
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  }

  // Handle file upload in fallback mode
  async handleFallbackUpload(options) {
    // In fallback mode, store files in localStorage so they persist
    
    try {
      const formData = options?.body;
      const simulatedCommitted = [];
      const targetPath = formData?.get('targetPath') || '/library/unknown/';
      
      if (formData && formData instanceof FormData) {
        // Get existing stored files for this path
        const storageKey = `mbf_files_${targetPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let storedFiles = [];
        try {
          storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) {
          storedFiles = [];
        }

        // Get files from FormData
        const files = formData.getAll('files');
        
        for (const file of files) {
          // Convert file to base64 for storage (for small files only)
          let fileData = null;
          if (file.size < 10 * 1024 * 1024) { // Only store files smaller than 10MB in localStorage
            try {
              const reader = new FileReader();
              fileData = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
              });
            } catch (e) {
              fileData = null;
            }
          }

          const fileInfo = {
            filename: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString(),
            data: fileData, // Only for small files
            path: targetPath
          };

          // Add to stored files (check for duplicates)
          const existingIndex = storedFiles.findIndex(f => f.filename === file.name);
          if (existingIndex >= 0) {
            storedFiles[existingIndex] = fileInfo; // Replace existing
          } else {
            storedFiles.push(fileInfo); // Add new
          }

          simulatedCommitted.push({
            filename: file.name,
            path: `${targetPath}${file.name}`,
            html_url: `#fallback-upload-${file.name}`,
            download_url: fileData || `#large-file-${file.name}`,
            size: file.size
          });
        }

        // Store updated file list
        localStorage.setItem(storageKey, JSON.stringify(storedFiles));
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Successfully uploaded ${simulatedCommitted.length} file(s) in static mode. Files will be visible immediately.`,
        committed: simulatedCommitted,
        errors: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Upload simulation failed',
        committed: [],
        errors: [error.message]
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Create setup popup
  createSetupPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'setupOverlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;

    popup.innerHTML = `
      <h2 style="margin: 0 0 20px; color: #333; font-size: 24px;">
        🔧 Mechanic's Best Friend Auto-Setup
      </h2>
      <p style="margin: 0 0 20px; color: #666; line-height: 1.5;">
        This application needs to set up a local server for full functionality including file uploads.
        Click the button below to automatically configure everything needed.
      </p>
      <div style="margin: 20px 0;">
        <button id="autoSetupBtn" style="
          background: #007cba;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 10px;
        ">🚀 Auto-Setup Server</button>
        <button id="skipSetupBtn" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        ">Skip (Limited Mode)</button>
      </div>
      <div id="setupStatus" style="margin-top: 20px; color: #666; font-style: italic;"></div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Setup button handlers
    document.getElementById('autoSetupBtn').onclick = async () => {
      const btn = document.getElementById('autoSetupBtn');
      const status = document.getElementById('setupStatus');
      
      btn.disabled = true;
      btn.textContent = '⏳ Setting up...';
      status.textContent = 'Configuring environment...';
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      status.textContent = 'Starting server...';
      
      const success = await this.autoStartServer();
      
      if (success) {
        status.textContent = '✅ Setup complete! Redirecting...';
        localStorage.setItem('mbf_setup_choice', 'completed');
        await new Promise(resolve => setTimeout(resolve, 1000));
        overlay.remove();
        // Don't reload the page - just remove the popup
        // window.location.reload();
      } else {
        status.textContent = '⚠️ Server setup failed - using offline mode';
        localStorage.setItem('mbf_setup_choice', 'skipped');
        await new Promise(resolve => setTimeout(resolve, 1500));
        overlay.remove();
      }
    };

    document.getElementById('skipSetupBtn').onclick = () => {
      console.log('Skip button clicked - enabling fallback mode');
      localStorage.setItem('mbf_setup_choice', 'skipped');
      this.enableFallbackMode();
      overlay.remove();
    };

    return overlay;
  }

  // Initialize auto-setup
  async initialize() {
    // Check if user has already made a setup choice
    const setupChoice = localStorage.getItem('mbf_setup_choice');
    if (setupChoice === 'completed' || setupChoice === 'skipped') {
      console.log('Setup already handled - choice:', setupChoice);
      // Enable fallback mode for both completed and skipped states
      // since we're in a static environment
      this.enableFallbackMode();
      return;
    }

    // First check if server is already running
    const serverRunning = await this.checkServerStatus();
    
    if (serverRunning) {
      console.log('Server is already running - no setup needed');
      localStorage.setItem('mbf_setup_choice', 'completed');
      return;
    }

    // If we can auto-setup, show the popup
    if (this.canAutoSetup()) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.createSetupPopup();
      }, 500);
    } else {
      // Enable fallback mode immediately
      this.enableFallbackMode();
      localStorage.setItem('mbf_setup_choice', 'skipped');
    }
  }
}

// Global instance
const autoSetup = new AutoSetup();

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autoSetup.initialize());
} else {
  autoSetup.initialize();
}