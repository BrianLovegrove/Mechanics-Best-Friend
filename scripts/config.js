// scripts/config.js
export let CONFIG = { 
  FILES_BASE_URL: "https://pub-d8f89cb648cd4a35a8635d47997501f2.r2.dev/mbf-library", 
  WORKER_BASE_URL: "https://mbf-api.factoryflowdynamics.workers.dev", 
  ROOT_PREFIX: "library" 
};

export async function loadConfig(){
  try {
    const response = await fetch('/data/config.json', {cache:'no-store'});
    if (response.ok) {
      const config = await response.json();
      CONFIG = { ...CONFIG, ...config }; // merge with defaults
    }
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error);
  }
}