import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MarketDataService, StockData } from '../../services/market-data.service';
import { AlphaVantageService } from '../../services/alpha-vantage.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioService } from '../../services/portfolio.service';
import { TechnicalIndicatorsComponent } from '../technical-indicators/technical-indicators.component';
import { PriceData } from '../../services/technical-indicators.service';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { PriceChartComponent, PriceHistoryPoint } from '../price-chart/price-chart.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, 
            FormsModule, 
            TechnicalIndicatorsComponent,
            PriceChartComponent],
  templateUrl: './stock-detail.component.html',
  styleUrls: ['./stock-detail.component.scss']
})

export class StockDetailComponent implements OnInit, OnDestroy {
  stock: StockData | null = null;
  symbol: string = '';
  loading = true;
  
  // Propiedades para la gráfica y análisis técnico
  priceHistory: PriceHistoryPoint[] = [];
  historicalPrices: PriceData[] = [];
  loadingIndicators = false;

  operationType: 'buy' | 'sell' = 'buy';
  quantity: number = 1;
  totalAmount: number = 0;
  currentPrice: number = 0;

  userPosition: any = null;
  availableCash: number = 0;
  remainingCash: number = 0;

  // Modo de datos
  private useMockData = environment.useMockData;
  private useAlphaVantage = environment.alphaVantage?.enabled && !this.useMockData;

