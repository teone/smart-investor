import { config } from '../config';

interface MarketData {
  currentPrice?: number;
  priceHistory?: Array<{ price: number; timestamp: string }>;
  volatility?: number;
  returns?: { totalReturn: number; annualizedReturn: number };
  priceRange?: { min: number; max: number; current: number; rangePercent: number };
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MCPMarketDataClient {
  private baseUrl: string;
  private connected: boolean = false;

  constructor() {
    this.baseUrl = `http://${config.mcpServer.host}:${config.mcpServer.port}`;
  }

  async connect(): Promise<void> {
    if (!config.mcpServer.enabled) {
      throw new Error('MCP Server is disabled in configuration');
    }

    try {
      // Test connection with a simple health check
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        this.connected = true;
        console.log('🔗 Connected to MCP Market Data server');
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to connect to MCP server:', error);
      this.connected = false;
      throw error;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    const marketData: MarketData = {};

    try {
      // Get current price
      const priceResponse = await this.callTool('get_current_price', { symbol });
      if (priceResponse.success && priceResponse.data?.price) {
        marketData.currentPrice = priceResponse.data.price;
      }
    } catch (error) {
      console.warn(`Failed to get current price for ${symbol}:`, error);
    }

    try {
      // Get historical prices for trend analysis
      const historyResponse = await this.callTool('get_historical_prices', { 
        symbol, 
        period: '1y' 
      });
      if (historyResponse.success && historyResponse.data?.prices) {
        marketData.priceHistory = historyResponse.data.prices;
      }
    } catch (error) {
      console.warn(`Failed to get historical prices for ${symbol}:`, error);
    }

    try {
      // Get calculated metrics
      const metricsResponse = await this.callTool('calculate_metrics', { 
        symbol, 
        metrics: ['volatility', 'returns', 'price_range'],
        period: '1y'
      });
      if (metricsResponse.success && metricsResponse.data?.metrics) {
        marketData.volatility = metricsResponse.data.metrics.volatility;
        marketData.returns = metricsResponse.data.metrics.returns;
        marketData.priceRange = metricsResponse.data.metrics.price_range;
      }
    } catch (error) {
      console.warn(`Failed to get metrics for ${symbol}:`, error);
    }

    return marketData;
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.callTool('validate_symbol', { symbol });
      return response?.success && response?.data?.valid || false;
    } catch (error) {
      console.warn(`Failed to validate symbol ${symbol}:`, error);
      return false;
    }
  }

  async searchSymbols(query: string, limit: number = 10): Promise<Array<{ symbol: string; name: string }>> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.callTool('search_symbols', { query, limit });
      return response?.success && response?.data?.results || [];
    } catch (error) {
      console.warn(`Failed to search symbols for ${query}:`, error);
      return [];
    }
  }

  private async callTool(toolName: string, args: any): Promise<APIResponse> {
    const response = await fetch(`${this.baseUrl}/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as APIResponse;
    
    if (!result.success && result.error) {
      throw new Error(result.error);
    }
    
    return result;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    console.log('🔌 Disconnected from MCP Market Data server');
  }
}