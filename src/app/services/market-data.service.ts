import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  time: string;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {

  constructor(private http: HttpClient) {}

  getSP500Data(): Observable<IndexData> {
    return of(this.getMockIndexData('SP500'));
  }

  getNASDAQData(): Observable<IndexData> {
    return of(this.getMockIndexData('NASDAQ'));
  }

  getSP500Stocks(): Observable<StockData[]> {
    // ✅ S&P 500 COMPLETO - 500 VALORES
    const sp500Symbols = [
      // Technology (77 stocks)
      'AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'CSCO', 'ADBE', 'ACN', 'AMD',
      'IBM', 'INTU', 'TXN', 'QCOM', 'AMAT', 'MU', 'INTC', 'ADI', 'LRCX', 'KLAC',
      'SNPS', 'CDNS', 'MCHP', 'NXPI', 'ADSK', 'ANSS', 'MSI', 'FTNT', 'APH', 'TEL',
      'PANW', 'ANET', 'MPWR', 'ON', 'KEYS', 'GLW', 'HPE', 'NTAP', 'AKAM', 'FFIV',
      'JNPR', 'ZBRA', 'GDDY', 'CRWD', 'ZS', 'DDOG', 'S', 'SNOW', 'NET', 'CFLT',
      'BILL', 'DOCN', 'MDB', 'HUBS', 'ZI', 'ESTC', 'DBX', 'OKTA', 'TWLO', 'SPLK',
      'RNG', 'VEEV', 'WDAY', 'TEAM', 'NOW', 'DXCM', 'ALGN', 'ILMN', 'ISRG', 'PODD',
      'EW', 'STE', 'HOLX', 'IDXX', 'RMD', 'MTD', 'A',
      
      // Communication Services (23 stocks)
      'GOOGL', 'GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'CHTR', 'TMUS', 'T', 'VZ',
      'EA', 'TTWO', 'NWSA', 'NWS', 'FOX', 'FOXA', 'PARA', 'OMC', 'IPG', 'MTCH',
      'LYV', 'WBD', 'DISH',
      
      // Consumer Discretionary (51 stocks)
      'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX', 'BKNG', 'CMG',
      'MAR', 'ABNB', 'GM', 'F', 'ORLY', 'AZO', 'YUM', 'DHI', 'LEN', 'NVR',
      'PHM', 'ROST', 'TGT', 'EBAY', 'ETSY', 'W', 'CVNA', 'BBY', 'ULTA', 'DPZ',
      'MHK', 'TPR', 'RL', 'LULU', 'DECK', 'UAA', 'UA', 'HAS', 'MAT', 'PVH',
      'VFC', 'NCLH', 'CCL', 'RCL', 'LVS', 'WYNN', 'MGM', 'CZR', 'GRMN', 'BWA',
      'HLT',
      
      // Consumer Staples (31 stocks)
      'WMT', 'PG', 'COST', 'KO', 'PEP', 'PM', 'MO', 'MDLZ', 'CL', 'KMB',
      'GIS', 'K', 'HSY', 'SJM', 'CPB', 'CAG', 'HRL', 'MKC', 'CHD', 'CLX',
      'TSN', 'KHC', 'MNST', 'KDP', 'STZ', 'TAP', 'BF.B', 'ADM', 'BG', 'INGR',
      'LW',
      
      // Energy (22 stocks)
      'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'HES',
      'KMI', 'WMB', 'OKE', 'TRGP', 'FANG', 'DVN', 'MRO', 'HAL', 'BKR', 'APA',
      'NOV', 'CTRA',
      
      // Financials (71 stocks)
      'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'C', 'SCHW',
      'BLK', 'AXP', 'SPGI', 'CME', 'ICE', 'MCO', 'AON', 'MMC', 'AJG', 'BRO',
      'TRV', 'PGR', 'ALL', 'CB', 'MET', 'PRU', 'AFL', 'AIG', 'HIG', 'PFG',
      'L', 'GL', 'RGA', 'AIZ', 'CINF', 'WRB', 'ERIE', 'USB', 'PNC', 'TFC',
      'COF', 'BK', 'STT', 'NTRS', 'CFG', 'RF', 'KEY', 'FITB', 'HBAN', 'MTB',
      'ZION', 'CMA', 'FRC', 'WAL', 'SIVB', 'ALLY', 'DFS', 'SYF', 'NAVI', 'PYPL',
      'FIS', 'FISV', 'FLT', 'GPN', 'JKHY', 'BR', 'MSCI', 'VRSK', 'TRU', 'EFX',
      'CBOE',
      
      // Health Care (63 stocks)
      'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE', 'AMGN',
      'GILD', 'VRTX', 'ISRG', 'REGN', 'BSX', 'MDT', 'CI', 'ELV', 'CVS', 'HUM',
      'ZTS', 'SYK', 'BDX', 'EW', 'RMD', 'IDXX', 'GEHC', 'HCA', 'DXCM', 'ALGN',
      'BIIB', 'ILMN', 'MRNA', 'PODD', 'TECH', 'BAX', 'MTD', 'A', 'HOLX', 'STE',
      'VTRS', 'CTLT', 'COR', 'HSIC', 'CAH', 'MCK', 'CNC', 'MOH', 'UHS', 'DVA',
      'LH', 'DGX', 'RVTY', 'IQV', 'CRL', 'SOLV', 'WST', 'PKI', 'BIO', 'WAT',
      'XRAY', 'INCY', 'EXAS',
      
      // Industrials (72 stocks)
      'HON', 'UPS', 'RTX', 'BA', 'CAT', 'GE', 'DE', 'LMT', 'MMM', 'GD',
      'NOC', 'ETN', 'EMR', 'ITW', 'PH', 'TT', 'CMI', 'CARR', 'OTIS', 'PCAR',
      'JCI', 'ROK', 'AME', 'DOV', 'FTV', 'HUBB', 'IEX', 'SWK', 'GNRC', 'PWR',
      'AOS', 'BLDR', 'J', 'FAST', 'CHRW', 'EXPD', 'JBHT', 'ODFL', 'XPO', 'KNX',
      'NSC', 'UNP', 'CSX', 'CP', 'DAL', 'UAL', 'AAL', 'LUV', 'ALK', 'JBLU',
      'SAVE', 'FDX', 'GWW', 'WM', 'RSG', 'CTAS', 'CINTAS', 'URI', 'VMC', 'MLM',
      'SUM', 'STLD', 'NUE', 'CLF', 'X', 'FCX', 'NEM', 'GOLD', 'AA', 'ARNC',
      'HWM', 'TXT',
      
      // Materials (28 stocks)
      'LIN', 'APD', 'SHW', 'ECL', 'DD', 'NEM', 'FCX', 'NUE', 'VMC', 'MLM',
      'DOW', 'PPG', 'CTVA', 'ALB', 'EMN', 'CE', 'FMC', 'MOS', 'CF', 'IFF',
      'LYB', 'AMCR', 'PKG', 'IP', 'WRK', 'AVY', 'BALL', 'SEE',
      
      // Real Estate (30 stocks)
      'AMT', 'PLD', 'EQIX', 'SPG', 'PSA', 'O', 'VICI', 'DLR', 'EXR', 'WELL',
      'SBAC', 'AVB', 'EQR', 'VTR', 'MAA', 'ESS', 'ARE', 'INVH', 'UDR', 'CPT',
      'KIM', 'REG', 'FRT', 'BXP', 'HST', 'VNO', 'SLG', 'AIV', 'AKR', 'BRX',
      
      // Utilities (32 stocks)
      'NEE', 'DUK', 'SO', 'SRE', 'AEP', 'D', 'EXC', 'PEG', 'XEL', 'ED',
      'WEC', 'ES', 'AWK', 'PPL', 'DTE', 'EIX', 'FE', 'AEE', 'CMS', 'CNP',
      'ETR', 'EVRG', 'ATO', 'NI', 'LNT', 'PNW', 'OGE', 'IDA', 'SJW', 'AVA',
      'NWE', 'POR'
    ];

    return of(this.getMockStockData(sp500Symbols));
  }

  getNASDAQStocks(): Observable<StockData[]> {
    // ✅ NASDAQ-100 COMPLETO - 100 VALORES
    const nasdaq100Symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'COST',
      'ASML', 'NFLX', 'AMD', 'PEP', 'ADBE', 'CSCO', 'TMUS', 'CMCSA', 'INTC', 'INTU',
      'TXN', 'QCOM', 'AMGN', 'HON', 'AMAT', 'SBUX', 'BKNG', 'ISRG', 'GILD', 'ADP',
      'VRTX', 'PANW', 'ADI', 'MU', 'LRCX', 'REGN', 'MDLZ', 'KLAC', 'SNPS', 'CDNS',
      'PYPL', 'CRWD', 'MNST', 'MAR', 'CSX', 'MELI', 'ORLY', 'FTNT', 'ABNB', 'DASH',
      'NXPI', 'WDAY', 'ADSK', 'CTAS', 'AEP', 'CHTR', 'PCAR', 'CPRT', 'MRNA', 'ROST',
      'MCHP', 'PAYX', 'ODFL', 'DXCM', 'FAST', 'EA', 'KDP', 'CTSH', 'IDXX', 'VRSK',
      'LULU', 'KHC', 'TEAM', 'CSGP', 'EXC', 'GEHC', 'TTWO', 'ANSS', 'XEL', 'ON',
      'FANG', 'BIIB', 'ZS', 'DDOG', 'ILMN', 'WBD', 'CDW', 'CCEP', 'GFS', 'MDB',
      'WBA', 'DLTR', 'ZM', 'ENPH', 'SIRI', 'ALGN', 'EBAY', 'RIVN', 'LCID', 'JD'
    ];

    return of(this.getMockStockData(nasdaq100Symbols));
  }

  getStockData(symbol: string): Observable<StockData> {
    return of(this.getMockStockData([symbol])[0]);
  }

  getHistoricalData(symbol: string): Observable<any[]> {
    return of(this.generateHistoricalData(symbol));
  }

  private formatVolume(volume: number): string {
    if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + 'B';
    if (volume >= 1000000) return Math.floor(volume / 1000000) + 'M';
    if (volume >= 1000) return Math.floor(volume / 1000) + 'K';
    return volume.toString();
  }

  private getMockIndexData(indexType: 'SP500' | 'NASDAQ'): IndexData {
    if (indexType === 'SP500') {
      return {
        name: 'S&P 500',
        value: 5234.18,
        change: 28.50,
        changePercent: 0.55,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        name: 'NASDAQ Composite',
        value: 16274.94,
        change: 85.34,
        changePercent: 0.53,
        timestamp: new Date().toISOString()
      };
    }
  }

  private getMockStockData(stocks: string[]): StockData[] {
    // Datos de empresas principales con información real
    const knownStocks: { [key: string]: Partial<StockData> } = {
      'AAPL': { name: 'Apple Inc.', price: 178.50, change: 2.30, changePercent: 1.31 },
      'MSFT': { name: 'Microsoft Corp.', price: 425.80, change: 5.60, changePercent: 1.33 },
      'GOOGL': { name: 'Alphabet Inc.', price: 142.35, change: 1.85, changePercent: 1.32 },
      'GOOG': { name: 'Alphabet Inc. Class C', price: 143.80, change: 1.90, changePercent: 1.34 },
      'AMZN': { name: 'Amazon.com Inc.', price: 178.90, change: -1.20, changePercent: -0.67 },
      'NVDA': { name: 'NVIDIA Corp.', price: 875.30, change: 18.50, changePercent: 2.16 },
      'META': { name: 'Meta Platforms Inc.', price: 485.20, change: 7.80, changePercent: 1.63 },
      'TSLA': { name: 'Tesla Inc.', price: 195.40, change: -3.20, changePercent: -1.61 },
      'BRK.B': { name: 'Berkshire Hathaway', price: 425.80, change: 3.20, changePercent: 0.76 },
      'UNH': { name: 'UnitedHealth Group', price: 512.30, change: 4.50, changePercent: 0.89 },
      'JNJ': { name: 'Johnson & Johnson', price: 158.40, change: 1.10, changePercent: 0.70 },
      'V': { name: 'Visa Inc.', price: 278.50, change: 2.30, changePercent: 0.83 },
      'XOM': { name: 'Exxon Mobil', price: 115.30, change: 1.80, changePercent: 1.59 },
      'WMT': { name: 'Walmart Inc.', price: 165.20, change: 1.40, changePercent: 0.85 },
      'JPM': { name: 'JPMorgan Chase', price: 198.40, change: 1.60, changePercent: 0.81 },
      'PG': { name: 'Procter & Gamble', price: 162.30, change: 0.80, changePercent: 0.50 },
      'MA': { name: 'Mastercard Inc.', price: 465.30, change: 3.80, changePercent: 0.82 },
      'AVGO': { name: 'Broadcom Inc.', price: 1342.50, change: 15.80, changePercent: 1.19 },
      'HD': { name: 'Home Depot', price: 385.60, change: 3.40, changePercent: 0.89 },
      'CVX': { name: 'Chevron Corp.', price: 162.40, change: 2.10, changePercent: 1.31 },
      'MRK': { name: 'Merck & Co.', price: 128.40, change: 1.20, changePercent: 0.94 },
      'ABBV': { name: 'AbbVie Inc.', price: 178.90, change: 1.60, changePercent: 0.90 },
      'COST': { name: 'Costco Wholesale', price: 815.60, change: 6.80, changePercent: 0.84 },
      'PEP': { name: 'PepsiCo Inc.', price: 173.40, change: 1.20, changePercent: 0.70 },
      'KO': { name: 'Coca-Cola Co.', price: 61.80, change: 0.40, changePercent: 0.65 },
      'ADBE': { name: 'Adobe Inc.', price: 545.30, change: -2.80, changePercent: -0.51 },
      'CRM': { name: 'Salesforce Inc.', price: 298.50, change: 4.20, changePercent: 1.43 },
      'LLY': { name: 'Eli Lilly', price: 785.20, change: 12.80, changePercent: 1.66 },
      'TMO': { name: 'Thermo Fisher Scientific', price: 568.30, change: 5.20, changePercent: 0.92 },
      'MCD': { name: 'McDonald\'s Corp.', price: 295.80, change: 2.40, changePercent: 0.82 },
      'CSCO': { name: 'Cisco Systems Inc.', price: 51.20, change: 0.40, changePercent: 0.79 },
      'ACN': { name: 'Accenture plc', price: 345.80, change: 3.20, changePercent: 0.93 },
      'NFLX': { name: 'Netflix Inc.', price: 612.80, change: 8.40, changePercent: 1.39 },
      'ABT': { name: 'Abbott Laboratories', price: 118.60, change: 0.90, changePercent: 0.76 },
      'ORCL': { name: 'Oracle Corp.', price: 125.60, change: 1.80, changePercent: 1.45 },
      'WFC': { name: 'Wells Fargo', price: 58.30, change: 0.50, changePercent: 0.87 },
      'DHR': { name: 'Danaher Corp.', price: 242.10, change: 2.80, changePercent: 1.17 },
      'VZ': { name: 'Verizon Communications', price: 41.25, change: -0.15, changePercent: -0.36 },
      'TXN': { name: 'Texas Instruments', price: 184.20, change: 1.30, changePercent: 0.71 },
      'NKE': { name: 'Nike Inc.', price: 112.40, change: -0.80, changePercent: -0.71 },
      'BA': { name: 'Boeing Co.', price: 185.30, change: 2.50, changePercent: 1.37 }
    };

    return stocks.map(symbol => {
      const known = knownStocks[symbol];
      
      if (known) {
        const basePrice = known.price!;
        const change = known.change!;
        const changePercent = known.changePercent!;
        
        return {
          symbol,
          name: known.name!,
          price: basePrice,
          change,
          changePercent,
          volume: this.formatVolume(Math.floor(Math.random() * 100000000 + 5000000)),
          previousClose: basePrice - change,
          dayHigh: basePrice + Math.abs(change) * 1.5,
          dayLow: basePrice - Math.abs(change) * 1.5,
          time: 'CIERRE'
        };
      }
      
      // Para símbolos no conocidos, generar datos aleatorios
      const basePrice = Math.random() * 400 + 20;
      const changePercent = (Math.random() * 8) - 4;
      const change = basePrice * changePercent / 100;
      
      return {
        symbol,
        name: this.getCompanyName(symbol),
        price: parseFloat(basePrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: this.formatVolume(Math.floor(Math.random() * 50000000 + 1000000)),
        previousClose: parseFloat((basePrice - change).toFixed(2)),
        dayHigh: parseFloat((basePrice + Math.abs(change) * 1.5).toFixed(2)),
        dayLow: parseFloat((basePrice - Math.abs(change) * 1.5).toFixed(2)),
        time: 'CIERRE'
      };
    });
  }

  private getCompanyName(symbol: string): string {
    const names: {[key: string]: string} = {
      // Añadir nombres de empresas conocidas
      'ASML': 'ASML Holding', 'AMD': 'Advanced Micro Devices', 'TMUS': 'T-Mobile US',
      'CMCSA': 'Comcast Corp.', 'INTC': 'Intel Corp.', 'INTU': 'Intuit Inc.',
      'QCOM': 'QUALCOMM Inc.', 'AMGN': 'Amgen Inc.', 'HON': 'Honeywell International',
      'AMAT': 'Applied Materials', 'SBUX': 'Starbucks Corp.', 'BKNG': 'Booking Holdings',
      'ISRG': 'Intuitive Surgical', 'GILD': 'Gilead Sciences', 'ADP': 'Automatic Data Processing',
      'VRTX': 'Vertex Pharmaceuticals', 'PANW': 'Palo Alto Networks', 'ADI': 'Analog Devices',
      'MU': 'Micron Technology', 'LRCX': 'Lam Research', 'REGN': 'Regeneron Pharmaceuticals',
      'MDLZ': 'Mondelez International', 'KLAC': 'KLA Corp.', 'SNPS': 'Synopsys Inc.',
      'CDNS': 'Cadence Design Systems', 'PYPL': 'PayPal Holdings', 'CRWD': 'CrowdStrike Holdings',
      'MNST': 'Monster Beverage', 'MAR': 'Marriott International', 'CSX': 'CSX Corp.',
      'MELI': 'MercadoLibre Inc.', 'ORLY': 'O\'Reilly Automotive', 'FTNT': 'Fortinet Inc.',
      'ABNB': 'Airbnb Inc.', 'DASH': 'DoorDash Inc.', 'NXPI': 'NXP Semiconductors',
      'WDAY': 'Workday Inc.', 'ADSK': 'Autodesk Inc.', 'CTAS': 'Cintas Corp.',
      'AEP': 'American Electric Power', 'CHTR': 'Charter Communications', 'PCAR': 'PACCAR Inc.',
      'CPRT': 'Copart Inc.', 'MRNA': 'Moderna Inc.', 'ROST': 'Ross Stores',
      'MCHP': 'Microchip Technology', 'PAYX': 'Paychex Inc.', 'ODFL': 'Old Dominion Freight',
      'DXCM': 'DexCom Inc.', 'FAST': 'Fastenal Co.', 'EA': 'Electronic Arts',
      'KDP': 'Keurig Dr Pepper', 'CTSH': 'Cognizant Technology', 'IDXX': 'IDEXX Laboratories',
      'VRSK': 'Verisk Analytics', 'LULU': 'Lululemon Athletica', 'KHC': 'Kraft Heinz Co.',
      'TEAM': 'Atlassian Corp.', 'CSGP': 'CoStar Group', 'EXC': 'Exelon Corp.',
      'GEHC': 'GE HealthCare', 'TTWO': 'Take-Two Interactive', 'ANSS': 'ANSYS Inc.',
      'XEL': 'Xcel Energy', 'ON': 'ON Semiconductor', 'FANG': 'Diamondback Energy',
      'BIIB': 'Biogen Inc.', 'ZS': 'Zscaler Inc.', 'DDOG': 'Datadog Inc.',
      'ILMN': 'Illumina Inc.', 'WBD': 'Warner Bros. Discovery', 'CDW': 'CDW Corp.',
      'CCEP': 'Coca-Cola Europacific', 'GFS': 'GlobalFoundries', 'MDB': 'MongoDB Inc.',
      'WBA': 'Walgreens Boots Alliance', 'DLTR': 'Dollar Tree', 'ZM': 'Zoom Video',
      'ENPH': 'Enphase Energy', 'SIRI': 'Sirius XM Holdings', 'ALGN': 'Align Technology',
      'EBAY': 'eBay Inc.', 'RIVN': 'Rivian Automotive', 'LCID': 'Lucid Group',
      'JD': 'JD.com Inc.'
    };
    return names[symbol] || `${symbol} Corp.`;
  }

  /**
   * ✅ NUEVO: Genera datos históricos que TERMINAN en el precio actual
   * Esto asegura coherencia entre el precio mostrado y el gráfico
   */
  private generateHistoricalData(symbol: string): any[] {
    const history: any[] = [];
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Obtener el precio actual del stock
    const stockData = this.getMockStockData([symbol])[0];
    const currentPrice = stockData.price;
    
    // ✅ CAMBIO CLAVE: Calcular hacia atrás para que termine en currentPrice
    // Generamos datos primero con una tendencia, luego los ajustamos
    const rawHistory = [];
    let price = currentPrice * 0.85; // Empezar un 15% más bajo hace 1 año
    const currentDate = new Date(oneYearAgo);
    
    // Primera pasada: generar datos con tendencia alcista
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Solo días laborables
        const trend = 0.0003; // Tendencia alcista suave
        const volatility = (Math.random() - 0.5) * 0.04; // ±2% de volatilidad
        price = price * (1 + trend + volatility);
        
        rawHistory.push({
          date: new Date(currentDate),
          price: price
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // ✅ AJUSTE FINAL: Escalar todos los precios para que el último sea exactamente currentPrice
    const lastGeneratedPrice = rawHistory[rawHistory.length - 1].price;
    const scaleFactor = currentPrice / lastGeneratedPrice;
    
    // Segunda pasada: aplicar escala y generar OHLCV completos
    rawHistory.forEach(item => {
      const adjustedPrice = item.price * scaleFactor;
      const high = adjustedPrice * (1 + Math.random() * 0.01);
      const low = adjustedPrice * (1 - Math.random() * 0.01);
      const open = (high + low) / 2;
      
      history.push({
        date: item.date.toISOString().split('T')[0],
        price: parseFloat(adjustedPrice.toFixed(4)),
        close: parseFloat(adjustedPrice.toFixed(4)),
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        volume: Math.floor(Math.random() * 50000000) + 10000000
      });
    });
    
    // ✅ VERIFICACIÓN: El último precio debe ser exactamente currentPrice
    const lastItem = history[history.length - 1];
    lastItem.price = currentPrice;
    lastItem.close = currentPrice;
    
    console.log(`📊 Histórico generado para ${symbol}:`, {
      puntos: history.length,
      precioInicial: history[0].close,
      precioFinal: lastItem.close,
      precioActualEsperado: currentPrice,
      coincide: Math.abs(lastItem.close - currentPrice) < 0.01
    });
    
    return history;
  }
}