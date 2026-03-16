import { Routes } from '@angular/router';
import { MarketViewComponent } from './components/market-view/market-view.component';
import { StockDetailComponent } from './components/stock-detail/stock-detail.component';
import { AuthComponent } from './components/auth/auth.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { authGuard } from './guards/auth.guard';
import { CashManagementComponent } from './components/cash-managment/cash-managment.component';
import { EuriborComponent } from './components/euribor/euribor.component';

export const routes: Routes = [
  // ✅ Ruta por defecto - IR AL MERCADO (no al login)
  {
    path: '',
    redirectTo: '/sp500',
    pathMatch: 'full'
  },
  
  // ✅ Rutas PÚBLICAS del mercado (sin authGuard)
  {
    path: 'sp500',
    component: MarketViewComponent,
    data: { market: 'sp500' }
  },
  {
    path: 'nasdaq',
    component: MarketViewComponent,
    data: { market: 'nasdaq' }
  },
  {
    path: 'stock/:symbol',
    component: StockDetailComponent
  },
  
  // ✅ Rutas PROTEGIDAS (con authGuard)
  {
    path: 'portfolio',
    component: PortfolioComponent,
    canActivate: [authGuard]
  },
  {
    path: 'cash-management',
    component: CashManagementComponent,
    canActivate: [authGuard]
  },
  
  // ✅ Otras rutas públicas
  {
    path: 'login',
    component: AuthComponent
  },
  {
    path: 'euribor',
    component: EuriborComponent
  },
  {
    path: 'treasury-rates',
    component: EuriborComponent  // Reutilizar el mismo componente o crear uno nuevo
  },
  
  // ✅ Ruta 404 - IR AL MERCADO (no al login)
  {
    path: '**',
    redirectTo: '/sp500'
  }
];