// migrate-cash.js - Script de migración en JavaScript puro

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// IMPORTANTE: Reemplaza con tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAhUiTqfOd_0GYj1I_N2ebd0Cp4yPXjmh12",  // ← Copia tu apiKey real
  authDomain: "burtsa-app.firebaseapp.com",
  projectId: "burtsa-app",
  storageBucket: "burtsa-app.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCash() {
  console.log('🔄 Iniciando migración de carteras...');
  
  try {
    const portfoliosRef = collection(db, 'portfolios');
    const snapshot = await getDocs(portfoliosRef);
    
    console.log(`📊 Encontradas ${snapshot.size} carteras`);
    
    let count = 0;
    let alreadyMigrated = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Solo actualizar si NO tiene el campo cash
      if (data.cash === undefined) {
        const portfolioRef = doc(db, 'portfolios', docSnap.id);
        await updateDoc(portfolioRef, {
          cash: 0
        });
        count++;
        console.log(`✅ Migrado: ${docSnap.id} → cash: 0`);
      } else {
        alreadyMigrated++;
        console.log(`⏭️  Ya migrado: ${docSnap.id} → cash: ${data.cash}`);
      }
    }
    
    console.log('\n✨ Migración completada:');
    console.log(`   📝 Carteras actualizadas: ${count}`);
    console.log(`   ✅ Ya migradas: ${alreadyMigrated}`);
    console.log(`   📊 Total: ${snapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateCash()
  .then(() => {
    console.log('\n🎉 ¡Migración exitosa!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });