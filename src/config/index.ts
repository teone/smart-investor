import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // LLM Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4'
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
  },

  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash'
  },

  // Market Data Configuration
  yahooFinance: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/'
  },

  // MCP Server Configuration
  mcpServer: {
    host: process.env.MCP_SERVER_HOST || 'localhost',
    port: parseInt(process.env.MCP_SERVER_PORT || '3001'),
    enabled: process.env.MCP_SERVER_ENABLED !== 'false'
  },

  // Data Storage
  dataPath: process.env.DATA_PATH || './data',
  portfolioFile: 'portfolios.json',

  // Default Settings
  defaultLLMProvider: process.env.LLM_PROVIDER || 'google',
  maxRetries: 3,
  requestTimeout: 30000
};

export function validateConfig(): void {
  const provider = config.defaultLLMProvider;
  let requiredEnvVars: { key: string; value: string | undefined }[] = [];

  switch (provider) {
    case 'google':
      requiredEnvVars = [{ key: 'GOOGLE_API_KEY', value: config.google.apiKey }];
      break;
    case 'openai':
      requiredEnvVars = [{ key: 'OPENAI_API_KEY', value: config.openai.apiKey }];
      break;
    case 'anthropic':
      requiredEnvVars = [{ key: 'ANTHROPIC_API_KEY', value: config.anthropic.apiKey }];
      break;
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Supported: google, openai, anthropic`);
  }

  const missing = requiredEnvVars.filter(env => !env.value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${provider}: ${missing.map(e => e.key).join(', ')}\n` +
      'Please create a .env file with these variables.'
    );
  }
}