// Utility functions for Mechanic's Best Friend
import { CONFIG, loadConfig } from './config.js';

export function slug(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, '').replace(/_+/g, '_');
}

export function encodeKey(p) {
  return p.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
}

export function prefixFromBreadcrumbs(crumbs) {
  // e.g. ['Home','Line 2','Depalletizer',...,'Electrical Schematics']
  const segs = crumbs.map(slug);
  return `${CONFIG.ROOT_PREFIX}/${segs.join('/')}/`;          // always end with "/"
}

export function fileUrlFromKey(key) {
  return `${CONFIG.FILES_BASE_URL}/${encodeKey(key)}`;
}

export async function api(path){
  await loadConfig();
  return `${CONFIG.WORKER_BASE_URL}${path}`;
}

// detect if the current breadcrumbs end with "Mechanic Notes"
export function isMechanicNotesCrumbs(crumbs){
  if (!Array.isArray(crumbs) || !crumbs.length) return false;
  const last = String(crumbs[crumbs.length - 1] || '').trim();
  const lower = last.toLowerCase();
  return lower === 'mechanic notes' || slug(last) === 'mechanic_notes';
}