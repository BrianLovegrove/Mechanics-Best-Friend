// Mechanic's Best Friend - Cloudflare R2 + Worker integration
// User session state
let currentUser = null;

// Application configuration (global CONFIG for modular components)
let config = null;
let CONFIG = { FILES_BASE_URL:"", WORKER_BASE_URL:"", ROOT_PREFIX:"library" };

let tree=null;
const stack=[];

// Global cache for file and folder counts - populated once after login
const globalCountsCache = new Map();
let countsPreloaded = false;

// Recursive counting system to show total items in folders including all subfolders
async function preloadAllCounts() {
  if (countsPreloaded || !tree) return;
  
  console.log('Preloading real file and folder counts from Cloudflare...');
  globalCountsCache.clear();
  
  // Helper function to fetch real file count for a folder path
  async function fetchRealFileCount(folderPath) {
    try {
      await loadConfig();
      const prefix = `${CONFIG.ROOT_PREFIX}/${folderPath}/`.replace(/\/+/g, '/');
      const items = await listFilesFromWorker(prefix);
      
      // Count only actual files (not prefixes/subfolders)
      const files = items.filter(item => item.kind === 'object');
      return files.length;
    } catch (error) {
      console.warn(`Failed to get file count for ${folderPath}:`, error);
      return 0; // Fallback to 0 if API fails
    }
  }
  
  // Helper function to fetch real note count for mechanic notes folders
  async function fetchRealNoteCount(machinePrefix) {
    try {
      await loadConfig();
      const response = await fetch(`${CONFIG.WORKER_BASE_URL}/notes/list?machinePrefix=${encodeURIComponent(machinePrefix)}`);
      if (response.ok) {
        const data = await response.json();
        return (data.notes || []).length;
      }
      return 0;
    } catch (error) {
      console.warn(`Failed to get note count for ${machinePrefix}:`, error);
      return 0; // Fallback to 0 if API fails
    }
  }
  
  // Helper function to count all descendants recursively with real file counts
  async function countAllDescendantsWithRealCounts(node, basePath = []) {
    if (!node.children || node.children.length === 0) {
      // Leaf node - fetch real file count from API
      const folderPath = [...basePath, node.name].map(name => 
        name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
      ).join('/');
      
      let fileCount = 0;
      const isMechanicNotes = node.name.toLowerCase() === 'mechanic notes';
      
      if (isMechanicNotes) {
        // For mechanic notes, get note count
        const machinePrefix = basePath.map(name => 
          name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
        ).join('/');
        fileCount = await fetchRealNoteCount(machinePrefix);
      } else {
        // For regular folders, get file count
        fileCount = await fetchRealFileCount(folderPath);
      }
      
      return { totalItems: 0, totalFolders: 0, totalLeafFolders: 1, totalFiles: fileCount };
    }
    
    // Check if this is a folder that only contains leaf folders (document categories)
    const hasOnlyLeafChildren = node.children.every(child => !child.children || child.children.length === 0);
    
    if (hasOnlyLeafChildren) {
      // This folder contains only document categories (leaf folders)
      // Fetch real file counts for all children
      let totalFiles = 0;
      const leafCount = node.children.length;
      
      for (const child of node.children) {
        const childCounts = await countAllDescendantsWithRealCounts(child, [...basePath, node.name]);
        totalFiles += childCounts.totalFiles;
      }
      
      return { totalItems: leafCount, totalFolders: leafCount, totalLeafFolders: leafCount, totalFiles };
    }
    
    // This is a higher-level folder - count all descendants recursively
    let totalItems = 0;
    let totalFolders = 0;
    let totalLeafFolders = 0;
    let totalFiles = 0;
    
    // Count all children and their descendants
    for (const child of node.children) {
      const childCounts = await countAllDescendantsWithRealCounts(child, [...basePath, node.name]);
      totalItems += childCounts.totalItems;
      totalFolders += childCounts.totalFolders;
      totalLeafFolders += childCounts.totalLeafFolders;
      totalFiles += childCounts.totalFiles;
    }
    
    // Add the immediate children to the count
    totalItems += node.children.length;
    totalFolders += node.children.length;
    
    return { totalItems, totalFolders, totalLeafFolders, totalFiles };
  }
  
  // Populate tree counts with real file counts from API
  async function populateTreeCountsWithRealData(node, basePath = []) {
    const nodeKey = [...basePath, node.name].join('/');
    
    // Calculate recursive counts with real file data
    const recursiveCounts = await countAllDescendantsWithRealCounts(node, basePath);
    const isLeaf = !node.children || node.children.length === 0;
    const isMechanicNotes = node.name.toLowerCase() === 'mechanic notes';
    
    // For display purposes:
    // - If it's a leaf folder, show 0 items (it contains files, not folders)
    // - If it's a parent folder, show total recursive count
    const displayItemCount = isLeaf ? 0 : recursiveCounts.totalItems;
    
    // Use real file count from API
    const realFileCount = isLeaf ? recursiveCounts.totalFiles : recursiveCounts.totalFiles;
    
    // Set cache entry with real counts
    globalCountsCache.set(nodeKey, {
      folderCount: displayItemCount,
      fileCount: realFileCount,
      timestamp: Date.now(),
      isLeaf: isLeaf,
      isMechanicNotes: isMechanicNotes
    });
    
    // Recursively process children
    if (node.children) {
      for (const child of node.children) {
        await populateTreeCountsWithRealData(child, [...basePath, node.name]);
      }
    }
  }
  
  try {
    // Populate counts for all nodes in the tree with real data
    if (tree.children) {
      for (const child of tree.children) {
        await populateTreeCountsWithRealData(child, []);
      }
    }
    
    countsPreloaded = true;
    console.log('Real file and folder counts preloaded successfully from Cloudflare');
  } catch (error) {
    console.error('Failed to preload counts:', error);
    countsPreloaded = true; // Continue anyway
  }
}

// Get cached counts for a node
function getCachedCounts(node, basePath = []) {
  const nodeKey = [...basePath, node.name].join('/');
  const cached = globalCountsCache.get(nodeKey);
  
  if (cached) {
    return {
      folderCount: cached.folderCount,
      fileCount: cached.fileCount,
      isLeaf: cached.isLeaf,
      isMechanicNotes: cached.isMechanicNotes || false
    };
  }
  
  // Fallback to basic counts if not cached
  const folderCount = node.children ? node.children.length : 0;
  const isLeaf = !node.children || node.children.length === 0;
  const isMechanicNotes = node.name.toLowerCase() === 'mechanic notes';
  
  return {
    folderCount: folderCount,
    fileCount: 0,
    isLeaf: isLeaf,
    isMechanicNotes: isMechanicNotes
  };
}

// Clear the global cache and reset preload flag - call this when user refreshes
function clearGlobalCountsCache() {
  globalCountsCache.clear();
  countsPreloaded = false;
  console.log('Global counts cache cleared');
}

// Clear file count cache (legacy function for compatibility)
function clearFileCountCache() {
  // For now, just clear the global cache - can be enhanced later for file-specific caching
  clearGlobalCountsCache();
}

const $overlay=document.getElementById('loginOverlay');
const $loadingOverlay=document.getElementById('loadingOverlay');
const $loadingText=document.getElementById('loadingText');
const $loginBtn=document.getElementById('loginBtn');
const $u=document.getElementById('u');
const $p=document.getElementById('p');
const $err=document.getElementById('err');
const $header=document.getElementById('appHeader');
const $main=document.getElementById('appMain');
const $c=document.getElementById('content');
const $bc=document.getElementById('breadcrumbs');
const $back=document.getElementById('backBtn');

