// Initialization lines generator for progress bar code stream
// Generates ~500+ realistic lines with color-cycling numbers

import { CONSTS } from "./initConstants.js";

// Global color state for cycling
let currentNumberColor = '#dc2626'; // Start with red
const colorCycle = ['#dc2626', '#9333ea', '#dc2626', '#9333ea']; // red -> purple -> red -> purple
let colorIndex = 0;

// Helper: make numbers colored in HTML with current color
const colorize = (s) => s.replace(/\b(\d+)\b/g, `<span style='color: ${currentNumberColor};'>$1</span>`);

// Function to cycle colors
export function cycleNumberColor() {
  colorIndex = (colorIndex + 1) % colorCycle.length;
  currentNumberColor = colorCycle[colorIndex];
}

// Export current color for external access
export { currentNumberColor };

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
  "User authentication: VERIFIED",
  "Performing vulnerability scan...",
  "No critical vulnerabilities detected",
  "Checking certificate validity: 365 days remaining",
  "Intrusion detection system: ONLINE",
  "Data encryption verification: PASSED",
  "Access control matrix: LOADED",
  "Security audit log: INITIALIZED"
];

const serverOps = [
  "Initializing server runtime environment...",
  "Loading application configuration files...",
  "Express.js server framework: READY",
  "HTTP request handler: INITIALIZED", 
  "Static file middleware: CONFIGURED",
  "Session management: ACTIVE",
  "Authentication middleware: LOADED",
  "Database connection pool: ESTABLISHED",
  "API endpoint routing: CONFIGURED",
  "File upload handling: ENABLED",
  "GitHub API integration: CONNECTED",
  "Cloudflare R2 storage: AUTHENTICATED",
  "SSL certificate: VALID",
  "CORS policy: APPLIED",
  "Rate limiting: CONFIGURED",
  "Request logging: ACTIVE",
  "Error handling middleware: LOADED",
  "Security headers: APPLIED",
  "Compression middleware: ENABLED",
  "Health check endpoint: REGISTERED",
  "WebSocket support: INITIALIZED",
  "Cache strategy: CONFIGURED",
  "Background job queue: STARTED",
  "Process monitoring: ACTIVE",
  "Memory usage tracking: ENABLED",
  "CPU utilization monitor: RUNNING",
  "Disk space monitoring: ACTIVE",
  "Network interface: BOUND",
  "Load balancer: READY",
  "Service discovery: REGISTERED"
];

const networkOps = [
  "Running network stack diagnostics...",
  "TCP/IP configuration: VALIDATED",
  "DNS resolution: 8ms response time",
  "HTTP/2 protocol: ENABLED",
  "WebSocket connection: ESTABLISHED",
  "Load balancer health check: PASSED",
  "CDN edge cache: SYNCHRONIZED",
  "SSL handshake: 45ms completion",
  "Certificate chain: VALIDATED",
  "HTTPS redirect: CONFIGURED",
  "API gateway: OPERATIONAL",
  "Rate limiter: 1000 req/min",
  "Connection pool: 50 active connections", 
  "Keep-alive timeout: 30 seconds",
  "Request queue: 0 pending",
  "Bandwidth utilization: 12.5 Mbps",
  "Latency monitoring: 15ms average",
  "Error rate: 0.01% within threshold",
  "Circuit breaker: CLOSED",
  "Retry mechanism: ACTIVE",
  "Timeout settings: CONFIGURED",
  "Security scanning: NO THREATS",
  "DDoS protection: ENABLED",
  "Firewall rules: 247 rules active",
  "VPN gateway: CONNECTED",
  "Encrypted tunnel: AES-256",
  "Session affinity: CONFIGURED",
  "Geographic routing: OPTIMIZED",
  "Cache hit ratio: 87.3%",
  "Content delivery: ACCELERATED"
];

