export const environment = {
  production: false,
  
  // ✅ Alpha Vantage configuración
  alphaVantage: {
    enabled: true,
    apiKey: 'R5KI16GRPSP5PKHZ', // ⚠️ Reemplaza con tu API key real
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
  activeAPI: 'alphaVantage'
};