// Load configuration from data/config.json
async function loadConfig() {
  if (config) return config;
  
  try {
    const response = await fetch('/data/config.json?v=' + (Date.now() % 1e7));
    if (response.ok) {
      config = await response.json();
      // Set global CONFIG for new modular components
      CONFIG = { ...config };
      return config;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  
  // Fallback config
  config = {
    "FILES_BASE_URL": "https://pub-d8f89cb648cd4a35a8635d47997501f2.r2.dev",
    "WORKER_BASE_URL": "https://mbf-api.factoryflowdynamics.workers.dev",
    "ROOT_PREFIX": "library",
    "ALLOWED_ROOTS": ["library", "docs", "assets"],
    "STRICT_FOLDERS": true
  };
  CONFIG = { ...config };
  return config;
}

// Generate slug from text: lowercase, trim, spaces→_, remove non [a-z0-9._-], collapse _
function slug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Convert breadcrumbs to R2 key path
function breadcrumbsToKey(breadcrumbs) {
  if (!breadcrumbs || breadcrumbs.length === 0) return 'library';
  
  const keyParts = ['library'];
  for (const crumb of breadcrumbs) {
    keyParts.push(slug(crumb));
  }
  
  return keyParts.join('/');
}

// URL-encode each path segment for links/iframes
function encodeKey(keyPath) {
  return keyPath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
}

// Build file URL from R2 key using new centralized function
function r2PublicUrl(key) {
  // Use the preferred R2 public domain (cleaner, no bucket name in path)
  const PUBLIC_BASE = 'https://pub-d8f89cb648cd4a35a8635d47997501f2.r2.dev';
  // Properly encode each path segment for R2 keys
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${PUBLIC_BASE}/${encodedKey}`;
}

// Build file URL from R2 key
async function buildFileUrl(key) {
  return r2PublicUrl(key);
}

// Admin token management
const getAdminToken = () => localStorage.getItem('mbf_admin_token') || '';
const isAdmin = () => !!getAdminToken();

// Admin helper functions (inline)
function setAdminKey(k) { 
  localStorage.setItem('mbf_admin_token', k); 
}
function getAdminKey() { 
  return localStorage.getItem('mbf_admin_token') || ''; 
}
function clearAdminKey() { 
  localStorage.removeItem('mbf_admin_token'); 
}

// Alt+A admin toggle feature removed as requested

// Utility functions (inline)
function encodeKey(p) {
  return p.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
}

function prefixFromBreadcrumbs(crumbs) {
  // e.g. ['Home','Line 2','Depalletizer',...,'Electrical Schematics']
  const segs = crumbs.map(slug);
  return `library/${segs.join('/')}/`;          // always end with "/"
}

function fileUrlFromKey(key) {
  return r2PublicUrl(key);
}

// Auto-store admin token on successful admin login
function onAdminLoginSuccess() {
  localStorage.setItem('mbf_admin_token', '124rfgsdfw3r3trhfjghju8475623edsfsfffwefsd33');
  
  // Call seedAdminOnLogin if the modular admin system is available
  if (window.seedAdminOnLogin) {
    window.seedAdminOnLogin();
  }
}

// Helper functions for upload
function keyFromBreadcrumbs(breadcrumbs, filename) {
  const parts = breadcrumbs.map(slug);
  return ['library', ...parts, slug(filename)].join('/');
}

// Admin settings panel
function createAdminSettingsPanel() {
  const panel = document.createElement('div');
  panel.className = 'admin-settings-panel';
  panel.style.cssText = `
    margin: 16px 0;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f8f9fa;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Admin Settings';
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
  panel.appendChild(title);

  // System status
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = 'margin-bottom: 16px;';
  updateSystemStatus(statusDiv);
  panel.appendChild(statusDiv);

  return panel;
}

async function updateSystemStatus(statusDiv) {
  try {
    const cfg = await loadConfig();
    statusDiv.innerHTML = `
      <div style="color: #28a745; font-weight: 600;">
        Connected to Cloudflare Worker
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">
        Worker: ${cfg.WORKER_BASE_URL}<br>
        Storage: ${cfg.FILES_BASE_URL}
      </div>
    `;
  } catch (error) {
    statusDiv.innerHTML = `
      <div style="color: #dc3545; font-weight: 600;">
        Configuration Error
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">
        Failed to load application configuration
      </div>
    `;
  }
}

// Authentication functions
async function checkAuth() {
  // Check if user is already authenticated via sessionStorage
  const authOk = sessionStorage.getItem('refresco_auth_ok');
  if (authOk === '1') {
    // Restore user info from sessionStorage
    const userInfo = sessionStorage.getItem('refresco_user_info');
    if (userInfo) {
      try {
        currentUser = JSON.parse(userInfo);
        
        // If this is an admin user, restore admin functionality
        if (currentUser.role === 'admin') {
          onAdminLoginSuccess();
        }
        
        return true;
      } catch (e) {
        // Fallback to MECH if user info is corrupted
        currentUser = { username: 'MECH', role: 'mechanic' };
        return true;
      }
    } else {
      // Fallback to MECH for legacy sessions
      currentUser = { username: 'MECH', role: 'mechanic' };
      return true;
    }
  }
  return false;
}

function authed() { 
  return currentUser !== null; 
}

function showApp() { 
  $overlay.style.display='none'; 
  $loadingOverlay.style.display='none'; 
  $header.style.display='block'; 
  $main.style.display='block'; 
  initApp(); 
}

function requireLogin() { 
  $overlay.style.display='flex'; 
  $loadingOverlay.style.display='none'; 
  $header.style.display='none'; 
  $main.style.display='none'; 
}

async function showLoadingAnimation() {
  $overlay.style.display='none';
  $loadingOverlay.style.display='flex';
  
  // Simple "Finalizing Environment..." for 3 seconds
  await showLoadingPhase('Finalizing Environment', 3000);
  
  // Show main app
  showApp();
}

async function showLoadingPhase(text, duration) {
  return new Promise(resolve => {
    // Fade out current text
    $loadingText.classList.remove('show');
    
    setTimeout(() => {
      // Update text and fade in
      $loadingText.innerHTML = text + '<span class="dots"></span>';
      $loadingText.classList.add('show');
      
      // Wait for the specified duration then resolve
      setTimeout(resolve, duration);
    }, 300); // Wait for fade out
  });
}
// Login handling
$loginBtn.onclick = async () => { 
  const username = ($u.value || '').trim(); 
  const password = ($p.value || '').trim();
  
  if (!username || !password) {
    $err.textContent = 'Please enter username and password';
    return;
  }
  
  $loginBtn.disabled = true;
  $loginBtn.textContent = 'Signing in...';
  $err.textContent = '';
  
  try {
    // Simple hardcoded authentication
    if (username === 'MECH' && password === '1234') {
      currentUser = { username: 'MECH', role: 'mechanic' };
      sessionStorage.setItem('refresco_auth_ok', '1');
      sessionStorage.setItem('refresco_user_info', JSON.stringify(currentUser));
      
      showLoadingAnimation();
    } else if (username === 'ADMIN' && password === '1234') {
      currentUser = { username: 'ADMIN', role: 'admin' };
      sessionStorage.setItem('refresco_auth_ok', '1');
      sessionStorage.setItem('refresco_user_info', JSON.stringify(currentUser));
      
      // Enable admin functionality
      onAdminLoginSuccess();
      
      showLoadingAnimation();
    } else {
      $err.textContent = 'Invalid username or password';
    }
  } catch (error) {
    console.error('Login error:', error);
    $err.textContent = 'Connection error. Please try again.';
  } finally {
    $loginBtn.disabled = false;
    $loginBtn.textContent = 'Sign In';
  }
};

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => { 
  if (await checkAuth()) {
    showApp(); 
  } else {
    requireLogin(); 
  }
});

async function initApp(){
  // Load application configuration and tree
  await loadConfig();

  try{
    const res=await fetch('data/tree.json?v='+(Date.now()%1e7));
    if(!res.ok) throw new Error('tree.json missing');
    tree=await res.json(); 
    
    // Start preloading file and folder counts in the background (non-blocking)
    preloadAllCounts().then(() => {
      // Re-render once counts are loaded to update the display with real counts
      if (tree && stack.length === 0) {
        render();
      }
    }).catch(err => {
      console.warn('Failed to preload counts, using fallback counts:', err);
    });
    
    // Render immediately with fallback counts
    render();
  }catch(e){ console.error(e); $c.innerHTML='<p class="empty">Failed to load folder tree (data/tree.json).</p>'; }
}
function current(){ let n=tree; for(const i of stack){ n=(n.children||[])[i]; } return n; }
function pathBreadcrumbs(){ const names=[]; let n=tree; stack.forEach(i=>{ n=n.children[i]; names.push(n.name); }); return names; }
function slugify(label){ return label.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,''); }

function render(){
  // Reset scroll position to top when navigating to new folder
  window.scrollTo(0, 0);
  
  renderBack(); renderCrumbs();
  const n=current(); $c.innerHTML='';
  
  // Clear the new UI components initially
  const toolbarEl = document.getElementById('folder-toolbar');
  const filesEl = document.getElementById('files-list');
  const notesEl = document.getElementById('notes-panel');
  if (toolbarEl) toolbarEl.innerHTML = '';
  if (filesEl) filesEl.innerHTML = '';
  if (notesEl) notesEl.innerHTML = '';

  // Admin settings panel (only at root level for admin users)
  if (currentUser && currentUser.role === 'admin' && stack.length === 0) {
    const adminPanel = createAdminSettingsPanel();
    $c.appendChild(adminPanel);
  }

  if(n.children && n.children.length){
    const list=document.createElement('div'); list.className='list';
    
    // Get current path for building cache keys
    const currentPath = [];
    let currentNode = tree;
    for (let stackIndex of stack) {
      currentNode = currentNode.children[stackIndex];
      currentPath.push(currentNode.name);
    }
    
    // Create all buttons with immediate counts from cache
    n.children.forEach((ch,i)=>{ 
      const b=document.createElement('button'); 
      b.className='item'; 
      
      // Get cached counts immediately
      const counts = getCachedCounts(ch, currentPath);
      const folderCount = counts.folderCount;
      const fileCount = counts.fileCount;
      const isLeaf = counts.isLeaf;
      const isMechanicNotes = counts.isMechanicNotes;
      
      // Create compact, non-wrapping display with special handling for Mechanic Notes
      let countDisplay = '';
      if (isLeaf) {
        // Leaf folders show file count only, with special text for Mechanic Notes
        if (isMechanicNotes) {
          countDisplay = `Notes: ${fileCount}`;
        } else {
          countDisplay = `Files: ${fileCount}`;
        }
      } else {
        // Parent folders show both folder and file counts
        countDisplay = `Items: ${folderCount} | Files: ${fileCount}`;
      }
      
      // Use improved styling to prevent line wrapping and make it more compact
      b.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="flex: 1; text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis;">${ch.name}</span>
          <span style="font-size: 0.7em; color: #666; white-space: nowrap; margin-left: 8px; flex-shrink: 0;">${countDisplay}</span>
        </div>
      `;
      
      // Add click handler
      b.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Navigating to ${ch.name} (index ${i})`);
        stack.push(i); 
        render(); 
      }); 
      
      list.appendChild(b);
    });
    $c.appendChild(list);
  } else {
    // This is a folder page - use the new modular UI components
    console.log('Initializing folder page for:', pathBreadcrumbs());
    initFolderPage().catch(err => {
      console.error('Error initializing folder page:', err);
      // Fallback to basic message
      $c.innerHTML = '<div class="empty">Loading folder contents...</div>';
    });
  }
}

