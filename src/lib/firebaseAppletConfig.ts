// Safe fallback loader for optional local firebase-applet-config.json
// This ensures the application builds cleanly even if firebase-applet-config.json is absent in Git clones or Vercel
let localAppletConfig: {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  if (typeof import.meta !== 'undefined' && typeof (import.meta as any).glob === 'function') {
    const globModules = (import.meta as any).glob('/firebase-applet-config.json', { eager: true });
    const keys = Object.keys(globModules);
    if (keys.length > 0 && globModules[keys[0]]) {
      localAppletConfig = globModules[keys[0]].default || globModules[keys[0]];
    }
  }
} catch {
  // In CI/CD, GitHub, or production deployment, environment variables are used
}

export default localAppletConfig;
