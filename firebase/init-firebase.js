// Script para inicializar Firestore correctamente
console.log('🔧 Inicializando Firestore...');

// Importar Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
  projectId: "spdidos-8edda",
  appId: "1:573150906777:web:0ac9b6294842a031736b08",
  storageBucket: "spdidos-8edda.appspot.com",
  apiKey: "AIzaSyA0d21nelkgyJ0DGtlEdmzLG6AgMgD8GmE",
  authDomain: "spdidos-8edda.firebaseapp.com",
  messagingSenderId: "573150906777"
};

// Inicializar Firebase
try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app inicializada');
  
  // Inicializar Firestore sin especificar base de datos
  const db = getFirestore(app);
  console.log('✅ Firestore inicializado (base de datos por defecto)');
  
  // Probar conexión
  db.collection('_test').add({
    test: 'conexión exitosa'
  }).then(() => {
    console.log('🎉 ¡Conexión a Firestore exitosa!');
  }).catch(error => {
    console.error('❌ Error en conexión:', error);
  });
  
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
}
