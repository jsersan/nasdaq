import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketDataService, StockData, IndexData } from '../../services/market-data.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-market-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './market-view.component.html',
  styleUrls: ['./market-view.component.scss']
})
export class MarketViewComponent implements OnInit, OnDestroy {
  marketType: 'sp500' | 'nasdaq' = 'sp500';
  indexData: IndexData | null = null;
  stocks: StockData[] = [];
  topGainers: StockData[] = [];
  topLosers: StockData[] = [];
  loading = true;
  lastUpdateTime: string = '';
  private destroy$ = new Subject<void>();
  
  // Variables de ordenamiento
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Exponer Math para usar en el template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketDataService: MarketDataService
  ) {}

  ngOnInit() {
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.marketType = data['market'];
        this.loadMarketData();
      });

    // Actualizar datos cada minuto
    setInterval(() => this.loadMarketData(), 60000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMarketData() {
    this.loading = true;

    if (this.marketType === 'sp500') {
      this.marketDataService.getSP500Data()
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
          this.indexData = data;
          this.updateLastUpdateTime();
        });

      this.marketDataService.getSP500Stocks()
        .pipe(takeUntil(this.destroy$))
        .subscribe(stocks => {
          // Ordenar alfabéticamente por símbolo por defecto
          this.stocks = stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
          this.calculateTopMovers();
          this.loading = false;
          this.updateLastUpdateTime();
          
          // Aplicar ordenamiento si había uno activo
          if (this.sortColumn) {
            this.sortStocks();
          }
        });
    } else {
      this.marketDataService.getNASDAQData()
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
          this.indexData = data;
          this.updateLastUpdateTime();
        });

      this.marketDataService.getNASDAQStocks()
        .pipe(takeUntil(this.destroy$))
        .subscribe(stocks => {
          // Ordenar alfabéticamente por símbolo por defecto
          this.stocks = stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
          this.calculateTopMovers();
          this.loading = false;
          this.updateLastUpdateTime();
          
          // Aplicar ordenamiento si había uno activo
          if (this.sortColumn) {
            this.sortStocks();
          }
        });
    }
  }

  /**
   * Actualizar hora de última actualización
   */
  private updateLastUpdateTime() {
    const now = new Date();
    this.lastUpdateTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  calculateTopMovers() {
    const sorted = [...this.stocks].sort((a, b) => b.changePercent - a.changePercent);
    this.topGainers = sorted.slice(0, 5);
    this.topLosers = sorted.slice(-5).reverse();
  }

  /**
   * Ordenar tabla por columna
   */
  sortBy(column: string) {
    if (this.sortColumn === column) {
      // Misma columna: alternar dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna: descendente por defecto
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    
    this.sortStocks();
  }

  /**
   * Aplicar ordenamiento al array de stocks
   */
  private sortStocks() {
    this.stocks.sort((a: any, b: any) => {
      let aVal = a[this.sortColumn];
      let bVal = b[this.sortColumn];
      
      // Manejo especial para strings (símbolo y nombre)
      if (this.sortColumn === 'symbol' || this.sortColumn === 'name') {
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'desc' ? -comparison : comparison;
      }
      
      // Manejo especial para hora (string)
      if (this.sortColumn === 'time') {
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'desc' ? -comparison : comparison;
      }
      
      // Manejo especial para volumen (puede tener K, M, B)
      if (this.sortColumn === 'volume') {
        aVal = this.parseVolume(aVal);
        bVal = this.parseVolume(bVal);
      }
      
      // Ordenamiento numérico
      if (this.sortDirection === 'desc') {
        return bVal - aVal; // Mayor a menor
      } else {
        return aVal - bVal; // Menor a mayor
      }
    });
  }

  /**
   * Convertir volumen (con K, M, B) a número
   */
  private parseVolume(volume: string): number {
    if (typeof volume === 'number') return volume;
    
    const str = volume.toString().toUpperCase();
    
    if (str.includes('B')) {
      return parseFloat(str.replace('B', '')) * 1000000000;
    } else if (str.includes('M')) {
      return parseFloat(str.replace('M', '')) * 1000000;
    } else if (str.includes('K')) {
      return parseFloat(str.replace('K', '')) * 1000;
    }
    
    return parseFloat(str) || 0;
  }

  /**
   * Obtener icono de ordenamiento para una columna
   */
  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'desc' ? '▼' : '▲';
  }

  /**
   * Verificar si una columna está activa
   */
  isSortedBy(column: string): boolean {
    return this.sortColumn === column;
  }

  navigateToMarket(market: string) {
    if (market === 'sp500') {
      this.router.navigate(['/sp500']);
    } else {
      this.router.navigate(['/nasdaq']);
    }
  }

  navigateToStock(symbol: string) {
    this.router.navigate(['/stock', symbol]);
  }
  
  navigateToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  navigateToEuribor() {
    // Puedes cambiar esto por algún índice relevante de US, como Treasury Rates
    this.router.navigate(['/treasury-rates']);
  }

  /**
   * Formatear número con separador de miles español
   */
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