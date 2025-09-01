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
          const r = await fetch(r2PublicUrl(n.key));
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