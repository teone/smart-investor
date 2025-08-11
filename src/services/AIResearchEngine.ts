import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { CompanyResearch, InvestmentCriteria, InvestmentRecommendation } from '../types';
import { config } from '../config';
import { MCPMarketDataClient } from '../utils/MCPClient';

export class AIResearchEngine {
  private llm: ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;
  private mcpClient: MCPMarketDataClient;

  constructor(provider: 'openai' | 'anthropic' | 'google' = 'google') {
    if (provider === 'google' && config.google.apiKey) {
      this.llm = new ChatGoogleGenerativeAI({
        apiKey: config.google.apiKey,
        modelName: config.google.model,
        temperature: 0.3,
        maxOutputTokens: 8192
      });
    } else if (provider === 'openai' && config.openai.apiKey) {
      this.llm = new ChatOpenAI({
        openAIApiKey: config.openai.apiKey,
        modelName: config.openai.model,
        temperature: 0.3
      });
    } else if (provider === 'anthropic' && config.anthropic.apiKey) {
      this.llm = new ChatAnthropic({
        anthropicApiKey: config.anthropic.apiKey,
        modelName: config.anthropic.model,
        temperature: 0.3
      });
    } else {
      throw new Error(`Invalid LLM provider or missing API key: ${provider}`);
    }

    // Initialize MCP client
    this.mcpClient = new MCPMarketDataClient();
  }

