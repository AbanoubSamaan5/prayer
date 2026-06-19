// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  off,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

/* ==================================
   FIREBASE CONFIG
================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCKVIzNCDYmOhZA3kwlWJ2ER23776m46b4",
  authDomain: "lucky-spinner-5a125.firebaseapp.com",
  projectId: "lucky-spinner-5a125",
  databaseURL: "https://lucky-spinner-5a125-default-rtdb.firebaseio.com",
  storageBucket: "lucky-spinner-5a125.firebasestorage.app",
  messagingSenderId: "216169285808",
  appId: "1:216169285808:web:6692133116339a11479375",
};
/* ==================================
   INIT
================================== */

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

/* ==================================
   EXPORTS
================================== */

export { db, ref, get, set, update, onValue, runTransaction, off };
