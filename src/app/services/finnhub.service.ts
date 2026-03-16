import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinnhubService {
  private baseURL = 'https://finnhub.io/api/v1';
  private apiKey = environment.finnhub.key;
  
  // Mapeo de símbolos IBEX35 a tickers de Finnhub
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
    'UNICAJA BANCO': 'UNI.MC'
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtener cotización actual de una acción
   */
  getQuote(symbol: string): Observable<FinnhubQuote> {
    if (!environment.finnhub.enabled || !this.apiKey) {
      return throwError(() => new Error('Finnhub API no configurada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.baseURL}/quote?symbol=${ticker}&token=${this.apiKey}`;

    return this.http.get<FinnhubQuote>(url).pipe(
      catchError(error => {
        console.error('Error fetching Finnhub quote:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener perfil de empresa
   */
  getProfile(symbol: string): Observable<FinnhubProfile> {
    if (!environment.finnhub.enabled || !this.apiKey) {
      return throwError(() => new Error('Finnhub API no configurada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.baseURL}/stock/profile2?symbol=${ticker}&token=${this.apiKey}`;

    return this.http.get<FinnhubProfile>(url).pipe(
      catchError(error => {
        console.error('Error fetching Finnhub profile:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener datos de velas (histórico)
   */
  getCandles(
    symbol: string,
    resolution: string = 'D',  // D = daily, 1 = 1min, 5 = 5min, 15, 30, 60
    from: number,  // Unix timestamp
    to: number     // Unix timestamp
  ): Observable<any> {
    if (!environment.finnhub.enabled || !this.apiKey) {
      return throwError(() => new Error('Finnhub API no configurada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.baseURL}/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`;

    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Error fetching Finnhub candles:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener noticias de empresa
   */
  getNews(symbol: string, from: string, to: string): Observable<any[]> {
    if (!environment.finnhub.enabled || !this.apiKey) {
      return throwError(() => new Error('Finnhub API no configurada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.baseURL}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${this.apiKey}`;

    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('Error fetching Finnhub news:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Convertir respuesta de Finnhub al formato de tu app
   */
  convertToStockData(symbol: string, quote: FinnhubQuote): any {
    return {
      symbol: symbol,
      name: symbol,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      volume: '0',  // Finnhub no devuelve volumen en quote
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
   * Verificar si Finnhub está configurado y habilitado
   */
  isConfigured(): boolean {
    return environment.finnhub.enabled && !!this.apiKey;
  }
}