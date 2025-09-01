// Admin helper functions for Mechanic's Best Friend

export function setAdminKey(k) { 
  localStorage.setItem('mbf_admin_token', k); 
}

export function getAdminKey() { 
  return localStorage.getItem('mbf_admin_token') || ''; 
}

// Check if current user has admin role
export function isAdmin() { 
  // Check if currentUser exists and has admin role
  if (window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'ADMIN')) {
    return true;
  }
  
  // Only allow fallback token check if no user is logged in or user role is undefined
  // This prevents MECH users from getting admin access via stored tokens
  if (!window.currentUser || window.currentUser.role === undefined) {
    return !!getAdminKey(); 
  }
  
  return false;
}

export function clearAdminKey() { 
  localStorage.removeItem('mbf_admin_token'); 
}

// Call this after *your* admin login succeeds:
export function seedAdminOnLogin(){
  // TEST KEY (requested by Brian; remove/rotate for prod)
  setAdminKey('124rfgsdfw3r3trhfjghju8475623edsfsfffwefsd33');
}

// Expose to global scope for app.js compatibility
window.seedAdminOnLogin = seedAdminOnLogin;