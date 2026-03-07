import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase - Proyecto Real
const firebaseConfig = {
  projectId: "spdidos-8edda",
  appId: "1:573150906777:web:0ac9b6294842a031736b08",
  storageBucket: "spdidos-8edda.firebasestorage.app",
  apiKey: "AIzaSyA0d21nelkgyJ0DGtlEdmzLG6AgMgD8GmE",
  authDomain: "spdidos-8edda.firebaseapp.com",
  messagingSenderId: "573150906777",
  measurementId: "G-9QLHQJJ332",
  projectNumber: "573150906777"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
