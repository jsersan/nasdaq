import { Injectable } from '@angular/core';

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketState {
  trend: 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
  strength: number; // 0-100
  direction: 'bullish' | 'bearish' | 'neutral';
  phase: 'trending' | 'ranging' | 'consolidating';
  confidence: number; // 0-100
  description: string;
  recommendedIndicators: string[];
}

export interface TechnicalIndicators {
  // NUEVO: Estado del mercado
  marketState?: MarketState;
  
  // Medias Móviles
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema10: number | null;
  ema20: number | null;
  ema50: number | null;
  
  // MACD
  macd: {
    value: number;
    signal: number;
    histogram: number;
  } | null;
  
  // Ichimoku
  ichimoku: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    chikou: number;
    cloudColor: 'green' | 'red';
  } | null;
  
  // ADX
  adx: {
    value: number;
    plusDI: number;
    minusDI: number;
  } | null;
  
  // Parabolic SAR
  sar: number | null;
  
  // Osciladores
  rsi: number | null;
  stochastic: {
    k: number;
    d: number;
  } | null;
  cci: number | null;
  williamsR: number | null;
  momentum: number | null;
  aroon: {
    up: number;
    down: number;
  } | null;
  
  // Volatilidad y Volumen
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  } | null;
  
  atr: number | null;
  
  obv: number | null;
  
  volumeAnalysis: {
    current: number;
    average: number;
    trend: 'high' | 'low' | 'normal';
    spike: boolean;
  } | null;
  
  // Soporte/Resistencia
  fibonacci: {
    level236: number;
    level382: number;
    level50: number;
    level618: number;
    high: number;
    low: number;
  } | null;
  
  pivotPoints: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  } | null;
}

export interface TradingSignal {
  indicator: string;
  type: 'buy' | 'sell' | 'neutral' | 'strong_buy' | 'strong_sell';
  message: string;
  strength: number;
  timestamp: Date;
  priority?: number; // NUEVO: 1=alta, 2=media, 3=baja
}

@Injectable({
  providedIn: 'root'
})
export class TechnicalIndicatorsService {

  constructor() {}

