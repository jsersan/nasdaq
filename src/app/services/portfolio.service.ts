import { Injectable } from '@angular/core';
import { Firestore, 
         doc, 
         getDoc, 
         setDoc, 
         collection,
         addDoc,
         query,
         where,
         orderBy,
         getDocs,
         serverTimestamp,
         Timestamp,
         writeBatch } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface StockPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  totalInvested: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export interface Portfolio {
  userId: string;
  cash: number;  // ← NUEVO: Efectivo disponible
  stocks: { [symbol: string]: StockPosition };
  totalInvested: number;
  currentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  updatedAt: any;
}

export interface Transaction {
  id?: string;
  userId: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  timestamp: any;
  notes?: string;
}

export interface CashMovement {
  id?: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  timestamp: any;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  /**
   * Obtener cartera del usuario
   */
  async getPortfolio(userId: string): Promise<Portfolio | null> {
    try {
      console.log('📊 Obteniendo cartera para userId:', userId);
      
      const portfolioRef = doc(this.firestore, `portfolios/${userId}`);
      const portfolioSnap = await getDoc(portfolioRef);

      if (portfolioSnap.exists()) {
        console.log('✅ Cartera encontrada');
        return portfolioSnap.data() as Portfolio;
      }

      // Si no existe, crear cartera vacía
      console.log('📝 Creando cartera vacía');
      return await this.createEmptyPortfolio(userId);
    } catch (error: any) {
      console.error('❌ Error al obtener cartera:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      
      if (error.code === 'permission-denied') {
        console.log('⚠️ Error de permisos, intentando crear cartera...');
        try {
          return await this.createEmptyPortfolio(userId);
        } catch (createError) {
          console.error('❌ No se pudo crear cartera:', createError);
          throw new Error('No se pudo acceder a la cartera. Verifica los permisos de Firebase.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Crear cartera vacía
   */
  private async createEmptyPortfolio(userId: string): Promise<Portfolio> {
    try {
      const emptyPortfolio: Portfolio = {
        userId,
        cash: 0,  // ← Empieza con 0€
        stocks: {},
        totalInvested: 0,
        currentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        updatedAt: serverTimestamp()
      };

      const portfolioRef = doc(this.firestore, `portfolios/${userId}`);
      await setDoc(portfolioRef, emptyPortfolio);

      console.log('✅ Cartera vacía creada correctamente');
      return emptyPortfolio;
    } catch (error: any) {
      console.error('❌ Error al crear cartera vacía:', error);
      throw new Error(`No se pudo crear la cartera: ${error.message}`);
    }
  }

  /**
   * Ingresar dinero en la cuenta
   */
  async depositCash(amount: number, notes?: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    if (amount <= 0) {
      throw new Error('El importe debe ser mayor que 0');
    }

    try {
      console.log('💰 Ingresando efectivo:', amount);

      const portfolio = await this.getPortfolio(user.uid);
      if (!portfolio) throw new Error('No se pudo obtener la cartera');

      // Actualizar efectivo
      portfolio.cash += amount;
      portfolio.updatedAt = serverTimestamp();

      // Guardar cartera
      const portfolioRef = doc(this.firestore, `portfolios/${user.uid}`);
      await setDoc(portfolioRef, portfolio);

      // Registrar movimiento
      await this.addCashMovement({
        userId: user.uid,
        type: 'deposit',
        amount,
        timestamp: serverTimestamp(),
        notes: notes || `Ingreso de efectivo`
      });

      console.log('✅ Ingreso realizado correctamente');
    } catch (error: any) {
      console.error('❌ Error al ingresar efectivo:', error);
      throw new Error(`Error en el ingreso: ${error.message}`);
    }
  }

  /**
   * Retirar dinero de la cuenta
   */
  async withdrawCash(amount: number, notes?: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    if (amount <= 0) {
      throw new Error('El importe debe ser mayor que 0');
    }

    try {
      console.log('💵 Retirando efectivo:', amount);

      const portfolio = await this.getPortfolio(user.uid);
      if (!portfolio) throw new Error('No se pudo obtener la cartera');

      // Verificar que hay suficiente efectivo
      if (portfolio.cash < amount) {
        throw new Error(`Fondos insuficientes. Disponible: ${portfolio.cash.toFixed(2)}€`);
      }

      // Actualizar efectivo
      portfolio.cash -= amount;
      portfolio.updatedAt = serverTimestamp();

      // Guardar cartera
      const portfolioRef = doc(this.firestore, `portfolios/${user.uid}`);
      await setDoc(portfolioRef, portfolio);

      // Registrar movimiento
      await this.addCashMovement({
        userId: user.uid,
        type: 'withdrawal',
        amount,
        timestamp: serverTimestamp(),
        notes: notes || `Retirada de efectivo`
      });

      console.log('✅ Retirada realizada correctamente');
    } catch (error: any) {
      console.error('❌ Error al retirar efectivo:', error);
      throw new Error(`Error en la retirada: ${error.message}`);
    }
  }

  /**
   * Registrar movimiento de efectivo
   */
  private async addCashMovement(movement: CashMovement): Promise<void> {
    try {
      const movementsRef = collection(this.firestore, 'cash_movements');
      await addDoc(movementsRef, movement);
      console.log('✅ Movimiento de efectivo registrado');
    } catch (error: any) {
      console.error('❌ Error al registrar movimiento:', error);
      throw new Error(`No se pudo registrar el movimiento: ${error.message}`);
    }
  }

  /**
   * Obtener historial de movimientos de efectivo
   */
  async getCashMovements(userId: string, limit: number = 50): Promise<CashMovement[]> {
    try {
      const movementsRef = collection(this.firestore, 'cash_movements');
      const q = query(
        movementsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const movements: CashMovement[] = [];

      querySnapshot.forEach((doc) => {
        movements.push({
          id: doc.id,
          ...doc.data()
        } as CashMovement);
      });

      // Ordenar por timestamp descendente
      movements.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });

      return movements.slice(0, limit);
    } catch (error: any) {
      console.error('❌ Error al obtener movimientos:', error);
      return [];
    }
  }

  /**
   * Ejecutar operación de compra (CON VALIDACIÓN DE FONDOS)
   */
  async buyStock(
    symbol: string, 
    name: string, 
    quantity: number, 
    price: number,
    notes?: string
  ): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    try {
      console.log('🛒 Iniciando compra:', { symbol, name, quantity, price });
      
      const total = quantity * price;

      // 1. Obtener cartera actual
      const portfolio = await this.getPortfolio(user.uid);
      if (!portfolio) throw new Error('No se pudo obtener la cartera');

      // 2. VALIDAR FONDOS DISPONIBLES
      if (portfolio.cash < total) {
        throw new Error(
          `Fondos insuficientes.\n\n` +
          `Necesitas: ${total.toFixed(2)}€\n` +
          `Disponible: ${portfolio.cash.toFixed(2)}€\n` +
          `Faltan: ${(total - portfolio.cash).toFixed(2)}€\n\n` +
          `💡 Ingresa fondos desde tu cartera.`
        );
      }

      console.log('✅ Fondos suficientes:', portfolio.cash);

      // 3. Descontar efectivo
      portfolio.cash -= total;

      // 4. Actualizar posición de la acción
      const currentPosition = portfolio.stocks[symbol];

      if (currentPosition) {
        const newQuantity = currentPosition.quantity + quantity;
        const newTotalInvested = currentPosition.totalInvested + total;
        const newAvgPrice = newTotalInvested / newQuantity;

        portfolio.stocks[symbol] = {
          ...currentPosition,
          quantity: newQuantity,
          avgPrice: newAvgPrice,
          totalInvested: newTotalInvested
        };
      } else {
        portfolio.stocks[symbol] = {
          symbol,
          name,
          quantity,
          avgPrice: price,
          totalInvested: total
        };
      }

      // 5. Actualizar totales
      portfolio.totalInvested += total;
      portfolio.updatedAt = serverTimestamp();

      // 6. Guardar cartera
      const portfolioRef = doc(this.firestore, `portfolios/${user.uid}`);
      await setDoc(portfolioRef, portfolio);

      // 7. Registrar transacción
      await this.addTransaction({
        userId: user.uid,
        type: 'buy',
        symbol,
        name,
        quantity,
        price,
        total,
        timestamp: serverTimestamp(),
        notes
      });

      console.log('✅ Compra completada correctamente');
    } catch (error: any) {
      console.error('❌ Error al ejecutar compra:', error);
      throw error;
    }
  }

  /**
   * Ejecutar operación de venta (SUMA EL DINERO AL CASH)
   */
  async sellStock(
    symbol: string,
    name: string,
    quantity: number,
    price: number,
    notes?: string
  ): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    try {
      console.log('💵 Iniciando venta:', { symbol, name, quantity, price });
      
      const total = quantity * price;

      // 1. Obtener cartera actual
      const portfolio = await this.getPortfolio(user.uid);
      if (!portfolio) throw new Error('No se pudo obtener la cartera');

      // 2. Verificar que existe la posición
      const currentPosition = portfolio.stocks[symbol];
      if (!currentPosition) {
        throw new Error('No tienes acciones de este valor');
      }

      if (currentPosition.quantity < quantity) {
        throw new Error(`Solo tienes ${currentPosition.quantity} acciones`);
      }

      // 3. Sumar efectivo de la venta
      portfolio.cash += total;

      // 4. Actualizar posición
      const newQuantity = currentPosition.quantity - quantity;
      const proportionalInvestment = (quantity / currentPosition.quantity) * currentPosition.totalInvested;

      if (newQuantity === 0) {
        delete portfolio.stocks[symbol];
      } else {
        portfolio.stocks[symbol] = {
          ...currentPosition,
          quantity: newQuantity,
          totalInvested: currentPosition.totalInvested - proportionalInvestment
        };
      }

      // 5. Actualizar totales
      portfolio.totalInvested -= proportionalInvestment;
      portfolio.updatedAt = serverTimestamp();

      // 6. Guardar cartera
      const portfolioRef = doc(this.firestore, `portfolios/${user.uid}`);
      await setDoc(portfolioRef, portfolio);

      // 7. Registrar transacción
      await this.addTransaction({
        userId: user.uid,
        type: 'sell',
        symbol,
        name,
        quantity,
        price,
        total,
        timestamp: serverTimestamp(),
        notes
      });

      console.log('✅ Venta completada correctamente');
    } catch (error: any) {
      console.error('❌ Error al ejecutar venta:', error);
      throw error;
    }
  }

  /**
   * Registrar transacción
   */
  private async addTransaction(transaction: Transaction): Promise<void> {
    try {
      const transactionsRef = collection(this.firestore, 'transactions');
      await addDoc(transactionsRef, transaction);
      console.log('✅ Transacción registrada');
    } catch (error: any) {
      console.error('❌ Error al registrar transacción:', error);
      throw new Error(`No se pudo registrar la transacción: ${error.message}`);
    }
  }

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const transactionsRef = collection(this.firestore, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        } as Transaction);
      });