// Initialize folder page with new modular components
async function initFolderPage() {
  const crumbs = pathBreadcrumbs(); // you already have this array of labels
  
  // Use modular folder page system if available, otherwise fallback to inline
  if (window.initModularFolderPage) {
    await window.initModularFolderPage(crumbs);
  } else {
    // Fallback to inline implementation
    const prefix = prefixFromBreadcrumbs(crumbs);
    await renderFolderToolbar(prefix);
    await renderFilesList(prefix);
    await renderNotes(prefix);
  }
}

// Files UI functions (inline implementations)
function viewerUrlFor(key, contentType = '') {
  const url = r2PublicUrl(key);
  const lower = key.toLowerCase();
  
  // Office documents
  if (lower.endsWith('.doc') || lower.endsWith('.docx')
   || lower.endsWith('.ppt') || lower.endsWith('.pptx')
   || lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }
  
  // PDF (use PDF.js bundled in the repo)
  if (lower.endsWith('.pdf')) {
    return `/assets/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}`;
  }
  
  // Images / text / others → open directly
  return url;
}

// Handle special view action for mechanic notes
function handleNoteView(noteKey) {
  openNoteReader(noteKey);
}

// Open mechanic note in internal reader
async function openNoteReader(noteKey) {
  try {
    const url = r2PublicUrl(noteKey);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Note not found: ${noteKey}`);
    }
    const note = await response.json();
    showNoteModal(note, noteKey);
  } catch (error) {
    console.error('Error loading note:', error);
    alert(`File not found in storage. Key: ${noteKey}`);
  }
}

// Show note in a modal reader
function showNoteModal(note, noteKey) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    max-width: 90%;
    max-height: 90%;
    width: 600px;
    overflow-y: auto;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
  
  const title = document.createElement('h3');
  title.textContent = note.title || 'Mechanic Note';
  title.style.margin = '0';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
  `;
  closeBtn.onclick = () => modal.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);

  const meta = document.createElement('div');
  meta.style.cssText = 'margin-bottom: 16px; color: #666; font-size: 14px;';
  meta.innerHTML = `
    <strong>Author:</strong> ${note.author || 'Unknown'}<br>
    <strong>Created:</strong> ${note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown'}
  `;

  const body = document.createElement('pre');
  body.style.cssText = `
    white-space: pre-wrap;
    margin: 16px 0;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 4px;
    font-family: inherit;
  `;
  body.textContent = note.body || '';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export as .txt';
  exportBtn.style.cssText = `
    padding: 8px 16px;
    background: #007cba;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 16px;
  `;
  exportBtn.onclick = () => exportNoteTxt(note);

  content.appendChild(header);
  content.appendChild(meta);
  content.appendChild(body);
  content.appendChild(exportBtn);
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// Export note as .txt file
function exportNoteTxt(note) {
  const text = `Title: ${note.title || 'Untitled'}\nAuthor: ${note.author || 'Unknown'}\nDate: ${note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown'}\n\n${note.body || ''}\n`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (note.title || 'note').replace(/\s+/g, '_') + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function listFilesFromWorker(prefix, retryCount = 0) {
  await loadConfig();
  
  try {
    // Add cache-busting parameter to ensure fresh data on each request
    const cacheBuster = `v=${Date.now()}&retry=${retryCount}`;
    const url = `${CONFIG.WORKER_BASE_URL}/files?prefix=${encodeURIComponent(prefix)}&${cacheBuster}`;
    
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!r.ok) {
      console.warn(`Failed to fetch files for prefix ${prefix}: ${r.status} ${r.statusText}`);
      
      // Retry once if the first attempt fails
      if (retryCount < 1) {
        console.log(`Retrying file fetch for prefix: ${prefix}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return listFilesFromWorker(prefix, retryCount + 1);
      }
      return [];
    }
    
    const data = await r.json();
    console.log(`Successfully loaded ${data.length} items for prefix: ${prefix}`);
    return data;
  } catch (error) {
    console.error(`Error fetching files for prefix ${prefix}:`, error);
    
    // Retry once if network error occurs
    if (retryCount < 1) {
      console.log(`Retrying file fetch after error for prefix: ${prefix}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return listFilesFromWorker(prefix, retryCount + 1);
    }
    return [];
  }
}

// Note: Old file counting functions removed to prevent performance issues
// File counts are now handled by the simple preloading system

async function renderFilesList(prefix) {
  await loadConfig();
  const host = document.getElementById('files-list');
  if (!host) return;

  host.innerHTML = '<div class="mbf-empty">Loading files...</div>';
  
  try {
    const items = await listFilesFromWorker(prefix);
    const files = items.filter(x => x.kind === 'object');
    const folders = items.filter(x => x.kind === 'prefix'); // if you want to show subfolders too

    if (!files.length && !folders.length) {
      host.innerHTML = '<div class="mbf-empty">No files found in this folder. Files will appear here when uploaded to the repository.</div>';
      return;
    }

    host.innerHTML = '';
    console.log(`Rendering ${files.length} files and ${folders.length} folders`);
    
    // (Optional) render folders here first…

    // Files
    for (const f of files) {
      const row = document.createElement('div');
      row.className = 'mbf-row';
    const name = f.key.split('/').pop();
    const isNoteFile = f.key.toLowerCase().endsWith('.json') && f.key.includes('/mechanic_notes/');

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    
    if (isNoteFile) {
      // Special handling for mechanic notes - open in internal reader
      viewBtn.onclick = () => handleNoteView(f.key);
    } else {
      // Regular file viewing
      viewBtn.onclick = () => window.open(viewerUrlFor(f.key, f.contentType || ''), '_blank');
    }

    const dlBtn = document.createElement('a');
    dlBtn.textContent = 'Download';
    dlBtn.href = r2PublicUrl(f.key);
    dlBtn.download = f.originalFileName || name;
    dlBtn.role = 'button';

    row.innerHTML = `<div title="${f.key}">${name}</div>`;
    row.appendChild(viewBtn);
    row.appendChild(dlBtn);

    if (isAdmin()) {
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.onclick = async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        const r = await fetch(`${CONFIG.WORKER_BASE_URL}/object?key=${encodeURIComponent(f.key)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getAdminKey()}` }
        });
        const j = await r.json();
        if (!r.ok) { alert(j.error || 'Delete failed'); return; }
        await renderFilesList(prefix);
      };
      row.appendChild(del);
    }

    host.appendChild(row);
  }
  } catch (error) {
    console.error('Error rendering files list:', error);
    host.innerHTML = '<div class="mbf-empty">Error loading files. Please refresh the page and try again.</div>';
  }
}

// Admin-only Upload functionality
async function renderFolderToolbar(prefix) {
  await loadConfig();
  const el = document.getElementById('folder-toolbar');
  if (!el) return;
  el.innerHTML = '';

  if (!isAdmin()) return; // only admins see upload button

  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Add upload icon
  const uploadIcon = window.createIconElement(window.UPLOAD_ICON, 'Upload', 20);
  uploadIcon.style.filter = 'brightness(0) invert(1)'; // Make icon white
  btn.appendChild(uploadIcon);
  
  const uploadText = document.createElement('span');
  uploadText.textContent = 'Upload Files';
  btn.appendChild(uploadText);
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#2563eb';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#3b82f6';
  });
  const input = document.createElement('input');
  input.type = 'file'; 
  input.multiple = true; 
  input.style.display = 'none';
  btn.onclick = () => input.click();

  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const key = `${prefix}${file.name}`.replace(/\/+$/, '');   // full key
      const url = `${CONFIG.WORKER_BASE_URL}/upload?key=${encodeURIComponent(key)}&mkparents=true`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminKey()}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Upload failed'); break; }
    }
    input.value = '';
    clearFileCountCache(); // Clear cache so counts will be refreshed
    await renderFilesList(prefix);       // refresh list after upload
  };

  el.appendChild(btn);
  el.appendChild(input);
}

// Mechanic Notes functionality
async function fetchNotes(prefix) {
  await loadConfig();
  const r = await fetch(`${CONFIG.WORKER_BASE_URL}/notes/list?machinePrefix=${encodeURIComponent(prefix)}`);
  return r.ok ? r.json() : { notes: [] };
}

