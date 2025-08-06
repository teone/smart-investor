import { PortfolioModel } from '../models/Portfolio';
import { Portfolio, Transaction, InvestmentRecommendation, PerformanceMetrics } from '../types';
import { MarketDataService } from './MarketDataService';
import { AIResearchEngine } from './AIResearchEngine';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config';

export class PortfolioManager {
  private portfolios: Map<string, PortfolioModel> = new Map();
  private transactions: Transaction[] = [];
  private marketData: MarketDataService;
  private aiEngine: AIResearchEngine;

  constructor() {
    this.marketData = new MarketDataService();
    this.aiEngine = new AIResearchEngine(config.defaultLLMProvider as 'openai' | 'anthropic' | 'google');
  }

  async initialize(): Promise<void> {
    await this.loadPortfolios();
    await this.loadTransactions();
  }

  async createPortfolio(name: string, initialCapital: number): Promise<string> {
    const portfolio = new PortfolioModel(name, initialCapital);
    const portfolioId = portfolio.getId();
    
    this.portfolios.set(portfolioId, portfolio);
    await this.savePortfolios();
    
    return portfolioId;
  }

  getPortfolio(portfolioId: string): PortfolioModel | undefined {
    return this.portfolios.get(portfolioId);
  }

  getAllPortfolios(): PortfolioModel[] {
    return Array.from(this.portfolios.values());
  }

  async deletePortfolio(portfolioId: string): Promise<boolean> {
    const deleted = this.portfolios.delete(portfolioId);
    if (deleted) {
      // Remove associated transactions
      this.transactions = this.transactions.filter(t => t.portfolioId !== portfolioId);
      await this.savePortfolios();
      await this.saveTransactions();
    }
    return deleted;
  }

  async buyStock(portfolioId: string, symbol: string, quantity: number): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    // Get current market price
    const stockPrice = await this.marketData.getCurrentPrice(symbol);
    const totalCost = quantity * stockPrice.price;

    if (totalCost > portfolio.getCurrentCash()) {
      throw new Error(`Insufficient funds. Required: $${totalCost.toFixed(2)}, Available: $${portfolio.getCurrentCash().toFixed(2)}`);
    }

    // Execute the trade
    portfolio.addHolding(symbol, quantity, stockPrice.price);

    // Record transaction
    const transaction: Transaction = {
      id: uuidv4(),
      portfolioId,
      symbol,
      type: 'BUY',
      quantity,
      price: stockPrice.price,
      timestamp: new Date(),
      reasoning: `Manual buy order executed at market price`
    };
    
    this.transactions.push(transaction);
    
    await this.savePortfolios();
    await this.saveTransactions();
  }

  async sellStock(portfolioId: string, symbol: string, quantity: number): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    // Get current market price
    const stockPrice = await this.marketData.getCurrentPrice(symbol);

    // Execute the trade
    portfolio.removeHolding(symbol, quantity, stockPrice.price);

    // Record transaction
    const transaction: Transaction = {
      id: uuidv4(),
      portfolioId,
      symbol,
      type: 'SELL',
      quantity,
      price: stockPrice.price,
      timestamp: new Date(),
      reasoning: `Manual sell order executed at market price`
    };
    
    this.transactions.push(transaction);
    
    await this.savePortfolios();
    await this.saveTransactions();
  }

  async getPortfolioPerformance(portfolioId: string): Promise<PerformanceMetrics> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const holdings = portfolio.getHoldings();
    if (holdings.length === 0) {
      return {
        totalValue: portfolio.getCurrentCash(),
        totalReturns: portfolio.getCurrentCash() - portfolio.toData().initialCapital,
        percentageReturns: ((portfolio.getCurrentCash() - portfolio.toData().initialCapital) / portfolio.toData().initialCapital) * 100,
        unrealizedGains: 0,
        realizedGains: 0,
        timestamp: new Date()
      };
    }

    const symbols = holdings.map(h => h.symbol);
    const currentPrices = await this.marketData.getBatchPrices(symbols);

    return portfolio.calculateTotalValue(currentPrices);
  }

  async generateRecommendations(portfolioId: string): Promise<InvestmentRecommendation[]> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const criteria = portfolio.getCriteria();
    if (criteria.length === 0) {
      return [];
    }

    // Find potential companies based on criteria
    const potentialSymbols = await this.aiEngine.findCompaniesForCriteria(criteria, 15);
    
    // Research each company
    const researches = [];
    for (const symbol of potentialSymbols) {
      try {
        const research = await this.aiEngine.researchCompany(symbol, criteria);
        researches.push(research);
      } catch (error) {
        console.warn(`Failed to research ${symbol}:`, error);
      }
    }

    // Generate recommendations
    return await this.aiEngine.generateRecommendations(
      researches,
      portfolio.getCurrentCash(),
      8 // Max 8 positions for diversification
    );
  }

  async executeRecommendation(portfolioId: string, recommendation: InvestmentRecommendation): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    if (recommendation.action === 'BUY' && recommendation.quantity) {
      await this.buyStock(portfolioId, recommendation.symbol, recommendation.quantity);
    } else if (recommendation.action === 'SELL' && recommendation.quantity) {
      await this.sellStock(portfolioId, recommendation.symbol, recommendation.quantity);
    }
  }

  getTransactionHistory(portfolioId: string): Transaction[] {
    return this.transactions
      .filter(t => t.portfolioId === portfolioId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async loadPortfolios(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const portfolioPath = path.join(dataDir, config.portfolioFile);
      
      await fs.mkdir(dataDir, { recursive: true });
      
      const data = await fs.readFile(portfolioPath, 'utf-8');
      const portfoliosData: Portfolio[] = JSON.parse(data);
      
      for (const portfolioData of portfoliosData) {
        const portfolio = PortfolioModel.fromData({
          ...portfolioData,
          createdAt: new Date(portfolioData.createdAt)
        });
        this.portfolios.set(portfolio.getId(), portfolio);
      }
    } catch (error) {
      // File doesn't exist or is empty, start with empty portfolios
      console.log('No existing portfolios found, starting fresh');
    }
  }

  private async savePortfolios(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const portfolioPath = path.join(dataDir, config.portfolioFile);
      
      await fs.mkdir(dataDir, { recursive: true });
      
      const portfoliosData = Array.from(this.portfolios.values()).map(p => p.toData());
      await fs.writeFile(portfolioPath, JSON.stringify(portfoliosData, null, 2));
    } catch (error) {
      console.error('Error saving portfolios:', error);
      throw new Error('Failed to save portfolios');
    }
  }

  private async loadTransactions(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const transactionsPath = path.join(dataDir, 'transactions.json');
      
      const data = await fs.readFile(transactionsPath, 'utf-8');
      const transactionsData = JSON.parse(data);
      
      this.transactions = transactionsData.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      }));
    } catch (error) {
      // File doesn't exist or is empty, start with empty transactions
      console.log('No existing transactions found, starting fresh');
    }
  }

  private async saveTransactions(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const transactionsPath = path.join(dataDir, 'transactions.json');
      
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(transactionsPath, JSON.stringify(this.transactions, null, 2));
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw new Error('Failed to save transactions');
    }
  }
}