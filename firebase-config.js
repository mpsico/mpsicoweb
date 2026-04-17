// ============================================================
// FIREBASE CONFIGURATION
// ------------------------------------------------------------
// PASOS:
// 1. Ve a https://console.firebase.google.com
// 2. Crear proyecto → nombre "marita-psicologia"
// 3. Activar "Realtime Database" → Europa → modo prueba
// 4. Project Settings > General > Tu app web > Registrar
// 5. Copia los valores y pégalos aquí
// 6. En Realtime Database > Reglas, pega esto:
/*// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUjcnbZA7iI86fLpU6TmucnuUWws3UVUU",
  authDomain: "maritapsicologia.firebaseapp.com",
  projectId: "maritapsicologia",
  storageBucket: "maritapsicologia.firebasestorage.app",
  messagingSenderId: "793657125766",
  appId: "1:793657125766:web:2b65bdb2f905d32cc3da07"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
{
  "rules": {
    "bookings":    { ".read": true,           ".write": true },
    "schedule":    { ".read": true,           ".write": "auth != null" },
    "specialDays": { ".read": true,           ".write": "auth != null" },
    "contacts":    { ".read": "auth != null", ".write": true }
  }
}
*/
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  databaseURL:       "https://TU_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.database();
const auth = firebase.auth();

const ADMIN_EMAIL = "maritagpsicologa@gmail.com";
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
