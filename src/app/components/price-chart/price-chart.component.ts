import { Component, Input, OnInit, OnChanges, AfterViewInit, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { YahooFinanceService } from '../../services/yahoo-finance.service';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

export interface PriceHistoryPoint {
  date: string;
  price: number;
  high?: number;
  low?: number;
}

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.scss',
})
export class PriceChartComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  // ✅ CAMBIO: static: false para que se inicialice después de la vista
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() data: PriceHistoryPoint[] = [];
  @Input() title: string = 'Evolución del Precio';
  @Input() symbol: string = '';
  
  chart: Chart | null = null;
  selectedPeriod: number = 365; // 1 año por defecto
  loading: boolean = false;
  error: string | null = null;
  
  // ✅ Bandera para saber si la vista ya está lista
  private viewInitialized = false;
  
  periods = [
    { label: '1M', value: 30 },
    { label: '3M', value: 90 },
    { label: '6M', value: 180 },
    { label: '1A', value: 365 },
    { label: 'YTD', value: -1 }, // Year to date
    { label: '4A', value: 1460 }
  ];

  stats: {
    max: number;
    min: number;
    avg: number;
    change: number;
  } | null = null;

  constructor(private yahooFinanceService: YahooFinanceService) {}

  ngOnInit() {
    // ✅ Solo cargar datos, NO crear gráfico aquí
    if (this.data.length === 0 && this.symbol) {
      this.loadHistoricalData();
    }
  }

  // ✅ NUEVO: Ejecutar DESPUÉS de que la vista esté lista
  ngAfterViewInit() {
    this.viewInitialized = true;
    
    // Si ya tenemos datos, crear el gráfico
    if (this.data.length > 0) {
      // Pequeño delay para asegurar que Angular termine de renderizar
      setTimeout(() => this.createChart(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // ✅ Si cambia el símbolo, recargar datos
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.loadHistoricalData();
    } else if (changes['data'] && !changes['data'].firstChange && this.viewInitialized) {
      this.updateChart();
    }
  }

  public loadHistoricalData() {
    if (!this.symbol) {
      this.error = 'No se ha especificado ningún símbolo';
      return;
    }

    this.loading = true;
    this.error = null;

    this.yahooFinanceService.getHistory(this.symbol).subscribe({
      next: (history) => {
        console.log('📊 Datos históricos recibidos:', history.length, 'registros');
        
        // Convertir el formato de la API al formato esperado
        this.data = this.convertHistoryData(history);
        
        if (this.data.length < 50) {
          this.error = `No hay suficientes datos históricos. Se necesitan al menos 50 días. Recibidos: ${this.data.length}`;
          console.warn('⚠️', this.error);
        } else {
          this.error = null;
          console.log('✅ Datos convertidos correctamente:', this.data.length, 'puntos');
        }
        
        this.loading = false;
        
        // ✅ Solo crear gráfico si la vista ya está inicializada
        if (this.viewInitialized && this.data.length > 0) {
          this.createChart();
        }
      },
      error: (error) => {
        console.error('❌ Error cargando datos históricos:', error);
        this.error = 'Error al cargar datos históricos. Verifica que el backend esté corriendo.';
        this.loading = false;
      }
    });
  }

  private convertHistoryData(apiData: any[]): PriceHistoryPoint[] {
    if (!apiData || apiData.length === 0) {
      console.warn('⚠️ No hay datos para convertir');
      return [];
    }

    const converted = apiData.map(item => ({
      date: item.date || item.t || item.timestamp,
      price: item.close || item.c || item.price,
      high: item.high || item.h,
      low: item.low || item.l
    })).filter(item => item.date && item.price); // Filtrar inválidos

    console.log(`✅ Convertidos ${converted.length} de ${apiData.length} registros`);
    return converted;
  }

  changePeriod(days: number) {
    this.selectedPeriod = days;
    this.updateChart();
  }

  private getFilteredData(): PriceHistoryPoint[] {
    if (this.selectedPeriod === -1) {
      // YTD: desde enero del año actual
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      return this.data.filter(point => new Date(point.date) >= yearStart);
    }
    
    return this.data.slice(-this.selectedPeriod);
  }

  private calculateStats(data: PriceHistoryPoint[]) {
    if (data.length === 0) {
      this.stats = null;
      return;
    }

    const prices = data.map(d => d.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    this.stats = { max, min, avg, change };
  }

  private createChart() {
    // ✅ VALIDACIÓN: Verificar que el canvas existe
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) {
      console.warn('⚠️ Canvas no disponible todavía, reintentando...');
      setTimeout(() => this.createChart(), 100);
      return;
    }

    // Si hay un gráfico previo, destruirlo
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const filteredData = this.getFilteredData();
    
    if (filteredData.length === 0) {
      console.warn('⚠️ No hay datos para mostrar en el gráfico');
      return;
    }

    this.calculateStats(filteredData);

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('❌ No se pudo obtener el contexto 2D del canvas');
      return;
    }

    const labels = filteredData.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        year: this.selectedPeriod > 365 ? '2-digit' : undefined
      });
    });

    const prices = filteredData.map(point => point.price);
    
    // Determinar color del gradiente según tendencia
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.01)');
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: this.symbol,
          data: prices,
          borderColor: isPositive ? '#10b981' : '#ef4444',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          hoverBackgroundColor: isPositive ? '#10b981' : '#ef4444',
          pointHoverBorderColor: 'white',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: isPositive ? '#10b981' : '#ef4444',
            borderWidth: 2,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `Precio: ${value !== null ? value.toFixed(4) : '0.0000'}€`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 8,
              color: '#6b7280',
              font: {
                size: 11,
                weight: 500 as const
              }
            }
          },
          y: {
            position: 'right',
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => {
                return `${(value as number).toFixed(2)}€`;
              },
              color: '#6b7280',
              font: {
                size: 12,
                weight: 600 as const
              }
            }
          }
        }
      }
    };

    try {
      this.chart = new Chart(ctx, config);
      console.log('✅ Gráfico creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando gráfico:', error);
      this.error = 'Error al crear el gráfico';
    }
  }

  private updateChart() {
    if (!this.chart) {
      console.log('⚠️ No hay gráfico previo, creando uno nuevo...');
      this.createChart();
      return;
    }

    const filteredData = this.getFilteredData();
    
    if (filteredData.length === 0) {
      console.warn('⚠️ No hay datos para actualizar el gráfico');
      return;
    }

    this.calculateStats(filteredData);

    const labels = filteredData.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        year: this.selectedPeriod > 365 ? '2-digit' : undefined
      });
    });

    const prices = filteredData.map(point => point.price);

    // Actualizar color según tendencia
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 350);
      if (isPositive) {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.01)');
      }

      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = prices;
      this.chart.data.datasets[0].borderColor = isPositive ? '#10b981' : '#ef4444';
      this.chart.data.datasets[0].backgroundColor = gradient;
      this.chart.data.datasets[0].hoverBackgroundColor = isPositive ? '#10b981' : '#ef4444';
      
      if (this.chart.options.plugins?.tooltip) {
        this.chart.options.plugins.tooltip.borderColor = isPositive ? '#10b981' : '#ef4444';
      }
      
      this.chart.update();
      console.log('✅ Gráfico actualizado');
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
      console.log('🗑️ Gráfico destruido');
    }
  }
}