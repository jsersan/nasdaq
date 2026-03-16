export const environment = {
  production: true,
  
  firebase: {
    apiKey: "AIzaSyDXkfZdslH0EuCaAEIwRGzSc9JM-HAwLcU",
    authDomain: "burtsa.firebaseapp.com",
    projectId: "burtsa",
    storageBucket: "burtsa.firebasestorage.app",
    messagingSenderId: "730639825299",
    appId: "1:730639825299:web:8e8ee6e2dcb91a2c7c9a38"
  },
  
  // ✅ Alpha Vantage configuración
  alphaVantage: {
    enabled: true,
    apiKey: 'R5KI16GRPSP5PKHZ',
    backendUrl: 'https://your-backend.com/api/alpha-vantage'  // ⚠️ Cambiar en producción
  },
  
  // ❌ Yahoo Finance deshabilitado (no funciona)
  yahooFinance: {
    enabled: false,
    backendUrl: 'https://your-backend.com/api/yahoo-finance'
  },
  
  // 🎯 Modo de datos: false = usar API real, true = datos simulados
  useMockData: false,
  
  // API activa
  activeAPI: 'alphaVantage' as 'alphaVantage' | 'yahooFinance'
};