const serverMaintenanceOps = [
  "Loading server maintenance schedules...",
  "System health check: PASSED",
  "Auto-scaling policy: CONFIGURED",
  "Backup verification: COMPLETED",
  "Log rotation schedule: ACTIVE",
  "Database optimization: RUNNING",
  "Cache cleanup interval: 4 hours",
  "SSL certificate renewal: 89 days remaining",
  "Security patch scan: UP TO DATE",
  "Memory leak detection: CLEAN",
  "Disk cleanup routine: SCHEDULED",
  "Performance metrics collection: ENABLED",
  "Error log analysis: AUTOMATED",
  "Capacity planning alerts: CONFIGURED",
  "Resource utilization monitoring: ACTIVE",
  "Service dependency check: HEALTHY",
  "Configuration drift detection: STABLE",
  "Disaster recovery test: PASSED",
  "Compliance audit: COMPLIANT",
  "Version control sync: SYNCHRONIZED",
  "Deployment pipeline: READY",
  "Blue-green deployment: STANDBY",
  "Feature flag management: OPERATIONAL",
  "A/B testing framework: ENABLED",
  "User session cleanup: AUTOMATED",
  "API rate limit monitoring: ACTIVE",
  "Database connection pooling: OPTIMIZED",
  "CDN cache invalidation: SCHEDULED",
  "Security token rotation: 7 days cycle",
  "System backup: 99.9% success rate"
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

// Templates for static code with changing numbers
const dynamicTemplates = [
  "Processing request batch #{BATCH_NUM} of 45...",
  "Server load: {TEMP_VAL}% CPU utilization",
  "Database queries: {RPM_VAL} QPS sustained",
  "Memory usage: {PRESSURE_VAL} MB allocated",
  "Active connections: {COUNT_VAL} sessions",
  "Response time: {TIME_VAL}ms average",
  "Network throughput: {FLOW_VAL} MB/s",
  "Error rate: {VIB_VAL}% acceptable",
  "Thread pool: {AMP_VAL} workers active",
  "Cache hit rate: {FREQ_VAL}% optimized"
];

function generateDynamicLine(template, iteration = 0) {
  return template
    .replace(/{BATCH_NUM}/g, String(Math.floor(Math.random() * 50) + iteration * 5 + 1))
    .replace(/{TEMP_VAL}/g, String(Math.floor(Math.random() * 30) + 15 + iteration * 2)) // CPU %
    .replace(/{RPM_VAL}/g, String(Math.floor(Math.random() * 500) + 1500 + iteration * 50)) // QPS
    .replace(/{PRESSURE_VAL}/g, String(Math.floor(Math.random() * 500) + 1024 + iteration * 100)) // MB
    .replace(/{COUNT_VAL}/g, String(Math.floor(Math.random() * 500) + iteration * 100 + 1000)) // connections
    .replace(/{TIME_VAL}/g, String((Math.random() * 50 + 50 + iteration * 5).toFixed(1))) // ms
    .replace(/{FLOW_VAL}/g, String(Math.floor(Math.random() * 50) + 10 + iteration * 2)) // MB/s
    .replace(/{VIB_VAL}/g, String((Math.random() * 0.5 + 0.1 + iteration * 0.01).toFixed(2))) // error %
    .replace(/{AMP_VAL}/g, String(Math.floor(Math.random() * 10) + 8 + iteration)) // workers
    .replace(/{FREQ_VAL}/g, String((Math.random() * 10 + 85 + iteration * 0.5).toFixed(1))); // cache %
}

// Generate ~500 lines
export function buildAllLines() {
  const out = [];
  
  // Constants dump (first chunk looks "techy")
  Object.entries(CONSTS).slice(0, 50).forEach(([k, v]) => {
    if (k !== 'APP_AUTHOR' && k !== 'APP_CONTACT') { // Skip removed author info
      out.push(`${k}=${JSON.stringify(v)}`);
    }
  });
  
  // Security operations
  securityOps.forEach((line) => out.push(line));
  
  // Server operations  
  serverOps.forEach((line) => out.push(line));
  
  // System operational lines with expansion
  for (let i = 0; i < 4; i++) {
    systemOps.forEach((t) => out.push(materialize(t)));
  }
  
  // Dynamic templates with changing numbers (3 iterations for color cycling)
  for (let iteration = 0; iteration < 3; iteration++) {
    dynamicTemplates.forEach((template) => {
      out.push(generateDynamicLine(template, iteration));
    });
  }
  
  // Network operations
  networkOps.forEach((line) => out.push(line));
  
  // Process operations
  for (let i = 0; i < 2; i++) {
    processOps.forEach((line) => out.push(line));
  }
  
  // Server maintenance operations
  serverMaintenanceOps.forEach((line) => out.push(line));
  
  // Additional server variants
  for (let i = 0; i < 3; i++) {
    serverOps.slice(0, 15).forEach((line) => {
      const variant = line.replace(/\d+/g, (match) => String(parseInt(match) + i * 5 + Math.floor(Math.random() * 10)));
      out.push(variant);
    });
  }
  
  // Final security checks
  out.push("Final security scan... COMPLETE");
  out.push("System hardening... APPLIED");
  out.push("Audit trail... ENABLED");
  out.push("Server protocols... LOADED");
  out.push("Network diagnostics... VERIFIED");
  out.push("Maintenance schedules... SYNCHRONIZED");
  out.push("Security systems... ARMED");
  out.push("Performance optimization... ACTIVE");
  out.push("Check /healthz … 200");
  out.push("Check Cloudflare R2 connectivity … OK");
  out.push("Environment security validated");
  out.push("All systems operational");
  out.push("Index complete • Integrity OK");
  out.push("Mechanic's Best Friend ready for service");
  
  return out.slice(0, 500);
}

// Returns HTML ticker string up to current percentage
export function initLinesHTML(pct) {
  const lines = buildAllLines();
  // Show more text as pct increases; clamp 10..500 lines across 0..100%
  const visibleCount = Math.min(500, Math.max(10, Math.round((pct / 100) * 500)));
  const slice = lines.slice(0, visibleCount).map(colorize);
  // Return single line without bullet points for flashing display
  return slice[Math.floor(Math.random() * slice.length)] || slice[slice.length - 1];
}