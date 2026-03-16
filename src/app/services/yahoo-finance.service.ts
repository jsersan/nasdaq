import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class YahooFinanceService {
  
  // ✅ CORRECTO - Lee de environment según el modo (dev/prod)
  private backendUrl = environment.yahooFinance.backendUrl;

  // Mapeo de símbolos a Yahoo Finance
  private symbolMap: { [key: string]: string } = {
    'ACCIONA': 'ANA.MC',
    'ACCIONA ENERGÍA': 'ANE.MC',
    'ACERINOX': 'ACX.MC',
    'ACS CONST.': 'ACS.MC',
    'AENA': 'AENA.MC',
    'AMADEUS IT': 'AMS.MC',
    'ARCEL.MITTAL': 'MTS.MC',
    'BANKINTER': 'BKT.MC',
    'BBVA': 'BBVA.MC',
    'CAIXABANK': 'CABK.MC',
    'CELLNEX TEL.': 'CLNX.MC',
    'COLONIAL': 'COL.MC',
    'ENAGAS': 'ENG.MC',
    'ENDESA': 'ELE.MC',
    'FERROVIAL INTL RG': 'FER.MC',
    'FLUIDRA': 'FDR.MC',
    'GRIFOLS': 'GRF.MC',
    'IAG (IBERIA)': 'IAG.MC',
    'IBERDROLA': 'IBE.MC',
    'INDRA A': 'IDR.MC',
    'INDITEX': 'ITX.MC',
    'LABORAT.ROVI': 'ROVI.MC',
    'LOGISTA': 'LOG.MC',
    'MAPFRE': 'MAP.MC',
    'MERLIN PROP.': 'MRL.MC',
    'NATURGY': 'NTGY.MC',
    'PUIG BRANDS S RG': 'PUIG.MC',
    'REDEIA CORPORACIÓN': 'RED.MC',
    'REPSOL': 'REP.MC',
    'B.SABADELL': 'SAB.MC',
    'SACYR': 'SCYR.MC',
    'SANTANDER': 'SAN.MC',
    'SOLARIA': 'SLR.MC',
    'TELEFONICA': 'TEF.MC',
    'UNICAJA BANCO': 'UNI.MC',
    '^IBEX': '^IBEX'
  };

  constructor(private http: HttpClient) {
    // Log para debugging
    console.log(`🔧 YahooFinanceService inicializado`);
    console.log(`📡 Backend URL: ${this.backendUrl}`);
    console.log(`🏭 Production: ${environment.production}`);
  }

  /**
   * ✅ MÉTODO MEJORADO: Obtener histórico de precios
   * Este método debe ser llamado por price-chart.component
   */
  getHistory(symbol: string, period: string = '1y'): Observable<any[]> {
    if (!environment.yahooFinance?.enabled) {
      return throwError(() => new Error('Yahoo Finance deshabilitada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.backendUrl}/history/${ticker}`;
    
    console.log(`📊 GET History: ${url}`);
    
    return this.http.get<any[]>(url, { 
      params: { period },
      responseType: 'json' 
    }).pipe(
      timeout(15000), // Aumentar timeout para datos históricos
      map((data: any) => {
        console.log(`✅ Histórico ${ticker}: ${data.length} registros`);
        
        // ✅ Normalizar formato de respuesta
        // El backend puede devolver diferentes formatos
        if (Array.isArray(data)) {
          return data;
        } else if (data.history && Array.isArray(data.history)) {
          return data.history;
        } else if (data.results && Array.isArray(data.results)) {
          return data.results;
        }
        
        console.warn('⚠️ Formato de respuesta no reconocido:', data);
        return [];
      }),
      catchError(error => {
        console.error(`❌ Error histórico ${ticker}:`, error);
        
        // Mensaje de error más descriptivo
        let errorMessage = 'Error al cargar datos históricos';
        if (error.status === 0) {
          errorMessage = 'No se puede conectar al backend. Verifica que esté corriendo en ' + this.backendUrl;
        } else if (error.status === 404) {
          errorMessage = `No se encontró el endpoint ${url}`;
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Obtener cotización usando backend propio
   */
  getQuote(symbol: string): Observable<any> {
    if (!environment.yahooFinance?.enabled) {
      return throwError(() => new Error('Yahoo Finance deshabilitada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.backendUrl}/quote/${ticker}`;
    
    console.log(`📊 GET ${url}`);
    
    return this.http.get(url, { responseType: 'json' }).pipe(
      timeout(10000),
      map((data: any) => {
        console.log(`✅ ${ticker}: ${data.c}`);
        return data;
      }),
      catchError(error => {
        console.error(`❌ Error ${ticker}:`, error);
        return throwError(() => new Error(`No se pudo obtener datos de ${symbol}`));
      })
    );
  }

  /**
   * Obtener datos de índice usando backend
   */
  getIndex(symbol: string): Observable<any> {
    if (!environment.yahooFinance?.enabled) {
      return throwError(() => new Error('Yahoo Finance deshabilitada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.backendUrl}/index/${ticker}`;
    
    console.log(`📈 GET ${url}`);
    
    return this.http.get(url, { responseType: 'json' }).pipe(
      timeout(10000),
      map((data: any) => data),
      catchError(error => {
        console.error(`❌ Error índice ${ticker}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener ticker de Yahoo Finance
   */
  getTicker(symbol: string): string {
    return this.symbolMap[symbol] || symbol;
  }

  /**
   * Convertir respuesta al formato de la app
   */
  convertToStockData(symbol: string, quote: any): any {
    return {
      symbol,
      name: symbol,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      volume: this.formatVolume(quote.volume),
      previousClose: quote.pc,
      dayHigh: quote.h,
      dayLow: quote.l,
      time: new Date(quote.t * 1000).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Formatear volumen
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000) return Math.floor(volume / 1000000) + 'M';
    if (volume >= 1000) return Math.floor(volume / 1000) + 'K';
    return volume.toString();
  }

  /**
   * Verificar si está configurado
   */
  isConfigured(): boolean {
    return environment.yahooFinance?.enabled === true;
  }
}