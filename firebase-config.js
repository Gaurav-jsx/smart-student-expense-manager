/* ==========================================================================
   SmartSpend — Firebase Configuration
   File: firebase-config.js
   
   INSTRUCTIONS TO ENABLE CLOUD MODE:
   1. Create a free Firebase project at https://console.firebase.google.com/
   2. Enable Authentication:
      - Go to Build > Authentication > Sign-in method.
      - Enable "Email/Password" and (optional) "Google".
   3. Enable Firestore Database:
      - Go to Build > Firestore Database > Create database.
      - Start in Production mode, select your preferred location.
      - Paste the security rules from `firestore.rules` into the Rules tab and Publish.
   4. Register a Web App:
      - In Project Settings > General, click "</>" (Add app > Web).
      - Copy the `firebaseConfig` object and paste it below, replacing `null`.
   5. Authorized Domains:
      - In Authentication > Settings > Authorized domains, add your host
        (e.g., localhost, your GitHub Pages domain).

   NOTE: If `SS_FIREBASE_CONFIG` is `null` or invalid, SmartSpend automatically
   runs in "Local Demo Mode" with fully simulated multi-user accounts and
   realtime sync, requiring zero cloud setup for testing and offline demos!
========================================================================== */

window.SS_FIREBASE_CONFIG = null;

/* Example Configuration Structure:
window.SS_FIREBASE_CONFIG = {
    apiKey: "AIzaSy...",
    authDomain: "smartspend-demo.firebaseapp.com",
    projectId: "smartspend-demo",
    storageBucket: "smartspend-demo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef..."
};
*/
