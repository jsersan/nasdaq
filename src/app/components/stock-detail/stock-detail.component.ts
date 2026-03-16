import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MarketDataService, StockData } from '../../services/market-data.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioService } from '../../services/portfolio.service';
import { TechnicalIndicatorsComponent } from '../technical-indicators/technical-indicators.component';
import { PriceData } from '../../services/technical-indicators.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { PriceChartComponent, PriceHistoryPoint } from '../price-chart/price-chart.component';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';
import { YahooFinanceService } from '../../services/yahoo-finance.service';

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
  symbol: string = '';  // ← CAMBIAR de stockSymbol a symbol
  loading = true;
  
  // Propiedades para la gráfica y análisis técnico
  priceHistory: PriceHistoryPoint[] = [];
  historicalPrices: PriceData[] = [];  // Para el componente de indicadores técnicos
  loadingIndicators = false;

  operationType: 'buy' | 'sell' = 'buy';
  quantity: number = 1;
  totalAmount: number = 0;
  currentPrice: number = 0;  // ← AÑADIR esto

  userPosition: any = null;
  availableCash: number = 0;
  remainingCash: number = 0;

  private companyWebsites: { [key: string]: string } = {
    ACCIONA: 'https://www.acciona.com',
    'ACCIONA ENERGÍA': 'https://www.acciona-energia.com',
    ACERINOX: 'https://www.acerinox.com',
    'ACS CONST.': 'https://www.grupoacs.com',
    AENA: 'https://www.aena.es',
    'AMADEUS IT': 'https://www.amadeus.com',
    'ARCEL.MITTAL': 'https://www.arcelormittal.com',
    BANKINTER: 'https://www.bankinter.com',
    BBVA: 'https://www.bbva.com',
    CAIXABANK: 'https://www.caixabank.com',
    'CELLNEX TEL.': 'https://www.cellnextelecom.com',
    COLONIAL: 'https://www.inmocolonial.com',
    ENAGAS: 'https://www.enagas.es',
    ENDESA: 'https://www.endesa.com',
    'FERROVIAL INTL RG': 'https://www.ferrovial.com',
    FLUIDRA: 'https://www.fluidra.com',
    GRIFOLS: 'https://www.grifols.com',
    'IAG (IBERIA)': 'https://www.iairgroup.com',
    IBERDROLA: 'https://www.iberdrola.com',
    'INDRA A': 'https://www.indracompany.com',
    INDITEX: 'https://www.inditex.com',
    'LABORAT.ROVI': 'https://www.rovi.es',
    LOGISTA: 'https://www.logista.com',
    MAPFRE: 'https://www.mapfre.com',
    'MERLIN PROP.': 'https://www.merlinproperties.com',
    NATURGY: 'https://www.naturgy.com',
    'PUIG BRANDS S RG': 'https://www.puig.com',
    'REDEIA CORPORACIÓN': 'https://www.redeia.com',
    REPSOL: 'https://www.repsol.com',
    'B.SABADELL': 'https://www.bancsabadell.com',
    SACYR: 'https://www.sacyr.com',
    SANTANDER: 'https://www.santander.com',
    SOLARIA: 'https://www.solariaenergia.com',
    TELEFONICA: 'https://www.telefonica.com',
    'UNICAJA BANCO': 'https://www.unicajabanco.com'
  };

  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketDataService: MarketDataService,
    private authService: AuthService,
    private portfolioService: PortfolioService,
    public yahooFinanceService: YahooFinanceService, // Asegúrate de que este import sea correcto
    private http: HttpClient
  ) {}