      transactions.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });

      return transactions.slice(0, limit);
    } catch (error: any) {
      console.error('❌ Error al obtener transacciones:', error);
      return [];
    }
  }

  /**
   * Actualizar precios actuales de la cartera
   */
  async updatePortfolioPrices(userId: string, currentPrices: { [symbol: string]: number }): Promise<void> {
    try {
      const portfolio = await this.getPortfolio(userId);
      if (!portfolio) return;

      let totalCurrentValue = 0;

      Object.keys(portfolio.stocks).forEach(symbol => {
        const position = portfolio.stocks[symbol];
        const currentPrice = currentPrices[symbol] || position.avgPrice;

        position.currentPrice = currentPrice;
        position.currentValue = position.quantity * currentPrice;
        position.profitLoss = position.currentValue - position.totalInvested;
        position.profitLossPercent = (position.profitLoss / position.totalInvested) * 100;

        totalCurrentValue += position.currentValue;
      });

      portfolio.currentValue = totalCurrentValue;
      portfolio.totalProfitLoss = totalCurrentValue - portfolio.totalInvested;
      portfolio.totalProfitLossPercent = portfolio.totalInvested > 0 
        ? (portfolio.totalProfitLoss / portfolio.totalInvested) * 100 
        : 0;
      portfolio.updatedAt = serverTimestamp();

      const portfolioRef = doc(this.firestore, `portfolios/${userId}`);
      await setDoc(portfolioRef, portfolio);
    } catch (error) {
      console.error('❌ Error al actualizar precios:', error);
    }
  }

  /**
   * Obtener posición de una acción específica
   */
  async getStockPosition(userId: string, symbol: string): Promise<StockPosition | null> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio) return null;

    return portfolio.stocks[symbol] || null;
  }
}