  /**
   * NUEVO: Detectar estado del mercado automáticamente
   */
  private detectMarketState(
    indicators: TechnicalIndicators, 
    currentPrice: number,
    priceHistory: PriceData[]
  ): MarketState {
    let trendScore = 0; // -100 (fuerte bajista) a +100 (fuerte alcista)
    let strengthScore = 0; // 0-100
    let confidence = 0; // 0-100
    let evidence: string[] = [];
    const detailedReasons: string[] = [];
    
    // 1. Análisis de Medias Móviles (peso: 25%)
    if (indicators.sma20 && indicators.sma50) {
      if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
        trendScore += 25;
        evidence.push('Precio sobre SMA20>SMA50');
        detailedReasons.push(
          `Las medias móviles muestran alineación alcista: el precio (${currentPrice.toFixed(2)}€) está por encima de la SMA20 (${indicators.sma20.toFixed(2)}€), ` +
          `que a su vez está por encima de la SMA50 (${indicators.sma50.toFixed(2)}€). Esta configuración indica que la tendencia de corto y medio plazo es alcista.`
        );
      } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
        trendScore -= 25;
        evidence.push('Precio bajo SMA20<SMA50');
        detailedReasons.push(
          `Las medias móviles muestran alineación bajista: el precio (${currentPrice.toFixed(2)}€) está por debajo de la SMA20 (${indicators.sma20.toFixed(2)}€), ` +
          `que a su vez está por debajo de la SMA50 (${indicators.sma50.toFixed(2)}€). Esta configuración indica que la tendencia de corto y medio plazo es bajista.`
        );
      }
    }
    
    // 2. ADX - Fuerza de tendencia (peso: 20%)
    if (indicators.adx) {
      const adxValue = indicators.adx.value;
      const plusDI = indicators.adx.plusDI;
      const minusDI = indicators.adx.minusDI;
      
      if (adxValue > 25) {
        strengthScore += 40;
        confidence += 20;
        
        if (plusDI > minusDI) {
          trendScore += 20;
          const diff = (plusDI - minusDI).toFixed(1);
          detailedReasons.push(
            `El ADX presenta un valor de ${adxValue.toFixed(1)}, superior a 25, lo que indica una tendencia fuerte. ` +
            `El +DI (${plusDI.toFixed(1)}) es mayor que el -DI (${minusDI.toFixed(1)}) por ${diff} puntos, ` +
            `confirmando que la tendencia actual es alcista con fuerza.`
          );
          evidence.push(`ADX fuerte (${adxValue.toFixed(1)})`);
        } else {
          trendScore -= 20;
          const diff = (minusDI - plusDI).toFixed(1);
          detailedReasons.push(
            `El ADX presenta un valor de ${adxValue.toFixed(1)}, superior a 25, lo que indica una tendencia fuerte. ` +
            `El -DI (${minusDI.toFixed(1)}) es mayor que el +DI (${plusDI.toFixed(1)}) por ${diff} puntos, ` +
            `confirmando que la tendencia actual es bajista con fuerza.`
          );
          evidence.push(`ADX fuerte (${adxValue.toFixed(1)})`);
        }
      } else if (adxValue < 20) {
        strengthScore -= 20;
        detailedReasons.push(
          `El ADX tiene un valor de ${adxValue.toFixed(1)}, por debajo de 20, lo que indica ausencia de tendencia definida. ` +
          `El mercado se encuentra en rango lateral, siendo más apropiados los indicadores de sobrecompra/sobreventa.`
        );
        evidence.push('ADX débil - rango lateral');
      } else {
        detailedReasons.push(
          `El ADX muestra ${adxValue.toFixed(1)}, un valor intermedio (20-25) que sugiere una tendencia moderada pero no consolidada.`
        );
      }
    }
    
    // 3. MACD (peso: 15%)
    if (indicators.macd) {
      const macdValue = indicators.macd.value;
      const signal = indicators.macd.signal;
      const histogram = indicators.macd.histogram;
      
      if (histogram > 0) {
        trendScore += 15;
        if (Math.abs(histogram) > 0.5) {
          detailedReasons.push(
            `El MACD (${macdValue.toFixed(2)}) está por encima de su línea de señal (${signal.toFixed(2)}), ` +
            `con un histograma positivo de ${histogram.toFixed(2)}. Esto indica momentum alcista fuerte.`
          );
        } else {
          detailedReasons.push(
            `El MACD muestra cruce alcista con histograma positivo de ${histogram.toFixed(2)}, indicando inicio de momentum alcista.`
          );
        }
        evidence.push('MACD alcista');
      } else {
        trendScore -= 15;
        if (Math.abs(histogram) > 0.5) {
          detailedReasons.push(
            `El MACD (${macdValue.toFixed(2)}) está por debajo de su línea de señal (${signal.toFixed(2)}), ` +
            `con un histograma negativo de ${histogram.toFixed(2)}. Esto indica momentum bajista fuerte.`
          );
        } else {
          detailedReasons.push(
            `El MACD muestra cruce bajista con histograma negativo de ${histogram.toFixed(2)}, indicando inicio de momentum bajista.`
          );
        }
        evidence.push('MACD bajista');
      }
      
      if (Math.abs(histogram) > 0.5) {
        strengthScore += 20;
      }
    }
    
    // 4. Ichimoku (peso: 20%)
    if (indicators.ichimoku) {
      const cloudColor = indicators.ichimoku.cloudColor;
      const senkouA = indicators.ichimoku.senkouA;
      const senkouB = indicators.ichimoku.senkouB;
      
      if (cloudColor === 'green' && currentPrice > senkouA) {
        trendScore += 20;
        strengthScore += 20;
        confidence += 15;
        detailedReasons.push(
          `Ichimoku muestra nube verde (Senkou A: ${senkouA.toFixed(2)}€ > Senkou B: ${senkouB.toFixed(2)}€) ` +
          `y el precio (${currentPrice.toFixed(2)}€) está por encima de la nube. ` +
          `Esta es una señal alcista muy fuerte que indica soporte sólido y tendencia clara.`
        );
        evidence.push('Precio sobre nube verde');
      } else if (cloudColor === 'red' && currentPrice < senkouB) {
        trendScore -= 20;
        strengthScore += 20;
        confidence += 15;
        detailedReasons.push(
          `Ichimoku muestra nube roja (Senkou B: ${senkouB.toFixed(2)}€ > Senkou A: ${senkouA.toFixed(2)}€) ` +
          `y el precio (${currentPrice.toFixed(2)}€) está por debajo de la nube. ` +
          `Esta es una señal bajista muy fuerte que indica resistencia sólida y tendencia clara.`
        );
        evidence.push('Precio bajo nube roja');
      } else {
        detailedReasons.push(
          `El precio se encuentra dentro o cerca de la nube de Ichimoku, lo que indica indecisión del mercado.`
        );
      }
    }
    
    // 5. Aroon (peso: 10%)
    if (indicators.aroon) {
      const aroonUp = indicators.aroon.up;
      const aroonDown = indicators.aroon.down;
      
      if (aroonUp > 70 && aroonDown < 30) {
        trendScore += 10;
        detailedReasons.push(
          `El Aroon Up (${aroonUp.toFixed(1)}%) está por encima de 70 mientras que el Aroon Down (${aroonDown.toFixed(1)}%) ` +
          `está por debajo de 30. Esto indica que se han formado nuevos máximos recientemente, señal de tendencia alcista.`
        );
        evidence.push('Aroon alcista');
      } else if (aroonDown > 70 && aroonUp < 30) {
        trendScore -= 10;
        detailedReasons.push(
          `El Aroon Down (${aroonDown.toFixed(1)}%) está por encima de 70 mientras que el Aroon Up (${aroonUp.toFixed(1)}%) ` +
          `está por debajo de 30. Esto indica que se han formado nuevos mínimos recientemente, señal de tendencia bajista.`
        );
        evidence.push('Aroon bajista');
      }
    }
    
    // 6. Momentum (peso: 10%)
    if (indicators.momentum !== null && indicators.momentum !== undefined) {
      if (indicators.momentum > 0) {
        trendScore += 10;
        detailedReasons.push(
          `El Momentum es positivo (${indicators.momentum.toFixed(2)}), indicando que el precio actual está por encima del precio de hace 10 períodos, lo que confirma tendencia alcista.`
        );
      } else {
        trendScore -= 10;
        detailedReasons.push(
          `El Momentum es negativo (${indicators.momentum.toFixed(2)}), indicando que el precio actual está por debajo del precio de hace 10 períodos, lo que confirma tendencia bajista.`
        );
      }
    }
    
    // Normalizar scores
    strengthScore = Math.min(100, Math.max(0, strengthScore));
    confidence = Math.min(100, Math.max(0, confidence + 40)); // Base 40%
    
    // Determinar tendencia
    let trend: MarketState['trend'];
    let direction: MarketState['direction'];
    let phase: MarketState['phase'];
    let description: string;
    let recommendedIndicators: string[];
    
    if (trendScore >= 50) {
      trend = 'strong_uptrend';
      direction = 'bullish';
      phase = 'trending';
      description = detailedReasons.join(' ');
      recommendedIndicators = ['ADX', 'Parabolic SAR', 'EMA', 'MACD', 'Ichimoku'];
    } else if (trendScore >= 20) {
      trend = 'uptrend';
      direction = 'bullish';
      phase = 'trending';
      description = detailedReasons.join(' ');
      recommendedIndicators = ['SMA', 'MACD', 'ADX', 'Bollinger Bands'];
    } else if (trendScore <= -50) {
      trend = 'strong_downtrend';
      direction = 'bearish';
      phase = 'trending';
      description = detailedReasons.join(' ');
      recommendedIndicators = ['ADX', 'Parabolic SAR', 'EMA', 'MACD', 'Ichimoku'];
    } else if (trendScore <= -20) {
      trend = 'downtrend';
      direction = 'bearish';
      phase = 'trending';
      description = detailedReasons.join(' ');
      recommendedIndicators = ['SMA', 'MACD', 'ADX', 'Bollinger Bands'];
    } else {
      trend = 'sideways';
      direction = 'neutral';
      
      // Determinar si está consolidando o en rango
      if (indicators.bollingerBands && indicators.bollingerBands.bandwidth < 10) {
        phase = 'consolidating';
        description = `Nos encontramos en fase de consolidación. ` + detailedReasons.join(' ') + 
          ` Las Bandas de Bollinger muestran un ancho de ${indicators.bollingerBands.bandwidth.toFixed(1)}%, ` +
          `indicando baja volatilidad y posible breakout inminente.`;
      } else {
        phase = 'ranging';
        description = `Nos encontramos en fase de rango lateral. ` + detailedReasons.join(' ') + 
          ` En esta situación, son más efectivos los osciladores que detectan zonas de sobrecompra y sobreventa.`;
      }
      
      recommendedIndicators = ['RSI', 'Estocástico', 'CCI', 'Bollinger Bands', 'Fibonacci'];
    }
    
    return {
      trend,
      strength: strengthScore,
      direction,
      phase,
      confidence,
      description,
      recommendedIndicators
    };
  }

  /**
   * Calcular todos los indicadores técnicos + DETECTAR ESTADO
   */
  calculateIndicators(priceHistory: PriceData[], currentPrice?: number): TechnicalIndicators {
    if (!priceHistory || priceHistory.length < 50) {
      return this.getEmptyIndicators();
    }

    const closes = priceHistory.map(p => p.close);
    const highs = priceHistory.map(p => p.high);
    const lows = priceHistory.map(p => p.low);
    const price = currentPrice || closes[closes.length - 1];

    const indicators: TechnicalIndicators = {
      // Medias Móviles
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      ema10: this.calculateEMA(closes, 10),
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      
      // MACD
      macd: this.calculateMACD(closes),
      
      // Ichimoku
      ichimoku: this.calculateIchimoku(priceHistory),
      
      // ADX
      adx: this.calculateADX(priceHistory, 14),
      
      // Parabolic SAR (corregido)
      sar: this.calculateParabolicSAR(priceHistory),
      
      // Osciladores
      rsi: this.calculateRSI(closes, 14),
      stochastic: this.calculateStochastic(priceHistory, 14),
      cci: this.calculateCCI(priceHistory, 20),
      williamsR: this.calculateWilliamsR(highs, lows, closes, 14),
      momentum: this.calculateMomentum(closes, 10),
      aroon: this.calculateAroon(highs, lows, 25),
      
      // Volatilidad y Volumen
      bollingerBands: this.calculateBollingerBands(closes, 20),
      atr: this.calculateATR(priceHistory, 14),
      obv: this.calculateOBV(priceHistory),
      volumeAnalysis: this.calculateVolumeAnalysis(priceHistory),
      
      // Soporte/Resistencia
      fibonacci: this.calculateFibonacci(priceHistory, 50),
      pivotPoints: this.calculatePivotPoints(priceHistory)
    };
    
    // NUEVO: Detectar estado del mercado
    indicators.marketState = this.detectMarketState(indicators, price, priceHistory);
    
    return indicators;
  }

  /**
   * MEJORADO: Generar señales priorizadas según estado del mercado
   */
  generateSignals(indicators: TechnicalIndicators, currentPrice: number): TradingSignal[] {
    const signals: TradingSignal[] = [];
    const marketState = indicators.marketState;
    
    // Si estamos en tendencia fuerte, priorizar indicadores de tendencia
    if (marketState && (marketState.phase === 'trending')) {
      this.addTrendFollowingSignals(signals, indicators, currentPrice, marketState);
    }
    
    // Si estamos en rango, priorizar osciladores
    if (marketState && marketState.phase === 'ranging') {
      this.addRangeBoundSignals(signals, indicators, currentPrice);
    }
    
    // Si estamos consolidando, priorizar señales de breakout
    if (marketState && marketState.phase === 'consolidating') {
      this.addBreakoutSignals(signals, indicators, currentPrice);
    }
    
    // Señales generales (siempre activas)
    this.addGeneralSignals(signals, indicators, currentPrice);
    
    // Ordenar por prioridad y strength
    return signals.sort((a, b) => {
      const priorityDiff = (a.priority || 3) - (b.priority || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return b.strength - a.strength;
    });
  }

  /**
   * NUEVO: Señales para tendencias
   */
  private addTrendFollowingSignals(
    signals: TradingSignal[], 
    indicators: TechnicalIndicators, 
    currentPrice: number,
    marketState: MarketState
  ) {
    // ADX con dirección
    if (indicators.adx && indicators.adx.value > 25) {
      if (indicators.adx.plusDI > indicators.adx.minusDI) {
        signals.push({
          indicator: 'ADX',
          type: marketState.strength > 70 ? 'strong_buy' : 'buy',
          message: `Tendencia alcista confirmada (ADX: ${indicators.adx.value.toFixed(1)}, +DI > -DI)`,
          strength: Math.min(indicators.adx.value, 100),
          timestamp: new Date(),
          priority: 1
        });
      } else {
        signals.push({
          indicator: 'ADX',
          type: marketState.strength > 70 ? 'strong_sell' : 'sell',
          message: `Tendencia bajista confirmada (ADX: ${indicators.adx.value.toFixed(1)}, -DI > +DI)`,
          strength: Math.min(indicators.adx.value, 100),
          timestamp: new Date(),
          priority: 1
        });
      }
    }
    
    // Ichimoku en tendencia
    if (indicators.ichimoku) {
      if (indicators.ichimoku.cloudColor === 'green' && currentPrice > indicators.ichimoku.senkouA) {
        signals.push({
          indicator: 'Ichimoku',
          type: 'strong_buy',
          message: `Precio sobre nube verde - Tendencia alcista muy fuerte`,
          strength: 85,
          timestamp: new Date(),
          priority: 1
        });
      } else if (indicators.ichimoku.cloudColor === 'red' && currentPrice < indicators.ichimoku.senkouB) {
        signals.push({
          indicator: 'Ichimoku',
          type: 'strong_sell',
          message: `Precio bajo nube roja - Tendencia bajista muy fuerte`,
          strength: 85,
          timestamp: new Date(),
          priority: 1
        });
      }
    }
    
    // MACD para confirmar tendencia
    if (indicators.macd && Math.abs(indicators.macd.histogram) > 0.3) {
      if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
        signals.push({
          indicator: 'MACD',
          type: 'buy',
          message: `Momentum alcista fuerte (Histograma: ${indicators.macd.histogram.toFixed(2)})`,
          strength: 75,
          timestamp: new Date(),
          priority: 1
        });
      } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
        signals.push({
          indicator: 'MACD',
          type: 'sell',
          message: `Momentum bajista fuerte (Histograma: ${indicators.macd.histogram.toFixed(2)})`,
          strength: 75,
          timestamp: new Date(),
          priority: 1
        });
      }
    }
  }

  /**
   * NUEVO: Señales para rangos laterales
   */
  private addRangeBoundSignals(
    signals: TradingSignal[], 
    indicators: TechnicalIndicators, 
    currentPrice: number
  ) {
    // RSI en extremos
    if (indicators.rsi !== null) {
      if (indicators.rsi < 30) {
        signals.push({
          indicator: 'RSI',
          type: 'buy',
          message: `Sobreventa extrema en rango (RSI: ${indicators.rsi.toFixed(1)}) - Rebote probable`,
          strength: Math.min((30 - indicators.rsi) * 3, 100),
          timestamp: new Date(),
          priority: 1
        });
      } else if (indicators.rsi > 70) {
        signals.push({
          indicator: 'RSI',
          type: 'sell',
          message: `Sobrecompra extrema en rango (RSI: ${indicators.rsi.toFixed(1)}) - Corrección probable`,
          strength: Math.min((indicators.rsi - 70) * 3, 100),
          timestamp: new Date(),
          priority: 1
        });
      }
    }
    
    // Estocástico en zonas extremas
    if (indicators.stochastic) {
      if (indicators.stochastic.k < 20 && indicators.stochastic.k < indicators.stochastic.d) {
        signals.push({
          indicator: 'Estocástico',
          type: 'buy',
          message: `Sobreventa confirmada (%K: ${indicators.stochastic.k.toFixed(1)} < %D) - Compra en rango`,
          strength: 70,
          timestamp: new Date(),
          priority: 1
        });
      } else if (indicators.stochastic.k > 80 && indicators.stochastic.k > indicators.stochastic.d) {
        signals.push({
          indicator: 'Estocástico',
          type: 'sell',
          message: `Sobrecompra confirmada (%K: ${indicators.stochastic.k.toFixed(1)} > %D) - Venta en rango`,
          strength: 70,
          timestamp: new Date(),
          priority: 1
        });
      }
    }
    
    // Bandas de Bollinger para rebotes
    if (indicators.bollingerBands) {
      if (currentPrice <= indicators.bollingerBands.lower) {
        signals.push({
          indicator: 'Bollinger Bands',
          type: 'buy',
          message: `Precio en banda inferior (${indicators.bollingerBands.lower.toFixed(2)}€) - Rebote probable`,
          strength: 75,
          timestamp: new Date(),
          priority: 1
        });
      } else if (currentPrice >= indicators.bollingerBands.upper) {
        signals.push({
          indicator: 'Bollinger Bands',
          type: 'sell',
          message: `Precio en banda superior (${indicators.bollingerBands.upper.toFixed(2)}€) - Retroceso probable`,
          strength: 75,
          timestamp: new Date(),
          priority: 1
        });
      }
    }
  }

  /**
   * NUEVO: Señales para consolidación/breakout
   */
  private addBreakoutSignals(
    signals: TradingSignal[], 
    indicators: TechnicalIndicators, 
    currentPrice: number
  ) {
    // Bollinger Squeeze
    if (indicators.bollingerBands && indicators.bollingerBands.bandwidth < 10) {
      signals.push({
        indicator: 'Bollinger Squeeze',
        type: 'neutral',
        message: `Squeeze extremo (Ancho: ${indicators.bollingerBands.bandwidth.toFixed(1)}%) - Gran movimiento inminente`,
        strength: 80,
        timestamp: new Date(),
        priority: 1
      });
    }
    
    // Volumen anómalo
    if (indicators.volumeAnalysis && indicators.volumeAnalysis.spike) {
      const ratio = (indicators.volumeAnalysis.current / indicators.volumeAnalysis.average * 100).toFixed(0);
      signals.push({
        indicator: 'Volumen',
        type: 'neutral',
        message: `Pico de volumen (${ratio}% vs promedio) - Posible breakout`,
        strength: 75,
        timestamp: new Date(),
        priority: 1
      });
    }
    
    // ADX bajo pero empezando a subir (señal temprana de nuevo trend)
    if (indicators.adx && indicators.adx.value > 15 && indicators.adx.value < 25) {
      signals.push({
        indicator: 'ADX',
        type: 'neutral',
        message: `ADX en ${indicators.adx.value.toFixed(1)} - Posible inicio de nueva tendencia`,
        strength: 60,
        timestamp: new Date(),
        priority: 2
      });
    }
  }

  /**
   * Señales generales (siempre activas, prioridad más baja)
   */
  private addGeneralSignals(
    signals: TradingSignal[], 
    indicators: TechnicalIndicators, 
    currentPrice: number
  ) {
    // Cruces de medias móviles
    if (indicators.sma20 && indicators.sma50) {
      if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
        signals.push({
          indicator: 'SMA',
          type: 'buy',
          message: `Alineación alcista: Precio > SMA20 > SMA50`,
          strength: 65,
          timestamp: new Date(),
          priority: 2
        });
      } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
        signals.push({
          indicator: 'SMA',
          type: 'sell',
          message: `Alineación bajista: Precio < SMA20 < SMA50`,
          strength: 65,
          timestamp: new Date(),
          priority: 2
        });
      }
    }
    
    // Fibonacci (niveles clave)
    if (indicators.fibonacci) {
      const tolerance = (indicators.fibonacci.high - indicators.fibonacci.low) * 0.02;
      
      if (Math.abs(currentPrice - indicators.fibonacci.level618) < tolerance) {
        signals.push({
          indicator: 'Fibonacci',
          type: 'neutral',
          message: `Precio en nivel 61.8% (${indicators.fibonacci.level618.toFixed(2)}€) - Nivel clave`,
          strength: 70,
          timestamp: new Date(),
          priority: 2
        });
      }
    }
    
    // ATR para gestión de riesgo
    if (indicators.atr) {
      const stopDistance = indicators.atr * 2;
      signals.push({
        indicator: 'ATR',
        type: 'neutral',
        message: `Stop Loss sugerido: ${stopDistance.toFixed(2)}€ (2x ATR)`,
        strength: 50,
        timestamp: new Date(),
        priority: 3
      });
    }
  }

  /**
   * Obtener consenso general
   */
  getConsensus(signals: TradingSignal[]): { type: string; strength: number; message: string } {
    if (signals.length === 0) {
      return { type: 'neutral', strength: 0, message: 'Sin señales suficientes' };
    }

    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      const weight = (signal.strength / 100) * (4 - (signal.priority || 3)); // Prioridad 1=3x, 2=2x, 3=1x

      totalWeight += weight;

      if (signal.type === 'buy' || signal.type === 'strong_buy') {
        buyScore += weight * (signal.type === 'strong_buy' ? 1.5 : 1);
      } else if (signal.type === 'sell' || signal.type === 'strong_sell') {
        sellScore += weight * (signal.type === 'strong_sell' ? 1.5 : 1);
      }
    });

    const buyPercent = (buyScore / totalWeight) * 100;
    const sellPercent = (sellScore / totalWeight) * 100;

    if (buyPercent > sellPercent && buyPercent > 60) {
      return {
        type: buyPercent > 75 ? 'strong_buy' : 'buy',
        strength: Math.round(buyPercent),
        message: `${signals.filter(s => s.type === 'buy' || s.type === 'strong_buy').length} indicadores sugieren COMPRA`
      };
    } else if (sellPercent > buyPercent && sellPercent > 60) {
      return {
        type: sellPercent > 75 ? 'strong_sell' : 'sell',
        strength: Math.round(sellPercent),
        message: `${signals.filter(s => s.type === 'sell' || s.type === 'strong_sell').length} indicadores sugieren VENTA`
      };
    } else {
      return {
        type: 'neutral',
        strength: 50,
        message: 'Señales mixtas - Esperar confirmación'
      };
    }
  }

  // ============================================
  // MÉTODOS DE CÁLCULO (sin cambios)
  // ============================================

  private calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period)!;
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateMACD(closes: number[]): { value: number; signal: number; histogram: number } | null {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    if (!ema12 || !ema26) return null;
    
    const macdLine = ema12 - ema26;
    const macdHistory: number[] = [];
    
    for (let i = 26; i < closes.length; i++) {
      const e12 = this.calculateEMA(closes.slice(0, i + 1), 12)!;
      const e26 = this.calculateEMA(closes.slice(0, i + 1), 26)!;
      macdHistory.push(e12 - e26);
    }
    
    const signal = this.calculateEMA(macdHistory, 9) || 0;
    const histogram = macdLine - signal;
    
    return { value: macdLine, signal, histogram };
  }

  private calculateIchimoku(data: PriceData[]): any {
    if (data.length < 52) return null;
    const recent = data.slice(-52);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    
    const tenkan9 = highs.slice(-9);
    const tenkanLow9 = lows.slice(-9);
    const tenkan = (Math.max(...tenkan9) + Math.min(...tenkanLow9)) / 2;
    
    const kijun26 = highs.slice(-26);
    const kijunLow26 = lows.slice(-26);
    const kijun = (Math.max(...kijun26) + Math.min(...kijunLow26)) / 2;
    
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = (Math.max(...highs) + Math.min(...lows)) / 2;
    const chikou = recent[recent.length - 1].close;
    
    return {
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
      cloudColor: senkouA > senkouB ? 'green' : 'red'
    };
  }

  private calculateADX(data: PriceData[], period: number): any {
    if (data.length < period + 1) return null;
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      tr.push(Math.max(tr1, tr2, tr3));
      
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    
    const smoothTR = this.smoothATR(tr, period);
    const smoothPlusDM = this.smoothATR(plusDM, period);
    const smoothMinusDM = this.smoothATR(minusDM, period);
    
    const plusDI = (smoothPlusDM / smoothTR) * 100;
    const minusDI = (smoothMinusDM / smoothTR) * 100;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    
    return { value: dx, plusDI, minusDI };
  }

  private smoothATR(data: number[], period: number): number {
    if (data.length < period) return 0;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateParabolicSAR(data: PriceData[]): number | null {
    if (data.length < 5) return null;
    const recent = data.slice(-5);
    const lastClose = recent[recent.length - 1].close;
    const minLow = Math.min(...recent.map(d => d.low));
    const maxHigh = Math.max(...recent.map(d => d.high));
    return lastClose > (minLow + maxHigh) / 2 ? minLow : maxHigh;
  }

  private calculateRSI(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateStochastic(data: PriceData[], period: number): { k: number; d: number } | null {
    if (data.length < period) return null;
    const recent = data.slice(-period);
    const currentClose = recent[recent.length - 1].close;
    const low = Math.min(...recent.map(d => d.low));
    const high = Math.max(...recent.map(d => d.high));
    const k = ((currentClose - low) / (high - low)) * 100;
    return { k, d: k };
  }

  private calculateCCI(data: PriceData[], period: number): number | null {
    if (data.length < period) return null;
    const recent = data.slice(-period);
    const typicalPrices = recent.map(d => (d.high + d.low + d.close) / 3);
    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    const currentTP = typicalPrices[typicalPrices.length - 1];
    return (currentTP - sma) / (0.015 * meanDeviation);
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number | null {
    if (highs.length < period) return null;
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  private calculateMomentum(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    return closes[closes.length - 1] - closes[closes.length - 1 - period];
  }

  private calculateAroon(highs: number[], lows: number[], period: number): { up: number; down: number } | null {
    if (highs.length < period) return null;
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const daysSinceHigh = period - 1 - recentHighs.lastIndexOf(Math.max(...recentHighs));
    const daysSinceLow = period - 1 - recentLows.lastIndexOf(Math.min(...recentLows));
    const aroonUp = ((period - daysSinceHigh) / period) * 100;
    const aroonDown = ((period - daysSinceLow) / period) * 100;
    return { up: aroonUp, down: aroonDown };
  }

  private calculateBollingerBands(closes: number[], period: number = 20): any {
    if (closes.length < period) return null;
    
    const sma = this.calculateSMA(closes, period)!;
    const slice = closes.slice(-period);
    
    const variance = slice.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const stdDev = Math.sqrt(variance);
    const upper = sma + (2 * stdDev);
    const lower = sma - (2 * stdDev);
    const bandwidth = ((upper - lower) / sma) * 100;
    
    return { upper, middle: sma, lower, bandwidth };
  }

  private calculateATR(data: PriceData[], period: number = 14): number | null {
    if (data.length < period + 1) return null;
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / period;
  }

  private calculateOBV(data: PriceData[]): number | null {
    if (data.length < 2) return null;
    
    let obv = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
    }
    
    return obv;
  }

  private calculateVolumeAnalysis(data: PriceData[]): any {
    if (data.length < 20) return null;
    
    const recent20 = data.slice(-20);
    const volumes = recent20.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / 20;
    const currentVolume = data[data.length - 1].volume;
    
    const ratio = currentVolume / avgVolume;
    
    return {
      current: currentVolume,
      average: avgVolume,
      trend: ratio > 1.5 ? 'high' : ratio < 0.7 ? 'low' : 'normal',
      spike: ratio > 1.5
    };
  }

  private calculateFibonacci(data: PriceData[], periods: number = 50): any {
    if (data.length < periods) return null;
    
    const recent = data.slice(-periods);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const diff = high - low;
    
    return {
      level236: high - (diff * 0.236),
      level382: high - (diff * 0.382),
      level50: high - (diff * 0.5),
      level618: high - (diff * 0.618),
      high,
      low
    };
  }

  private calculatePivotPoints(data: PriceData[]): any {
    if (data.length < 2) return null;
    
    const yesterday = data[data.length - 2];
    const high = yesterday.high;
    const low = yesterday.low;
    const close = yesterday.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);
    
    return { pivot, r1, r2, r3, s1, s2, s3 };
  }

  private getEmptyIndicators(): TechnicalIndicators {
    return {
      marketState: undefined,
      sma20: null,
      sma50: null,
      sma200: null,
      ema10: null,
      ema20: null,
      ema50: null,
      macd: null,
      ichimoku: null,
      adx: null,
      sar: null,
      rsi: null,
      stochastic: null,
      cci: null,
      williamsR: null,
      momentum: null,
      aroon: null,
      bollingerBands: null,
      atr: null,
      obv: null,
      volumeAnalysis: null,
      fibonacci: null,
      pivotPoints: null
    };
  }
}