// En stock-detail.component.ts
ngOnInit(): void {
  this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
    this.symbol = params['symbol'];
    this.loading = true; // Aseguramos que sale el spinner al cambiar de valor
    this.loadUserData();
    
    this.marketDataService.getStockData(this.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: StockData | null) => {
          if (data) {
            this.stock = data;
            this.currentPrice = data.price;
            this.calculateTotal();
            this.loadPriceHistory(); // Esto carga la gráfica
          }
          // Movemos el loading aquí dentro para asegurar que Angular 
          // detecte el cambio cuando 'stock' ya tiene valor
          this.loading = false; 
        },
        error: (err) => {
          console.error("Error cargando datos:", err);
          this.loading = false;
        }
      });
  });
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStockData() {
    this.loading = true;
    this.marketDataService
      .getStockData(this.symbol)  // ← CAMBIAR stockSymbol a symbol
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.stock = data;
          this.currentPrice = data.price;  // ← AÑADIR esto
          this.calculateTotal();
          this.loading = false;
        },
        error: error => {
          console.error('Error loading stock data:', error);
          this.loading = false;
        }
      });
  }

  async loadUserData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    try {
      this.userPosition = await this.portfolioService.getStockPosition(
        user.uid,
        this.symbol  // ← CAMBIAR stockSymbol a symbol
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

  /**
   * NUEVO: Cargar histórico para gráfica e indicadores técnicos
   */

  loadPriceHistory() {
    if (!this.symbol) return;
    this.loadingIndicators = true;
  
    // ✅ USAR EL SERVICIO que ya tiene environment configurado
    this.yahooFinanceService.getHistory(this.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('✅ Datos históricos recibidos:', data.length);
          if (data && data.length > 0) {
            this.priceHistory = data.map(item => ({
              date: item.date,
              price: item.price || item.close
            }));
            this.historicalPrices = data;
          }
          this.loadingIndicators = false;
        },
        error: (err) => {
          console.error("❌ Error cargando histórico:", err);
          this.loadingIndicators = false;
        }
      });
  }

  /**
   * TEMPORAL: Generar datos históricos simulados de 4 años
   * TODO: Reemplazar con datos reales de tu API cuando estén disponibles
   */
  private generateHistoricalData(symbol: string, currentPrice: number): any[] {
    const data = [];
    const days = 1460; // 4 años
    const volatility = 0.02; // 2% de volatilidad diaria
    
    let price = currentPrice * 0.7; // Empezar desde un 30% más bajo hace 4 años
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simular variación diaria con tendencia alcista suave
      const trend = 0.0003; // Tendencia alcista del 0.03% diario
      const change = (Math.random() - 0.5) * 2 * volatility + trend;
      price = price * (1 + change);
      
      const high = price * (1 + Math.random() * 0.01);
      const low = price * (1 - Math.random() * 0.01);
      const open = (high + low) / 2;
      const close = price;
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return data;
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
        title: 'Sesión requerida',
        text: 'Debes iniciar sesión para realizar operaciones',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a login',
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
      title: '¿Confirmar operación?',
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
          this.symbol,  // ← CAMBIAR
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Compra desde detalle - ${new Date().toLocaleDateString()}`
        );

        const updatedPosition = await this.portfolioService.getStockPosition(user.uid, this.symbol);  // ← CAMBIAR
        
        if (!updatedPosition) {
          throw new Error('⚠️ Error: La compra no se guardó correctamente en tu cartera. Intenta de nuevo.');
        }

        Swal.fire({
          icon: 'success',
          title: '¡Compra realizada!',
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
          this.symbol,  // ← CAMBIAR
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Venta desde detalle - ${new Date().toLocaleDateString()}`
        );

        Swal.fire({
          icon: 'success',
          title: '¡Venta realizada!',
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
        title: 'Error en la operación',
        text: error.message || 'No se pudo completar la operación',
        confirmButtonText: 'Entendido',
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

    const website = this.companyWebsites[this.stock.name];
    if (website) {
      window.open(website, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Website no disponible',
        text: 'No tenemos el sitio web registrado para esta empresa',
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
    this.router.navigate(['/ibex35']);
  }

  formatNumber(num: number, decimals: number = 2): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal ? `${withThousands},${decimal}` : withThousands;
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
  }
}