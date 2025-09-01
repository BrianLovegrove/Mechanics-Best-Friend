// Mechanic Notes component for Mechanic's Best Friend
import { loadConfig, CONFIG } from './config.js';
import { isAdmin, getAdminKey } from './admin.js';
import { r2PublicUrl, api } from './utils.js';

async function fetchNotes(prefix) {
  const r = await fetch(await api(`/notes/list?machinePrefix=${encodeURIComponent(prefix)}`));
  return r.ok ? r.json() : { notes: [] };
}

async function createNote(prefix, author, title, body) {
  const r = await fetch(await api(`/notes/create`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machinePrefix: prefix, author, title, body })
  });
  return r.json();
}

async function deleteNote(prefix, id) {
  const r = await fetch(await api(`/notes/delete?id=${encodeURIComponent(id)}&machinePrefix=${encodeURIComponent(prefix)}`), {
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

export async function renderNotes(prefix) {
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
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      row.addEventListener('mouseenter', () => {
        row.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        row.style.borderColor = '#ccc';
      });
      
      row.addEventListener('mouseleave', () => {
        row.style.boxShadow = 'none';
        row.style.borderColor = '#ddd';
      });
      
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1;';
      
      const iconDiv = document.createElement('div');
      iconDiv.style.cssText = `
        width: 36px;
        height: 36px;
        background: #f8f9fa;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      `;
      iconDiv.textContent = '📄';
      
      const textDiv = document.createElement('div');
      textDiv.innerHTML = `
        <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${n.title}</div>
        <div style="font-size: 13px; color: #666; font-style: italic;">
          ${n.author} — ${new Date(n.createdAt).toLocaleString()}
        </div>
      `;
      
      contentDiv.appendChild(iconDiv);
      contentDiv.appendChild(textDiv);
      
      const actionsDiv = document.createElement('div');
      actionsDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      // Download button
      const downloadBtn = document.createElement('button');
      downloadBtn.innerHTML = '⬇️ Download';
      downloadBtn.style.cssText = `
        border: 1px solid #ddd;
        background: white;
        color: #333;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.background = '#f8f9fa';
      });
      downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.background = 'white';
      });
      downloadBtn.onclick = (ev) => {
        ev.stopPropagation();
        // Export note as .txt file
        const text = `Title: ${n.title || 'Untitled'}\nAuthor: ${n.author || 'Unknown'}\nDate: ${n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Unknown'}\n\n${n.body || ''}\n`;
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (n.title || 'note').replace(/\s+/g, '_') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      };
      
      actionsDiv.appendChild(downloadBtn);
      
      // Delete button (only for admin)
      if (isAdmin()) {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️ Delete';
        deleteBtn.style.cssText = `
          border: 1px solid #dc3545;
          background: #fff5f5;
          color: #dc3545;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        deleteBtn.addEventListener('mouseenter', () => {
          deleteBtn.style.background = '#dc3545';
          deleteBtn.style.color = 'white';
        });
        deleteBtn.addEventListener('mouseleave', () => {
          deleteBtn.style.background = '#fff5f5';
          deleteBtn.style.color = '#dc3545';
        });
        deleteBtn.onclick = async (ev) => {
          ev.stopPropagation();
          if (!confirm('Delete this note?')) return;
          const r = await deleteNote(prefix, n.id);
          if (!r.ok) { alert(r.error || 'Delete failed'); return; }
          await draw();
        };
        actionsDiv.appendChild(deleteBtn);
      }
      
      row.appendChild(contentDiv);
      row.appendChild(actionsDiv);
      
      // Click row to open note
      contentDiv.onclick = async () => {
        const r = await fetch(r2PublicUrl(n.key));
        if (!r.ok) { alert('Cannot load note'); return; }
        const obj = await r.json();
        viewEl.style.display = 'block';
        viewEl.innerHTML = `<h4 style="margin:.25rem 0">${obj.title}</h4>
          <div style="opacity:.7;margin-bottom:.5rem">${obj.author} — ${new Date(obj.createdAt).toLocaleString()}</div>
          <pre style="white-space:pre-wrap;margin:0">${obj.body || ''}</pre>`;
        viewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      
      listEl.appendChild(row);
    }
  }
  await draw();
}