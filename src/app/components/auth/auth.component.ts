import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  mode: 'login' | 'register' = 'login';
  
  // Form data
  email = '';
  password = '';
  displayName = '';
  confirmPassword = '';
  
  // UI state
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Alternar entre login y registro
   */
  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.errorMessage = '';
  }

  /**
   * Iniciar sesión
   */
  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);
      
      // ✅ CAMBIO: Verificar si hay una URL guardada para redirección
      const redirectUrl = localStorage.getItem('redirectUrl');
      
      if (redirectUrl) {
        // Si venías de alguna página protegida, volver allí
        localStorage.removeItem('redirectUrl');
        console.log('✅ Redirigiendo a:', redirectUrl);
        this.router.navigate([redirectUrl]);
      } else {
        // Si no, ir al portfolio por defecto
        console.log('✅ Redirigiendo a: /portfolio');
        this.router.navigate(['/portfolio']);
      }
      
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async onRegister() {
    // Validaciones
    if (!this.email || !this.password || !this.displayName) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.register(this.email, this.password, this.displayName);
      
      // ✅ Después del registro, ir al portfolio
      console.log('✅ Registro exitoso. Redirigiendo a: /portfolio');
      this.router.navigate(['/portfolio']);
      
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Limpiar mensaje de error
   */
  clearError() {
    this.errorMessage = '';
  }
}