  async researchCompany(symbol: string, criteria: InvestmentCriteria[]): Promise<CompanyResearch> {
    const criteriaText = criteria
      .filter(c => c.active)
      .map(c => `- ${c.description} (weight: ${c.weight})`)
      .join('\n');

    // Get market data for context
    let marketContext = '';
    try {
      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.connect();
      }
      
      const marketData = await this.mcpClient.getMarketData(symbol);
      
      if (Object.keys(marketData).length > 0) {
        marketContext = `\nCurrent Market Data for ${symbol}:`;
        
        if (marketData.currentPrice) {
          marketContext += `\n- Current Price: $${marketData.currentPrice.toFixed(2)}`;
        }
        
        if (marketData.priceRange) {
          marketContext += `\n- 52-Week Range: $${marketData.priceRange.min} - $${marketData.priceRange.max}`;
          marketContext += `\n- Position in Range: ${marketData.priceRange.rangePercent.toFixed(1)}%`;
        }
        
        if (marketData.volatility) {
          marketContext += `\n- Volatility (1Y): ${marketData.volatility.toFixed(1)}%`;
        }
        
        if (marketData.returns) {
          marketContext += `\n- 1-Year Return: ${marketData.returns.totalReturn.toFixed(1)}%`;
        }
        
        if (marketData.priceHistory && marketData.priceHistory.length > 0) {
          const recent = marketData.priceHistory.slice(-30);
          const trend = this.calculateTrend(recent);
          marketContext += `\n- Recent Trend: ${trend}`;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch market data for ${symbol}:`, error);
    }

    const enhancedPrompt = `
Analyze the company with stock symbol "${symbol}" based on the following investment criteria:

${criteriaText}
${marketContext}

Please provide a comprehensive analysis considering BOTH:
1. Fundamental alignment with the investment criteria
2. Current market valuation and timing considerations

Your analysis should include:
1. Company name and brief description
2. How well the company aligns with each criterion
3. Market valuation assessment (is the current price attractive?)
4. Risk analysis based on volatility and market position
5. Overall investment potential combining fundamentals and market timing
6. A numerical score from 0-100 considering both criteria alignment AND current market attractiveness
7. Key reasons supporting your recommendation

Format your response as a detailed analysis that explains your reasoning.
`;

    try {
      const response = await this.llm.invoke(enhancedPrompt);
      const analysis = response.content as string;

      // Extract score from analysis (improved regex approach)
      const scoreMatches = analysis.match(/score[:\s]*(\d+)/gi);
      let score = 50;
      
      if (scoreMatches && scoreMatches.length > 0) {
        const lastMatch = scoreMatches[scoreMatches.length - 1];
        const scoreValue = lastMatch.match(/(\d+)/);
        if (scoreValue) {
          score = parseInt(scoreValue[1]);
        }
      }

      // Extract company name from analysis
      const nameMatch = analysis.match(/company name[:\s]*([^\n]+)/i) || 
                       analysis.match(/^([^.]+)(?:\sis|\soperates|\sengage)/im);
      const companyName = nameMatch ? nameMatch[1].trim().replace(/['"]/g, '') : symbol;

      return {
        symbol,
        companyName,
        analysis,
        score: Math.min(100, Math.max(0, score)),
        reasoning: analysis,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error researching company:', error);
      throw new Error(`Failed to research company ${symbol}: ${error}`);
    }
  }

  async generateRecommendations(
    portfolioId: string,
    researches: CompanyResearch[],
    availableCash: number,
    maxPositions: number = 10
  ): Promise<InvestmentRecommendation[]> {
    const sortedResearches = researches
      .filter(r => r.score >= 60) // Only consider companies with decent scores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPositions);

    if (sortedResearches.length === 0) {
      return [];
    }

    const recommendations: InvestmentRecommendation[] = [];

    for (const research of sortedResearches) {
      const confidence = research.score / 100;

      // Generate concise reasoning using LLM
      const reasoning = await this.generateConciseReasoning(research);

      recommendations.push({
        id: this.generateRecommendationId(),
        portfolioId,
        symbol: research.symbol,
        action: 'BUY',
        reasoning,
        score: research.score,
        confidence,
        targetPrice: undefined, // TODO: Add price analysis
        createdAt: new Date(),
        executed: false
      });
    }

    return recommendations;
  }

  private async generateConciseReasoning(research: CompanyResearch): Promise<string> {
    const prompt = `
Based on this company analysis, provide a concise investment reasoning in under 500 characters:

Company: ${research.symbol}
Score: ${research.score}/100
Full Analysis: ${research.analysis}

Provide a brief, compelling reason why this is a good investment opportunity. Focus on the key strengths and alignment with criteria. Keep it under 500 characters.
`;

    try {
      const response = await this.llm.invoke(prompt);
      const reasoning = (response.content as string).trim();

      // Ensure it's under 500 characters
      return reasoning.length > 500 ? reasoning.substring(0, 497) + '...' : reasoning;
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Fallback to truncated original analysis
      const fallback = `Score: ${research.score}/100. ${research.analysis.substring(0, 400)}`;
      return fallback.length > 500 ? fallback.substring(0, 497) + '...' : fallback;
    }
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private calculateTrend(prices: Array<{ price: number; timestamp: string }>): string {
    if (prices.length < 2) return 'Insufficient data';
    
    const first = prices[0].price;
    const last = prices[prices.length - 1].price;
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'Strong Uptrend';
    if (change > 2) return 'Uptrend';
    if (change > -2) return 'Sideways';
    if (change > -5) return 'Downtrend';
    return 'Strong Downtrend';
  }

  async findCompaniesForCriteria(criteria: InvestmentCriteria[], limit: number = 20): Promise<string[]> {
    const criteriaText = criteria
      .filter(c => c.active)
      .map(c => c.description)
      .join(', ');

    const prompt = `
Based on these investment criteria: "${criteriaText}"

Please suggest ${limit} publicly traded companies (provide only stock symbols) that would align well with these criteria. 

Focus on well-known, established companies that are likely to be available through major stock exchanges.

Provide only the stock symbols, one per line, without explanations. For example:
AAPL
MSFT
GOOGL
`;

    try {
      const response = await this.llm.invoke(prompt);
      const symbols = (response.content as string)
        .split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(line => line.match(/^[A-Z]{1,5}$/)) // Basic symbol validation
        .slice(0, limit);

      return symbols;
    } catch (error) {
      console.error('Error finding companies:', error);
      throw new Error(`Failed to find companies for criteria: ${error}`);
    }
  }
}