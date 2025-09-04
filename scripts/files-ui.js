// Files UI component for Mechanic's Best Friend
import { loadConfig, CONFIG } from './config.js';
import { isAdmin, getAdminKey } from './admin.js';
import { encodeKey, r2PublicUrl, isMechanicNotesCrumbs, api } from './utils.js';
import { iconFor, createIconElement, humanSize, UPLOAD_ICON, DOWNLOAD_ICON, iconForNote } from './icons.js';





function viewerUrlFor(key, contentType = '') {
  const url = r2PublicUrl(key);
  const lower = key.toLowerCase();
  
  // Office documents
  if (lower.endsWith('.doc') || lower.endsWith('.docx')
   || lower.endsWith('.ppt') || lower.endsWith('.pptx')
   || lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }
  
  // PDF (open directly - avoid relative path issues on GitHub Pages)
  if (lower.endsWith('.pdf')) {
    return url; // Open the R2 URL directly
  }
  
  // CAD files (dwg, dxf, dwf) - return direct URL for download
  if (lower.endsWith('.dwg') || lower.endsWith('.dxf') || lower.endsWith('.dwf')) {
    return url; // Direct URL for CAD files
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

async function listFiles(prefix) {
  const r = await fetch(await api(`/files?prefix=${encodeURIComponent(prefix)}`));
  if (!r.ok) return [];
  return r.json();
}

// Calculate total files and size
function calculateTotals(files) {
  const count = files.length;
  let totalBytes = 0;
  
  for (const file of files) {
    if (file.size && typeof file.size === 'number') {
      totalBytes += file.size;
    }
  }
  
  // Convert bytes to human readable format
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  return {
    count,
    size: formatSize(totalBytes)
  };
}

// Render the total files info badge
function renderTotalFilesInfo(files, isNotesPage = false) {
  const infoEl = document.getElementById('total-files-info');
  if (!infoEl) return;
  
  infoEl.style.display = 'flex';
  
  const totals = calculateTotals(files);
  const label = isNotesPage ? 'Total Notes In This Folder' : 'Total Files In This Folder';
  
  infoEl.innerHTML = `${label}: ${totals.count}, ${totals.size}`;
}

// Show loading state for total files info
function showTotalFilesLoading(isNotesPage = false) {
  const infoEl = document.getElementById('total-files-info');
  if (!infoEl) return;
  
  infoEl.style.display = 'flex';
  const label = isNotesPage ? 'Total Notes In This Folder' : 'Total Files In This Folder';
  
  infoEl.innerHTML = `
    <span>${label}: —, —</span>
    <div class="loading-spinner"></div>
  `;
}

export async function renderFilesList(prefix) {
  await loadConfig();
  
  // Show loading state for total files info
  showTotalFilesLoading();
  
  // Get the containers from new layout
  const searchContainer = document.getElementById('search-container');
  const filesHost = document.getElementById('files-list');
  
  if (!filesHost) return;

  filesHost.innerHTML = '<div class="mbf-empty">Loading…</div>';
  
  try {
    const items = await listFiles(prefix);
    const files = items.filter(x => x.kind === 'object');
    
    // Update total files info
    renderTotalFilesInfo(files);

    // Setup search container
    if (searchContainer) {
      searchContainer.innerHTML = '';
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search files by name or keywords...';
      searchInput.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-size: 16px;
        background: white;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      `;
      
      searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = '#3b82f6';
      });
      
      searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = '#e1e5e9';
      });
      
      searchContainer.appendChild(searchInput);
    }

    if (!files.length) {
      filesHost.innerHTML = '<div class="mbf-empty">No files yet in this folder.</div>';
      return;
    }
    
    // Add search bar above file list
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      margin-bottom: 20px;
      padding: 0;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search files by name or keywords...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      background: white;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    `;
    
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#3b82f6';
    });
    
    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#e1e5e9';
    });
    
    searchContainer.appendChild(searchInput);
    host.appendChild(searchContainer);
    
    // Container for file list
    const fileListContainer = document.createElement('div');
    fileListContainer.id = 'file-list-container';
    host.appendChild(fileListContainer);
    
    // Function to render files with optional filter
    const renderFiles = (filesToRender = files) => {
      fileListContainer.innerHTML = '';
      
      if (!filesToRender.length) {
        fileListContainer.innerHTML = '<div class="mbf-empty">No files match your search.</div>';
        return;
      }
      
      // Files
      for (const f of filesToRender) {
    const row = document.createElement('div');
    row.className = 'mbf-row';
    row.style.cssText = `
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border: 1px solid #ddd;
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 16px;
      background: white;
      transition: all 0.2s ease;
      min-height: 80px;
    `;
    
    row.addEventListener('mouseenter', () => {
      row.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      row.style.borderColor = '#ccc';
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.boxShadow = 'none';
      row.style.borderColor = '#ddd';
    });
    
    const name = f.key.split('/').pop();
    const ext = (name.split('.').pop() || '').toLowerCase();
    const size = humanSize(f.size);
    const isNoteFile = f.key.toLowerCase().endsWith('.json') && f.key.includes('/mechanic_notes/');

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 16px; flex: 1; max-width: calc(100% - 120px);';
    
    // File icon using real icons (no emojis)
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
    
    const iconImg = createIconElement(isNoteFile ? iconForNote() : iconFor(name), name, 32);
    iconDiv.appendChild(iconImg);
    
    const fileInfoDiv = document.createElement('div');
    fileInfoDiv.style.cssText = 'flex: 1;';
    
    const nameDiv = document.createElement('div');
    nameDiv.textContent = name;
    nameDiv.style.cssText = 'font-weight: 600; color: #333; font-size: 16px; margin-bottom: 4px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;';
    nameDiv.title = f.key;
    
    const sizeDiv = document.createElement('div');
    if (size) {
      sizeDiv.textContent = size;
      sizeDiv.style.cssText = 'font-size: 12px; color: #666;';
    }
    
    fileInfoDiv.appendChild(nameDiv);
    if (size) fileInfoDiv.appendChild(sizeDiv);
    
    contentDiv.appendChild(iconDiv);
    contentDiv.appendChild(fileInfoDiv);
    
    const actionsDiv = document.createElement('div');
    // For admin users, stack download and delete buttons vertically to prevent overflow
    if (isAdmin()) {
      actionsDiv.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 100px; flex-shrink: 0;';
    } else {
      actionsDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; flex-shrink: 0;';
    }
    
    // View button - bigger and no emoji
    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    // Adjust button size for admin users to fit in vertical layout
    if (isAdmin()) {
      viewBtn.style.cssText = `
        border: 1px solid #ddd;
        background: white;
        color: #333;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 65px;
        width: 100%;
      `;
    } else {
      viewBtn.style.cssText = `
        border: 1px solid #ddd;
        background: white;
        color: #333;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 70px;
      `;
    }
    viewBtn.addEventListener('mouseenter', () => {
      viewBtn.style.background = '#f8f9fa';
    });
    viewBtn.addEventListener('mouseleave', () => {
      viewBtn.style.background = 'white';
    });
    
    if (isNoteFile) {
      // Special handling for mechanic notes - open in internal reader
      viewBtn.onclick = () => handleNoteView(f.key);
    } else {
      // Check if this is a CAD file that should use the internal CAD viewer
      const fileName = f.key.split('/').pop() || '';
      const fileExt = (fileName.split('.').pop() || '').toLowerCase();
      const isCADFile = ['dwg', 'dxf', 'dwf'].includes(fileExt);
      
      if (isCADFile) {
        // Use internal CAD viewer via openFile function
        viewBtn.onclick = () => {
          const fileUrl = r2PublicUrl(f.key);
          if (typeof openFile === 'function') {
            openFile(fileUrl, fileName, false);
          } else {
            // Fallback to direct URL if openFile is not available
            window.open(viewerUrlFor(f.key, f.contentType || ''), '_blank');
          }
        };
      } else {
        // Regular file viewing
        viewBtn.onclick = () => window.open(viewerUrlFor(f.key, f.contentType || ''), '_blank');
      }
    }
    
    // Download button - bigger and with icon
    const dlBtn = document.createElement('button');
    // Adjust button size for admin users to fit in vertical layout
    if (isAdmin()) {
      dlBtn.style.cssText = `
        border: 1px solid #ddd;
        background: white;
        color: #333;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
      `;
    } else {
      dlBtn.style.cssText = `
        border: 1px solid #ddd;
        background: white;
        color: #333;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 90px;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
    }
    
    // Add download icon
    const downloadIcon = createIconElement(DOWNLOAD_ICON, 'Download', isAdmin() ? 14 : 16);
    dlBtn.appendChild(downloadIcon);
    
    const downloadText = document.createElement('span');
    downloadText.textContent = 'Download';
    dlBtn.appendChild(downloadText);
    dlBtn.addEventListener('mouseenter', () => {
      dlBtn.style.background = '#f8f9fa';
    });
    dlBtn.addEventListener('mouseleave', () => {
      dlBtn.style.background = 'white';
    });
    dlBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = r2PublicUrl(f.key);
      a.download = f.originalFileName || name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    actionsDiv.appendChild(viewBtn);
    actionsDiv.appendChild(dlBtn);

    // Delete button (only for admin) - smaller and fits in vertical layout
    if (isAdmin()) {
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.style.cssText = `
        border: 1px solid #dc3545;
        background: #fff5f5;
        color: #dc3545;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 65px;
        width: 100%;
      `;
      del.addEventListener('mouseenter', () => {
        del.style.background = '#dc3545';
        del.style.color = 'white';
      });
      del.addEventListener('mouseleave', () => {
        del.style.background = '#fff5f5';
        del.style.color = '#dc3545';
      });
      del.onclick = async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        const r = await fetch(await api(`/object?key=${encodeURIComponent(f.key)}`), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getAdminKey()}` }
        });
        const j = await r.json();
        if (!r.ok) { alert(j.error || 'Delete failed'); return; }
        await renderFilesList(prefix);
      };
      actionsDiv.appendChild(del);
    }
    
    row.appendChild(contentDiv);
    row.appendChild(actionsDiv);
    fileListContainer.appendChild(row);
  }
  };
  
  // Initial render with all files
  renderFiles();
  
  // Add search functionality
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      // Show all files if search is empty
      renderFiles(files);
      return;
    }
    
    // Filter files based on search term
    const filteredFiles = files.filter(f => {
      const fileName = f.key.split('/').pop().toLowerCase();
      return fileName.includes(searchTerm);
    });
    
    renderFiles(filteredFiles);
  });
    
  } catch (error) {
    console.error('Error rendering files list:', error);
    
    // Even on error, show search bar for better UX
    host.innerHTML = '';
    
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      margin-bottom: 20px;
      padding: 0;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search files by name or keywords...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      background: white;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    `;
    
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#3b82f6';
    });
    
    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#e1e5e9';
    });
    
    searchContainer.appendChild(searchInput);
    host.appendChild(searchContainer);
    
    const fileListContainer = document.createElement('div');
    fileListContainer.innerHTML = '<div class="mbf-empty">No files yet in this folder.</div>';
    host.appendChild(fileListContainer);
  }
}

// Admin-only Upload functionality
export async function renderFolderToolbar(prefix) {
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
    padding: 12px 18px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: var(--shadow);
  `;
  
  // Add upload icon
  const uploadIcon = createIconElement(UPLOAD_ICON, 'Upload', 16);
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
      const res = await fetch(await api(`/upload?key=${encodeURIComponent(key)}&mkparents=true`), {
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
    await renderFilesList(prefix);       // refresh list after upload
  };

  el.appendChild(btn);
  el.appendChild(input);
}