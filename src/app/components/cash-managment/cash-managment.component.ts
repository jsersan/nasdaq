import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PortfolioService, CashMovement } from '../../services/portfolio.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cash-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-managment.component.html',
  styleUrls: ['./cash-managment.component.scss']
})
export class CashManagementComponent implements OnInit {
  currentCash = 0;
  operationType: 'deposit' | 'withdrawal' = 'deposit';
  amount: number | null = null;
  notes = '';
  loading = false;
  movements: CashMovement[] = [];

  constructor(
    private authService: AuthService,
    private portfolioService: PortfolioService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const portfolio = await this.portfolioService.getPortfolio(user.uid);
      if (portfolio) {
        this.currentCash = portfolio.cash;
      }

      this.movements = await this.portfolioService.getCashMovements(user.uid, 20);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar',
        text: 'No se pudieron cargar los datos. Intenta recargar la página.',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        },
        buttonsStyling: false
      });
    }
  }

  async executeOperation() {
    if (!this.amount || this.amount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Importe inválido',
        text: 'Por favor introduce un importe válido mayor a 0',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        },
        buttonsStyling: false
      });
      return;
    }

    const confirmMessage = this.operationType === 'deposit'
      ? `<div style="font-size: 18px; margin: 10px 0;">
           <strong>INGRESO</strong><br>
           <span style="font-size: 24px; color: #2c7a7b; font-weight: bold;">
             ${this.formatNumber(this.amount, 2)}€
           </span>
         </div>`
      : `<div style="font-size: 18px; margin: 10px 0;">
           <strong>RETIRADA</strong><br>
           <span style="font-size: 24px; color: #dc2626; font-weight: bold;">
             ${this.formatNumber(this.amount, 2)}€
           </span>
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

    this.loading = true;

    try {
      if (this.operationType === 'deposit') {
        await this.portfolioService.depositCash(
          this.amount,
          this.notes || undefined
        );
        
        Swal.fire({
          icon: 'success',
          title: '¡Ingreso realizado!',
          html: `<div style="font-size: 18px; color: #2c7a7b;">
                   <strong>${this.formatNumber(this.amount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      } else {
        await this.portfolioService.withdrawCash(
          this.amount,
          this.notes || undefined
        );
        
        Swal.fire({
          icon: 'success',
          title: '¡Retirada realizada!',
          html: `<div style="font-size: 18px; color: #2c7a7b;">
                   <strong>${this.formatNumber(this.amount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }

      this.amount = null;
      this.notes = '';
      await this.loadData();

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

  goToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  formatNumber(num: number, decimals: number = 2): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal ? `${withThousands},${decimal}` : withThousands;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMovementClass(type: 'deposit' | 'withdrawal'): string {
    return type === 'deposit' ? 'deposit-movement' : 'withdrawal-movement';
  }

  getMovementIcon(type: 'deposit' | 'withdrawal'): string {
    return type === 'deposit' ? '📥' : '📤';
  }
}