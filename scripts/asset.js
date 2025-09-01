// Asset path helper for GitHub Pages compatibility
// Handles base path resolution for assets when deployed to GitHub Pages

// Get the base URL for the current environment
// On GitHub Pages: "/Mechanics-Best-Friend/"
// On localhost: "/"
export function getBasePath() {
  // For GitHub Pages deployment, the repo name becomes the base path
  const path = window.location.pathname;
  
  // If we're on GitHub Pages (path starts with repo name)
  if (path.startsWith('/Mechanics-Best-Friend/')) {
    return '/Mechanics-Best-Friend/';
  }
  
  // Otherwise assume we're on localhost or root domain
  return '/';
}

// Asset helper function that respects the site base path
export function asset(path) {
  const basePath = getBasePath();
  // Remove leading slash from path if present, then combine with base
  const cleanPath = path.replace(/^\//, '');
  return `${basePath}${cleanPath}`;
}

// For backward compatibility, also provide as global function
window.asset = asset;
window.getBasePath = getBasePath;