// scripts/folder-page.js
import { loadConfig } from './config.js';
import { prefixFromBreadcrumbs, isMechanicNotesCrumbs } from './utils.js';
import { renderFolderToolbar, renderFilesList } from './files-ui.js';
import { renderNotes } from './notes-ui.js';

export async function initFolderPage(currentBreadcrumbs) {
  await loadConfig();

  // Prefix for the CURRENT folder (always ends with "/")
  const folderPrefix = prefixFromBreadcrumbs(currentBreadcrumbs);

  // Get the new layout elements
  const searchContainer = document.getElementById('search-container');
  const fileListScroll = document.getElementById('file-list-scroll');
  const totalFilesInfo = document.getElementById('total-files-info');
  const notesHost = document.getElementById('notes-panel');

  // Check if this is a Mechanic Notes folder - implement notes-only view
  if (isMechanicNotesCrumbs(currentBreadcrumbs)) {
    // NOTES-ONLY VIEW: Hide file UI, show notes with new layout
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
    if (searchContainer) {
      searchContainer.style.display = 'none';
    }
    if (fileListScroll) {
      fileListScroll.style.display = 'none';
    }
    
    // Show notes panel with updated total info for notes
    if (notesHost) {
      notesHost.style.display = '';
      // parent machine prefix (drop the last "Mechanic Notes" crumb)
      const machinePrefix = prefixFromBreadcrumbs(currentBreadcrumbs.slice(0, -1));
      await renderNotes(machinePrefix);
    }
    
    // Update total info badge to show notes
    if (totalFilesInfo) {
      totalFilesInfo.style.display = 'flex';
      // This will be updated by renderNotes
    }
  } else {
    // NORMAL VIEW: Show file UI with new layout, hide notes
    if (searchContainer) {
      searchContainer.style.display = 'block';
    }
    if (fileListScroll) {
      fileListScroll.style.display = 'block';
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