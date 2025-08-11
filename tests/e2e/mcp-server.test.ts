import { spawn, ChildProcess } from 'child_process';
import { MarketDataMCPServer } from '../../src/mcp/market-data-server';

describe('MCP Market Data Server E2E Tests', () => {
  let serverProcess: ChildProcess;
  
  beforeAll(async () => {
    // Start the MCP server process
    serverProcess = spawn('node', ['dist/mcp/market-data-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  const sendMCPRequest = async (request: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      let responseData = '';
      let errorData = '';

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        const lines = responseData.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              serverProcess.stdout.off('data', onData);
              serverProcess.stderr.off('data', onError);
              resolve(response);
              return;
            }
          } catch (e) {
            // Ignore parsing errors, might be partial data
          }
        }
      };

      const onError = (data: Buffer) => {
        errorData += data.toString();
      };

      serverProcess.stdout.on('data', onData);
      serverProcess.stderr.on('data', onError);

      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  };

  test('should list available tools', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const response = await sendMCPRequest(request);

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: 'get_current_price',
            description: expect.stringContaining('current stock price')
          }),
          expect.objectContaining({
            name: 'get_historical_prices',
            description: expect.stringContaining('historical price data')
          }),
          expect.objectContaining({
            name: 'get_batch_prices',
            description: expect.stringContaining('multiple stocks')
          }),
          expect.objectContaining({
            name: 'search_symbols',
            description: expect.stringContaining('search for stock symbols')
          }),
          expect.objectContaining({
            name: 'validate_symbol',
            description: expect.stringContaining('validate')
          }),
          expect.objectContaining({
            name: 'calculate_metrics',
            description: expect.stringContaining('financial metrics')
          })
        ])
      }
    });

    expect(response.result.tools).toHaveLength(6);
  });

  test('should get current price for AAPL', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_current_price',
        arguments: {
          symbol: 'AAPL'
        }
      }
    };

    const response = await sendMCPRequest(request);

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        content: [
          {
            type: 'text',
            text: expect.stringMatching(/AAPL.*price.*timestamp/)
          }
        ]
      }
    });

    const priceData = JSON.parse(response.result.content[0].text);
    expect(priceData).toMatchObject({
      symbol: 'AAPL',
      price: expect.any(Number),
      timestamp: expect.any(String),
      source: expect.any(String)
    });

    expect(priceData.price).toBeGreaterThan(0);
  }, 15000);

  test('should validate a valid stock symbol', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'validate_symbol',
        arguments: {
          symbol: 'MSFT'
        }
      }
    };

    const response = await sendMCPRequest(request);

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 3,
      result: {
        content: [
          {
            type: 'text',
            text: expect.stringContaining('MSFT')
          }
        ]
      }
    });

    const validationData = JSON.parse(response.result.content[0].text);
    expect(validationData).toMatchObject({
      symbol: 'MSFT',
      valid: true
    });
  }, 10000);

  test('should reject invalid stock symbol', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'validate_symbol',
        arguments: {
          symbol: 'INVALIDXYZ'
        }
      }
    };

    const response = await sendMCPRequest(request);

    const validationData = JSON.parse(response.result.content[0].text);
    expect(validationData).toMatchObject({
      symbol: 'INVALIDXYZ',
      valid: false
    });
  }, 10000);

  test('should get historical prices', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_historical_prices',
        arguments: {
          symbol: 'AAPL',
          period: '5d'
        }
      }
    };

    const response = await sendMCPRequest(request);

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 5,
      result: {
        content: [
          {
            type: 'text',
            text: expect.stringContaining('AAPL')
          }
        ]
      }
    });

    const historyData = JSON.parse(response.result.content[0].text);
    expect(historyData).toMatchObject({
      symbol: 'AAPL',
      period: '5d',
      count: expect.any(Number),
      prices: expect.arrayContaining([
        expect.objectContaining({
          price: expect.any(Number),
          timestamp: expect.any(String)
        })
      ])
    });

    expect(historyData.prices.length).toBeGreaterThan(0);
    expect(historyData.count).toEqual(historyData.prices.length);
  }, 15000);

  test('should calculate basic metrics', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'calculate_metrics',
        arguments: {
          symbol: 'AAPL',
          metrics: ['volatility', 'returns', 'price_range'],
          period: '1mo'
        }
      }
    };

    const response = await sendMCPRequest(request);

    const metricsData = JSON.parse(response.result.content[0].text);
    expect(metricsData).toMatchObject({
      symbol: 'AAPL',
      period: '1mo',
      metrics: {
        volatility: expect.any(Number),
        returns: expect.objectContaining({
          totalReturn: expect.any(Number),
          annualizedReturn: expect.any(Number),
          period: expect.stringContaining('days')
        }),
        price_range: expect.objectContaining({
          min: expect.any(Number),
          max: expect.any(Number),
          current: expect.any(Number),
          rangePercent: expect.any(Number)
        })
      },
      dataPoints: expect.any(Number)
    });

    expect(metricsData.metrics.volatility).toBeGreaterThanOrEqual(0);
    expect(metricsData.metrics.price_range.min).toBeLessThanOrEqual(metricsData.metrics.price_range.max);
    expect(metricsData.dataPoints).toBeGreaterThan(0);
  }, 20000);

  test('should search for symbols', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'search_symbols',
        arguments: {
          query: 'Apple',
          limit: 5
        }
      }
    };

    const response = await sendMCPRequest(request);

    const searchData = JSON.parse(response.result.content[0].text);
    expect(searchData).toMatchObject({
      query: 'Apple',
      count: expect.any(Number),
      results: expect.arrayContaining([
        expect.objectContaining({
          symbol: expect.any(String),
          name: expect.any(String)
        })
      ])
    });

    expect(searchData.count).toBeLessThanOrEqual(5);
    expect(searchData.results.some((r: any) => r.symbol === 'AAPL')).toBe(true);
  }, 10000);

  test('should get batch prices', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'get_batch_prices',
        arguments: {
          symbols: ['AAPL', 'MSFT', 'GOOGL']
        }
      }
    };

    const response = await sendMCPRequest(request);

    const batchData = JSON.parse(response.result.content[0].text);
    
    expect(batchData).toMatchObject({
      AAPL: expect.objectContaining({
        price: expect.any(Number),
        timestamp: expect.any(String)
      }),
      MSFT: expect.objectContaining({
        price: expect.any(Number),
        timestamp: expect.any(String)
      }),
      GOOGL: expect.objectContaining({
        price: expect.any(Number),
        timestamp: expect.any(String)
      })
    });

    expect(Object.keys(batchData)).toHaveLength(3);
    expect(batchData.AAPL.price).toBeGreaterThan(0);
    expect(batchData.MSFT.price).toBeGreaterThan(0);
    expect(batchData.GOOGL.price).toBeGreaterThan(0);
  }, 15000);

  test('should handle invalid tool name', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'invalid_tool',
        arguments: {}
      }
    };

    const response = await sendMCPRequest(request);

    expect(response.result.content[0].text).toContain('Unknown tool: invalid_tool');
    expect(response.result.isError).toBe(true);
  });

  test('should handle missing required parameters', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'get_current_price',
        arguments: {}
      }
    };

    const response = await sendMCPRequest(request);

    expect(response.result.content[0].text).toContain('Symbol is required');
    expect(response.result.isError).toBe(true);
  });
});