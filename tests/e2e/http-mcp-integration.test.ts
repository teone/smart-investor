import { MCPMarketDataClient } from '../../src/utils/MCPClient';
import { AIResearchEngine } from '../../src/services/AIResearchEngine';

describe('HTTP MCP Integration Tests', () => {
  let mcpClient: MCPMarketDataClient;
  
  beforeAll(async () => {
    mcpClient = new MCPMarketDataClient();
  });

  afterAll(async () => {
    if (mcpClient.isConnected()) {
      mcpClient.disconnect();
    }
  });

  test('should connect to HTTP MCP server', async () => {
    await mcpClient.connect();
    expect(mcpClient.isConnected()).toBe(true);
  });

  test('should get market data for a stock', async () => {
    if (!mcpClient.isConnected()) {
      await mcpClient.connect();
    }

    const marketData = await mcpClient.getMarketData('AAPL');
    
    expect(marketData).toMatchObject({
      currentPrice: expect.any(Number),
      volatility: expect.any(Number),
      returns: expect.objectContaining({
        totalReturn: expect.any(Number),
        annualizedReturn: expect.any(Number)
      }),
      priceRange: expect.objectContaining({
        min: expect.any(Number),
        max: expect.any(Number),
        current: expect.any(Number),
        rangePercent: expect.any(Number)
      })
    });

    expect(marketData.currentPrice).toBeGreaterThan(0);
    expect(marketData.priceHistory).toBeInstanceOf(Array);
  }, 30000);

  test('should validate stock symbols', async () => {
    if (!mcpClient.isConnected()) {
      await mcpClient.connect();
    }

    const validSymbol = await mcpClient.validateSymbol('AAPL');
    const invalidSymbol = await mcpClient.validateSymbol('INVALIDXYZ');

    expect(validSymbol).toBe(true);
    expect(invalidSymbol).toBe(false);
  }, 15000);

  test('should search for symbols', async () => {
    if (!mcpClient.isConnected()) {
      await mcpClient.connect();
    }

    const results = await mcpClient.searchSymbols('Apple', 5);
    
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(results[0]).toMatchObject({
      symbol: expect.any(String),
      name: expect.any(String)
    });
    
    // Should find AAPL
    expect(results.some(r => r.symbol === 'AAPL')).toBe(true);
  }, 15000);

  test('should enhance AI research with market data', async () => {
    const aiEngine = new AIResearchEngine('google');
    
    // Mock criteria
    const criteria = [
      { id: '1', description: 'Large cap technology companies', weight: 1, active: true },
      { id: '2', description: 'Strong financial performance', weight: 0.8, active: true }
    ];

    const research = await aiEngine.researchCompany('AAPL', criteria);
    
    expect(research).toMatchObject({
      symbol: 'AAPL',
      companyName: expect.any(String),
      analysis: expect.any(String),
      score: expect.any(Number),
      reasoning: expect.any(String),
      timestamp: expect.any(Date)
    });

    expect(research.score).toBeGreaterThanOrEqual(0);
    expect(research.score).toBeLessThanOrEqual(100);
    expect(research.companyName).not.toBe('AAPL'); // Should extract actual company name
    expect(research.analysis.toLowerCase()).toContain('market'); // Should include market context
  }, 60000);
});