  private companyWebsites: { [key: string]: string } = {
    // Magnificent 7
    'AAPL': 'https://www.apple.com',
    'MSFT': 'https://www.microsoft.com',
    'GOOGL': 'https://www.google.com',
    'AMZN': 'https://www.amazon.com',
    'NVDA': 'https://www.nvidia.com',
    'META': 'https://www.meta.com',
    'TSLA': 'https://www.tesla.com',
    
    // Tech
    'NFLX': 'https://www.netflix.com',
    'ADBE': 'https://www.adobe.com',
    'CRM': 'https://www.salesforce.com',
    'ORCL': 'https://www.oracle.com',
    'CSCO': 'https://www.cisco.com',
    'INTC': 'https://www.intel.com',
    'AMD': 'https://www.amd.com',
    'QCOM': 'https://www.qualcomm.com',
    'AVGO': 'https://www.broadcom.com',
    'TXN': 'https://www.ti.com',
    'MU': 'https://www.micron.com',
    'AMAT': 'https://www.appliedmaterials.com',
    'LRCX': 'https://www.lamresearch.com',
    'ASML': 'https://www.asml.com',
    'PANW': 'https://www.paloaltonetworks.com',
    'ADI': 'https://www.analog.com',
    'INTU': 'https://www.intuit.com',
    
    // Finance
    'V': 'https://www.visa.com',
    'MA': 'https://www.mastercard.com',
    'JPM': 'https://www.jpmorganchase.com',
    'WFC': 'https://www.wellsfargo.com',
    'ADP': 'https://www.adp.com',
    'BRK.B': 'https://www.berkshirehathaway.com',
    
    // Consumer
    'WMT': 'https://www.walmart.com',
    'COST': 'https://www.costco.com',
    'PG': 'https://www.pg.com',
    'KO': 'https://www.coca-colacompany.com',
    'PEP': 'https://www.pepsico.com',
    'MCD': 'https://www.mcdonalds.com',
    'SBUX': 'https://www.starbucks.com',
    
    // Healthcare
    'UNH': 'https://www.unitedhealthgroup.com',
    'JNJ': 'https://www.jnj.com',
    'LLY': 'https://www.lilly.com',
    'ABBV': 'https://www.abbvie.com',
    'TMO': 'https://www.thermofisher.com',
    'ABT': 'https://www.abbott.com',
    'MRK': 'https://www.merck.com',
    'AMGN': 'https://www.amgen.com',
    'GILD': 'https://www.gilead.com',
    'VRTX': 'https://www.vrtx.com',
    'ISRG': 'https://www.intuitive.com',
    'REGN': 'https://www.regeneron.com',
    
    // Energy
    'XOM': 'https://www.exxonmobil.com',
    'CVX': 'https://www.chevron.com',
    
    // Industrial
    'HON': 'https://www.honeywell.com',
    'ACN': 'https://www.accenture.com',
    'HD': 'https://www.homedepot.com',
    
    // Communications
    'TMUS': 'https://www.t-mobile.com',
    'CMCSA': 'https://www.comcastcorporation.com',
    
    // Travel
    'BKNG': 'https://www.bookingholdings.com'
  };

  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketDataService: MarketDataService,
    private alphaVantageService: AlphaVantageService,
    private authService: AuthService,
    private portfolioService: PortfolioService
  ) {
    console.log('🎯 Modo de datos:', this.useAlphaVantage ? 'Alpha Vantage (REAL)' : 'Simulado (MOCK)');
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.symbol = params['symbol'];
      this.loading = true;
      this.loadUserData();
      this.loadStockDataWithFallback();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Cargar datos con fallback automático
   */
  private loadStockDataWithFallback(): void {
    if (this.useAlphaVantage) {
      console.log(`📡 Intentando cargar ${this.symbol} desde Alpha Vantage...`);
      
      // Intentar cargar quote y histórico simultáneamente
      forkJoin({
        quote: this.alphaVantageService.getQuote(this.symbol),
        history: this.alphaVantageService.getHistoricalData(this.symbol, 'compact')
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: ({ quote, history }) => {
          console.log('✅ Datos reales cargados desde Alpha Vantage');
          
          // Convertir quote de Alpha Vantage a formato StockData
          this.stock = {
            symbol: quote.symbol,
            name: this.getStockName(quote.symbol),
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: this.formatVolume(quote.volume),
            previousClose: quote.previousClose,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            time: quote.timestamp
          };
          
          this.currentPrice = quote.price;
          this.calculateTotal();
          
          // Procesar histórico
          this.processHistoricalData(history);
          
          this.loading = false;
          this.loadingIndicators = false;
        },
        error: (error) => {
          console.error('❌ Error con Alpha Vantage:', error.message);
          console.log('🔄 Fallback a datos simulados...');
          
          // Mostrar notificación al usuario
          Swal.fire({
            icon: 'warning',
            title: 'Usando Datos Simulados',
            html: `<div style="font-size: 14px;">
                     No se pudieron cargar datos reales de Alpha Vantage.<br>
                     <strong>Motivo:</strong> ${error.message}<br><br>
                     Mostrando datos simulados para <strong>${this.symbol}</strong>
                   </div>`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
          });
          
          // Cargar datos simulados
          this.loadMockData();
        }
      });
    } else {
      console.log(`💾 Cargando ${this.symbol} desde datos simulados...`);
      this.loadMockData();
    }
  }

  /**
   * 💾 Cargar datos simulados (fallback)
   */
  private loadMockData(): void {
    this.marketDataService.getStockData(this.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: StockData | null) => {
          if (data) {
            this.stock = data;
            this.currentPrice = data.price;
            this.calculateTotal();
            this.loadMockHistoricalData();
          }
          this.loading = false;
        },
        error: (err) => {
          console.error("Error loading mock data:", err);
          this.loading = false;
        }
      });
  }

  /**
   * 📊 Cargar histórico simulado
   */
  private loadMockHistoricalData(): void {
    this.loadingIndicators = true;
    
    this.marketDataService.getHistoricalData(this.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.processHistoricalData(data);
          this.loadingIndicators = false;
        },
        error: (err) => {
          console.error("❌ Error loading mock history:", err);
          this.loadingIndicators = false;
        }
      });
  }

  /**
   * 🔄 Procesar datos históricos (común para real y mock)
   */
  private processHistoricalData(data: any[]): void {
    if (data && data.length > 0) {
      // Convertir al formato esperado por el componente de gráfico
      this.priceHistory = data.map(item => ({
        date: item.date,
        price: item.close || item.price
      }));
      
      // Datos para indicadores técnicos
      this.historicalPrices = data;
      
      console.log(`✅ Histórico procesado: ${this.priceHistory.length} puntos`);
      console.log(`   Desde: ${this.priceHistory[0].date} (${this.priceHistory[0].price}€)`);
      console.log(`   Hasta: ${this.priceHistory[this.priceHistory.length - 1].date} (${this.priceHistory[this.priceHistory.length - 1].price}€)`);
    } else {
      console.warn('⚠️ No se recibieron datos históricos');
    }
  }

  /**
   * 📝 Obtener nombre de la empresa
   */
  private getStockName(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corporation',
      'META': 'Meta Platforms Inc.',
      'TSLA': 'Tesla Inc.',
      'NFLX': 'Netflix Inc.',
      'ADBE': 'Adobe Inc.',
      'CRM': 'Salesforce Inc.',
      // ... añadir más según necesidad
    };
    
    return names[symbol] || `${symbol} Corporation`;
  }

  /**
   * 📊 Formatear volumen
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(2)}B`;
    if (volume >= 1000000) return `${Math.floor(volume / 1000000)}M`;
    if (volume >= 1000) return `${Math.floor(volume / 1000)}K`;
    return volume.toString();
  }

  async loadUserData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    try {
      this.userPosition = await this.portfolioService.getStockPosition(
        user.uid,
        this.symbol
      );

      const portfolio = await this.portfolioService.getPortfolio(user.uid);
      if (portfolio) {
        this.availableCash = portfolio.cash;
        this.calculateRemainingCash();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  calculateTotal() {
    if (this.stock) {
      this.totalAmount = this.stock.price * this.quantity;
      this.calculateRemainingCash();
    }
  }

  calculateRemainingCash() {
    if (this.operationType === 'buy') {
      this.remainingCash = this.availableCash - this.totalAmount;
    } else {
      this.remainingCash = this.availableCash + this.totalAmount;
    }
  }

  onQuantityChange() {
    if (this.quantity < 1) {
      this.quantity = 1;
    }
    this.calculateTotal();
  }

  onOperationTypeChange() {
    this.calculateRemainingCash();
  }

  hasEnoughCash(): boolean {
    return this.operationType === 'sell' || this.remainingCash >= 0;
  }

  async simulateOperation() {
    if (!this.stock || this.quantity < 1) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      const result = await Swal.fire({
        title: 'Login Requerido',
        text: 'Debes iniciar sesión para realizar operaciones',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a Login',
        cancelButtonText: 'Cancelar',
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        },
        buttonsStyling: false
      });

      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
      return;
    }

    const confirmMessage = this.operationType === 'buy'
      ? `<div style="text-align: center;">
           <div style="font-size: 18px; margin-bottom: 15px;">
             <strong style="color: #2c7a7b;">COMPRA</strong>
           </div>
           <div style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">
             ${this.quantity} acciones de <strong>${this.stock.name}</strong>
           </div>
           <div style="font-size: 28px; color: #2c7a7b; font-weight: bold; margin-top: 15px;">
             ${this.formatNumber(this.totalAmount, 2)}€
           </div>
         </div>`
      : `<div style="text-align: center;">
           <div style="font-size: 18px; margin-bottom: 15px;">
             <strong style="color: #dc2626;">VENTA</strong>
           </div>
           <div style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">
             ${this.quantity} acciones de <strong>${this.stock.name}</strong>
           </div>
           <div style="font-size: 28px; color: #10b981; font-weight: bold; margin-top: 15px;">
             ${this.formatNumber(this.totalAmount, 2)}€
           </div>
         </div>`;

    const result = await Swal.fire({
      title: 'Confirmar Operación?',
      html: confirmMessage,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    try {
      this.loading = true;

      if (this.operationType === 'buy') {
        await this.portfolioService.buyStock(
          this.symbol,
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Compra desde detalle - ${new Date().toLocaleDateString()}`
        );

        const updatedPosition = await this.portfolioService.getStockPosition(user.uid, this.symbol);
        
        if (!updatedPosition) {
          throw new Error('⚠️ Error: La compra no se guardó correctamente. Inténtalo de nuevo.');
        }

        Swal.fire({
          icon: 'success',
          title: '¡Compra Completada!',
          html: `<div style="font-size: 16px;">
                   ${this.quantity} acciones de <strong>${this.stock.name}</strong><br>
                   Total: <strong style="color: #2c7a7b;">${this.formatNumber(this.totalAmount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true
        });
      } else {
        await this.portfolioService.sellStock(
          this.symbol,
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Venta desde detalle - ${new Date().toLocaleDateString()}`
        );

        Swal.fire({
          icon: 'success',
          title: '¡Venta Completada!',
          html: `<div style="font-size: 16px;">
                   ${this.quantity} acciones de <strong>${this.stock.name}</strong><br>
                   Total: <strong style="color: #10b981;">${this.formatNumber(this.totalAmount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true
        });
      }

      this.router.navigate(['/portfolio']);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error en la Operación',
        text: error.message || 'No se pudo completar la operación',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        },
        buttonsStyling: false
      });
    } finally {
      this.loading = false;
    }
  }

  goToCompanyWebsite() {
    if (!this.stock) return;

    const website = this.companyWebsites[this.stock.symbol];
    if (website) {
      window.open(website, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Website No Disponible',
        text: 'No tenemos registrada la web de esta empresa',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  goToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  goBack() {
    this.router.navigate(['/sp500']);
  }

  formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
  }
}