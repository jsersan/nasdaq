import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 AuthGuard ejecutado');
  console.log('   - Ruta solicitada:', state.url);
  console.log('   - Usuario autenticado:', authService.isAuthenticated());

  if (authService.isAuthenticated()) {
    console.log('✅ Acceso permitido');
    return true;
  }

  // ✅ Guardar la URL que intentabas acceder
  console.log('🚫 Acceso denegado. Guardando URL:', state.url);
  localStorage.setItem('redirectUrl', state.url);
  
  // Redirigir al login
  router.navigate(['/login']);
  return false;
};