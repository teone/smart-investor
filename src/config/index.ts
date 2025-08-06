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

  // Market Data Configuration
  yahooFinance: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/'
  },

  // Data Storage
  dataPath: process.env.DATA_PATH || './data',
  portfolioFile: 'portfolios.json',

  // Default Settings
  defaultLLMProvider: process.env.LLM_PROVIDER || 'openai',
  maxRetries: 3,
  requestTimeout: 30000
};

export function validateConfig(): void {
  const requiredEnvVars = [
    { key: 'OPENAI_API_KEY', value: config.openai.apiKey }
  ];

  const missing = requiredEnvVars.filter(env => !env.value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(e => e.key).join(', ')}\n` +
      'Please create a .env file with these variables.'
    );
  }
}