export const environment = {
  production: true,
  
  yahooFinance: {
    enabled: true,
    backendUrl: 'http://localhost:3000/api'
  },
  
  finnhub: {
    key: '',
    enabled: false
  },
  
  useMockData: false, // Correcto, en producción no queremos datos falsos
  activeAPI: 'yahooFinance'
};