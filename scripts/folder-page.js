// scripts/folder-page.js
import { loadConfig } from './config.js';
import { prefixFromBreadcrumbs, isMechanicNotesCrumbs } from './utils.js';
import { renderFolderToolbar, renderFilesList } from './files-ui.js';
import { renderNotes } from './notes-ui.js';

export async function initFolderPage(currentBreadcrumbs) {
  await loadConfig();

  // Prefix for the CURRENT folder (always ends with "/")
  const folderPrefix = prefixFromBreadcrumbs(currentBreadcrumbs);

  // Render file UI everywhere
  await renderFolderToolbar(folderPrefix);
  await renderFilesList(folderPrefix);

  // Render notes ONLY inside a "Mechanic Notes" folder
  const notesHost = document.getElementById('notes-panel');
  if (isMechanicNotesCrumbs(currentBreadcrumbs)) {
    // Show notes panel
    notesHost.style.display = '';
    // parent machine prefix (drop the last "Mechanic Notes" crumb)
    const machinePrefix = prefixFromBreadcrumbs(currentBreadcrumbs.slice(0, -1));
    await renderNotes(machinePrefix);
  } else if (notesHost) {
    // hide or clear if present on non-notes pages
    notesHost.style.display = 'none';
    notesHost.innerHTML = '';
  }
}

// Expose to global scope for app.js compatibility
window.initModularFolderPage = initFolderPage;