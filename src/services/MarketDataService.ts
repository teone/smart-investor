import axios from 'axios';
import { StockPrice } from '../types';

export class MarketDataService {
  private baseUrl: string = 'https://query1.finance.yahoo.com/v8/finance/chart/';

  async getCurrentPrice(symbol: string): Promise<StockPrice> {
    try {
      const response = await axios.get(`${this.baseUrl}${symbol}`, {
        timeout: 10000
      });

      const data = response.data;

      if (data.chart?.error) {
        throw new Error(`Yahoo Finance API Error: ${data.chart.error.description}`);
      }

      const result = data.chart?.result?.[0];
      if (!result) {
        throw new Error(`No price data available for symbol: ${symbol}`);
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice || meta.previousClose;

      if (!currentPrice) {
        throw new Error(`No valid price found for symbol: ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        timestamp: new Date(),
        source: 'Yahoo Finance'
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error fetching price for ${symbol}: ${error.message}`);
      }
      throw error;
    }
  }

  async getBatchPrices(symbols: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    // Yahoo Finance allows multiple symbols in one request
    const symbolsParam = symbols.join(',');

    try {
      const response = await axios.get(`${this.baseUrl}${symbolsParam}`, {
        timeout: 15000
      });

      const data = response.data;

      if (!data.chart?.result) {
        throw new Error('No data returned from Yahoo Finance');
      }

      for (const result of data.chart.result) {
        const symbol = result.meta.symbol;
        const currentPrice = result.meta.regularMarketPrice || result.meta.previousClose;

        if (currentPrice) {
          prices.set(symbol, currentPrice);
        }
      }

      return prices;
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Fallback to individual requests if batch fails
      console.warn('Batch request failed, falling back to individual requests');

      for (const symbol of symbols) {
        try {
          const stockPrice = await this.getCurrentPrice(symbol);
          prices.set(symbol, stockPrice.price);

          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (_error) {
          console.warn(`Failed to fetch price for ${symbol}:`, _error);
        }
      }

      return prices;
    }
  }

  async getHistoricalPrices(symbol: string, period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max' = '1y'): Promise<StockPrice[]> {
    try {
      const response = await axios.get(`${this.baseUrl}${symbol}`, {
        params: {
          period1: this.getPeriodTimestamp(period),
          period2: Math.floor(Date.now() / 1000),
          interval: '1d'
        },
        timeout: 15000
      });

      const data = response.data;

      if (data.chart?.error) {
        throw new Error(`Yahoo Finance API Error: ${data.chart.error.description}`);
      }

      const result = data.chart?.result?.[0];
      if (!result) {
        throw new Error(`No historical data available for symbol: ${symbol}`);
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      const prices: StockPrice[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null) {
          prices.push({
            symbol: symbol.toUpperCase(),
            price: closes[i],
            timestamp: new Date(timestamps[i] * 1000),
            source: 'Yahoo Finance'
          });
        }
      }

      return prices.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error fetching historical data for ${symbol}: ${error.message}`);
      }
      throw error;
    }
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      await this.getCurrentPrice(symbol);
      return true;
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return false;
    }
  }

  async searchSymbols(query: string): Promise<Array<{ symbol: string, name: string }>> {
    try {
      const response = await axios.get('https://query2.finance.yahoo.com/v1/finance/search', {
        params: {
          q: query,
          quotesCount: 10,
          newsCount: 0
        },
        timeout: 10000
      });

      const data = response.data;
      const quotes = data.quotes || [];

      return quotes
        .filter((quote: any) => quote.typeDisp === 'Equity' && quote.exchDisp)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol
        }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error searching for symbols: ${error.message}`);
      }
      throw error;
    }
  }

  private getPeriodTimestamp(period: string): number {
    const now = Date.now() / 1000;
    const day = 24 * 60 * 60;

    switch (period) {
      case '1d': return now - day;
      case '5d': return now - (5 * day);
      case '1mo': return now - (30 * day);
      case '3mo': return now - (90 * day);
      case '6mo': return now - (180 * day);
      case '1y': return now - (365 * day);
      case '2y': return now - (2 * 365 * day);
      case '5y': return now - (5 * 365 * day);
      case '10y': return now - (10 * 365 * day);
      case 'ytd': {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        return startOfYear.getTime() / 1000;
      }
      case 'max': return 0;
      default: return now - (365 * day);
    }
  }
}