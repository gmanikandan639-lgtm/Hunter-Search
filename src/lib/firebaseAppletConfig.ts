// Firebase configuration sourced from VITE_FIREBASE_* environment variables
// with secure project fallbacks for live Firebase project: fraudriskhub-44639

export interface FirebaseAppletConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

const firebaseConfig: FirebaseAppletConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyBDDN3pQECq6xgk6xlFt4N76b61fsSzU3g',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'fraudriskhub-44639.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    'fraudriskhub-44639',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'fraudriskhub-44639.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '880812568591',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:880812568591:web:3033cfc6f477247fed337a',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    'ai-studio-fraudriskhub-1bc1949c-52b4-459b-8fe4-430de62c4958',
};

export default firebaseConfig;
