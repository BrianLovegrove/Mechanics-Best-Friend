// Files UI component for Mechanic's Best Friend
import { loadConfig, CONFIG } from './config.js';
import { isAdmin, getAdminKey } from './admin.js';
import { encodeKey, fileUrlFromKey, api } from './utils.js';

function viewerUrlFor(key, contentType = '') {
  const url = fileUrlFromKey(key);
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
  const files = items.filter(x => x.kind === 'object');
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
    const name = f.key.split('/').pop();

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.onclick = () => window.open(viewerUrlFor(f.key, f.contentType || ''), '_blank');

    const dlBtn = document.createElement('a');
    dlBtn.textContent = 'Download';
    dlBtn.href = fileUrlFromKey(f.key);
    dlBtn.download = name;
    dlBtn.role = 'button';

    row.innerHTML = `<div title="${f.key}">${name}</div>`;
    row.appendChild(viewBtn);
    row.appendChild(dlBtn);

    if (isAdmin()) {
      const del = document.createElement('button');
      del.textContent = 'Delete';
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
      row.appendChild(del);
    }

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