async function createNote(prefix, author, title, body) {
  await loadConfig();
  const r = await fetch(`${CONFIG.WORKER_BASE_URL}/notes/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machinePrefix: prefix, author, title, body })
  });
  return r.json();
}

async function deleteNote(prefix, id) {
  await loadConfig();
  const r = await fetch(`${CONFIG.WORKER_BASE_URL}/notes/delete?id=${encodeURIComponent(id)}&machinePrefix=${encodeURIComponent(prefix)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAdminKey()}` }
  });
  return r.json();
}

function openNoteModal(onSubmit) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999';
  wrap.innerHTML = `
    <div style="background:#fff;padding:16px;max-width:520px;width:92%;border-radius:8px">
      <h3>Create Mechanic Note</h3>
      <div style="display:grid;gap:8px">
        <input id="n-author" placeholder="Author" />
        <input id="n-title"  placeholder="Title" />
        <textarea id="n-body" placeholder="Note..." rows="8"></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button id="n-cancel">Cancel</button>
        <button id="n-save">Save note</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#n-cancel').onclick = () => wrap.remove();
  wrap.querySelector('#n-save').onclick = () => {
    const author = wrap.querySelector('#n-author').value.trim();
    const title  = wrap.querySelector('#n-title').value.trim();
    const body   = wrap.querySelector('#n-body').value.trim();
    onSubmit({ author, title, body }).finally(() => wrap.remove());
  };
}

async function renderNotes(prefix) {
  await loadConfig();
  const host = document.getElementById('notes-panel');
  if (!host) return;

  host.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">Mechanic Notes</h3>
      <button id="mbf-create-note">Create note</button>
    </div>
    <div id="mbf-notes-list" class="mbf-notes-list">Loading…</div>
    <div id="mbf-note-view" style="display:none;margin-top:10px;border:1px solid #eee;border-radius:6px;padding:10px"></div>
  `;

  host.querySelector('#mbf-create-note').onclick = () => {
    openNoteModal(async ({ author, title, body }) => {
      if (!author || !title) { alert('Author and Title are required'); return; }
      const res = await createNote(prefix, author, title, body || '');
      if (!res.ok) { alert(res.error || 'Failed to save note'); return; }
      await draw();
    });
  };

  async function draw() {
    const listEl = host.querySelector('#mbf-notes-list');
    const viewEl = host.querySelector('#mbf-note-view');
    const { notes = [] } = await fetchNotes(prefix);

    if (!notes.length) { listEl.textContent = 'No notes yet.'; viewEl.style.display = 'none'; return; }
    listEl.innerHTML = '';

    for (const n of notes) {
      const row = document.createElement('div');
      row.className = 'mbf-note-row';
      row.innerHTML = `
        <div><strong>${n.title}</strong> — <em>${n.author}</em> <span style="opacity:.6">(${new Date(n.createdAt).toLocaleString()})</span></div>
        ${isAdmin() ? '<button class="del" title="Delete note">Delete</button>' : ''}
      `;
      row.onclick = async (ev) => {
        if (ev.target.classList.contains('del')) {
          ev.stopPropagation();
          if (!confirm('Delete this note?')) return;
          const r = await deleteNote(prefix, n.id);
          if (!r.ok) { alert(r.error || 'Delete failed'); return; }
          await draw();
        } else {
          const r = await fetch(fileUrlFromKey(n.key));
          if (!r.ok) { alert('Cannot load note'); return; }
          const obj = await r.json();
          viewEl.style.display = 'block';
          viewEl.innerHTML = `<h4 style="margin:.25rem 0">${obj.title}</h4>
            <div style="opacity:.7;margin-bottom:.5rem">${obj.author} — ${new Date(obj.createdAt).toLocaleString()}</div>
            <pre style="white-space:pre-wrap;margin:0">${obj.body || ''}</pre>`;
          viewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
      listEl.appendChild(row);
    }
  }
  await draw();
}

function renderCrumbs(){ const parts=['<a href="#" data-i="-1">Home</a>']; let n=tree;
  stack.forEach((idx,d)=>{ n=n.children[idx]; if(d<stack.length-1) parts.push(`<a href="#" data-i="${d}">${n.name}</a>`); else parts.push(`<span>${n.name}</span>`); });
  $bc.innerHTML=parts.join(' / ');
  $bc.querySelectorAll('a[data-i]').forEach(a=>{ a.onclick=e=>{ e.preventDefault(); const i=parseInt(a.getAttribute('data-i'),10); if(i===-1) stack.length=0; else stack.length=i+1; render(); }; });
}
function renderBack(){ if(stack.length===0){ $back.style.display='none'; return; } $back.style.display='inline-block'; $back.onclick=()=>{ stack.pop(); render(); }; }

// Get current folder path from navigation stack
function nodeRepoPath(){ 
  if (stack.length === 0) return '/library/';
  return '/library/' + stack.map(s => slug(s.name)).join('/') + '/';
}

async function listFiles(path){ 
  try {
    const cfg = await loadConfig();
    const folderKey = breadcrumbsToKey(stack.map(s => s.name));
    
    const res = await fetch(`${cfg.WORKER_BASE_URL}/files?prefix=${encodeURIComponent(folderKey)}`);
    if (!res.ok) throw new Error('Worker API ' + res.status);
    
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    
    // Filter out .keep files and convert to expected format
    return items
      .filter(item => !item.key.endsWith('/.keep'))
      .map(item => ({
        name: item.key.split('/').pop(),
        type: item.kind === 'prefix' ? 'dir' : 'file',
        size: item.size || 0,
        lastModified: item.lastModified || new Date().toISOString(),
        contentType: item.contentType || 'application/octet-stream'
      }));
      
  } catch (error) {
    console.log('Worker API failed:', error);
    return [];
  }
}
function prettyName(filename){ const noExt=filename.replace(/\.[^.]+$/,''); return noExt.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }


function showFileActions(url, name, isLocalStorage = false) {
  const ext = (name.split('.').pop()||'').toLowerCase();
  $c.innerHTML='';
  
  const title=document.createElement('div'); 
  title.className='sectionTitle'; 
  title.textContent=name; 
  $c.appendChild(title);
  
  // File action buttons container
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = `
    margin: 20px 0;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f9f9f9;
    text-align: center;
  `;
  
  // View button
  const viewBtn = document.createElement('button');
  viewBtn.textContent = 'View File';
  viewBtn.className = 'action-btn';
  viewBtn.style.cssText = `
    display: inline-block;
    margin: 8px;
    padding: 12px 24px;
    border: 1px solid #000;
    border-radius: 4px;
    background: #fff;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  viewBtn.onmouseover = () => {
    viewBtn.style.background = '#000';
    viewBtn.style.color = '#fff';
  };
  viewBtn.onmouseout = () => {
    viewBtn.style.background = '#fff';
    viewBtn.style.color = '#000';
  };
  viewBtn.onclick = () => viewFile(url, name, isLocalStorage);
  
  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download File';
  downloadBtn.className = 'action-btn';
  downloadBtn.style.cssText = viewBtn.style.cssText;
  downloadBtn.onmouseover = () => {
    downloadBtn.style.background = '#000';
    downloadBtn.style.color = '#fff';
  };
  downloadBtn.onmouseout = () => {
    downloadBtn.style.background = '#fff';
    downloadBtn.style.color = '#000';
  };
  downloadBtn.onclick = () => downloadFile(url, name, isLocalStorage);
  
  actionsContainer.appendChild(viewBtn);
  actionsContainer.appendChild(downloadBtn);
  
  // Delete button for admin users only
  if (currentUser && currentUser.role === 'admin') {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete File';
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.style.cssText = `
      display: inline-block;
      margin: 8px;
      padding: 12px 24px;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      background: #fff;
      color: #d32f2f;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    deleteBtn.onmouseover = () => {
      deleteBtn.style.background = '#d32f2f';
      deleteBtn.style.color = '#fff';
    };
    deleteBtn.onmouseout = () => {
      deleteBtn.style.background = '#fff';
      deleteBtn.style.color = '#d32f2f';
    };
    deleteBtn.onclick = () => deleteFile(url, name, isLocalStorage);
    
    actionsContainer.appendChild(deleteBtn);
  }
  
  $c.appendChild(actionsContainer);
  
  // File info
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'margin: 16px 0; font-size: 14px; color: #666;';
  
  let sourceText = 'GitHub Repository';
  if (url.startsWith('#fallback-upload-') || url.startsWith('#large-file-')) {
    sourceText = 'Browser Local Storage';
  } else if (url.startsWith('/uploads/') || url.startsWith('http://localhost')) {
    sourceText = 'Server Local Storage';
  }
  
  infoDiv.innerHTML = `
    <strong>File:</strong> ${name}<br>
    <strong>Type:</strong> ${ext.toUpperCase() || 'Unknown'}<br>
    <strong>Source:</strong> ${sourceText}
  `;
  $c.appendChild(infoDiv);
}

function viewFile(url, name, isLocalStorage = false) {
  openFile(url, name, isLocalStorage);
}

function downloadFile(url, name, isLocalStorage = false) {
  if (isLocalStorage) {
    // Handle localStorage file download
    const currentPath = nodeRepoPath();
    const storageKey = `mbf_files_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      const storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const file = storedFiles.find(f => f.filename === name);
      
      if (file && file.data) {
        // Create download link for data URL
        const a = document.createElement('a');
        a.href = file.data;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch (e) {
      console.error('Error accessing stored file:', e);
    }
    
    alert('File not available for download in fallback mode.');
    return;
  }
  
  // Handle regular file download
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function deleteFile(url, name, isLocalStorage = false) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) {
    return;
  }
  
  try {
    const cfg = await loadConfig();
    const folderKey = breadcrumbsToKey(stack.map(s => s.name));
    const fileKey = `${folderKey}/${name}`;
    
    // TODO: Admin API key would be needed for deletion
    // For now, show that deletion requires admin authentication
    alert('File deletion requires admin API key. Contact system administrator.');
    
    // When admin API key is available:
    // const response = await fetch(`${cfg.WORKER_BASE_URL}/object?key=${encodeURIComponent(fileKey)}`, {
    //   method: 'DELETE',
    //   headers: {
    //     'Authorization': 'Bearer ' + ADMIN_API_KEY
    //   }
    // });
    // 
    // if (response.ok) {
    //   alert(`File "${name}" has been deleted.`);
    //   render(); // Refresh the file list
    // } else {
    //   const error = await response.json();
    //   alert(`Error deleting file: ${error.message || 'Unknown error'}`);
    // }
    
  } catch (error) {
    console.error('Error deleting file:', error);
    alert('Error deleting file.');
  }
}

// Custom file viewer that handles various file types without external dependencies
function renderCustomFileViewer(url, name, ext) {
  // Create a loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = 'text-align: center; padding: 20px; color: #666;';
  loadingDiv.textContent = 'Preparing file preview...';
  $c.appendChild(loadingDiv);

  // Use different viewing strategies based on file type
  if (['docx'].includes(ext)) {
    renderWordDocument(url, name, loadingDiv);
  } else if (['pptx'].includes(ext)) {
    renderPowerPointDocument(url, name, loadingDiv);
  } else if (['xlsx'].includes(ext)) {
    renderExcelDocument(url, name, loadingDiv);
  } else if (['doc'].includes(ext)) {
    renderLegacyDocument(url, name, loadingDiv, 'Word');
  } else if (['ppt'].includes(ext)) {
    renderLegacyDocument(url, name, loadingDiv, 'PowerPoint');
  } else if (['xls'].includes(ext)) {
    renderLegacyDocument(url, name, loadingDiv, 'Excel');
  } else if (ext === 'pdf') {
    renderPDFDocument(url, name, loadingDiv);
  } else {
    // Fallback for other file types
    renderGenericDocument(url, name, loadingDiv, ext);
  }
}

