import { Injectable } from '@angular/core';
import { Auth, 
         createUserWithEmailAndPassword, 
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged,
         User,
         updateProfile } from '@angular/fire/auth';
import { Firestore, 
         doc, 
         setDoc, 
         getDoc,
         serverTimestamp } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  updatedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  /**
   * Registrar nuevo usuario
   */
  async register(email: string, password: string, displayName: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );

      // Actualizar perfil con nombre
      await updateProfile(userCredential.user, { displayName });

      // Crear documento de usuario en Firestore
      await this.createUserProfile(userCredential.user, displayName);

      console.log('✅ Usuario registrado correctamente');
    } catch (error: any) {
      console.error('❌ Error al registrar:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Iniciar sesión
   */
  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Sesión iniciada correctamente');
    } catch (error: any) {
      console.error('❌ Error al iniciar sesión:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('✅ Sesión cerrada correctamente');
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error);
      throw error;
    }
  }

  /**
   * Crear perfil de usuario en Firestore
   */
  private async createUserProfile(user: User, displayName: string): Promise<void> {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, userProfile);
  }

  /**
   * Obtener perfil de usuario
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(this.firestore, `users/${uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Verificar si hay usuario autenticado
   */
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Manejar errores de autenticación
   */
  private handleAuthError(error: any): Error {
    let message = 'Error desconocido';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este correo ya está registrado';
        break;
      case 'auth/invalid-email':
        message = 'Correo electrónico inválido';
        break;
      case 'auth/weak-password':
        message = 'La contraseña debe tener al menos 6 caracteres';
        break;
      case 'auth/user-not-found':
        message = 'Usuario no encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Contraseña incorrecta';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Intenta más tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Error de conexión. Verifica tu internet';
        break;
      default:
        message = error.message || 'Error de autenticación';
    }

    return new Error(message);
  }
}