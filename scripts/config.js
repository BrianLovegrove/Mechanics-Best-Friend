// scripts/config.js
export let CONFIG = { FILES_BASE_URL:"", WORKER_BASE_URL:"", ROOT_PREFIX:"library" };
export async function loadConfig(){
  CONFIG = await fetch('/data/config.json', {cache:'no-store'}).then(r=>r.json());
}