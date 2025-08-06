import { Portfolio, Holding, InvestmentCriteria, PerformanceMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PortfolioModel {
  private data: Portfolio;

  constructor(name: string, initialCapital: number, criteria: InvestmentCriteria[] = []) {
    this.data = {
      id: uuidv4(),
      name,
      initialCapital,
      currentCash: initialCapital,
      createdAt: new Date(),
      criteria,
      holdings: []
    };
  }

  static fromData(data: Portfolio): PortfolioModel {
    const portfolio = new PortfolioModel(data.name, data.initialCapital, data.criteria);
    portfolio.data = data;
    return portfolio;
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getCurrentCash(): number {
    return this.data.currentCash;
  }

  getHoldings(): Holding[] {
    return this.data.holdings;
  }

  getCriteria(): InvestmentCriteria[] {
    return this.data.criteria;
  }

  addCriteria(description: string, weight: number = 1): void {
    const criteria: InvestmentCriteria = {
      id: uuidv4(),
      description,
      weight,
      active: true
    };
    this.data.criteria.push(criteria);
  }

  addHolding(symbol: string, quantity: number, price: number): void {
    const totalCost = quantity * price;
    
    if (totalCost > this.data.currentCash) {
      throw new Error('Insufficient funds');
    }

    const existingHolding = this.data.holdings.find(h => h.symbol === symbol);
    
    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      const totalCost = (existingHolding.averageCost * existingHolding.quantity) + (price * quantity);
      existingHolding.averageCost = totalCost / totalQuantity;
      existingHolding.quantity = totalQuantity;
      existingHolding.lastUpdated = new Date();
    } else {
      this.data.holdings.push({
        symbol,
        quantity,
        averageCost: price,
        lastUpdated: new Date()
      });
    }

    this.data.currentCash -= totalCost;
  }

  removeHolding(symbol: string, quantity: number, price: number): void {
    const holding = this.data.holdings.find(h => h.symbol === symbol);
    
    if (!holding) {
      throw new Error(`No holding found for symbol: ${symbol}`);
    }

    if (holding.quantity < quantity) {
      throw new Error('Insufficient shares to sell');
    }

    const sellValue = quantity * price;
    this.data.currentCash += sellValue;

    if (holding.quantity === quantity) {
      this.data.holdings = this.data.holdings.filter(h => h.symbol !== symbol);
    } else {
      holding.quantity -= quantity;
      holding.lastUpdated = new Date();
    }
  }

  calculateTotalValue(currentPrices: Map<string, number>): PerformanceMetrics {
    let totalValue = this.data.currentCash;
    let unrealizedGains = 0;

    for (const holding of this.data.holdings) {
      const currentPrice = currentPrices.get(holding.symbol) || holding.averageCost;
      const holdingValue = holding.quantity * currentPrice;
      const costBasis = holding.quantity * holding.averageCost;
      
      totalValue += holdingValue;
      unrealizedGains += (holdingValue - costBasis);
      
      holding.currentPrice = currentPrice;
    }

    const totalReturns = totalValue - this.data.initialCapital;
    const percentageReturns = (totalReturns / this.data.initialCapital) * 100;

    return {
      totalValue,
      totalReturns,
      percentageReturns,
      unrealizedGains,
      realizedGains: 0, // TODO: Track realized gains from transaction history
      timestamp: new Date()
    };
  }

  toData(): Portfolio {
    return { ...this.data };
  }
}