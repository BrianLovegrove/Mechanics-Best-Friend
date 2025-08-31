// Mechanic's Best Friend - full login gate + auto file listing
const OWNER='BrianLovegrove';
const REPO='Refresco-Tempe';
const BRANCH='main';

// User session state
let currentUser = null;

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
  
  // Simple "Thinking..." for 1 second
  await showLoadingPhase('Thinking', 1000);
  
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
    
    // Add upload controls for admin users
    if (currentUser && currentUser.role === 'admin') {
      const uploadSection = createUploadSection(repoPath);
      $c.appendChild(uploadSection);
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
  viewBtn.textContent = '👁️ View File';
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
  viewBtn.onclick = () => viewFile(url, name);
  
  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = '⬇️ Download File';
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

function viewFile(url, name) {
  openFile(url, name);
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

function openFile(url, name){
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
        } else if(['txt','log','json','md','csv','ini','cfg'].includes(ext)){
          // Extract text content from data URL
          const base64Data = file.data.split(',')[1];
          const text = atob(base64Data);
          const pre=document.createElement('pre'); pre.textContent=text; pre.style.whiteSpace='pre-wrap'; pre.style.wordBreak='break-word'; $c.appendChild(pre);
        } else if(ext==='pdf'){
          const emb=document.createElement('embed'); emb.type='application/pdf'; emb.src=file.data; emb.style.width='100%'; emb.style.height='80vh'; $c.appendChild(emb);
        } else if(['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)){
          const iframe=document.createElement('iframe'); iframe.src='https://docs.google.com/gview?embedded=1&url='+encodeURIComponent(file.data); iframe.style.width='100%'; iframe.style.height='80vh'; iframe.loading='lazy'; $c.appendChild(iframe);
        } else {
          // Check for unsupported file types (PLC programs, etc.)
          if(['plc','rslogix','l5x','l5k','acd','rss','s7p','awl','scl','fbd','ladder'].includes(ext) || 
             name.toLowerCase().includes('plc') || 
             name.toLowerCase().includes('hmi') ||
             name.toLowerCase().includes('scada')) {
            const p=document.createElement('p'); 
            p.textContent='⚠️ File type not supported for preview. This appears to be a PLC program or specialized industrial file. Please download and use with the appropriate software (RSLogix, TIA Portal, etc.).'; 
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
  } else if(['txt','log','json','md','csv','ini','cfg'].includes(ext)){
    fetch(url).then(r=>r.text()).then(t=>{ const pre=document.createElement('pre'); pre.textContent=t; pre.style.whiteSpace='pre-wrap'; pre.style.wordBreak='break-word'; $c.appendChild(pre); });
  } else if(['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)){
    // Check if this is a local server file or localStorage file
    if (url.startsWith('/uploads/') || 
        url.startsWith('http://localhost') || 
        url.startsWith('#fallback-upload-') ||
        url.startsWith('#large-file-') ||
        isLocalStorage) {
      // For local files, offer download instead of Google Docs viewer since it won't work with localhost URLs
      const warning = document.createElement('div');
      warning.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404; margin: 16px 0;';
      warning.innerHTML = `
        <strong>📄 Office Document Preview</strong><br>
        Preview is not available for locally stored Office documents. Please download the file to view it in Microsoft Office, LibreOffice, or another compatible application.
      `;
      $c.appendChild(warning);
      
      const downloadBtn = document.createElement('a');
      downloadBtn.href = url;
      downloadBtn.download = name;
      downloadBtn.textContent = `📥 Download ${name}`;
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
      // For GitHub-hosted files, try Google Docs viewer
      const iframe=document.createElement('iframe'); 
      iframe.src='https://docs.google.com/gview?embedded=1&url='+encodeURIComponent(url); 
      iframe.style.width='100%'; 
      iframe.style.height='80vh'; 
      iframe.loading='lazy';
      
      // Add better error handling for Google Docs viewer
      let errorShown = false;
      
      const showPreviewError = () => {
        if (errorShown) return;
        errorShown = true;
        
        iframe.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 16px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; margin: 16px 0;';
        errorDiv.innerHTML = `
          <strong>❌ Preview Failed</strong><br>
          Unable to preview this document. This may happen due to:
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>File is not publicly accessible</li>
            <li>File format is not supported by Google Docs viewer</li>
            <li>Network connectivity issues</li>
            <li>CORS restrictions</li>
          </ul>
          Please download the file to view it locally.
        `;
        $c.appendChild(errorDiv);
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = url;
        downloadBtn.download = name;
        downloadBtn.textContent = `📥 Download ${name}`;
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
        $c.appendChild(downloadBtn);
      };
      
      iframe.onerror = showPreviewError;
      
      // Also add a timeout for cases where the iframe loads but shows an error page
      setTimeout(() => {
        try {
          // Check if iframe loaded successfully
          if (iframe.contentDocument || iframe.contentWindow) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.body && iframeDoc.body.innerText.includes('Sorry')) {
              showPreviewError();
            }
          }
        } catch (e) {
          // Cross-origin restrictions prevent access, assume it's loading
        }
      }, 5000); // 5 second check
      
      $c.appendChild(iframe);
    }
  } else {
    // Check for unsupported file types (PLC programs, etc.)
    if(['plc','rslogix','l5x','l5k','acd','rss','s7p','awl','scl','fbd','ladder'].includes(ext) || 
       name.toLowerCase().includes('plc') || 
       name.toLowerCase().includes('hmi') ||
       name.toLowerCase().includes('scada')) {
      const p=document.createElement('p'); 
      p.textContent='⚠️ File type not supported for preview. This appears to be a PLC program or specialized industrial file. Please download and use with the appropriate software (RSLogix, TIA Portal, etc.).'; 
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
  
  const formData = new FormData();
  formData.append('targetPath', targetPath);
  
  for (const file of files) {
    formData.append('files', file);
  }

  // Show progress
  statusDiv.innerHTML = `
    <div style="margin: 8px 0;">
      <div style="color: #000; font-weight: 600;">Uploading ${files.length} file${files.length > 1 ? 's' : ''}...</div>
      <div style="margin: 8px 0; background: #e0e0e0; border-radius: 4px; height: 6px; overflow: hidden;">
        <div style="background: #000; height: 100%; width: 0%; transition: width 0.3s ease;" class="progress-bar"></div>
      </div>
    </div>
  `;

  const progressBar = statusDiv.querySelector('.progress-bar');
  
  // Simulate progress (since we can't track real upload progress easily)
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress > 90) progress = 90;
    progressBar.style.width = progress + '%';
  }, 200);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    clearInterval(progressInterval);
    progressBar.style.width = '100%';

    const result = await response.json();

    if (response.ok) {
      let message = `<div style="color: #008000; font-weight: 600; margin: 8px 0;">✅ Upload successful!</div>`;
      
      if (result.committed && result.committed.length > 0) {
        message += '<div style="margin: 8px 0;"><strong>Uploaded files:</strong></div>';
        result.committed.forEach(file => {
          message += `
            <div style="margin: 4px 0; padding: 8px; background: #f0f8f0; border-radius: 4px; font-size: 13px;">
              • ${file.filename}
              <br><a href="${file.html_url}" target="_blank" style="color: #0066cc; text-decoration: none;">View in GitHub</a>
            </div>
          `;
        });
      }

      if (result.errors && result.errors.length > 0) {
        message += '<div style="margin: 8px 0;"><strong>Errors:</strong></div>';
        result.errors.forEach(error => {
          message += `
            <div style="margin: 4px 0; padding: 8px; background: #fff0f0; border-radius: 4px; font-size: 13px; color: #cc0000;">
              • ${error.filename}: ${error.error}
            </div>
          `;
        });
      }

      statusDiv.innerHTML = message;

      // Refresh the file list
      setTimeout(() => {
        render();
      }, 1000);
      
    } else {
      statusDiv.innerHTML = `
        <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
          ❌ Upload failed: ${result.error}
        </div>
        ${result.details ? `<div style="font-size: 12px; color: #666;">${result.details}</div>` : ''}
      `;
    }
  } catch (error) {
    clearInterval(progressInterval);
    console.error('Upload error:', error);
    statusDiv.innerHTML = `
      <div style="color: #cc0000; font-weight: 600; margin: 8px 0;">
        ❌ Upload failed: ${error.message}
      </div>
      <div style="font-size: 12px; color: #666;">
        Check your connection and try again. For large files, ensure they are under 50MB.
      </div>
    `;
  }
}
