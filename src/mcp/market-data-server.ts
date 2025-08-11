#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MarketDataService } from '../services/MarketDataService';

class MarketDataMCPServer {
  private server: Server;
  private marketData: MarketDataService;

  constructor() {
    this.server = new Server(
      {
        name: 'smart-investment-market-data',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.marketData = new MarketDataService();
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_current_price',
          description: 'Get current stock price and basic market information',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Stock symbol (e.g., AAPL, MSFT)',
              },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'get_historical_prices',
          description: 'Get historical price data for a stock over specified period',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Stock symbol',
              },
              period: {
                type: 'string',
                enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'],
                description: 'Time period for historical data',
              },
            },
            required: ['symbol', 'period'],
          },
        },
        {
          name: 'get_batch_prices',
          description: 'Get current prices for multiple stocks simultaneously',
          inputSchema: {
            type: 'object',
            properties: {
              symbols: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of stock symbols',
              },
            },
            required: ['symbols'],
          },
        },
        {
          name: 'search_symbols',
          description: 'Search for stock symbols by company name or keywords',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (company name or keywords)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'validate_symbol',
          description: 'Validate if a stock symbol exists and is tradeable',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Stock symbol to validate',
              },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'calculate_metrics',
          description: 'Calculate basic financial metrics from historical data',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Stock symbol',
              },
              metrics: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['volatility', 'returns', 'price_range'],
                },
                description: 'Metrics to calculate',
              },
              period: {
                type: 'string',
                description: 'Analysis period',
                default: '1y',
              },
            },
            required: ['symbol', 'metrics'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_current_price':
            return await this.getCurrentPrice(args?.symbol as string);

          case 'get_historical_prices':
            return await this.getHistoricalPrices(
              args?.symbol as string,
              args?.period as string
            );

          case 'get_batch_prices':
            return await this.getBatchPrices(args?.symbols as string[]);

          case 'search_symbols':
            return await this.searchSymbols(
              args?.query as string,
              args?.limit as number
            );

          case 'validate_symbol':
            return await this.validateSymbol(args?.symbol as string);

          case 'calculate_metrics':
            return await this.calculateMetrics(
              args?.symbol as string,
              args?.metrics as string[],
              args?.period as string
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getCurrentPrice(symbol: string) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const price = await this.marketData.getCurrentPrice(symbol.toUpperCase());
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol: price.symbol,
            price: price.price,
            timestamp: price.timestamp,
            source: price.source,
          }, null, 2),
        },
      ],
    };
  }

  private async getHistoricalPrices(symbol: string, period: string) {
    if (!symbol || !period) {
      throw new Error('Symbol and period are required');
    }

    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'];
    if (!validPeriods.includes(period)) {
      throw new Error(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }

    const prices = await this.marketData.getHistoricalPrices(
      symbol.toUpperCase(),
      period as any
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol: symbol.toUpperCase(),
            period,
            count: prices.length,
            prices: prices.map(p => ({
              price: p.price,
              timestamp: p.timestamp,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async getBatchPrices(symbols: string[]) {
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Symbols array is required');
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    const pricesMap = await this.marketData.getBatchPrices(upperSymbols);

    const result: Record<string, { price: number; timestamp: Date }> = {};
    for (const [symbol, price] of pricesMap.entries()) {
      result[symbol] = {
        price,
        timestamp: new Date(),
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async searchSymbols(query: string, limit = 10) {
    if (!query) {
      throw new Error('Query is required');
    }

    const results = await this.marketData.searchSymbols(query);
    const limitedResults = results.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            count: limitedResults.length,
            results: limitedResults,
          }, null, 2),
        },
      ],
    };
  }

  private async validateSymbol(symbol: string) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const isValid = await this.marketData.validateSymbol(symbol.toUpperCase());

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol: symbol.toUpperCase(),
            valid: isValid,
          }, null, 2),
        },
      ],
    };
  }

  private async calculateMetrics(symbol: string, metrics: string[], period = '1y') {
    if (!symbol || !metrics || !Array.isArray(metrics)) {
      throw new Error('Symbol and metrics array are required');
    }

    const validMetrics = ['volatility', 'returns', 'price_range'];
    const invalidMetrics = metrics.filter(m => !validMetrics.includes(m));
    if (invalidMetrics.length > 0) {
      throw new Error(`Invalid metrics: ${invalidMetrics.join(', ')}. Valid metrics: ${validMetrics.join(', ')}`);
    }

    try {
      const prices = await this.marketData.getHistoricalPrices(
        symbol.toUpperCase(),
        period as any
      );

      if (prices.length === 0) {
        throw new Error(`No historical data available for ${symbol}`);
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              symbol: symbol.toUpperCase(),
              period,
              metrics: result,
              dataPoints: prices.length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to calculate metrics for ${symbol}: ${error}`);
    }
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Run the server if this file is executed directly
if (require.main === module) {
  const server = new MarketDataMCPServer();
  server.run().catch(console.error);
}

export { MarketDataMCPServer };