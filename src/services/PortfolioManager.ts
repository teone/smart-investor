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
  private recommendations: InvestmentRecommendation[] = [];
  private marketData: MarketDataService;
  private aiEngine: AIResearchEngine;

  constructor() {
    this.marketData = new MarketDataService();
    this.aiEngine = new AIResearchEngine(config.defaultLLMProvider as 'openai' | 'anthropic' | 'google');
  }

  async initialize(): Promise<void> {
    await this.loadPortfolios();
    await this.loadTransactions();
    await this.loadRecommendations();
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

  async addCriteria(portfolioId: string, description: string, weight: number = 1): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    portfolio.addCriteria(description, weight);
    await this.savePortfolios();
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

  async generateRecommendations(portfolioId: string, progressCallback?: (step: string, current?: number, total?: number) => void): Promise<InvestmentRecommendation[]> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const criteria = portfolio.getCriteria();
    if (criteria.length === 0) {
      return [];
    }

    progressCallback?.('Finding potential companies based on your criteria...');
    // Find potential companies based on criteria
    const potentialSymbols = await this.aiEngine.findCompaniesForCriteria(criteria, 15);
    
    if (potentialSymbols.length === 0) {
      progressCallback?.('No companies found matching your criteria.');
      return [];
    }

    progressCallback?.('Researching companies using AI analysis...', 0, potentialSymbols.length);
    // Research each company
    const researches = [];
    for (let i = 0; i < potentialSymbols.length; i++) {
      const symbol = potentialSymbols[i];
      try {
        progressCallback?.(`Analyzing ${symbol}...`, i + 1, potentialSymbols.length);
        const research = await this.aiEngine.researchCompany(symbol, criteria);
        researches.push(research);
      } catch (error) {
        console.warn(`Failed to research ${symbol}:`, error);
      }
    }

    progressCallback?.('Generating investment recommendations...');
    // Generate recommendations
    const recommendations = await this.aiEngine.generateRecommendations(
      portfolioId,
      researches,
      portfolio.getCurrentCash(),
      8 // Max 8 positions for diversification
    );

    progressCallback?.('Saving recommendations...');
    // Store recommendations
    this.recommendations.push(...recommendations);
    await this.saveRecommendations();

    return recommendations;
  }

  async executeRecommendation(recommendationId: string): Promise<void> {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    if (recommendation.executed) {
      throw new Error('Recommendation has already been executed');
    }

    const portfolio = this.portfolios.get(recommendation.portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${recommendation.portfolioId}`);
    }

    // Calculate quantity if not specified
    if (!recommendation.quantity && recommendation.action === 'BUY') {
      const stockPrice = await this.marketData.getCurrentPrice(recommendation.symbol);
      const maxInvestment = portfolio.getCurrentCash() * 0.1; // Max 10% of cash per position
      recommendation.quantity = Math.floor(maxInvestment / stockPrice.price);
    }

    if (recommendation.action === 'BUY' && recommendation.quantity) {
      await this.buyStock(recommendation.portfolioId, recommendation.symbol, recommendation.quantity);
    } else if (recommendation.action === 'SELL' && recommendation.quantity) {
      await this.sellStock(recommendation.portfolioId, recommendation.symbol, recommendation.quantity);
    }

    // Mark recommendation as executed
    recommendation.executed = true;
    recommendation.executedAt = new Date();
    await this.saveRecommendations();
  }

  getRecommendations(portfolioId: string): InvestmentRecommendation[] {
    return this.recommendations
      .filter(r => r.portfolioId === portfolioId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPendingRecommendations(portfolioId: string): InvestmentRecommendation[] {
    return this.recommendations
      .filter(r => r.portfolioId === portfolioId && !r.executed)
      .sort((a, b) => b.score - a.score);
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

  private async loadRecommendations(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const recommendationsPath = path.join(dataDir, 'recommendations.json');
      
      const data = await fs.readFile(recommendationsPath, 'utf-8');
      const recommendationsData = JSON.parse(data);
      
      this.recommendations = recommendationsData.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        executedAt: r.executedAt ? new Date(r.executedAt) : undefined
      }));
    } catch (error) {
      // File doesn't exist or is empty, start with empty recommendations
      console.log('No existing recommendations found, starting fresh');
    }
  }

  private async saveRecommendations(): Promise<void> {
    try {
      const dataDir = config.dataPath;
      const recommendationsPath = path.join(dataDir, 'recommendations.json');
      
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(recommendationsPath, JSON.stringify(this.recommendations, null, 2));
    } catch (error) {
      console.error('Error saving recommendations:', error);
      throw new Error('Failed to save recommendations');
    }
  }
}