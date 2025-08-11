#!/usr/bin/env node

import express from 'express';
import { MarketDataService } from '../services/MarketDataService';
import { config } from '../config';

interface MarketDataResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class HTTPMarketDataServer {
  private app: express.Application;
  private marketData: MarketDataService;
  private port: number;

  constructor(port: number = 3001) {
    this.app = express();
    this.marketData = new MarketDataService();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'smart-investment-market-data',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Get current price
    this.app.post('/tools/get_current_price', async (req, res) => {
      try {
        const { symbol } = req.body;
        if (!symbol) {
          return res.status(400).json({
            success: false,
            error: 'Symbol is required'
          } as MarketDataResponse);
        }

        const result = await this.marketData.getCurrentPrice(symbol.toUpperCase());
        
        res.json({
          success: true,
          data: {
            symbol: result.symbol,
            price: result.price,
            timestamp: result.timestamp,
            source: result.source
          }
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // Get historical prices
    this.app.post('/tools/get_historical_prices', async (req, res) => {
      try {
        const { symbol, period = '1y' } = req.body;
        if (!symbol) {
          return res.status(400).json({
            success: false,
            error: 'Symbol is required'
          } as MarketDataResponse);
        }

        const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'];
        if (!validPeriods.includes(period)) {
          return res.status(400).json({
            success: false,
            error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
          } as MarketDataResponse);
        }

        const result = await this.marketData.getHistoricalPrices(symbol.toUpperCase(), period);
        
        res.json({
          success: true,
          data: {
            symbol: symbol.toUpperCase(),
            period,
            count: result.length,
            prices: result.map(p => ({
              price: p.price,
              timestamp: p.timestamp
            }))
          }
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // Get batch prices
    this.app.post('/tools/get_batch_prices', async (req, res) => {
      try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Symbols array is required'
          } as MarketDataResponse);
        }

        const upperSymbols = symbols.map((s: string) => s.toUpperCase());
        const result = await this.marketData.getBatchPrices(upperSymbols);
        
        const data: Record<string, { price: number; timestamp: Date }> = {};
        for (const [symbol, price] of result.entries()) {
          data[symbol] = {
            price,
            timestamp: new Date()
          };
        }

        res.json({
          success: true,
          data
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // Search symbols
    this.app.post('/tools/search_symbols', async (req, res) => {
      try {
        const { query, limit = 10 } = req.body;
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'Query is required'
          } as MarketDataResponse);
        }

        const results = await this.marketData.searchSymbols(query);
        const limitedResults = results.slice(0, limit);

        res.json({
          success: true,
          data: {
            query,
            count: limitedResults.length,
            results: limitedResults
          }
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // Validate symbol
    this.app.post('/tools/validate_symbol', async (req, res) => {
      try {
        const { symbol } = req.body;
        if (!symbol) {
          return res.status(400).json({
            success: false,
            error: 'Symbol is required'
          } as MarketDataResponse);
        }

        const isValid = await this.marketData.validateSymbol(symbol.toUpperCase());

        res.json({
          success: true,
          data: {
            symbol: symbol.toUpperCase(),
            valid: isValid
          }
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // Calculate metrics
    this.app.post('/tools/calculate_metrics', async (req, res) => {
      try {
        const { symbol, metrics, period = '1y' } = req.body;
        if (!symbol || !metrics || !Array.isArray(metrics)) {
          return res.status(400).json({
            success: false,
            error: 'Symbol and metrics array are required'
          } as MarketDataResponse);
        }

        const validMetrics = ['volatility', 'returns', 'price_range'];
        const invalidMetrics = metrics.filter((m: string) => !validMetrics.includes(m));
        if (invalidMetrics.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid metrics: ${invalidMetrics.join(', ')}. Valid metrics: ${validMetrics.join(', ')}`
          } as MarketDataResponse);
        }

        const prices = await this.marketData.getHistoricalPrices(symbol.toUpperCase(), period);

        if (prices.length === 0) {
          return res.status(404).json({
            success: false,
            error: `No historical data available for ${symbol}`
          } as MarketDataResponse);
        }

        const result: Record<string, any> = {};

        for (const metric of metrics) {
          switch (metric) {
            case 'volatility':
              result[metric] = this.calculateVolatility(prices);
              break;
            case 'returns':
              result[metric] = this.calculateReturns(prices);
              break;
            case 'price_range':
              result[metric] = this.calculatePriceRange(prices);
              break;
          }
        }

        res.json({
          success: true,
          data: {
            symbol: symbol.toUpperCase(),
            period,
            metrics: result,
            dataPoints: prices.length
          }
        } as MarketDataResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketDataResponse);
      }
    });

    // List available tools
    this.app.get('/tools', (req, res) => {
      res.json({
        success: true,
        data: {
          tools: [
            {
              name: 'get_current_price',
              description: 'Get current stock price and basic market information',
              method: 'POST',
              endpoint: '/tools/get_current_price',
              parameters: {
                symbol: { type: 'string', required: true, description: 'Stock symbol (e.g., AAPL, MSFT)' }
              }
            },
            {
              name: 'get_historical_prices',
              description: 'Get historical price data for a stock over specified period',
              method: 'POST',
              endpoint: '/tools/get_historical_prices',
              parameters: {
                symbol: { type: 'string', required: true, description: 'Stock symbol' },
                period: { type: 'string', required: false, default: '1y', enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'] }
              }
            },
            {
              name: 'get_batch_prices',
              description: 'Get current prices for multiple stocks simultaneously',
              method: 'POST',
              endpoint: '/tools/get_batch_prices',
              parameters: {
                symbols: { type: 'array', items: 'string', required: true, description: 'Array of stock symbols' }
              }
            },
            {
              name: 'search_symbols',
              description: 'Search for stock symbols by company name or keywords',
              method: 'POST',
              endpoint: '/tools/search_symbols',
              parameters: {
                query: { type: 'string', required: true, description: 'Search query (company name or keywords)' },
                limit: { type: 'number', required: false, default: 10, description: 'Maximum number of results' }
              }
            },
            {
              name: 'validate_symbol',
              description: 'Validate if a stock symbol exists and is tradeable',
              method: 'POST',
              endpoint: '/tools/validate_symbol',
              parameters: {
                symbol: { type: 'string', required: true, description: 'Stock symbol to validate' }
              }
            },
            {
              name: 'calculate_metrics',
              description: 'Calculate basic financial metrics from historical data',
              method: 'POST',
              endpoint: '/tools/calculate_metrics',
              parameters: {
                symbol: { type: 'string', required: true, description: 'Stock symbol' },
                metrics: { type: 'array', items: 'string', enum: ['volatility', 'returns', 'price_range'], required: true },
                period: { type: 'string', required: false, default: '1y', description: 'Analysis period' }
              }
            }
          ]
        }
      });
    });
  }

  private calculateVolatility(prices: Array<{ price: number; timestamp: Date }>) {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i].price - prices[i-1].price) / prices[i-1].price;
      returns.push(dailyReturn);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

    return Math.round(volatility * 10000) / 100; // Convert to percentage
  }

  private calculateReturns(prices: Array<{ price: number; timestamp: Date }>) {
    if (prices.length < 2) return { totalReturn: 0, annualizedReturn: 0 };

    const startPrice = prices[0].price;
    const endPrice = prices[prices.length - 1].price;
    const totalReturn = (endPrice - startPrice) / startPrice;

    const daysDiff = (prices[prices.length - 1].timestamp.getTime() - prices[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

    return {
      totalReturn: Math.round(totalReturn * 10000) / 100,
      annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
      period: `${Math.round(daysDiff)} days`,
    };
  }

  private calculatePriceRange(prices: Array<{ price: number; timestamp: Date }>) {
    if (prices.length === 0) return { min: 0, max: 0, current: 0 };

    const priceValues = prices.map(p => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const current = prices[prices.length - 1].price;

    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      current: Math.round(current * 100) / 100,
      rangePercent: Math.round(((current - min) / (max - min)) * 10000) / 100,
    };
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Market Data HTTP Server running on port ${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🔧 Available tools: http://localhost:${this.port}/tools`);
    });
  }
}

// Run the server if this file is executed directly
if (require.main === module) {
  const port = parseInt(process.env.MCP_SERVER_PORT || '3001');
  const server = new HTTPMarketDataServer(port);
  server.start();
}

export { HTTPMarketDataServer };