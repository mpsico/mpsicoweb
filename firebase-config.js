// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAUjcnbZA7iI86fLpU6TmucnuUWws3UVUU",
  authDomain:        "maritapsicologia.firebaseapp.com",
  databaseURL:       "https://maritapsicologia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "maritapsicologia",
  storageBucket:     "maritapsicologia.firebasestorage.app",
  messagingSenderId: "793657125766",
  appId:             "1:793657125766:web:2b65bdb2f905d32cc3da07"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.database();
const auth = firebase.auth();

const ADMIN_EMAIL = "maritagpsicologa@gmail.com";
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
