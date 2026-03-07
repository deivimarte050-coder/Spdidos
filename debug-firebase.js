// Script de depuración para Firebase
console.log('🔍 Iniciando depuración de Firebase...');

// Verificar configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

try {
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

  console.log('✅ Configuración Firebase:', firebaseConfig);
  
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app inicializada');
  
  const db = getFirestore(app);
  console.log('✅ Firestore inicializado');
  
  // Probar conexión
  db.collection('test').get().then(snapshot => {
    console.log('✅ Conexión Firebase exitosa');
  }).catch(error => {
    console.error('❌ Error en conexión Firebase:', error);
  });
  
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
}