// Render Office documents (Word, PowerPoint, Excel) with multiple fallback strategies
async function renderOfficeDocument(url, name, loadingDiv, docType) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  console.log(`${docType} document viewing:`, {
    originalUrl: url,
    fileName: name
  });
  
  // Create header with filename and download link
  const header = document.createElement('div');
  header.style.cssText = `
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px 6px 0 0;
    padding: 12px 16px;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  header.innerHTML = `
    <h3 style="margin: 0; color: #2B579A; font-size: 16px;">${name}</h3>
    <a href="${url}" download="${name}" style="
      padding: 8px 16px;
      background: #2B579A;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
    ">Download</a>
  `;
  
  const container = document.createElement('div');
  container.style.cssText = 'margin: 16px 0;';
  container.appendChild(header);
  
  // Create viewing area container
  const viewerContainer = document.createElement('div');
  viewerContainer.style.cssText = `
    border: 1px solid #dee2e6;
    border-top: none;
    border-radius: 0 0 6px 6px;
    min-height: 400px;
    background: #f8f9fa;
  `;
  container.appendChild(viewerContainer);
  $c.appendChild(container);
  
  // Use Office Web Viewer for Office documents
  const ext = name.split('.').pop().toLowerCase();
  if (['docx', 'pptx', 'xlsx'].includes(ext)) {
    const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    
    const iframe = document.createElement('iframe');
    iframe.src = officeViewerUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 600px;
      border: none;
      border-radius: 0 0 6px 6px;
    `;
    
    // Handle iframe load errors
    iframe.onload = () => {
      console.log('Office viewer loaded successfully');
    };
    
    iframe.onerror = () => {
      console.log('Office viewer failed to load');
      showOfficeViewerFallback(viewerContainer, name, url, docType, url);
    };
    
    viewerContainer.appendChild(iframe);
  } else {
    // For other document types, show fallback
    showOfficeViewerFallback(viewerContainer, name, url, docType, url);
  }
}

// Render Office documents directly via Office Web Viewer - no preflight checks
async function tryDocumentViewing(container, url, name, docType, pagesUrl, rawUrl) {
  // Render Office Web Viewer directly with GitHub Pages URL
  console.log('Rendering Office Web Viewer for:', { name, pagesUrl });
  
  if (await tryOfficeWebViewer(container, pagesUrl, name, docType)) {
    return; // Success!
  }
  
  // Only show fallback if the viewer itself fails to load
  showPreviewNotAvailableFallback(container, name, pagesUrl);
}

