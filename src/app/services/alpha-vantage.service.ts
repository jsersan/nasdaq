import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  timestamp: string;
}

export interface AlphaVantageHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price?: number; // Alias para close
}

@Injectable({
  providedIn: 'root'
})
export class AlphaVantageService {
  private readonly API_KEY = environment.alphaVantage.apiKey;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  
  // Cache para evitar rate limits
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor(private http: HttpClient) {
    console.log('🔌 AlphaVantageService inicializado');
    console.log('   API Key:', this.API_KEY ? `${this.API_KEY.substring(0, 8)}...` : '❌ NO CONFIGURADA');
  }

  /**
   * ✅ Obtener cotización en tiempo real (GLOBAL_QUOTE)
   */
  getQuote(symbol: string): Observable<AlphaVantageQuote> {
    console.log(`📊 Solicitando quote para: ${symbol}`);
    
    // Verificar cache
    const cached = this.getFromCache(`quote_${symbol}`);
    if (cached) {
      console.log(`✅ Quote de ${symbol} obtenida desde CACHE`);
      return of(cached);
    }

    const params = new HttpParams()
      .set('function', 'GLOBAL_QUOTE')
      .set('symbol', symbol)
      .set('apikey', this.API_KEY);

    return this.http.get<any>(this.BASE_URL, { params }).pipe(
      timeout(10000), // 10 segundos timeout
      retry(2), // Reintentar 2 veces si falla
      map(response => {
        console.log(`📥 Respuesta Alpha Vantage para ${symbol}:`, response);
        
        // Verificar si hay error de rate limit
        if (response['Note']) {
          throw new Error('⚠️ Rate limit alcanzado. Espera 1 minuto.');
        }
        
        // Verificar si hay error de API key
        if (response['Error Message']) {
          throw new Error('❌ API Key inválida o símbolo no encontrado');
        }

        const quote = response['Global Quote'];
        
        if (!quote || Object.keys(quote).length === 0) {
          throw new Error(`❌ No se encontraron datos para ${symbol}`);
        }

        const data: AlphaVantageQuote = {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          previousClose: parseFloat(quote['08. previous close']),
          dayHigh: parseFloat(quote['03. high']),
          dayLow: parseFloat(quote['04. low']),
          timestamp: quote['07. latest trading day']
        };

        // Guardar en cache
        this.saveToCache(`quote_${symbol}`, data);
        
        console.log(`✅ Quote procesado:`, data);
        return data;
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo quote de ${symbol}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Obtener datos históricos diarios (TIME_SERIES_DAILY)
   */
  getHistoricalData(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Observable<AlphaVantageHistoricalData[]> {
    console.log(`📈 Solicitando histórico para: ${symbol} (${outputSize})`);
    
    // Verificar cache
    const cached = this.getFromCache(`history_${symbol}_${outputSize}`);
    if (cached) {
      console.log(`✅ Histórico de ${symbol} obtenido desde CACHE (${cached.length} puntos)`);
      return of(cached);
    }

    const params = new HttpParams()
      .set('function', 'TIME_SERIES_DAILY')
      .set('symbol', symbol)
      .set('outputsize', outputSize) // compact = 100 días, full = 20+ años
      .set('apikey', this.API_KEY);

    return this.http.get<any>(this.BASE_URL, { params }).pipe(
      timeout(15000), // 15 segundos timeout
      retry(2),
      map(response => {
        console.log(`📥 Respuesta histórica Alpha Vantage para ${symbol}`);
        
        // Verificar errores
        if (response['Note']) {
          throw new Error('⚠️ Rate limit alcanzado. Espera 1 minuto.');
        }
        
        if (response['Error Message']) {
          throw new Error('❌ API Key inválida o símbolo no encontrado');
        }

        const timeSeries = response['Time Series (Daily)'];
        
        if (!timeSeries) {
          throw new Error(`❌ No se encontraron datos históricos para ${symbol}`);
        }

        // Convertir objeto a array ordenado
        const history: AlphaVantageHistoricalData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
          price: parseFloat(values['4. close']) // Alias
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordenar ascendente

        console.log(`✅ Histórico procesado: ${history.length} puntos desde ${history[0].date} hasta ${history[history.length - 1].date}`);
        
        // Guardar en cache
        this.saveToCache(`history_${symbol}_${outputSize}`, history);
        
        return history;
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo histórico de ${symbol}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Obtener datos intraday (1min, 5min, 15min, 30min, 60min)
   */
  getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'): Observable<AlphaVantageHistoricalData[]> {
    console.log(`⏰ Solicitando datos intraday para: ${symbol} (${interval})`);
    
    const params = new HttpParams()
      .set('function', 'TIME_SERIES_INTRADAY')
      .set('symbol', symbol)
      .set('interval', interval)
      .set('apikey', this.API_KEY);

    return this.http.get<any>(this.BASE_URL, { params }).pipe(
      timeout(15000),
      retry(2),
      map(response => {
        const timeSeries = response[`Time Series (${interval})`];
        
        if (!timeSeries) {
          throw new Error(`❌ No se encontraron datos intraday para ${symbol}`);
        }

        const data: AlphaVantageHistoricalData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
          price: parseFloat(values['4. close'])
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log(`✅ Intraday procesado: ${data.length} puntos`);
        return data;
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo intraday de ${symbol}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Buscar símbolos (SYMBOL_SEARCH)
   */
  searchSymbol(keywords: string): Observable<any[]> {
    console.log(`🔍 Buscando: ${keywords}`);
    
    const params = new HttpParams()
      .set('function', 'SYMBOL_SEARCH')
      .set('keywords', keywords)
      .set('apikey', this.API_KEY);

    return this.http.get<any>(this.BASE_URL, { params }).pipe(
      timeout(10000),
      map(response => {
        const matches = response['bestMatches'] || [];
        console.log(`✅ Encontrados ${matches.length} resultados`);
        return matches;
      }),
      catchError(error => {
        console.error(`❌ Error buscando ${keywords}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 💾 Sistema de Cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Guardado en cache: ${key}`);
  }

  /**
   * 🗑️ Limpiar cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache limpiado');
  }

  /**
   * ℹ️ Obtener información del estado del servicio
   */
  getServiceInfo(): { apiKey: string; cacheSize: number; isConfigured: boolean } {
    return {
      apiKey: this.API_KEY ? `${this.API_KEY.substring(0, 8)}...` : 'NO CONFIGURADA',
      cacheSize: this.cache.size,
      isConfigured: !!this.API_KEY && this.API_KEY.length > 10
    };
  }
}