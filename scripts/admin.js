// Admin helper functions for Mechanic's Best Friend

export function setAdminKey(k) { 
  localStorage.setItem('mbf_admin_token', k); 
}

export function getAdminKey() { 
  return localStorage.getItem('mbf_admin_token') || ''; 
}

export function isAdmin() { 
  return !!getAdminKey(); 
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

// Dev helper: Alt+A toggles admin on/off while testing
window.addEventListener('keydown', e => {
  if (e.altKey && e.key.toLowerCase() === 'a') {
    if (isAdmin()) { 
      clearAdminKey(); 
      alert('Admin OFF'); 
    } else { 
      setAdminKey('124rfgsdfw3r3trhfjghju8475623edsfsfffwefsd33'); 
      alert('Admin ON'); 
    }
    location.reload();
  }
});