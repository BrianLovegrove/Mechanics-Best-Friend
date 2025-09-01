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

const manufacturingOps = [
  "Initializing factory equipment protocols...",
  "Loading Refresco-Tempe production line configurations...",
  "Depalletizer system status: ONLINE",
  "Filler line pressure: 45 PSI nominal",
  "Pasteurizer temperature: 185°F operational",
  "Palletizer stack count: 24 units per layer",
  "Conveyor belt speed: 120 FPM standard",
  "Can crusher capacity: 2400 cans/minute",
  "Steam generator pressure: 150 PSI",
  "RO system flow rate: 500 GPM",
  "VFD Powerflex 40 frequency: 60 Hz",
  "VFD Powerflex 525 torque: 98% available",
  "Line 2 throughput: 1200 units/minute",
  "Line 3 throughput: 1100 units/minute", 
  "Line 4 throughput: 1350 units/minute",
  "Batching system recipe: Loaded recipe #247",
  "Quality control sensors: 16 sensors active",
  "Empty can inspection: 99.7% pass rate",
  "Fill level verification: ±2ml tolerance",
  "Capper torque specification: 15-18 lb-ft",
  "Label application accuracy: 99.95%",
  "Case forming speed: 45 cases/minute",
  "Wrapper film tension: 85% standard",
  "Electrical panel temperature: 78°F nominal",
  "Motor bearing vibration: 0.2mm/s acceptable",
  "Hydraulic system pressure: 2000 PSI",
  "Pneumatic air pressure: 90 PSI",
  "Cooling tower temperature: 85°F inlet",
  "Compressor duty cycle: 75% average",
  "Safety interlock status: ALL CLEAR"
];

const diagnosticOps = [
  "Running PLC diagnostic scan...",
  "Allen-Bradley ControlLogix status: HEALTHY",
  "HMI touch panel response: 12ms average",
  "Ethernet/IP network latency: 3ms",
  "DeviceNet communication: STABLE",
  "Servo drive amplifier: 2.3A current draw",
  "Encoder position feedback: ACCURATE",
  "Proximity sensor array: 24 sensors OK",
  "Photo-eye beam status: CLEAR",
  "Limit switch actuations: 1,247,382 cycles",
  "Emergency stop circuit: TESTED OK",
  "Light curtain safety zone: PROTECTED",
  "Variable frequency drive temperature: 65°C",
  "Motor insulation resistance: 500 MΩ",
  "Circuit breaker trip curve: NORMAL",
  "Ground fault monitoring: NO FAULTS",
  "Arc flash protection: ENABLED",
  "Lockout/tagout verification: COMPLIANT",
  "Machine guarding inspection: COMPLETE",
  "Pressure relief valve test: 152 PSI",
  "Temperature sensor calibration: ±0.5°C",
  "Flow meter accuracy: 99.8%",
  "Level transmitter: 4-20mA signal OK",
  "Vibration analysis baseline: ESTABLISHED",
  "Ultrasonic thickness reading: 0.125 inches",
  "Infrared temperature scan: NO HOT SPOTS",
  "Oil analysis report: ACCEPTABLE",
  "Belt tension measurement: 150 lbs force",
  "Bearing temperature: 145°F maximum"
];

const maintenanceOps = [
  "Loading preventive maintenance schedules...",
  "Daily inspection checklist: LOADED",
  "Weekly lubrication schedule: ACTIVE",
  "Monthly calibration cycle: PLANNED",
  "Quarterly overhaul schedule: UPDATED",
  "Filter replacement interval: 2,000 hours",
  "Belt replacement schedule: 8,000 hours",
  "Bearing regreasing interval: 500 hours",
  "Oil change frequency: 4,000 hours",
  "Seal replacement schedule: 6,000 hours",
  "Coupling alignment check: MONTHLY",
  "Torque specification verification: BI-WEEKLY",
  "Electrical connection inspection: WEEKLY",
  "Safety device testing: DAILY",
  "Calibration due tracking: AUTOMATED",
  "Spare parts inventory: SYNCHRONIZED",
  "Work order management: INTEGRATED",
  "Maintenance history logging: ENABLED",
  "Failure mode analysis: UPDATED",
  "Root cause investigation: DOCUMENTED",
  "Reliability metrics calculation: ACTIVE",
  "Mean time between failures: 2,847 hours",
  "Mean time to repair: 1.2 hours",
  "Overall equipment effectiveness: 89.4%",
  "Planned maintenance compliance: 97.8%"
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
  "Processing batch #{BATCH_NUM} of 45...",
  "Sensor reading: {TEMP_VAL}°F within tolerance",
  "Motor speed: {RPM_VAL} RPM target achieved",
  "Pressure vessel: {PRESSURE_VAL} PSI stable",
  "Production count: {COUNT_VAL} units completed",
  "Cycle time: {TIME_VAL} seconds optimal",
  "Flow rate: {FLOW_VAL} GPM sustained",
  "Vibration level: {VIB_VAL} mm/s acceptable",
  "Current draw: {AMP_VAL} amperes nominal",
  "Frequency output: {FREQ_VAL} Hz locked"
];

function generateDynamicLine(template, iteration = 0) {
  return template
    .replace(/{BATCH_NUM}/g, String(Math.floor(Math.random() * 50) + iteration * 5 + 1))
    .replace(/{TEMP_VAL}/g, String(Math.floor(Math.random() * 50) + 150 + iteration * 2))
    .replace(/{RPM_VAL}/g, String(Math.floor(Math.random() * 200) + 1750 + iteration * 10))
    .replace(/{PRESSURE_VAL}/g, String(Math.floor(Math.random() * 20) + 140 + iteration))
    .replace(/{COUNT_VAL}/g, String(Math.floor(Math.random() * 500) + iteration * 100 + 1000))
    .replace(/{TIME_VAL}/g, String((Math.random() * 2 + 8 + iteration * 0.1).toFixed(1)))
    .replace(/{FLOW_VAL}/g, String(Math.floor(Math.random() * 100) + 450 + iteration * 5))
    .replace(/{VIB_VAL}/g, String((Math.random() * 0.5 + 0.1 + iteration * 0.01).toFixed(2)))
    .replace(/{AMP_VAL}/g, String((Math.random() * 5 + 12 + iteration * 0.2).toFixed(1)))
    .replace(/{FREQ_VAL}/g, String((Math.random() * 5 + 58 + iteration * 0.1).toFixed(1)));
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
  
  // Manufacturing operations
  manufacturingOps.forEach((line) => out.push(line));
  
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
  
  // Diagnostic operations
  diagnosticOps.forEach((line) => out.push(line));
  
  // Process operations
  for (let i = 0; i < 2; i++) {
    processOps.forEach((line) => out.push(line));
  }
  
  // Maintenance operations
  maintenanceOps.forEach((line) => out.push(line));
  
  // Additional manufacturing variants
  for (let i = 0; i < 3; i++) {
    manufacturingOps.slice(0, 15).forEach((line) => {
      const variant = line.replace(/\d+/g, (match) => String(parseInt(match) + i * 5 + Math.floor(Math.random() * 10)));
      out.push(variant);
    });
  }
  
  // Final security checks
  out.push("Final security scan... COMPLETE");
  out.push("System hardening... APPLIED");
  out.push("Audit trail... ENABLED");
  out.push("Manufacturing protocols... LOADED");
  out.push("Equipment diagnostics... VERIFIED");
  out.push("Maintenance schedules... SYNCHRONIZED");
  out.push("Safety systems... ARMED");
  out.push("Production optimization... ACTIVE");
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