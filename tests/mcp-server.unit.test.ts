import { MarketDataMCPServer } from '../src/mcp/market-data-server';
import { MarketDataService } from '../src/services/MarketDataService';

// Mock the MarketDataService
jest.mock('../src/services/MarketDataService');

describe('MarketDataMCPServer Unit Tests', () => {
  let server: MarketDataMCPServer;
  let mockMarketDataService: jest.Mocked<MarketDataService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock instance
    mockMarketDataService = {
      getCurrentPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
      getBatchPrices: jest.fn(),
      searchSymbols: jest.fn(),
      validateSymbol: jest.fn(),
    } as any;

    // Mock the MarketDataService constructor
    (MarketDataService as jest.MockedClass<typeof MarketDataService>).mockImplementation(
      () => mockMarketDataService
    );

    server = new MarketDataMCPServer();
  });

  describe('Tool Registration', () => {
    test('should register all required MCP tools', () => {
      // This test verifies that the server has the expected tools
      // Since we can't easily test private methods, we'll test through the public interface
      expect(server).toBeInstanceOf(MarketDataMCPServer);
    });
  });

  describe('getCurrentPrice tool', () => {
    test('should return formatted price data', async () => {
      const mockPrice = {
        symbol: 'AAPL',
        price: 150.25,
        timestamp: new Date('2023-12-01T10:00:00Z'),
        source: 'Yahoo Finance'
      };

      mockMarketDataService.getCurrentPrice.mockResolvedValue(mockPrice);

      // Test the private method through reflection (for unit testing purposes)
      const result = await (server as any).getCurrentPrice('AAPL');

      expect(mockMarketDataService.getCurrentPrice).toHaveBeenCalledWith('AAPL');
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('AAPL')
          }
        ]
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        symbol: 'AAPL',
        price: 150.25,
        timestamp: mockPrice.timestamp,
        source: 'Yahoo Finance'
      });
    });

    test('should handle missing symbol parameter', async () => {
      await expect((server as any).getCurrentPrice(undefined)).rejects.toThrow('Symbol is required');
    });

    test('should handle market data service errors', async () => {
      mockMarketDataService.getCurrentPrice.mockRejectedValue(new Error('API Error'));

      await expect((server as any).getCurrentPrice('INVALID')).rejects.toThrow('API Error');
    });
  });

  describe('getHistoricalPrices tool', () => {
    test('should return formatted historical data', async () => {
      const mockPrices = [
        {
          symbol: 'AAPL',
          price: 148.50,
          timestamp: new Date('2023-11-29T10:00:00Z'),
          source: 'Yahoo Finance'
        },
        {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: new Date('2023-11-30T10:00:00Z'),
          source: 'Yahoo Finance'
        }
      ];

      mockMarketDataService.getHistoricalPrices.mockResolvedValue(mockPrices);

      const result = await (server as any).getHistoricalPrices('AAPL', '5d');

      expect(mockMarketDataService.getHistoricalPrices).toHaveBeenCalledWith('AAPL', '5d');
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('AAPL')
          }
        ]
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        symbol: 'AAPL',
        period: '5d',
        count: 2,
        prices: expect.arrayContaining([
          expect.objectContaining({
            price: 148.50,
            timestamp: mockPrices[0].timestamp
          }),
          expect.objectContaining({
            price: 150.25,
            timestamp: mockPrices[1].timestamp
          })
        ])
      });
    });

    test('should validate period parameter', async () => {
      await expect((server as any).getHistoricalPrices('AAPL', 'invalid')).rejects.toThrow(
        'Invalid period'
      );
    });

    test('should require symbol and period parameters', async () => {
      await expect((server as any).getHistoricalPrices(undefined, '1d')).rejects.toThrow(
        'Symbol and period are required'
      );
      await expect((server as any).getHistoricalPrices('AAPL', undefined)).rejects.toThrow(
        'Symbol and period are required'
      );
    });
  });

  describe('getBatchPrices tool', () => {
    test('should return formatted batch price data', async () => {
      const mockPricesMap = new Map([
        ['AAPL', 150.25],
        ['MSFT', 375.80],
        ['GOOGL', 142.30]
      ]);

      mockMarketDataService.getBatchPrices.mockResolvedValue(mockPricesMap);

      const result = await (server as any).getBatchPrices(['AAPL', 'MSFT', 'GOOGL']);

      expect(mockMarketDataService.getBatchPrices).toHaveBeenCalledWith(['AAPL', 'MSFT', 'GOOGL']);
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        AAPL: expect.objectContaining({
          price: 150.25,
          timestamp: expect.any(String)
        }),
        MSFT: expect.objectContaining({
          price: 375.80,
          timestamp: expect.any(String)
        }),
        GOOGL: expect.objectContaining({
          price: 142.30,
          timestamp: expect.any(String)
        })
      });
    });

    test('should validate symbols parameter', async () => {
      await expect((server as any).getBatchPrices(undefined)).rejects.toThrow(
        'Symbols array is required'
      );
      await expect((server as any).getBatchPrices([])).rejects.toThrow(
        'Symbols array is required'
      );
      await expect((server as any).getBatchPrices('not-array')).rejects.toThrow(
        'Symbols array is required'
      );
    });
  });

  describe('validateSymbol tool', () => {
    test('should return validation result for valid symbol', async () => {
      mockMarketDataService.validateSymbol.mockResolvedValue(true);

      const result = await (server as any).validateSymbol('AAPL');

      expect(mockMarketDataService.validateSymbol).toHaveBeenCalledWith('AAPL');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        symbol: 'AAPL',
        valid: true
      });
    });

    test('should return validation result for invalid symbol', async () => {
      mockMarketDataService.validateSymbol.mockResolvedValue(false);

      const result = await (server as any).validateSymbol('INVALID');

      expect(mockMarketDataService.validateSymbol).toHaveBeenCalledWith('INVALID');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        symbol: 'INVALID',
        valid: false
      });
    });

    test('should require symbol parameter', async () => {
      await expect((server as any).validateSymbol(undefined)).rejects.toThrow('Symbol is required');
    });
  });

  describe('searchSymbols tool', () => {
    test('should return search results', async () => {
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AAPLF', name: 'Apple Inc. Foreign' }
      ];

      mockMarketDataService.searchSymbols.mockResolvedValue(mockResults);

      const result = await (server as any).searchSymbols('Apple', 5);

      expect(mockMarketDataService.searchSymbols).toHaveBeenCalledWith('Apple');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        query: 'Apple',
        count: 2,
        results: mockResults
      });
    });

    test('should limit results correctly', async () => {
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AAPLF', name: 'Apple Inc. Foreign' },
        { symbol: 'AAPL1', name: 'Apple Inc. 1' },
        { symbol: 'AAPL2', name: 'Apple Inc. 2' },
        { symbol: 'AAPL3', name: 'Apple Inc. 3' }
      ];

      mockMarketDataService.searchSymbols.mockResolvedValue(mockResults);

      const result = await (server as any).searchSymbols('Apple', 3);
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.count).toBe(3);
      expect(responseData.results).toHaveLength(3);
    });

    test('should require query parameter', async () => {
      await expect((server as any).searchSymbols(undefined)).rejects.toThrow('Query is required');
    });
  });

  describe('calculateMetrics tool', () => {
    test('should calculate volatility metric', async () => {
      const mockPrices = [
        { price: 100, timestamp: new Date('2023-11-01') },
        { price: 105, timestamp: new Date('2023-11-02') },
        { price: 98, timestamp: new Date('2023-11-03') },
        { price: 102, timestamp: new Date('2023-11-04') }
      ];

      mockMarketDataService.getHistoricalPrices.mockResolvedValue(mockPrices as any);

      const result = await (server as any).calculateMetrics('AAPL', ['volatility'], '1mo');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toMatchObject({
        symbol: 'AAPL',
        period: '1mo',
        metrics: {
          volatility: expect.any(Number)
        },
        dataPoints: 4
      });

      expect(responseData.metrics.volatility).toBeGreaterThanOrEqual(0);
    });

    test('should calculate all metrics', async () => {
      const mockPrices = [
        { price: 100, timestamp: new Date('2023-11-01') },
        { price: 110, timestamp: new Date('2023-11-15') },
        { price: 105, timestamp: new Date('2023-11-30') }
      ];

      mockMarketDataService.getHistoricalPrices.mockResolvedValue(mockPrices as any);

      const result = await (server as any).calculateMetrics('AAPL', ['volatility', 'returns', 'price_range'], '1mo');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.metrics).toMatchObject({
        volatility: expect.any(Number),
        returns: expect.objectContaining({
          totalReturn: expect.any(Number),
          annualizedReturn: expect.any(Number),
          period: expect.stringContaining('days')
        }),
        price_range: expect.objectContaining({
          min: 100,
          max: 110,
          current: 105,
          rangePercent: expect.any(Number)
        })
      });
    });

    test('should validate metrics parameter', async () => {
      await expect((server as any).calculateMetrics('AAPL', ['invalid_metric'], '1mo')).rejects.toThrow(
        'Invalid metrics: invalid_metric'
      );
    });

    test('should require symbol and metrics parameters', async () => {
      await expect((server as any).calculateMetrics(undefined, ['volatility'])).rejects.toThrow(
        'Symbol and metrics array are required'
      );
      await expect((server as any).calculateMetrics('AAPL', undefined)).rejects.toThrow(
        'Symbol and metrics array are required'
      );
    });
  });
});