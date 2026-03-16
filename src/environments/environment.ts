export const environment = {
  production: false,
  
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
    backendUrl: 'http://localhost:3000/api/alpha-vantage'
  },
  
  // ❌ Yahoo Finance deshabilitado (no funciona)
  yahooFinance: {
    enabled: false,
    backendUrl: 'http://localhost:3000/api/yahoo-finance'
  },
  
  // 🎯 Modo de datos: false = usar API real, true = datos simulados
  useMockData: false, // Cambiar a true si Alpha Vantage falla
  
  // API activa
  activeAPI: 'alphaVantage' as 'alphaVantage' | 'yahooFinance'
};
