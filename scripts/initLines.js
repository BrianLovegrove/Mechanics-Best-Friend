// Initialization lines generator for progress bar code stream
// Generates ~120 realistic lines with red numbers

import { CONSTS } from "./initConstants.js";

// Helper: make numbers red in HTML
const colorize = (s) => s.replace(/\b(\d+)\b/g, "<span style='color: #dc2626;'>$1</span>");

const securityOps = [
  "Checking security parameters...",
  "Scanning system for threats...",
  "Found no security threats",
  "Checking for malware injection from user device...",
  "User device security: CLEAN",
  "Validating system integrity...",
  "System integrity check: PASSED",
  "Connecting to Cloudflare R2...",
  "Cloudflare connection: SECURE",
  "Initializing secure data bucket...",
  "Data bucket status: READY",
  "Inputting security token...",
  "Security token: VALIDATED",
  "Establishing encrypted tunnel...",
  "Tunnel encryption: AES-256",
  "Verifying SSL certificates...",
  "SSL verification: PASSED",
  "Loading firewall rules...",
  "Firewall status: ACTIVE",
  "Authenticating user permissions...",
  "User authentication: VERIFIED"
];

const systemOps = [
  "Initialize APP_NAME APP_VERSION (BUILD APP_BUILD)",
  "Detect OS ENV_OS / ARCH ENV_ARCH", 
  "Home HOME_DIR Cache CACHE_DIR Logs LOG_DIR",
  "TLS TLS_PROTOCOL CIPHER TLS_CIPHER_SUITE",
  "DNS NET_DNS_PRIMARY NET_DNS_SECONDARY Bind NET_BIND",
  "R2 HEAD mbf-library → NET_STATUS_OK",
  "R2 GET /library/tree.json … 200 (54ms)",
  "Seed roles ROLEMAP_ADMIN ROLEMAP_MECH",
  "Map routes API_FILES API_NOTES API_AUTH",
  "Viewers PDF VIEWER_PDF_ENGINE IMG VIEWER_IMG_ENGINE",
  "Health API_HEALTH → NET_STATUS_OK",
  "Cache warmup CACHE_WARMUP Parallel CACHE_PARALLELISM",
  "Start API NET_PORT_API Notes NET_PORT_NOTES Static NET_PORT_STATIC",
  "Ready local server at http://NET_BIND:NET_PORT_API"
];

const processOps = [
  "Loading core modules...",
  "Core modules: LOADED",
  "Starting background services...",
  "Background services: RUNNING",
  "Allocating memory buffers...",
  "Memory allocation: COMPLETE",
  "Initializing file handlers...",
  "File handlers: READY",
  "Setting up event listeners...",
  "Event listeners: ACTIVE",
  "Configuring network stack...",
  "Network stack: CONFIGURED",
  "Loading user preferences...",
  "User preferences: APPLIED",
  "Preparing workspace...",
  "Workspace: INITIALIZED"
];

function materialize(template) {
  return template.replace(/\b([A-Z0-9_]+)\b/g, (m) =>
    CONSTS[m] !== undefined ? String(CONSTS[m]) : m
  );
}

// Generate ~250 lines
export function buildAllLines() {
  const out = [];
  
  // Constants dump (first chunk looks "techy")
  Object.entries(CONSTS).slice(0, 80).forEach(([k, v]) => {
    out.push(`${k}=${JSON.stringify(v)}`);
  });
  
  // Security operations
  securityOps.forEach((line) => out.push(line));
  
  // System operational lines with expansion
  for (let i = 0; i < 6; i++) {
    systemOps.forEach((t) => out.push(materialize(t)));
  }
  
  // Process operations
  for (let i = 0; i < 3; i++) {
    processOps.forEach((line) => out.push(line));
  }
  
  // Final security checks
  out.push("Final security scan... COMPLETE");
  out.push("System hardening... APPLIED");
  out.push("Audit trail... ENABLED");
  out.push("Check /healthz … 200");
  out.push("Check Cloudflare R2 connectivity … OK");
  out.push("Environment security validated");
  out.push("All systems operational");
  out.push("Index complete • Integrity OK");
  
  return out.slice(0, 250);
}

// Returns HTML ticker string up to current percentage
export function initLinesHTML(pct) {
  const lines = buildAllLines();
  // Show more text as pct increases; clamp 10..250 lines across 0..100%
  const visibleCount = Math.min(250, Math.max(10, Math.round((pct / 100) * 250)));
  const slice = lines.slice(0, visibleCount).map(colorize);
  // Return single line without bullet points for flashing display
  return slice[Math.floor(Math.random() * slice.length)] || slice[slice.length - 1];
}