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