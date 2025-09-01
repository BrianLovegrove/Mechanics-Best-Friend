// Utility functions for Mechanic's Best Friend

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
  return `library/${segs.join('/')}/`;          // always end with "/"
}

export function fileUrlFromKey(key) {
  return `${CONFIG.FILES_BASE_URL}/${encodeKey(key)}`;
}