export interface Portfolio {
  id: string;
  name: string;
  initialCapital: number;
  currentCash: number;
  createdAt: Date;
  criteria: InvestmentCriteria[];
  holdings: Holding[];
}

export interface Holding {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  lastUpdated: Date;
}

export interface InvestmentCriteria {
  id: string;
  description: string;
  weight: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
  reasoning: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  timestamp: Date;
  source: string;
}

export interface CompanyResearch {
  symbol: string;
  companyName: string;
  analysis: string;
  score: number;
  reasoning: string;
  timestamp: Date;
}

export interface InvestmentRecommendation {
  id: string;
  portfolioId: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity?: number;
  reasoning: string;
  score: number;
  confidence: number;
  targetPrice?: number;
  createdAt: Date;
  executed?: boolean;
  executedAt?: Date;
}

export interface PerformanceMetrics {
  totalValue: number;
  totalReturns: number;
  percentageReturns: number;
  unrealizedGains: number;
  realizedGains: number;
  timestamp: Date;
}