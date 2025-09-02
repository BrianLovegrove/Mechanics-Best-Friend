// scripts/folder-page.js
import { loadConfig } from './config.js';
import { prefixFromBreadcrumbs, isMechanicNotesCrumbs } from './utils.js';
import { renderFolderToolbar, renderFilesList } from './files-ui.js';
import { renderNotes } from './notes-ui.js';

export async function initFolderPage(currentBreadcrumbs) {
  await loadConfig();

  // Prefix for the CURRENT folder (always ends with "/")
  const folderPrefix = prefixFromBreadcrumbs(currentBreadcrumbs);

  // Check if this is a Mechanic Notes folder - implement notes-only view
  const notesHost = document.getElementById('notes-panel');
  if (isMechanicNotesCrumbs(currentBreadcrumbs)) {
    // NOTES-ONLY VIEW: Hide all file UI components
    const toolbarEl = document.getElementById('folder-toolbar');
    const filesEl = document.getElementById('files-list');
    
    if (toolbarEl) {
      toolbarEl.style.display = 'none';
      toolbarEl.innerHTML = '';
    }
    if (filesEl) {
      filesEl.style.display = 'none';
      filesEl.innerHTML = '';
    }

    // Show notes panel only
    if (notesHost) {
      notesHost.style.display = '';
      // parent machine prefix (drop the last "Mechanic Notes" crumb)
      const machinePrefix = prefixFromBreadcrumbs(currentBreadcrumbs.slice(0, -1));
      await renderNotes(machinePrefix);
    }
  } else {
    // NORMAL VIEW: Show file UI, hide notes
    // Ensure file UI elements are visible (in case they were hidden from previous notes view)
    const toolbarEl = document.getElementById('folder-toolbar');
    const filesEl = document.getElementById('files-list');
    
    if (toolbarEl) {
      toolbarEl.style.display = '';
    }
    if (filesEl) {
      filesEl.style.display = '';
    }
    
    await renderFolderToolbar(folderPrefix);
    await renderFilesList(folderPrefix);
    
    if (notesHost) {
      // hide notes panel on non-notes pages
      notesHost.style.display = 'none';
      notesHost.innerHTML = '';
    }
  }
}

// Expose to global scope for app.js compatibility
window.initModularFolderPage = initFolderPage;