// Try Office Web Viewer with timeout and error handling
async function tryOfficeWebViewer(container, fileUrl, name, docType) {
  return new Promise((resolve) => {
    const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 100%;
      height: 600px;
      border: none;
      background: white;
    `;
    
    let timeoutId;
    let resolved = false;
    
    iframe.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log('Office Web Viewer loaded successfully');
        resolve(true);
      }
    };
    
    iframe.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log('Office Web Viewer failed to load');
        iframe.remove();
        resolve(false);
      }
    };
    
    // Set timeout for loading
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('Office Web Viewer timed out');
        iframe.remove();
        resolve(false);
      }
    }, 10000); // 10 second timeout
    
    container.innerHTML = ''; // Clear previous content
    container.appendChild(iframe);
    iframe.src = officeViewerUrl;
  });
}

// Try custom document viewer for basic content extraction
async function tryCustomDocumentViewer(container, fileUrl, name, docType) {
  try {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <div style="margin-bottom: 16px;">
          <div style="display: inline-block; padding: 8px 16px; background: #17a2b8; color: white; border-radius: 4px; margin-bottom: 8px;">
            <div style="width: 48px; height: 48px; background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b; font-weight: 700; margin-bottom: 12px;">DOC</div>
            ${docType} Document
          </div>
          <h4 style="margin: 8px 0; color: #333;">${name}</h4>
        </div>
        <div style="background: white; border-radius: 6px; padding: 20px; margin: 16px 0; text-align: left; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #666; line-height: 1.6; margin-bottom: 16px;">
            This ${docType} document is ready to view. Choose your preferred viewing method:
          </p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
            <a href="${fileUrl}" target="_blank" style="
              display: inline-block;
              padding: 12px 24px;
              background: #28a745;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              transition: background 0.2s;
            " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
              🔗 Open in New Tab
            </a>
            <a href="${fileUrl}" download="${name}" style="
              display: inline-block;
              padding: 12px 24px;
              background: #007cba;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              transition: background 0.2s;
            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007cba'">
              📥 Download File
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <small style="color: #6c757d;">
            💡 Tip: Download the file to view it with full formatting in Microsoft Office
          </small>
        </div>
      </div>
    `;
    return true;
  } catch (error) {
    console.error('Custom document viewer failed:', error);
    return false;
  }
}

// Show "Preview not available. Download instead." when Pages URL is not accessible
function showPreviewNotAvailableFallback(container, name, downloadUrl) {
  container.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <div style="display: inline-block; padding: 8px 16px; background: #6c757d; color: white; border-radius: 4px; margin-bottom: 8px;">
          <div style="width: 48px; height: 48px; background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b; font-weight: 700; margin-bottom: 12px;">DOC</div>
          Office Document
        </div>
        <h4 style="margin: 8px 0; color: #333;">${name}</h4>
      </div>
      <div style="background: white; border-radius: 6px; padding: 20px; margin: 16px 0; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="color: #666; line-height: 1.6; margin-bottom: 16px;">
          Preview not available. Download instead.
        </p>
        <a href="${downloadUrl}" download="${name}" style="
          display: inline-block;
          padding: 12px 24px;
          background: #007cba;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          transition: background 0.2s;
        " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007cba'">
          📥 Download ${name}
        </a>
      </div>
    </div>
  `;
}

// Show enhanced fallback with multiple viewing options
function showEnhancedFallback(container, name, docType, rawUrl, pagesUrl) {
  container.innerHTML = `
    <div style="padding: 24px; text-align: center; background: white;">
      <div style="margin-bottom: 20px;">
        <div style="width: 48px; height: 48px; background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748b; font-weight: 700; margin-bottom: 12px;">FILE</div>
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 18px;">${name}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">${docType} Document</p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
        <h4 style="margin: 0 0 12px 0; color: #495057; font-size: 16px;">📋 How to view this document:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #6c757d; line-height: 1.6;">
          <li><strong>Download</strong> the file to view with full formatting in Microsoft Office</li>
          <li><strong>Open in new tab</strong> to let your browser handle the file</li>
          <li>Try viewing on a desktop computer for better compatibility</li>
          <li>Check your browser's download folder if the file was auto-downloaded</li>
        </ul>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
        <a href="${rawUrl}" target="_blank" style="
          display: inline-block;
          padding: 14px 28px;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        " onmouseover="this.style.background='#218838'; this.style.transform='translateY(-1px)'" 
           onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'">
          🔗 Open in New Tab
        </a>
        <a href="${rawUrl}" download="${name}" style="
          display: inline-block;
          padding: 14px 28px;
          background: #007cba;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        " onmouseover="this.style.background='#0056b3'; this.style.transform='translateY(-1px)'" 
           onmouseout="this.style.background='#007cba'; this.style.transform='translateY(0)'">
          📥 Download File
        </a>
      </div>
      
      <div style="margin-top: 24px; padding: 16px; background: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196f3;">
        <p style="margin: 0; color: #1565c0; font-size: 14px; text-align: left;">
          <strong>💡 Pro Tip:</strong> For the best viewing experience, download the file and open it in Microsoft Office or LibreOffice.
        </p>
      </div>
    </div>
  `;
}

// Render Word documents with Microsoft Office Web Viewer
function renderWordDocument(url, name, loadingDiv) {
  renderOfficeDocument(url, name, loadingDiv, 'Word');
}

// Render PowerPoint documents with Microsoft Office Web Viewer
function renderPowerPointDocument(url, name, loadingDiv) {
  renderOfficeDocument(url, name, loadingDiv, 'PowerPoint');
}

// Render Excel documents with Microsoft Office Web Viewer
// Render Excel documents with Microsoft Office Web Viewer
function renderExcelDocument(url, name, loadingDiv) {
  renderOfficeDocument(url, name, loadingDiv, 'Excel');
}

// Render legacy Office documents (.doc, .ppt, .xls) that aren't supported by Office Web Viewer
function renderLegacyDocument(url, name, loadingDiv, docType) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  // Build Pages URL for the file download
  const filePagesUrl = pagesUrlFromRepoPath(url);
  
  const legacyInfo = document.createElement('div');
  legacyInfo.style.cssText = `
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 24px;
    margin: 16px 0;
    text-align: center;
  `;
  
  legacyInfo.innerHTML = `
    <h3 style="margin: 0 0 12px 0; color: #6c757d; font-size: 20px;">Legacy ${docType} Document</h3>
    <p style="margin: 0 0 8px 0; font-size: 16px; color: #333; font-weight: 500;">${name}</p>
    <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
      Preview not available. Use Download.
    </p>
    <a href="${filePagesUrl}" download="${name}" style="
      display: inline-block;
      padding: 12px 24px;
      background: #6c757d;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      font-size: 16px;
    ">Download</a>
  `;
  
  $c.appendChild(legacyInfo);
}

// Render PDF documents - open directly to avoid GitHub Pages 404
function renderPDFDocument(url, name, loadingDiv) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  // Open PDF directly in new tab instead of using embedded viewer
  window.open(url, '_blank');
  
  // Show info message in the current view
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = 'margin: 16px 0;';
  
  pdfContainer.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(0, 124, 186, 0.125), rgba(0, 124, 186, 0.063));
      border: 2px solid #007cba;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
    ">
      <h3 style="margin: 0 0 12px 0; color: #007cba; font-size: 24px;">PDF Document Opened</h3>
      <p style="margin: 0 0 8px 0; font-size: 16px; color: #333; font-weight: 500;">${name}</p>
      <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">
        The PDF document has been opened in a new tab. If it didn't open automatically, click the link below.
      </p>
      <a href="${url}" target="_blank" style="
        display: inline-block;
        padding: 14px 28px;
        background: #007cba;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        transition: background 0.2s ease;
      " onmouseover="this.style.background='#005a9e'" onmouseout="this.style.background='#007cba'">
        Open PDF Document
      </a>
    </div>
  `;
  $c.appendChild(pdfContainer);
}

// Generic document viewer for unsupported types
function renderGenericDocument(url, name, loadingDiv, ext) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  const genericInfo = document.createElement('div');
  genericInfo.style.cssText = `
    background: linear-gradient(135deg, rgba(108, 117, 125, 0.125), rgba(108, 117, 125, 0.063));
    border: 2px dashed #6c757d;
    border-radius: 12px;
    padding: 30px;
    margin: 16px 0;
    text-align: center;
  `;
  
  genericInfo.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px;">📎</div>
    <h3 style="margin: 0 0 12px 0; color: #495057; font-size: 24px;">File Ready for Download</h3>
    <p style="margin: 0 0 8px 0; font-size: 16px; color: #333; font-weight: 500;">${name}</p>
    <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">
      This file is available for download. Click below to save it to your device and open it with the appropriate application.
    </p>
    <a href="${url}" download="${name}" style="
      display: inline-block;
      padding: 14px 28px;
      background: #6c757d;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    ">Download File</a>
  `;
  
  $c.appendChild(genericInfo);
}

// Function to try viewing files in browser using multiple methods
function tryViewInBrowser(url, name) {
  const viewerWindow = window.open('', '_blank');
  if (viewerWindow) {
    viewerWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Viewing: ${name}</title>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .viewer { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          iframe { width: 100%; height: 80vh; border: none; }
          .fallback { padding: 40px; text-align: center; }
          .download-btn { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #007cba; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600; 
            margin: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${name}</h1>
            <p>Attempting to display file content. If the file doesn't load, you can download it directly.</p>
            <a href="${url}" download="${name}" class="download-btn">Download Original File</a>
          </div>
          <div class="viewer">
            <iframe src="${url}" onload="console.log('File loaded')" onerror="showFallback()"></iframe>
          </div>
        </div>
        
        <script>
          function showFallback() {
            document.querySelector('.viewer').innerHTML = \`
              <div class="fallback">
                <h3>Unable to display file in browser</h3>
                <p>This file type may not be supported for inline viewing.</p>
                <a href="${url}" download="${name}" class="download-btn">Download to View</a>
              </div>
            \`;
          }
          
          // Check if iframe loaded successfully after a delay
          setTimeout(() => {
            const iframe = document.querySelector('iframe');
            try {
              if (!iframe.contentDocument && !iframe.contentWindow) {
                showFallback();
              }
            } catch (e) {
              // Cross-origin error is expected and means file is loading
              console.log('Cross-origin detected, file likely loaded');
            }
          }, 5000);
        </script>
      </body>
      </html>
    `);
    viewerWindow.document.close();
  } else {
    // Popup blocked, fall back to direct download
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function openFile(url, name, isLocalStorage = false){
  const ext = (name.split('.').pop()||'').toLowerCase();
  $c.innerHTML='';
  const title=document.createElement('div'); title.className='sectionTitle'; title.textContent=name; $c.appendChild(title);
  
  // Add back button to return to file actions
  const backToActionsBtn = document.createElement('button');
  backToActionsBtn.textContent = '← Back to File Options';
  backToActionsBtn.style.cssText = `
    margin: 10px 0;
    padding: 8px 16px;
    border: 1px solid #666;
    border-radius: 4px;
    background: #f5f5f5;
    color: #333;
    cursor: pointer;
    font-size: 14px;
  `;
  backToActionsBtn.onclick = () => {
    const isLocalStorage = url.startsWith('#fallback-upload-') || url.startsWith('#large-file-');
    const isServerStorage = url.startsWith('/uploads/');
    showFileActions(url, name, isLocalStorage || isServerStorage);
  };
  $c.appendChild(backToActionsBtn);
  
  // Check if this is a localStorage file
  if (url.startsWith('#fallback-upload-') || url.startsWith('#large-file-')) {
    // Try to find the file in localStorage
    const currentPath = nodeRepoPath();
    const storageKey = `mbf_files_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      const storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const file = storedFiles.find(f => f.filename === name);
      
      if (file && file.data) {
        // File has data stored
        if(['png','jpg','jpeg','gif','webp','svg'].includes(ext)){
          const img=new Image(); img.src=file.data; img.style.maxWidth='100%'; img.style.height='auto'; $c.appendChild(img);
        } else if(['txt','log','json','md','csv','ini','cfg','xml','html','htm','js','css','py','java','c','cpp','h','hpp'].includes(ext)){
          // Extract text content from data URL
          const base64Data = file.data.split(',')[1];
          const text = atob(base64Data);
          const pre=document.createElement('pre'); 
          pre.textContent=text; 
          pre.style.cssText = 'white-space: pre-wrap; word-break: break-word; background: #f5f5f5; padding: 16px; border-radius: 4px; border: 1px solid #ddd; overflow-x: auto; font-family: monospace; font-size: 14px;';
          $c.appendChild(pre);
        } else if(ext==='pdf'){
          const emb=document.createElement('embed'); emb.type='application/pdf'; emb.src=file.data; emb.style.width='100%'; emb.style.height='80vh'; $c.appendChild(emb);
        } else if(['mp4','webm','ogg','avi','mov'].includes(ext)){
          const video=document.createElement('video'); 
          video.src=file.data; 
          video.controls=true; 
          video.style.cssText='max-width: 100%; height: auto;'; 
          $c.appendChild(video);
        } else if(['mp3','wav','ogg','m4a','flac'].includes(ext)){
          const audio=document.createElement('audio'); 
          audio.src=file.data; 
          audio.controls=true; 
          audio.style.cssText='width: 100%; margin: 16px 0;'; 
          $c.appendChild(audio);
        } else if(['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)){
          // For locally stored Office documents, preview is not available
          // Provide download option with explanation
          const warning = document.createElement('div');
          warning.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404; margin: 16px 0;';
          warning.innerHTML = `
            <strong>Office Document Preview</strong><br>
            Preview is not available for locally stored Office documents. Files stored in your browser's local storage cannot be accessed by external viewers. Please download the file to view it in Microsoft Office, LibreOffice, or another compatible application.
          `;
          $c.appendChild(warning);
          
          const downloadBtn = document.createElement('a');
          downloadBtn.href = file.data;
          downloadBtn.download = name;
          downloadBtn.textContent = `Download ${name}`;
          downloadBtn.style.cssText = `
            display: inline-block;
            padding: 12px 24px;
            background: #007cba;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            margin: 8px 0;
          `;
          downloadBtn.onmouseover = () => downloadBtn.style.background = '#005a87';
          downloadBtn.onmouseout = () => downloadBtn.style.background = '#007cba';
          $c.appendChild(downloadBtn);
        } else {
          // Check for unsupported file types (PLC programs, etc.)
          if(['plc','rslogix','l5x','l5k','acd','rss','s7p','awl','scl','fbd','ladder'].includes(ext) || 
             name.toLowerCase().includes('plc') || 
             name.toLowerCase().includes('hmi') ||
             name.toLowerCase().includes('scada')) {
            const p=document.createElement('p'); 
            p.textContent='File type not supported for preview. This appears to be a PLC program or specialized industrial file. Please download and use with the appropriate software (RSLogix, TIA Portal, etc.).'; 
            p.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;';
            $c.appendChild(p);
          } else {
            // Offer download for other unsupported types
            const p=document.createElement('p'); p.textContent='Preview not supported for this file type.'; $c.appendChild(p);
          }
          const a=document.createElement('a'); a.href=file.data; a.textContent='Download '+name; a.className='item'; a.download=name; $c.appendChild(a);
        }
        return;
      } else if (file) {
        // File exists but too large for storage
        const p=document.createElement('p'); p.textContent=`Large file uploaded: ${name} (${formatFileSize(file.size)}). File was uploaded successfully but is too large to preview in static mode.`; $c.appendChild(p);
        return;
      }
    } catch (e) {
      console.error('Error accessing stored file:', e);
    }
    
    // Fallback message
    const p=document.createElement('p'); p.textContent='File was uploaded but is not available for preview in static mode.'; $c.appendChild(p);
    return;
  }

  // Regular file handling  
  if(['png','jpg','jpeg','gif','webp','svg'].includes(ext)){
    const img=new Image(); img.src=url; img.style.maxWidth='100%'; img.style.height='auto'; $c.appendChild(img);
  } else if(ext==='pdf'){
    const emb=document.createElement('embed'); emb.type='application/pdf'; emb.src=url; emb.style.width='100%'; emb.style.height='80vh'; $c.appendChild(emb);
  } else if(['mp4','webm','ogg','avi','mov'].includes(ext)){
    const video=document.createElement('video'); 
    video.src=url; 
    video.controls=true; 
    video.style.cssText='max-width: 100%; height: auto;'; 
    $c.appendChild(video);
  } else if(['mp3','wav','ogg','m4a','flac'].includes(ext)){
    const audio=document.createElement('audio'); 
    audio.src=url; 
    audio.controls=true; 
    audio.style.cssText='width: 100%; margin: 16px 0;'; 
    $c.appendChild(audio);
  } else if(['txt','log','json','md','csv','ini','cfg','xml','html','htm','js','css','py','java','c','cpp','h','hpp'].includes(ext)){
    fetch(url).then(r=>r.text()).then(t=>{ 
      const pre=document.createElement('pre'); 
      pre.textContent=t; 
      pre.style.cssText = 'white-space: pre-wrap; word-break: break-word; background: #f5f5f5; padding: 16px; border-radius: 4px; border: 1px solid #ddd; overflow-x: auto; font-family: monospace; font-size: 14px;';
      $c.appendChild(pre); 
    }).catch(e => {
      const errorP = document.createElement('p');
      errorP.textContent = 'Failed to load text file: ' + e.message;
      errorP.style.cssText = 'color: #d32f2f; padding: 16px; background: #ffebee; border-radius: 4px;';
      $c.appendChild(errorP);
    });
  } else if(['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)){
    console.log('Opening Office document:', name, 'URL:', url);
    
    // Check if this is a localStorage file first
    if (url.startsWith('#fallback-upload-') || 
        url.startsWith('#large-file-') ||
        url.startsWith('data:') ||
        isLocalStorage) {
      // For localStorage files, offer download since viewers can't access data URLs
      const warning = document.createElement('div');
      warning.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404; margin: 16px 0;';
      warning.innerHTML = `
        <strong>Office Document Preview</strong><br>
        Preview is not available for locally stored Office documents. Files stored in your browser's local storage cannot be accessed by external viewers. Please download the file to view it in Microsoft Office, LibreOffice, or another compatible application.
      `;
      $c.appendChild(warning);
      
      const downloadBtn = document.createElement('a');
      downloadBtn.href = url;
      downloadBtn.download = name;
      downloadBtn.textContent = `Download ${name}`;
      downloadBtn.style.cssText = `
        display: inline-block;
        padding: 12px 24px;
        background: #007cba;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 600;
        margin: 8px 0;
      `;
      downloadBtn.onmouseover = () => downloadBtn.style.background = '#005a87';
      downloadBtn.onmouseout = () => downloadBtn.style.background = '#007cba';
      $c.appendChild(downloadBtn);
    } else {
      // Use custom file viewer for all other Office documents (including local server files)
      renderCustomFileViewer(url, name, ext);
    }
  } else {
    // Check for unsupported file types (PLC programs, etc.)
    if(['plc','rslogix','l5x','l5k','acd','rss','s7p','awl','scl','fbd','ladder'].includes(ext) || 
       name.toLowerCase().includes('plc') || 
       name.toLowerCase().includes('hmi') ||
       name.toLowerCase().includes('scada')) {
      const p=document.createElement('p'); 
      p.textContent='File type not supported for preview. This appears to be a PLC program or specialized industrial file. Please download and use with the appropriate software (RSLogix, TIA Portal, etc.).'; 
      p.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;';
      $c.appendChild(p);
    } else {
      const p=document.createElement('p'); p.textContent='Preview not supported. Download the file below:'; $c.appendChild(p);
    }
    const a=document.createElement('a'); a.href=url; a.textContent='Download '+name; a.className='item'; a.download=name; $c.appendChild(a);
  }
}

// Fallback function for when Office viewers fail to load
function showOfficeViewerFallback(container, name, fileUrl, docType, publicUrl = null, errorReason = 'unknown') {
  // Clear the container
  container.innerHTML = '';
  
  // Create error message with specific details
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    padding: 16px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    color: #856404;
    margin: 16px 0;
  `;
  
  let errorDetails = '';
  if (errorReason.includes('timeout')) {
    errorDetails = `
      <li>Microsoft Office Web Viewer is taking too long to respond</li>
      <li>The file may be too large or the service may be busy</li>
    `;
  } else if (errorReason.includes('failed to load')) {
    errorDetails = `
      <li>The Office Web Viewer service blocked the request</li>
      <li>The file may not be in a supported format</li>
    `;
  } else {
    errorDetails = `
      <li>File not being publicly accessible to Microsoft's servers</li>
      <li>Network connectivity issues</li>
      <li>Microsoft Office Web Viewer service unavailable</li>
    `;
  }
  
  errorDiv.innerHTML = `
    <strong>Document Viewer Not Available</strong><br>
    The Microsoft Office Web Viewer could not load this ${docType} document.<br>
    <strong>Error:</strong> ${errorReason}<br><br>
    This might be due to:
    <ul style="margin: 8px 0; padding-left: 20px;">
      ${errorDetails}
    </ul>
    <strong>Solutions:</strong>
    <ul style="margin: 8px 0; padding-left: 20px;">
      <li>Download the file to view it locally in Microsoft Office</li>
      <li>Try opening the file directly in a new browser tab</li>
      <li>Check if the file exists and is accessible</li>
    </ul>
  `;
  
  // Add debugging information for developers
  if (publicUrl && publicUrl !== fileUrl) {
    const debugDiv = document.createElement('details');
    debugDiv.style.cssText = 'margin: 8px 0; font-size: 12px; color: #666;';
    debugDiv.innerHTML = `
      <summary style="cursor: pointer;">Show technical details</summary>
      <div style="margin: 8px 0; font-family: monospace; background: #f8f9fa; padding: 8px; border-radius: 4px;">
        <strong>Local URL:</strong> ${fileUrl}<br>
        <strong>Public URL:</strong> ${publicUrl}<br>
        <strong>Office Viewer URL:</strong> https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}
      </div>
    `;
    errorDiv.appendChild(debugDiv);
  }
  
  // Create download button
  const downloadBtn = document.createElement('a');
  downloadBtn.href = fileUrl;
  downloadBtn.download = name;
  downloadBtn.textContent = `Download ${name}`;
  downloadBtn.style.cssText = `
    display: inline-block;
    padding: 12px 24px;
    background: #007cba;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
    margin: 8px 0;
  `;
  downloadBtn.onmouseover = () => downloadBtn.style.background = '#005a87';
  downloadBtn.onmouseout = () => downloadBtn.style.background = '#007cba';
  
  // Try opening file in new window as alternative
  const tryViewBtn = document.createElement('button');
  tryViewBtn.textContent = 'Try Viewing in New Window';
  tryViewBtn.style.cssText = `
    display: inline-block;
    padding: 12px 24px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    margin: 8px 8px 8px 0;
    cursor: pointer;
  `;
  tryViewBtn.onclick = () => {
    window.open(fileUrl, '_blank');
  };
  tryViewBtn.onmouseover = () => tryViewBtn.style.background = '#545b62';
  tryViewBtn.onmouseout = () => tryViewBtn.style.background = '#6c757d';
  
  // Add a button to test the public URL directly
  let testUrlBtn = null;
  if (publicUrl && publicUrl !== fileUrl) {
    testUrlBtn = document.createElement('button');
    testUrlBtn.textContent = 'Test Public URL';
    testUrlBtn.style.cssText = `
      display: inline-block;
      padding: 12px 24px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 8px 8px 8px 0;
      cursor: pointer;
    `;
    testUrlBtn.onclick = () => {
      window.open(publicUrl, '_blank');
    };
    testUrlBtn.onmouseover = () => testUrlBtn.style.background = '#218838';
    testUrlBtn.onmouseout = () => testUrlBtn.style.background = '#28a745';
  }
  
  const buttonContainer = document.createElement('div');
  buttonContainer.appendChild(tryViewBtn);
  if (testUrlBtn) buttonContainer.appendChild(testUrlBtn);
  buttonContainer.appendChild(downloadBtn);
  
  container.appendChild(errorDiv);
  container.appendChild(buttonContainer);
}

// Handle upload files according to requirements
async function handleUploadFiles(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  
  const token = getAdminToken();
  if (!token) {
    alert('Admin authentication required for uploads');
    return;
  }

  try {
    const cfg = await loadConfig();
    
    for (const file of files) {
      // Build key from current breadcrumbs (navigation stack) 
      const currentBreadcrumbs = stack.map(index => {
        let node = tree;
        for (let i = 0; i <= index; i++) {
          if (stack[i] !== undefined) {
            node = node.children[stack[i]];
          }
        }
        return node.name;
      });
      
      const key = keyFromBreadcrumbs(currentBreadcrumbs, file.name);
      const url = `${cfg.WORKER_BASE_URL}/upload?key=${encodeURIComponent(key)}&mkparents=true`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error('Upload failed', data);
        alert(data.error || 'Upload failed');
        break;
      }
    }
    
    await refreshListing(); // re-fetch GET /files?prefix=<currentFolderKey>
    e.target.value = ''; // reset input
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed: ' + error.message);
    e.target.value = '';
  }
}

// Upload functionality for admin users
function createUploadSection(targetPath) {
  // Only show for admin users
  if (!isAdmin()) {
    return document.createElement('div'); // Return empty div if not admin
  }

  const uploadDiv = document.createElement('div');
  uploadDiv.className = 'upload-section';
  uploadDiv.style.cssText = `
    margin: 16px 0;
    padding: 20px;
    border: 2px dashed #000;
    border-radius: 8px;
    background: #f9f9f9;
    text-align: center;
    position: relative;
  `;

  const uploadTitle = document.createElement('h3');
  uploadTitle.textContent = 'Upload Files';
  uploadTitle.style.cssText = 'margin: 0 0 16px 0; font-size: 18px;';
  uploadDiv.appendChild(uploadTitle);

  // Hidden file input with multiple support
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.accept = '*/*';
  fileInput.onchange = handleUploadFiles;
  uploadDiv.appendChild(fileInput);

  // Upload button that triggers hidden input
  const uploadButton = document.createElement('button');
  uploadButton.className = 'btn';
  uploadButton.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    margin: 8px;
    border: 1px solid #000;
    border-radius: 4px;
    background: #fff;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  // Add upload icon
  const uploadIcon = window.createIconElement(window.UPLOAD_ICON, 'Upload', 16);
  uploadButton.appendChild(uploadIcon);
  
  const uploadText = document.createElement('span');
  uploadText.textContent = 'Upload';
  uploadButton.appendChild(uploadText);
  
  uploadButton.onmouseover = () => {
    uploadButton.style.background = '#000';
    uploadButton.style.color = '#fff';
  };
  uploadButton.onmouseout = () => {
    uploadButton.style.background = '#fff';
    uploadButton.style.color = '#000';
  };
  uploadButton.onclick = () => fileInput.click();
  uploadDiv.appendChild(uploadButton);

  // Drag and drop functionality
  uploadDiv.ondragover = (e) => {
    e.preventDefault();
    uploadDiv.style.borderColor = '#000';
    uploadDiv.style.background = '#f0f0f0';
  };

  uploadDiv.ondragleave = (e) => {
    e.preventDefault();
    uploadDiv.style.borderColor = '#000';
    uploadDiv.style.background = '#f9f9f9';
  };

  uploadDiv.ondrop = (e) => {
    e.preventDefault();
    uploadDiv.style.borderColor = '#000';
    uploadDiv.style.background = '#f9f9f9';
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create a synthetic event for handleUploadFiles
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files,
          value: ''
        }
      };
      handleUploadFiles(syntheticEvent);
    }
  };

  const dropText = document.createElement('p');
  dropText.textContent = 'Or drag and drop files here';
  dropText.style.cssText = 'margin: 8px 0; color: #666; font-size: 14px;';
  uploadDiv.appendChild(dropText);

  return uploadDiv;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function uploadFiles(files, targetPath, statusDiv) {
  statusDiv.innerHTML = '';
  
  // Validate files
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      statusDiv.innerHTML = `
        <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
          File too large: ${file.name}
        </div>
        <div style="font-size: 12px; color: #666;">
          Maximum file size is 100MB.
        </div>
      `;
      return;
    }
  }

  const token = getAdminToken();
  if (!token) {
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        Upload requires admin authentication
      </div>
      <div style="font-size: 12px; color: #666;">
        Please log in as admin to upload files.
      </div>
    `;
    return;
  }

  try {
    const cfg = await loadConfig();
    statusDiv.innerHTML = `
      <div style="color: #007bff; font-weight: 600; margin: 8px 0;">
        Uploading ${files.length} file${files.length > 1 ? 's' : ''}...
      </div>
    `;

    const results = [];
    for (const file of files) {
      try {
        // Build key from current breadcrumbs (navigation stack)
        const currentBreadcrumbs = stack.map(index => {
          let node = tree;
          for (let i = 0; i <= index; i++) {
            if (stack[i] !== undefined) {
              node = node.children[stack[i]];
            }
          }
          return node.name;
        });
        
        const key = keyFromBreadcrumbs(currentBreadcrumbs, file.name);
        const url = `${cfg.WORKER_BASE_URL}/upload?key=${encodeURIComponent(key)}&mkparents=true`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': file.type || 'application/octet-stream'
          },
          body: file
        });
        
        const data = await response.json();
        
        if (response.ok) {
          results.push({ success: true, file: file.name, result: data });
        } else {
          console.error('Upload failed', data);
          results.push({ success: false, file: file.name, error: data.error || 'Upload failed' });
          break; // Stop on first error as specified in requirements
        }
        
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
        results.push({ success: false, file: file.name, error: error.message });
        break; // Stop on first error
      }
    }

    // Display results
    let successCount = results.filter(r => r.success).length;
    let errorCount = results.filter(r => !r.success).length;
    
    let statusHtml = '';
    if (successCount > 0) {
      statusHtml += `
        <div style="color: #28a745; font-weight: 600; margin: 8px 0;">
          ✓ ${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully
        </div>
      `;
    }
    
    if (errorCount > 0) {
      statusHtml += `
        <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
          ✗ ${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload
        </div>
      `;
      results.filter(r => !r.success).forEach(result => {
        statusHtml += `
          <div style="font-size: 12px; color: #666; margin: 4px 0;">
            ${result.file}: ${result.error}
          </div>
        `;
      });
    }
    
    statusDiv.innerHTML = statusHtml;
    
    if (successCount > 0) {
      // Refresh file list after upload
      setTimeout(async () => {
        await refreshListing();
      }, 1000);
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        Upload failed: ${error.message}
      </div>
    `;
  }
}

// Refresh current folder listing
async function refreshListing() {
  try {
    // Clear file count cache to force refresh of counts
    clearFileCountCache();
    render(); // Re-render the current view
  } catch (error) {
    console.error('Failed to refresh listing:', error);
  }
}

// Mechanics Notes functionality
async function createMechanicsNotesSection() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'mechanic')) {
    return null;
  }

  const notesDiv = document.createElement('div');
  notesDiv.className = 'mechanics-notes-section';
  notesDiv.style.cssText = `
    margin: 16px 0;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f8f9fa;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Mechanic Notes';
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
  notesDiv.appendChild(title);

  // Create note button (admin and mechanic only)
  const createBtn = document.createElement('button');
  createBtn.textContent = '+ Create Note';
  createBtn.className = 'btn';
  createBtn.style.cssText = `
    padding: 8px 16px;
    margin: 0 8px 16px 0;
    border: 1px solid #007bff;
    background: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  `;
  createBtn.onclick = () => showCreateNoteModal();
  notesDiv.appendChild(createBtn);

  // Notes list container
  const notesList = document.createElement('div');
  notesList.className = 'notes-list';
  notesDiv.appendChild(notesList);

  // Load and display notes
  await loadMechanicsNotes(notesList);

  return notesDiv;
}

async function loadMechanicsNotes(container) {
  try {
    const cfg = await loadConfig();
    const folderKey = breadcrumbsToKey(stack.map(s => s.name));
    const machinePrefix = folderKey;

    const response = await fetch(`${cfg.WORKER_BASE_URL}/notes/list?machinePrefix=${encodeURIComponent(machinePrefix)}`);
    
    if (response.ok) {
      const data = await response.json();
      const notes = data.notes || [];
      
      if (notes.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No notes yet for this machine.</p>';
        return;
      }

      container.innerHTML = '';
      notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.style.cssText = `
          margin: 8px 0;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        `;
        
        noteItem.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">${note.title}</div>
          <div style="font-size: 12px; color: #666;">
            by ${note.author} • ${new Date(note.createdAt).toLocaleDateString()}
            ${currentUser && currentUser.role === 'admin' ? `<button onclick="deleteMechanicNote('${note.id}', '${machinePrefix}')" style="float: right; color: #dc3545; border: none; background: none; cursor: pointer; font-weight: 600;">Delete</button>` : ''}
          </div>
        `;
        
        noteItem.onclick = () => showNoteDetail(note.key);
        container.appendChild(noteItem);
      });
    } else {
      container.innerHTML = '<p style="color: #666; font-style: italic;">No notes yet for this machine.</p>';
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    container.innerHTML = '<p style="color: #dc3545;">Failed to load notes.</p>';
  }
}

function showCreateNoteModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <h3 style="margin-top: 0;">Create Mechanic Note</h3>
    <div style="margin: 16px 0;">
      <label style="display: block; margin-bottom: 4px; font-weight: 600;">Author:</label>
      <input type="text" id="noteAuthor" value="${currentUser?.username || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin: 16px 0;">
      <label style="display: block; margin-bottom: 4px; font-weight: 600;">Title:</label>
      <input type="text" id="noteTitle" placeholder="Brief description of the note" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin: 16px 0;">
      <label style="display: block; margin-bottom: 4px; font-weight: 600;">Note:</label>
      <textarea id="noteBody" placeholder="Detailed notes about maintenance, issues, procedures, etc." style="width: 100%; height: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
    </div>
    <div style="text-align: right; margin-top: 20px;">
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; margin-right: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button onclick="submitMechanicNote(this)" style="padding: 8px 16px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Create Note</button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Focus on title field
  setTimeout(() => document.getElementById('noteTitle').focus(), 100);
}

async function submitMechanicNote(button) {
  const author = document.getElementById('noteAuthor').value.trim();
  const title = document.getElementById('noteTitle').value.trim();
  const body = document.getElementById('noteBody').value.trim();

  if (!author || !title || !body) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    // TODO: Admin API key would be needed for note creation
    alert('Note creation requires admin API key. Contact system administrator.');
    
    // Close modal for now
    button.closest('[style*="position: fixed"]').remove();

  } catch (error) {
    console.error('Error creating note:', error);
    alert('Error creating note.');
  }
}

async function showNoteDetail(noteKey) {
  try {
    const noteUrl = await buildFileUrl(noteKey);
    
    const response = await fetch(noteUrl);
    if (response.ok) {
      const note = await response.json();
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
      `;

      modalContent.innerHTML = `
        <h3 style="margin-top: 0;">${note.title}</h3>
        <div style="margin-bottom: 16px; font-size: 14px; color: #666;">
          by ${note.author} • ${new Date(note.createdAt).toLocaleDateString()}
        </div>
        <div style="white-space: pre-wrap; line-height: 1.6; margin: 16px 0;">${note.body}</div>
        <div style="text-align: right; margin-top: 20px;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    }
  } catch (error) {
    console.error('Error loading note detail:', error);
    alert('Error loading note details.');
  }
}

function deleteMechanicNote(noteId, machinePrefix) {
  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }

  // TODO: Admin API key would be needed for note deletion
  alert('Note deletion requires admin API key. Contact system administrator.');
}
