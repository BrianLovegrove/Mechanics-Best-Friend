// Files UI component for Mechanic's Best Friend
import { loadConfig, CONFIG } from './config.js';
import { isAdmin, getAdminKey } from './admin.js';
import { encodeKey, r2PublicUrl, isMechanicNotesCrumbs, api, humanSize } from './utils.js';

// Create file type badge component
function createFileBadge(ext) {
  const badge = document.createElement('span');
  const baseStyle = 'display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 6px; font-size: 10px; font-weight: bold;';
  
  if (/docx?$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #1e40af; background: #dbeafe; color: #1e40af;`;
    badge.textContent = 'DOC';
  } else if (/pdf$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #dc2626; background: #fee2e2; color: #dc2626;`;
    badge.textContent = 'PDF';
  } else if (/(png|jpg|jpeg|gif|webp|svg)$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #059669; background: #dcfce7; color: #059669;`;
    badge.textContent = 'IMG';
  } else if (/(xlsx?|csv)$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #059669; background: #dcfce7; color: #059669;`;
    badge.textContent = 'XLS';
  } else if (/(pptx?)$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #ea580c; background: #fed7aa; color: #ea580c;`;
    badge.textContent = 'PPT';
  } else if (/(txt|md)$/.test(ext)) {
    badge.style.cssText = `${baseStyle} border: 1px solid #6b7280; background: #f3f4f6; color: #6b7280;`;
    badge.textContent = 'TXT';
  } else {
    badge.style.cssText = `${baseStyle} border: 1px solid #6b7280; background: #f3f4f6; color: #6b7280;`;
    badge.textContent = 'FILE';
  }
  
  return badge;
}

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

async function listFiles(prefix) {
  const r = await fetch(await api(`/files?prefix=${encodeURIComponent(prefix)}`));
  if (!r.ok) return [];
  return r.json();
}

export async function renderFilesList(prefix) {
  await loadConfig();
  const host = document.getElementById('files-list');
  if (!host) return;

  host.innerHTML = '<div class="mbf-empty">Loading…</div>';
  const items = await listFiles(prefix);
  
  // Filter out JSON files and _index.json files as required
  const files = items.filter(x => {
    if (x.kind !== 'object') return false;
    const fileName = x.key.split('/').pop().toLowerCase();
    // Hide storage files like *.json and _index.json
    if (fileName.endsWith('.json') || fileName === '_index.json') return false;
    return true;
  });
  
  const folders = items.filter(x => x.kind === 'prefix'); // if you want to show subfolders too

  if (!files.length && !folders.length) {
    host.innerHTML = '<div class="mbf-empty">No files yet in this folder.</div>';
    return;
  }

  host.innerHTML = '';
  // (Optional) render folders here first…

  // Files
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'mbf-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #ddd;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 8px;
      background: white;
      transition: all 0.2s ease;
      min-height: 72px;
    `;
    
    row.addEventListener('mouseenter', () => {
      row.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      row.style.borderColor = '#ccc';
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.boxShadow = 'none';
      row.style.borderColor = '#ddd';
    });
    
    const name = f.key.split('/').pop();
    const ext = name.toLowerCase().split('.').pop();

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1;';
    
    // Use new file badge instead of emoji icons
    const fileBadge = createFileBadge(ext);
    
    const fileInfoDiv = document.createElement('div');
    fileInfoDiv.style.cssText = 'flex: 1;';
    
    const nameDiv = document.createElement('div');
    nameDiv.textContent = name;
    nameDiv.style.cssText = 'font-weight: 500; color: #333; font-size: 16px; margin-bottom: 2px;';
    nameDiv.title = f.key;
    
    const sizeDiv = document.createElement('div');
    sizeDiv.textContent = humanSize(f.size);
    sizeDiv.style.cssText = 'font-size: 12px; color: #666;';
    
    fileInfoDiv.appendChild(nameDiv);
    fileInfoDiv.appendChild(sizeDiv);
    
    contentDiv.appendChild(fileBadge);
    contentDiv.appendChild(fileInfoDiv);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    // View button
    const viewBtn = document.createElement('button');
    viewBtn.innerHTML = 'View';
    viewBtn.style.cssText = `
      border: 1px solid #ddd;
      background: white;
      color: #333;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    `;
    viewBtn.addEventListener('mouseenter', () => {
      viewBtn.style.background = '#f8f9fa';
    });
    viewBtn.addEventListener('mouseleave', () => {
      viewBtn.style.background = 'white';
    });
    
    // Regular file viewing (removed isNoteFile check since we filtered out JSON files)
    viewBtn.onclick = () => window.open(viewerUrlFor(f.key, f.contentType || ''), '_blank');
    
    // Download button
    const dlBtn = document.createElement('button');
    dlBtn.innerHTML = 'Download';
    dlBtn.style.cssText = `
      border: 1px solid #ddd;
      background: white;
      color: #333;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    `;
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

    // Delete button (only for admin)
    if (isAdmin()) {
      const del = document.createElement('button');
      del.innerHTML = 'Delete';
      del.style.cssText = `
        border: 1px solid #dc3545;
        background: #fff5f5;
        color: #dc3545;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
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
    host.appendChild(row);
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
  btn.textContent = 'Upload';
  btn.className = 'btn';
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