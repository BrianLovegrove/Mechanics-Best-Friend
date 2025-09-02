// Icon utilities for Mechanic's Best Friend
// Maps file extensions to appropriate icons and provides icon constants

import { asset } from './asset.js';

const ICONS_BASE = "assets/icons/";

// Map file extensions to icon paths
export function iconFor(nameOrExt) {
  const ext = (nameOrExt.split(".").pop() || "").toLowerCase();
  const fileName = nameOrExt.toLowerCase();
  
  // Word documents
  if (/(docx?|dotx?)$/.test(ext)) return asset(ICONS_BASE + "wordicon.png");
  
  // PDF documents
  if (ext === "pdf") return asset(ICONS_BASE + "pdficon.png");
  
  // PLC files - comprehensive list of PLC-related extensions
  const plcExtensions = [
    'acd', 'l5x', 'lk5', 'mer', 'apa', 'acd-backup', 'rsp', 'rss', 'lad', 'slc', 'pc5', 'pvc', 'csp',
    'gxw', 'gxw2', 'qxp', 'q82', 'qpj', 'zef', 'zen', 'zrx', 'srx', 'zlog', 'exp', 'csv', 'dat', 'db',
    'bak', 'par', 'cfg', 'ini', 'log', 'sta', 'zap', 'zefx', 'zdb', 'zprj', 'zcfg', 'esx', 'apx', 'prj',
    'prx', 'awp', 'scl', 'awl', 'stl', 'udt', 'sym', 'dbf', 'hmi', 'hmi-log', 'tpy', 'zip', 'zrxlog',
    'ob1', 'fc', 'fb', 'sdf', 'zvf', 'svd', 'pgm', 'ufb', 'ufc', 'ufx', 'ufl', 'st', 'il', 'seq',
    'mdl', 'mwp', 'pwf', 'xrs', 'cwx', 'prxproj', 'bkp', 'akb', 's7p', 's7l', 's7f', 'ap13', 'ap14',
    'ap15', 'ap16', 'zap13', 'zap14', 'zap15', 'zap16', 'pma', 'pml', 'gdf', 'gdx', 'scu', 'cxe',
    'cxp', 'cxr', 'cxz', 'irx', 'zvx', 'vdx', 'hwl', 'tag', 'tgm', 'scada', 'vsz', 'xrz', 'sfc',
    'xcp', 'hcx', 'mwx', 'plx', 'pld', 'plc', 'pwr', 'hcxproj', 'vdxproj'
  ];
  // Special handling for XML files that might be PLC-related
  if (ext === 'xml' && (fileName.includes('plc') || fileName.includes('hmi') || fileName.includes('scada') || fileName.includes('allen') || fileName.includes('siemens'))) {
    return asset(ICONS_BASE + "plcfileicon.png");
  }
  if (plcExtensions.includes(ext) || fileName.includes('plc') || fileName.includes('hmi') || fileName.includes('scada')) {
    return asset(ICONS_BASE + "plcfileicon.png");
  }
  
  // Media files - images, videos, etc.
  if (/(png|jpe?g|gif|webp|bmp|tiff?|svg|ico|mov|mp4|avi|mkv|webm|flv|wmv|m4v|3gp|ogv|mpg|mpeg)$/.test(ext)) {
    return asset(ICONS_BASE + "pictureicon.png");
  }
  
  // Text files (but NOT for mechanic notes - those use noteicon.png)
  if (/^(txt|md)$/.test(ext)) return asset(ICONS_BASE + "txtfileicon.png");
  
  // JSON files
  if (ext === "json") return asset(ICONS_BASE + "jsonicon.png");
  
  // Default fallback
  return asset(ICONS_BASE + "anyotherfiletype.png");
}

// Special function for mechanic notes
export function iconForNote() {
  return asset(ICONS_BASE + "noteicon.png");
}

// Button icons
export const UPLOAD_ICON = asset(ICONS_BASE + "upload.png");
export const DOWNLOAD_ICON = asset(ICONS_BASE + "download.png");

// Header image
export const HEADER_TITLE_IMAGE = asset(ICONS_BASE + "headertitle.png");

// Helper function to create an icon image element
export function createIconElement(iconPath, alt = "", size = 28) {
  const img = document.createElement('img');
  img.src = iconPath;
  img.alt = alt;
  img.style.cssText = `width: ${size}px; height: ${size}px; object-fit: contain;`;
  return img;
}

// Helper function to format file sizes
export function humanSize(b) {
  if (b == null) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i ? 1 : 0)} ${u[i]}`;
}