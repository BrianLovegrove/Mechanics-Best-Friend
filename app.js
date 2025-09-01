// Mechanic's Best Friend - full login gate + auto file listing
const OWNER='BrianLovegrove';
const REPO='Mechanics-Best-Friend';
const BRANCH='Base';

// User session state
let currentUser = null;

// Removed GitHub token logic - static web app only

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

// Removed GitHub token management functions - static web app only

// Removed admin settings panel and GitHub token management - static web app only

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
  // Static web app - no token initialization needed
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

  // No admin settings panel needed in static mode

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
    
    // No upload controls in static mode - just show existing files
    const list=document.createElement('div'); list.className='list'; $c.appendChild(list);
    listFiles(repoPath).then(items=>{
      if(!items.length){ 
        const p=document.createElement('p'); 
        p.className='empty'; 
        p.textContent = 'No files in this folder yet.';
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

// URL helper functions that encode per segment but keep /
function encodePath(p) { 
  return p.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'); 
}

function pagesUrlFromRepoPath(repoPath) {
  return `https://brianlovegrove.github.io/Mechanics-Best-Friend/${encodePath(repoPath)}`;
}

function rawUrlFromRepoPath(repoPath) {
  // NOTE: encode the branch and the path; branch is 'Base'
  return `https://raw.githubusercontent.com/BrianLovegrove/Mechanics-Best-Friend/${encodeURIComponent('Base')}/${encodePath(repoPath)}`;
}

function apiUrl(path){ 
  const clean=path.replace(/^\/+|\/+$/g,''); 
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(clean)}?ref=${encodeURIComponent(BRANCH)}`; 
}

function rawUrl(path){ 
  const clean=path.replace(/^\/+/, ''); 
  // For local development, try local path first
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return clean; // Use relative path for local files
  }
  return rawUrlFromRepoPath(clean); 
}

// Legacy function - use pagesUrlFromRepoPath instead
function getGitHubPagesUrl(path) {
  return pagesUrlFromRepoPath(path);
}

// Always return the public GitHub raw URL for external services like Office Web Viewer
function getPublicRawUrl(path) {
  return rawUrlFromRepoPath(path);
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
  
  // Build both GitHub Pages URL and raw URL for the file
  const pagesUrl = pagesUrlFromRepoPath(url);
  const fileRawUrl = rawUrl(url);
  
  console.log(`${docType} document viewing:`, {
    originalUrl: url,
    fileName: name,
    pagesUrl: pagesUrl,
    rawUrl: fileRawUrl
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
    <a href="${pagesUrl}" download="${name}" style="
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
  
  // Try multiple viewing strategies
  await tryDocumentViewing(viewerContainer, url, name, docType, pagesUrl, fileRawUrl);
}

// Render Office documents with RAW → Pages fallback strategy
async function tryDocumentViewing(container, url, name, docType, pagesUrl, rawUrl) {
  // First try with RAW URL (usually available immediately after commit)
  const rawViewerUrl = rawUrlFromRepoPath(url);
  console.log('Trying Office Web Viewer with RAW URL:', { name, rawViewerUrl });
  
  if (await tryOfficeWebViewer(container, rawViewerUrl, name, docType)) {
    return; // Success with RAW URL!
  }
  
  // If RAW fails, try with Pages URL (may lag until Pages finishes build)
  console.log('RAW URL failed, trying Office Web Viewer with Pages URL:', { name, pagesUrl });
  
  if (await tryOfficeWebViewer(container, pagesUrl, name, docType)) {
    return; // Success with Pages URL!
  }
  
  // Only show fallback if both RAW and Pages fail
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
    }, 5000); // 5 second timeout for faster fallback
    
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
            📄 ${docType} Document
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
          📄 Office Document
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
        <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
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

// Render PDF documents with improved fallback
function renderPDFDocument(url, name, loadingDiv) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  // Build Pages URL for the PDF file
  const pdfSrc = pagesUrlFromRepoPath(url);
  
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
    <h3 style="margin: 0; color: #DC3545; font-size: 16px;">📄 ${name}</h3>
    <a href="${pdfSrc}" download="${name}" style="
      padding: 8px 16px;
      background: #DC3545;
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
  
  // Create iframe for PDF.js viewer
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%;
    height: 70vh;
    border: 1px solid #dee2e6;
    border-top: none;
    border-radius: 0 0 6px 6px;
    background: white;
  `;
  iframe.src = `/Mechanics-Best-Friend/assets/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfSrc)}`;
  
  // Add error handling for iframe
  iframe.onerror = () => {
    container.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #DC354520, #DC354510);
        border: 2px solid #DC3545;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
      ">
        <h3 style="margin: 0 0 12px 0; color: #DC3545; font-size: 24px;">PDF Document</h3>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #333; font-weight: 500;">${name}</p>
        <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">
          PDF viewer failed to load. Download the document to view with your preferred PDF reader.
        </p>
        <a href="${pdfSrc}" download="${name}" style="
          display: inline-block;
          padding: 14px 28px;
          background: #DC3545;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
        ">Download PDF</a>
      </div>
    `;
  };
  
  container.appendChild(iframe);
  $c.appendChild(container);
}

// Generic document viewer for unsupported types
function renderGenericDocument(url, name, loadingDiv, ext) {
  if (loadingDiv.parentNode) {
    loadingDiv.remove();
  }
  
  const genericInfo = document.createElement('div');
  genericInfo.style.cssText = `
    background: linear-gradient(135deg, #6c757d20, #6c757d10);
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

// Upload functionality removed - static web app only

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload functions removed for static operation
