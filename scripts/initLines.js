// Initialization lines generator for progress bar code stream
// Generates ~120 realistic lines with red numbers

import { CONSTS } from "./initConstants.js";

// Helper: make numbers red in HTML
const colorize = (s) => s.replace(/\b(\d+)\b/g, "<span style='color: #dc2626;'>$1</span>");

const baseOps = [
  "Initialize APP_NAME APP_VERSION (BUILD APP_BUILD)",
  "Detect OS ENV_OS / ARCH ENV_ARCH",
  "Home HOME_DIR • Cache CACHE_DIR • Logs LOG_DIR",
  "TLS TLS_PROTOCOL / CIPHER TLS_CIPHER_SUITE (ENABLED TLS_ENABLED)",
  "DNS NET_DNS_PRIMARY / NET_DNS_SECONDARY • Bind NET_BIND",
  "R2 HEAD mbf-library → NET_STATUS_OK",
  "R2 GET /library/tree.json … 200 (54ms)",
  "Seed roles ROLEMAP_ADMIN / ROLEMAP_MECH",
  "Map routes API_FILES API_NOTES API_AUTH API_FILE_DOWNLOAD",
  "Viewers VIEWERS • PDF VIEWER_PDF_ENGINE • IMG VIEWER_IMG_ENGINE",
  "Health API_HEALTH → NET_STATUS_OK",
  "Cache warmup CACHE_WARMUP • Parallel CACHE_PARALLELISM",
  "Start API NET_PORT_API • Notes NET_PORT_NOTES • Static NET_PORT_STATIC",
  "Ready local server at http://NET_BIND:NET_PORT_API"
];

function materialize(template) {
  return template.replace(/\b([A-Z0-9_]+)\b/g, (m) =>
    CONSTS[m] !== undefined ? String(CONSTS[m]) : m
  );
}

// Generate ~120 lines
export function buildAllLines() {
  const out = [];
  
  // Constants dump (first chunk looks "techy")
  Object.entries(CONSTS).slice(0, 60).forEach(([k, v]) => {
    out.push(`${k}=${JSON.stringify(v)}`);
  });
  
  // Operational lines repeat with expansion
  for (let i = 0; i < 8; i++) {
    baseOps.forEach((t) => out.push(materialize(t)));
  }
  
  // Final checks
  out.push("Check /healthz … 200");
  out.push("Check Cloudflare R2 connectivity … OK");
  out.push("Index complete • Integrity OK");
  
  return out.slice(0, 120);
}

// Returns HTML ticker string up to current percentage
export function initLinesHTML(pct) {
  const lines = buildAllLines();
  // Show more text as pct increases; clamp 10..120 lines across 0..100%
  const visibleCount = Math.min(120, Math.max(10, Math.round((pct / 100) * 120)));
  const slice = lines.slice(0, visibleCount).map(colorize);
  // Concatenate as one long command-prompt string
  return slice.join("     •     ");
}