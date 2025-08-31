// Mechanic's Best Friend - full login gate + auto file listing
const OWNER='BrianLovegrove';
const REPO='Mechanics-Best-Friend';
const BRANCH='Base';

// User session state
let currentUser = null;

// GitHub API token management
let githubToken = null;
let githubUserInfo = null;

let tree=null;
const stack=[];
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

// GitHub token management functions
function getGitHubToken() {
  if (!githubToken) {
    githubToken = localStorage.getItem('mbf.githubToken');
  }
  return githubToken;
}

function setGitHubToken(token) {
  githubToken = token;
  if (token) {
    localStorage.setItem('mbf.githubToken', token);
  } else {
    localStorage.removeItem('mbf.githubToken');
    githubUserInfo = null;
  }
}

async function validateGitHubToken(token) {
  try {
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    
    if (response.ok) {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      
      if (userResponse.ok) {
        githubUserInfo = await userResponse.json();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('GitHub token validation failed:', error);
    return false;
  }
}

function isGitHubConnected() {
  return !!(getGitHubToken() && githubUserInfo);
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
  title.textContent = '⚙️ Admin Settings';
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: #333;';
  panel.appendChild(title);

  // GitHub connection status
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = 'margin-bottom: 16px;';
  updateGitHubStatus(statusDiv);
  panel.appendChild(statusDiv);

  // Token input (only show if not connected)
  if (!isGitHubConnected()) {
    const tokenSection = document.createElement('div');
    tokenSection.style.cssText = 'margin-bottom: 16px;';

    const tokenLabel = document.createElement('label');
    tokenLabel.textContent = 'GitHub Personal Access Token:';
    tokenLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 600;';
    tokenSection.appendChild(tokenLabel);

    const tokenInput = document.createElement('input');
    tokenInput.type = 'password';
    tokenInput.placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
    tokenInput.style.cssText = `
      width: 300px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
      margin-right: 8px;
    `;
    tokenSection.appendChild(tokenInput);

    const connectBtn = document.createElement('button');
    connectBtn.textContent = 'Connect';
    connectBtn.className = 'btn';
    connectBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    `;
    connectBtn.onclick = () => connectGitHub(tokenInput.value, statusDiv);
    tokenSection.appendChild(connectBtn);

    const helpText = document.createElement('div');
    helpText.innerHTML = `
      <small style="color: #666;">
        Create a fine-grained personal access token at 
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank">GitHub Settings</a>
        with Contents: write permission for this repository.
      </small>
    `;
    helpText.style.cssText = 'margin-top: 8px;';
    tokenSection.appendChild(helpText);

    panel.appendChild(tokenSection);
  } else {
    // Sign out button
    const signOutBtn = document.createElement('button');
    signOutBtn.textContent = 'Sign Out';
    signOutBtn.className = 'btn';
    signOutBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #dc3545;
      background: #dc3545;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    `;
    signOutBtn.onclick = () => {
      setGitHubToken(null);
      render(); // Refresh the panel
    };
    panel.appendChild(signOutBtn);
  }

  return panel;
}

function updateGitHubStatus(statusDiv) {
  if (isGitHubConnected()) {
    statusDiv.innerHTML = `
      <div style="color: #28a745; font-weight: 600;">
        Connected to GitHub as <strong>${githubUserInfo.login}</strong>
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">
        Repository: ${OWNER}/${REPO} • Branch: ${BRANCH}
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div style="color: #dc3545; font-weight: 600;">
        Not connected to GitHub
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">
        Configure your Personal Access Token to enable file uploads
      </div>
    `;
  }
}

async function connectGitHub(token, statusDiv) {
  if (!token) {
    alert('Please enter a GitHub Personal Access Token');
    return;
  }

  statusDiv.innerHTML = '<div style="color: #007bff;">🔄 Validating token...</div>';

  const isValid = await validateGitHubToken(token);
  if (isValid) {
    setGitHubToken(token);
    render(); // Refresh the entire UI
  } else {
    statusDiv.innerHTML = `
      <div style="color: #dc3545; font-weight: 600;">
        Invalid token or insufficient permissions
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">
        Make sure the token has Contents: write permission for ${OWNER}/${REPO}
      </div>
    `;
  }
}

// Authentication functions
async function checkAuth() {
  try {
    const response = await fetch('/auth/me');
    if (response.ok) {
      currentUser = await response.json();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
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
  
  // Simple "Thinking..." for 3 seconds
  await showLoadingPhase('Thinking', 3000);
  
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
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      currentUser = result.user;
      showLoadingAnimation();
    } else {
      $err.textContent = result.error || 'Login failed';
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
  // Initialize GitHub token if available
  const token = getGitHubToken();
  if (token && currentUser && currentUser.role === 'admin') {
    await validateGitHubToken(token);
  }

  try{
    const res=await fetch('data/tree.json?v='+(Date.now()%1e7));
    if(!res.ok) throw new Error('tree.json missing');
    tree=await res.json(); render();
  }catch(e){ console.error(e); $c.innerHTML='<p class="empty">Failed to load folder tree (data/tree.json).</p>'; }
}
function current(){ let n=tree; for(const i of stack){ n=(n.children||[])[i]; } return n; }
function pathBreadcrumbs(){ const names=[]; let n=tree; stack.forEach(i=>{ n=n.children[i]; names.push(n.name); }); return names; }
function slugify(label){ return label.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,''); }
function nodeRepoPath(){ 
  const names=pathBreadcrumbs(); 
  if(names.length===0) return null; 
  const slugs=names.map(slugify); 
  return '/library/'+slugs.join('/')+'/'; 
}

function render(){
  renderBack(); renderCrumbs();
  const n=current(); $c.innerHTML='';

  // Admin settings panel (only at root level for admin users)
  if (currentUser && currentUser.role === 'admin' && stack.length === 0) {
    const adminPanel = createAdminSettingsPanel();
    $c.appendChild(adminPanel);
  }

  if(n.children && n.children.length){
    const list=document.createElement('div'); list.className='list';
    n.children.forEach((ch,i)=>{ 
      const b=document.createElement('button'); 
      b.className='item'; 
      // Add item count if this item has children
      if(ch.children && ch.children.length) {
        b.innerHTML = `${ch.name} <span style="font-size:0.8em;color:#666;margin-left:8px;">| ${ch.children.length} items</span>`;
      } else {
        b.textContent = ch.name;
      }
      b.onclick=()=>{ stack.push(i); render(); }; 
      list.appendChild(b); 
    });
    $c.appendChild(list);
  }

  const repoPath=nodeRepoPath();
  if(repoPath && !(n.children && n.children.length)){
    const title=document.createElement('div'); title.className='sectionTitle'; title.textContent='Files'; $c.appendChild(title);
    
    // Add upload controls for admin users with GitHub token
    if (currentUser && currentUser.role === 'admin' && isGitHubConnected()) {
      const uploadSection = createUploadSection(repoPath);
      $c.appendChild(uploadSection);
    } else if (currentUser && currentUser.role === 'admin' && !isGitHubConnected()) {
      const noTokenMsg = document.createElement('div');
      noTokenMsg.style.cssText = `
        margin: 16px 0;
        padding: 16px;
        border: 1px solid #ffc107;
        border-radius: 4px;
        background: #fff3cd;
        color: #856404;
      `;
      noTokenMsg.innerHTML = `
        <strong>Upload Disabled</strong><br>
        Configure your GitHub Personal Access Token in Admin Settings to enable file uploads.
      `;
      $c.appendChild(noTokenMsg);
    }
    
    const list=document.createElement('div'); list.className='list'; $c.appendChild(list);
    listFiles(repoPath).then(items=>{
      if(!items.length){ 
        const p=document.createElement('p'); 
        p.className='empty'; 
        p.textContent = currentUser && currentUser.role === 'admin' 
          ? 'No files yet. Use the upload button above to add files.' 
          : 'No files yet. Contact administrator to upload files to '+repoPath;
        $c.appendChild(p); 
        return; 
      }
      items.forEach(it=>{ 
        if(it.type==='file'){ 
          const a=document.createElement('a'); 
          a.className='item'; 
          a.href='#'; 
          a.onclick=(e)=>{ 
            e.preventDefault(); 
            const url = it.isLocalStorage ? `#fallback-upload-${it.name}` : 
                        it.storage === 'local' ? it.download_url : 
                        rawUrl(repoPath+it.name);
            const isLocal = it.isLocalStorage || it.storage === 'local';
            showFileActions(url, it.name, isLocal); 
          }; 
          a.textContent=prettyName(it.name); 
          list.appendChild(a); 
        } 
      });
    }).catch(err=>{ const p=document.createElement('p'); p.className='empty'; p.textContent='Folder not found yet: '+repoPath; $c.appendChild(p); console.error(err); });
  }
}
function renderCrumbs(){ const parts=['<a href="#" data-i="-1">Home</a>']; let n=tree;
  stack.forEach((idx,d)=>{ n=n.children[idx]; if(d<stack.length-1) parts.push(`<a href="#" data-i="${d}">${n.name}</a>`); else parts.push(`<span>${n.name}</span>`); });
  $bc.innerHTML=parts.join(' / ');
  $bc.querySelectorAll('a[data-i]').forEach(a=>{ a.onclick=e=>{ e.preventDefault(); const i=parseInt(a.getAttribute('data-i'),10); if(i===-1) stack.length=0; else stack.length=i+1; render(); }; });
}
function renderBack(){ if(stack.length===0){ $back.style.display='none'; return; } $back.style.display='inline-block'; $back.onclick=()=>{ stack.pop(); render(); }; }

function apiUrl(path){ const clean=path.replace(/^\/+|\/+$/g,''); return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(clean)}?ref=${encodeURIComponent(BRANCH)}`; }
function rawUrl(path){ 
  const clean=path.replace(/^\/+/, ''); 
  // For local development, try local path first
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return clean; // Use relative path for local files
  }
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${encodeURIComponent(BRANCH)}/${clean}`; 
}
async function listFiles(path){ 
  try {
    // Try GitHub API first
    const res=await fetch(apiUrl(path), { headers:{ 'Accept':'application/vnd.github+json' } }); 
    if(!res.ok) throw new Error('GitHub API '+res.status); 
    const items=await res.json(); 
    return Array.isArray(items)?items:[];
  } catch (error) {
    console.log('GitHub API failed, trying server local storage...');
    
    // Try server local storage next
    try {
      const serverRes = await fetch(`/api/files${path}`);
      if (serverRes.ok) {
        const serverFiles = await serverRes.json();
        if (serverFiles.length > 0) {
          console.log(`Found ${serverFiles.length} files in server storage for path: ${path}`);
          return serverFiles;
        }
      }
    } catch (serverError) {
      console.log('Server storage check failed:', serverError);
    }
    
    // Check localStorage for uploaded files in fallback mode
    const storageKey = `mbf_files_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let storedFiles = [];
    try {
      storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (storedFiles.length > 0) {
        console.log(`Found ${storedFiles.length} stored files for path: ${path}`);
        return storedFiles.map(file => ({
          name: file.filename,
          type: 'file',
          size: file.size,
          uploadDate: file.uploadDate,
          isLocalStorage: true // Flag to indicate this is stored in localStorage
        }));
      }
    } catch (e) {
      console.error('Error reading stored files:', e);
    }

    // Fallback to check for known files when GitHub API fails and no stored files
    const knownFiles = [
      'sample_schematic.txt',
      'fault_codes_reference.txt',
      'manual.pdf',
      'troubleshooting_guide.txt',
      'procedures.txt',
      'adjustment_guide.txt',
      'pm_schedule.txt',
      'maintenance_log.txt',
      'wiring_diagram.pdf',
      'parts_list.txt'
    ];
    
    const foundFiles = [];
    for (const file of knownFiles) {
      try {
        const fileRes = await fetch(path + file, { method: 'HEAD' });
        if (fileRes.ok) {
          foundFiles.push({ name: file, type: 'file' });
        }
      } catch (e) {
        // File doesn't exist, continue silently
      }
    }
    
    return foundFiles;
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
    deleteBtn.textContent = '🗑️ Delete File';
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
  
  if (isLocalStorage) {
    // Handle localStorage file deletion
    const currentPath = nodeRepoPath();
    const storageKey = `mbf_files_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      const storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filteredFiles = storedFiles.filter(f => f.filename !== name);
      localStorage.setItem(storageKey, JSON.stringify(filteredFiles));
      
      alert(`File "${name}" has been deleted.`);
      render(); // Refresh the file list
      return;
    } catch (e) {
      console.error('Error deleting stored file:', e);
      alert('Error deleting file.');
      return;
    }
  }
  
  // For GitHub files, we would need to implement GitHub API deletion
  // For now, just show a message
  alert('GitHub file deletion will be implemented when server mode is available.');
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
          // For locally stored Office documents, Google Docs viewer cannot access data URLs
          // Provide download option with explanation
          const warning = document.createElement('div');
          warning.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404; margin: 16px 0;';
          warning.innerHTML = `
            <strong>Office Document Preview</strong><br>
            Preview is not available for locally stored Office documents. Google Docs viewer cannot access files stored in your browser's local storage. Please download the file to view it in Microsoft Office, LibreOffice, or another compatible application.
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
    console.log('Opening Word document:', name, 'URL:', url);
    
    // Check if this is a local server file or localStorage file
    if (url.startsWith('/uploads/') || 
        url.startsWith('http://localhost') || 
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('file://') ||
        url.startsWith('data:') ||
        url.startsWith('#fallback-upload-') ||
        url.startsWith('#large-file-') ||
        isLocalStorage ||
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      // For local files, offer download instead of Google Docs viewer since it won't work with localhost URLs
      const warning = document.createElement('div');
      warning.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404; margin: 16px 0;';
      warning.innerHTML = `
        <strong>Office Document Preview</strong><br>
        Preview is not available for locally served Office documents. Google Docs viewer cannot access local files due to security restrictions. Please download the file to view it in Microsoft Office, LibreOffice, or another compatible application.
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
      // For GitHub-hosted files, try Google Docs viewer with enhanced error handling
      console.log('Using Google Docs viewer for:', url);
      
      // Create a loading message
      const loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = 'text-align: center; padding: 20px; color: #666;';
      loadingDiv.textContent = 'Loading document preview...';
      $c.appendChild(loadingDiv);
      
      const iframe = document.createElement('iframe'); 
      iframe.src = 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(url); 
      iframe.style.cssText = 'width: 100%; height: 80vh; border: 1px solid #ddd; border-radius: 4px;';
      iframe.loading = 'lazy';
      
      // Better error handling for Google Docs viewer
      let errorShown = false;
      let loadTimeout;
      
      const showPreviewError = () => {
        if (errorShown) return;
        errorShown = true;
        
        // Remove loading message
        if (loadingDiv.parentNode) {
          loadingDiv.remove();
        }
        
        iframe.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 16px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; margin: 16px 0;';
        errorDiv.innerHTML = `
          <strong>Document Preview Unavailable</strong><br>
          Unable to preview this document. This may happen due to:
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>File is not publicly accessible</li>
            <li>File format is not supported by the preview service</li>
            <li>Network connectivity issues</li>
            <li>CORS restrictions</li>
          </ul>
          Please download the file to view it locally.
        `;
        $c.appendChild(errorDiv);
        
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
      };
      
      // Set a timeout for loading
      loadTimeout = setTimeout(() => {
        console.log('Document preview timed out');
        showPreviewError();
      }, 15000); // 15 second timeout
      
      iframe.onload = () => {
        console.log('Document preview loaded successfully');
        clearTimeout(loadTimeout);
        // Remove loading message
        if (loadingDiv.parentNode) {
          loadingDiv.remove();
        }
        
        // Check if iframe actually loaded content
        try {
          // This will fail due to CORS, but that's expected
          iframe.contentDocument;
        } catch (e) {
          // Cross-origin restrictions prevent access, assume it's loading
          console.log('Cross-origin restriction detected, assuming content loaded');
        }
      };
      
      iframe.onerror = () => {
        console.log('Document preview failed to load');
        clearTimeout(loadTimeout);
        showPreviewError();
      };
      
      $c.appendChild(iframe);
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

// Upload functionality for admin users
function createUploadSection(targetPath) {
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

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.accept = '*/*';
  uploadDiv.appendChild(fileInput);

  const uploadButton = document.createElement('button');
  uploadButton.className = 'btn';
  uploadButton.textContent = 'Choose Files';
  uploadButton.style.cssText = `
    display: inline-block;
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

  const uploadStatus = document.createElement('div');
  uploadStatus.className = 'upload-status';
  uploadStatus.style.cssText = 'margin: 16px 0; font-size: 14px;';
  uploadDiv.appendChild(uploadStatus);

  const selectedFiles = document.createElement('div');
  selectedFiles.className = 'selected-files';
  selectedFiles.style.cssText = 'margin: 12px 0; text-align: left;';
  uploadDiv.appendChild(selectedFiles);

  // File selection handling
  fileInput.onchange = () => {
    const files = Array.from(fileInput.files);
    if (files.length === 0) {
      selectedFiles.innerHTML = '';
      return;
    }

    selectedFiles.innerHTML = '<strong>Selected files:</strong><br>';
    files.forEach(file => {
      const fileDiv = document.createElement('div');
      fileDiv.style.cssText = 'margin: 4px 0; padding: 4px; font-size: 13px;';
      fileDiv.textContent = `• ${file.name} (${formatFileSize(file.size)})`;
      selectedFiles.appendChild(fileDiv);
    });

    // Show upload button
    if (uploadDiv.querySelector('.upload-submit')) {
      uploadDiv.removeChild(uploadDiv.querySelector('.upload-submit'));
    }

    const submitButton = document.createElement('button');
    submitButton.className = 'btn upload-submit';
    submitButton.textContent = `Upload ${files.length} file${files.length > 1 ? 's' : ''}`;
    submitButton.style.cssText = `
      display: inline-block;
      padding: 12px 24px;
      margin: 8px;
      border: 1px solid #000;
      border-radius: 4px;
      background: #000;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    submitButton.onclick = () => uploadFiles(files, targetPath, uploadStatus);
    uploadDiv.appendChild(submitButton);
  };

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
      fileInput.files = e.dataTransfer.files;
      fileInput.onchange();
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
  
  // Validate GitHub connection
  if (!isGitHubConnected()) {
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        GitHub connection required
      </div>
      <div style="font-size: 12px; color: #666;">
        Configure your GitHub Personal Access Token in Admin Settings
      </div>
    `;
    return;
  }

  const token = getGitHubToken();
  
  // Validate files
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      statusDiv.innerHTML = `
        <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
          File too large: ${file.name}
        </div>
        <div style="font-size: 12px; color: #666;">
          Maximum file size is 100MB. Use Git LFS for larger files.
        </div>
      `;
      return;
    }
  }

  // Sanitize target path
  const cleanPath = targetPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (cleanPath.includes('..') || cleanPath.includes('\\')) {
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        Invalid path
      </div>
      <div style="font-size: 12px; color: #666;">
        Path contains illegal characters
      </div>
    `;
    return;
  }

  // Show progress
  statusDiv.innerHTML = `
    <div style="margin: 8px 0;">
      <div style="color: #000; font-weight: 600;">Uploading ${files.length} file${files.length > 1 ? 's' : ''} to GitHub...</div>
      <div style="margin: 8px 0; background: #e0e0e0; border-radius: 4px; height: 6px; overflow: hidden;">
        <div style="background: #000; height: 100%; width: 0%; transition: width 0.3s ease;" class="progress-bar"></div>
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 4px;" class="progress-text">Preparing...</div>
    </div>
  `;

  const progressBar = statusDiv.querySelector('.progress-bar');
  const progressText = statusDiv.querySelector('.progress-text');
  
  try {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = ((i / files.length) * 100);
      progressBar.style.width = progress + '%';
      progressText.textContent = `Uploading ${file.name}...`;
      
      try {
        const result = await uploadFileToGitHub(file, cleanPath, token);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        errors.push({ filename: file.name, error: error.message });
      }
    }
    
    progressBar.style.width = '100%';
    progressText.textContent = 'Complete!';
    
    // Show results
    let message = '';
    
    if (results.length > 0) {
      message += `<div style="color: #28a745; font-weight: 600; margin: 8px 0;">Successfully uploaded ${results.length} file${results.length > 1 ? 's' : ''}!</div>`;
      message += '<div style="margin: 8px 0;"><strong>Uploaded files:</strong></div>';
      
      results.forEach(result => {
        message += `
          <div style="margin: 4px 0; padding: 8px; background: #f0f8f0; border-radius: 4px; font-size: 13px;">
            • ${result.filename}
            <br><a href="${result.html_url}" target="_blank" style="color: #0066cc; text-decoration: none;">View in GitHub</a>
            <span style="color: #666; margin-left: 8px;">| ${result.commit_sha.substring(0, 7)}</span>
          </div>
        `;
      });
    }
    
    if (errors.length > 0) {
      message += '<div style="margin: 8px 0;"><strong>Errors:</strong></div>';
      errors.forEach(error => {
        message += `
          <div style="margin: 4px 0; padding: 8px; background: #fff0f0; border-radius: 4px; font-size: 13px; color: #cc0000;">
            • ${error.filename}: ${error.error}
          </div>
        `;
      });
    }

    if (results.length === 0 && errors.length > 0) {
      message = `<div style="color: #cc0000; font-weight: 600; margin: 8px 0;">All uploads failed</div>` + message;
    }

    statusDiv.innerHTML = message;
    
    // Refresh file listing after successful uploads
    if (results.length > 0) {
      setTimeout(() => {
        render(); // Refresh the current view
      }, 1000);
    }

  } catch (error) {
    console.error('Upload error:', error);
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        Upload failed: ${error.message}
      </div>
      <div style="font-size: 12px; color: #666;">
        Check your GitHub token permissions and try again.
      </div>
    `;
  }
}

async function uploadFileToGitHub(file, targetPath, token) {
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const content = btoa(String.fromCharCode.apply(null, uint8Array));
  
  // Sanitize filename
  let filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const repoPath = `${targetPath}/${filename}`;
  
  // Check if file exists first
  let existingSha = null;
  try {
    const checkResponse = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json();
      existingSha = existingFile.sha;
      
      // If file exists, create a versioned filename
      const timestamp = Date.now();
      const nameParts = filename.split('.');
      if (nameParts.length > 1) {
        const extension = nameParts.pop();
        const basename = nameParts.join('.');
        filename = `${basename}_${timestamp}.${extension}`;
      } else {
        filename = `${filename}_${timestamp}`;
      }
    }
  } catch (error) {
    // File doesn't exist, continue with original filename
  }
  
  const finalPath = `${targetPath}/${filename}`;
  
  // Upload file
  const uploadData = {
    message: `feat(upload): ${filename} uploaded by ADMIN via app`,
    content: content,
    branch: BRANCH
  };
  
  if (existingSha) {
    uploadData.sha = existingSha;
  }
  
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${finalPath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(uploadData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GitHub API error (${response.status}): ${errorData.message || 'Upload failed'}`);
  }
  
  const result = await response.json();
  
  return {
    filename: filename,
    path: finalPath,
    html_url: result.content.html_url,
    download_url: result.content.download_url,
    commit_sha: result.commit.sha
  };
}
