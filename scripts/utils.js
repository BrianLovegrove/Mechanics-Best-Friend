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
  const rootPrefix = CONFIG.ROOT_PREFIX || 'library'; // fallback to 'library'
  return `${rootPrefix}/${segs.join('/')}/`;          // always end with "/"
}

export function fileUrlFromKey(key) {
  const baseUrl = CONFIG.FILES_BASE_URL || 'https://pub-d8f89cb648cd4a35a8635d47997501f2.r2.dev/mbf-library';
  return `${baseUrl}/${encodeKey(key)}`;
}

export async function api(path){
  await loadConfig().catch(() => {}); // ignore config loading errors
  const baseUrl = CONFIG.WORKER_BASE_URL || 'https://mbf-api.factoryflowdynamics.workers.dev';
  return `${baseUrl}${path}`;
}

// detect if the current breadcrumbs end with "Mechanic Notes"
export function isMechanicNotesCrumbs(crumbs){
  if (!Array.isArray(crumbs) || !crumbs.length) return false;
  const last = String(crumbs[crumbs.length - 1] || '').trim();
  const lower = last.toLowerCase();
  return lower === 'mechanic notes' || slug(last) === 'mechanic_notes';
}