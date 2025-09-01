// Icon utilities for Mechanic's Best Friend
// Maps file extensions to appropriate icons and provides icon constants

import { asset } from './asset.js';

const ICONS_BASE = "assets/icons/";

// Map file extensions to icon paths
export function iconFor(nameOrExt) {
  const ext = (nameOrExt.split(".").pop() || "").toLowerCase();
  
  if (/(docx?|dotx?)$/.test(ext)) return asset(ICONS_BASE + "wordicon.jpg");
  if (ext === "pdf") return asset(ICONS_BASE + "pdficon.png");
  if (/(png|jpe?g|gif|webp|bmp|tiff?)$/.test(ext)) return asset(ICONS_BASE + "pictureicon.png");
  if (/^(txt|md)$/.test(ext)) return asset(ICONS_BASE + "txtfileicon.png");
  if (ext === "json") return asset(ICONS_BASE + "jsonicon.png");
  
  return asset(ICONS_BASE + "anyotherfiletype.jpg");
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