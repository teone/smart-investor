# AI Investment Application Requirements

## Project Overview

Build an AI-powered investment application that uses Large Language Models (LLMs) to identify investment opportunities, manage portfolios, and provide ongoing investment recommendations based on user-defined criteria.

## Core Functionality Requirements

### 1. AI-Driven Company Research
- **LLM Integration**: Query LLMs to identify companies matching specific investment criteria
- **Criteria Processing**: Accept natural language criteria (e.g., "find companies that are ethical and invest in climate science")
- **Company Evaluation**: Use AI to research and evaluate companies against the specified criteria
- **Reasoning Documentation**: Provide clear explanations for why companies are recommended

### 2. Portfolio Management
- **Initial Capital**: Allow users to set a starting investment amount
- **Stock Selection**: Automatically select stocks based on AI recommendations
- **Portfolio Creation**: Build diversified portfolios from recommended companies
- **Holdings Tracking**: Keep detailed records of all investments, quantities, and costs
- **Cash Management**: Track available cash for new investments

### 3. Real-Time Market Integration
- **Current Stock Prices**: Fetch real-time stock prices for portfolio valuation
- **Market Data API**: Integrate with financial data providers
- **Price Monitoring**: Continuously monitor stock price changes
- **Market News Integration**: Track relevant news that might affect investments

### 4. Ongoing Portfolio Review
- **Scheduled Reviews**: Perform regular portfolio assessments at user-defined intervals
- **Rebalancing Recommendations**: Suggest buying or selling based on updated criteria analysis
- **Performance Monitoring**: Track how investments are performing over time
- **Criteria Compliance**: Regularly verify that holdings still meet investment criteria

### 5. Backtesting & Performance Analysis
- **Hypothetical Trading**: Simulate trades without real money execution
- **Performance Calculation**: Calculate gains/losses based on current market prices
- **Historical Analysis**: Show what returns would have been achieved with past decisions
- **Benchmark Comparison**: Compare performance against market indices
- **Risk Metrics**: Calculate portfolio volatility, Sharpe ratio, and other risk measures

### 6. Future Enhancement Capabilities
- **Proactive Monitoring**: Monitor news and market conditions for early sell/buy signals
- **Automated Alerts**: Notify users of significant market events affecting their holdings
- **Advanced Analytics**: Machine learning patterns for improved decision-making
- **Real Trading Integration**: Optional connection to actual brokerage accounts

## Technical Requirements

### Core Technology Stack
- **Backend**: Node.js with Typescript (preferred) or Python, using LangChain or LangGraph
- **Database**: PostgreSQL for persistent data, Redis for caching
- **LLM Integration**: OpenAI API, Anthropic Claude API, or similar
- **Market Data**: Alpha Vantage, Yahoo Finance, IEX Cloud, or similar APIs
- **Frontend**: React or Vue.js web application
- **Infrastructure**: Docker containers, cloud deployment ready

### Data Storage Requirements
- **Portfolio Data**: User portfolios, holdings, cash positions
- **Transaction History**: All buy/sell decisions with timestamps and reasoning
- **Market Data**: Historical and real-time stock prices, volumes
- **Research Data**: AI analysis results, company evaluations, criteria assessments
- **Performance Metrics**: Portfolio values over time, returns calculations

### API Requirements
- **RESTful API**: For frontend-backend communication
- **External Integrations**: Financial data APIs, news APIs
- **Authentication**: User account management and secure access
- **Rate Limiting**: Manage external API usage costs and limits

### Security & Compliance
- **Data Encryption**: Protect sensitive financial information
- **Audit Logging**: Track all system decisions and user actions
- **API Security**: Secure storage and usage of external API keys
- **Regulatory Compliance**: Include appropriate disclaimers and risk warnings

## Functional Specifications

### User Workflow
1. **Setup**: User defines investment criteria and initial capital
2. **Research**: AI researches and recommends companies
3. **Portfolio Creation**: System creates initial portfolio based on recommendations
4. **Monitoring**: Regular automated reviews of portfolio performance
5. **Recommendations**: System suggests portfolio adjustments
6. **Execution**: User approves/rejects suggested changes
7. **Tracking**: Continuous performance monitoring and reporting

### Investment Criteria Examples
- ESG (Environmental, Social, Governance) factors
- Industry focus (e.g., renewable energy, healthcare, technology)
- Company size (market cap requirements)
- Financial health metrics
- Growth potential assessments
- Ethical considerations (no tobacco, weapons, etc.)

### Decision Making Process
1. **Criteria Analysis**: AI evaluates how well companies match criteria
2. **Market Analysis**: Consider current market conditions and pricing
3. **Risk Assessment**: Evaluate portfolio risk and diversification needs
4. **Recommendation Generation**: Create buy/sell/hold recommendations with reasoning
5. **Confidence Scoring**: Provide confidence levels for each recommendation
6. **User Review**: Present recommendations for user approval

### Performance Tracking Features
- **Real-time Portfolio Value**: Current market value of all holdings
- **Return Calculations**: Total returns, annualized returns, time-weighted returns
- **Gain/Loss Analysis**: Individual position performance
- **Benchmark Comparison**: Performance vs. S&P 500, sector indices
- **Risk Metrics**: Portfolio volatility, beta, maximum drawdown
- **Historical Charts**: Visual representation of portfolio performance over time

## Non-Functional Requirements

### Performance
- **Response Time**: API responses under 2 seconds for most operations
- **LLM Query Time**: AI research queries should complete within reasonable time (30-60 seconds)
- **Data Updates**: Market data updates every 15 minutes during trading hours
- **Scalability**: Support multiple portfolios and users

### Reliability
- **Uptime**: 99% availability during trading hours
- **Data Accuracy**: Reliable market data integration with error handling
- **Backup Strategy**: Regular data backups and recovery procedures
- **Monitoring**: System health monitoring and alerting

### Usability
- **Web Interface**: Intuitive dashboard for portfolio management
- **Mobile Responsive**: Accessible on mobile devices
- **Documentation**: Clear user guides and API documentation
- **Error Handling**: Graceful error messages and recovery

## Architecture

### Core Components

1. AI Research & Analysis Engine
Purpose: Query LLMs to identify investment opportunities based on user-defined criteria
Components:

Criteria Parser: Converts natural language investment criteria into structured queries
Company Research Agent: Uses LLM to research companies based on criteria
ESG/Ethics Evaluator: Specialized module for ethical and sustainability assessments
Research Aggregator: Combines multiple LLM responses and external data sources

Key Functions:

Process investment criteria (e.g., "ethical companies investing in climate science")
Research potential companies using LLM knowledge and web search
Evaluate companies against specified criteria
Generate investment recommendations with reasoning

2. Market Data Service
Purpose: Provide real-time and historical financial data
Components:

Stock Price API Integration (Alpha Vantage, Yahoo Finance, IEX Cloud)
Market News API (NewsAPI, Financial Modeling Prep)
Company Fundamentals API (SEC EDGAR, Financial APIs)
Data Caching Layer (Redis for frequent queries)

Key Functions:

Fetch current stock prices and trading volumes
Retrieve historical price data
Monitor market news and events
Provide company financial metrics

3. Portfolio Management Engine
Purpose: Manage investment allocations and track performance
Components:

Portfolio State Manager: Track current holdings and cash positions
Allocation Engine: Determine optimal investment amounts
Rebalancing Service: Suggest portfolio adjustments
Risk Assessment Module: Evaluate portfolio risk metrics

Key Functions:

Maintain current portfolio state
Calculate position sizes and diversification
Generate buy/sell recommendations
Track investment performance metrics

4. Decision Engine
Purpose: Orchestrate investment decisions using AI insights and market data
Components:

Investment Strategy Processor: Apply user-defined investment rules
Market Timing Analyzer: Assess market conditions for timing decisions
Risk Manager: Ensure decisions align with risk tolerance
Decision Logger: Track all decisions with reasoning

Key Functions:

Combine AI recommendations with market data
Apply risk management rules
Generate actionable investment decisions
Maintain decision audit trail

5. Backtesting & Simulation Engine
Purpose: Test investment strategies and track hypothetical performance
Components:

Historical Data Processor: Apply decisions to historical market data
Performance Calculator: Compute returns, volatility, and other metrics
Benchmark Comparator: Compare against market indices
Scenario Tester: Test portfolio under different market conditions

Key Functions:

Simulate portfolio performance over time
Calculate would-be gains/losses
Generate performance reports
Test strategy variations

6. Data Storage Layer
Purpose: Persist application data and maintain historical records
Database Schema:
sql-- Core Tables
portfolios (id, name, initial_capital, current_cash, created_at)
holdings (portfolio_id, symbol, quantity, avg_cost, last_updated)
transactions (portfolio_id, symbol, type, quantity, price, timestamp, reasoning)
investment_criteria (portfolio_id, criteria_text, weight, active)
research_reports (id, portfolio_id, symbol, ai_analysis, score, created_at)
market_data (symbol, timestamp, price, volume, source)
decisions (id, portfolio_id, decision_type, reasoning, confidence, executed_at)
performance_snapshots (portfolio_id, timestamp, total_value, returns, metrics)
7. Monitoring & Alerting Service
Purpose: Track market conditions and trigger proactive recommendations
Components:

News Monitor: Scan financial news for relevant updates
Price Alert System: Monitor significant price movements
Criteria Change Detector: Identify when companies no longer meet criteria
Performance Threshold Monitor: Alert on significant gains/losses

8. API Gateway & Web Interface
Purpose: Provide user interface and external integrations
Features:

Portfolio dashboard with real-time values
Investment criteria configuration
Decision approval/rejection interface
Performance analytics and charts
Historical decision review

### Data Flow
User Input (Criteria) 
    ↓
AI Research Engine 
    ↓
Market Data Integration 
    ↓
Decision Engine 
    ↓
Portfolio Management 
    ↓
Execution (Mock/Real) 
    ↓
Performance Tracking 
    ↓
User Dashboard

## Development Phases

### Phase 1: MVP (Minimum Viable Product)
- Command line based
- Basic portfolio tracking
- Simple AI company research
- Market data integration via MCP server
- Manual buy/sell execution
- Basic performance reporting

### Phase 2: Enhanced AI & Automation
- Advanced LLM reasoning and analysis
- Scheduled portfolio reviews
- Automated rebalancing suggestions
- Comprehensive backtesting engine

### Phase 3: Advanced Features
- News monitoring and sentiment analysis
- Machine learning integration
- Advanced risk management
- Real-time alerts and notifications

### Phase 4: Production Ready
- Real brokerage integration (optional)
- Advanced analytics and reporting
- Multi-user support
- Professional-grade security and compliance

## Success Metrics
- **Investment Performance**: Portfolio returns vs. benchmarks
- **AI Accuracy**: Success rate of AI stock recommendations
- **User Engagement**: Frequency of portfolio reviews and adjustments
- **System Reliability**: Uptime and data accuracy metrics
- **Decision Quality**: Analysis of investment decision outcomes

## Risk Considerations
- **Market Risk**: Potential for investment losses
- **Technical Risk**: System failures affecting trading decisions
- **Data Risk**: Inaccurate market data or AI analysis
- **Regulatory Risk**: Compliance with financial regulations
- **API Risk**: Dependencies on external data providers

## Legal & Compliance Notes
- Include appropriate investment disclaimers
- Ensure compliance with relevant financial regulations
- Consider fiduciary responsibilities if managing others' money
- Implement proper data privacy and security measures
- Provide clear terms of service and risk disclosures

# MCP Market Data Server Specification

## Overview
The Market Data MCP Server provides LLMs with direct access to real-time and historical financial market data through standardized MCP tools. This enables dynamic, context-aware financial analysis during AI reasoning processes.

## MCP Server Architecture

### Server Configuration
- **Name**: `smart-investment-market-data`
- **Version**: `1.0.0`
- **Protocol**: MCP (Model Context Protocol)
- **Transport**: stdio/tcp
- **Language**: TypeScript/Node.js

### Core MCP Tools

#### 1. get_current_price
**Purpose**: Fetch real-time stock price and basic market data
```typescript
{
  name: "get_current_price",
  description: "Get current stock price and basic market information",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Stock symbol (e.g., AAPL, MSFT)" }
    },
    required: ["symbol"]
  }
}
```
**Returns**: `{ symbol: string, price: number, timestamp: Date, source: string, marketCap?: number }`

#### 2. get_historical_prices
**Purpose**: Retrieve historical price data for technical analysis
```typescript
{
  name: "get_historical_prices", 
  description: "Get historical price data for a stock over specified period",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Stock symbol" },
      period: { 
        type: "string", 
        enum: ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"],
        description: "Time period for historical data"
      },
      interval: {
        type: "string",
        enum: ["1m", "5m", "15m", "1h", "1d"],
        description: "Data interval granularity"
      }
    },
    required: ["symbol", "period"]
  }
}
```
**Returns**: `Array<{ symbol: string, price: number, timestamp: Date, volume?: number }>`

#### 3. get_batch_prices
**Purpose**: Efficiently fetch multiple stock prices in one request
```typescript
{
  name: "get_batch_prices",
  description: "Get current prices for multiple stocks simultaneously",
  inputSchema: {
    type: "object", 
    properties: {
      symbols: { 
        type: "array",
        items: { type: "string" },
        description: "Array of stock symbols"
      }
    },
    required: ["symbols"]
  }
}
```
**Returns**: `Map<string, { price: number, timestamp: Date }>`

#### 4. search_symbols
**Purpose**: Find stock symbols by company name or criteria
```typescript
{
  name: "search_symbols",
  description: "Search for stock symbols by company name or keywords",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (company name or keywords)" },
      limit: { type: "number", description: "Maximum number of results", default: 10 }
    },
    required: ["query"]
  }
}
```
**Returns**: `Array<{ symbol: string, name: string, exchange?: string }>`

#### 5. calculate_metrics
**Purpose**: Compute financial and technical indicators
```typescript
{
  name: "calculate_metrics",
  description: "Calculate financial metrics and technical indicators",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Stock symbol" },
      metrics: {
        type: "array",
        items: {
          enum: ["volatility", "returns", "moving_average", "rsi", "beta"]
        },
        description: "Metrics to calculate"
      },
      period: { type: "string", description: "Analysis period", default: "1y" }
    },
    required: ["symbol", "metrics"]
  }
}
```
**Returns**: `{ [metric: string]: number | object }`

#### 6. validate_symbol
**Purpose**: Check if a stock symbol is valid and tradeable
```typescript
{
  name: "validate_symbol",
  description: "Validate if a stock symbol exists and is tradeable",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Stock symbol to validate" }
    },
    required: ["symbol"]
  }
}
```
**Returns**: `{ valid: boolean, symbol: string, name?: string, exchange?: string }`

#### 7. get_market_status
**Purpose**: Check current market trading status
```typescript
{
  name: "get_market_status",
  description: "Get current market trading status and hours",
  inputSchema: {
    type: "object",
    properties: {
      market: { 
        type: "string", 
        enum: ["NYSE", "NASDAQ", "all"],
        description: "Specific market or all markets",
        default: "all"
      }
    }
  }
}
```
**Returns**: `{ isOpen: boolean, nextOpen?: Date, nextClose?: Date, timezone: string }`

#### 8. get_price_alerts
**Purpose**: Monitor price thresholds and movements
```typescript
{
  name: "get_price_alerts",
  description: "Check if stock price meets specified alert conditions",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Stock symbol" },
      conditions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { enum: ["above", "below", "change_percent"] },
            value: { type: "number" },
            timeframe: { type: "string", default: "1d" }
          }
        }
      }
    },
    required: ["symbol", "conditions"]
  }
}
```
**Returns**: `{ alerts: Array<{ condition: object, triggered: boolean, currentValue: number }> }`

## Implementation Details

### Error Handling
- Rate limiting with exponential backoff
- Graceful degradation when APIs are unavailable
- Comprehensive error logging

### Security
- Request validation and sanitization  
- Rate limiting per client connection
- Audit logging for all requests

### Data Provider
- **Primary**: Yahoo Finance (free tier)

## Integration with AI Research Engine

### Enhanced LLM Prompts
The AI Research Engine will be updated to instruct LLMs to use market data tools:

```typescript
const enhancedPrompt = `
Analyze the company with stock symbol "${symbol}" based on these investment criteria:
${criteriaText}

IMPORTANT: Use the available market data tools to gather current financial context:
1. Call get_current_price("${symbol}") to get current valuation
2. Call get_historical_prices("${symbol}", "1y") for price trends  
3. Call calculate_metrics("${symbol}", ["volatility", "returns"]) for risk analysis
4. Use get_market_status() to understand timing context

Provide analysis considering both fundamental criteria alignment AND current market valuation.
`;
```

### Dynamic Market Context
LLMs can now:
- Fetch real-time prices during analysis
- Calculate risk metrics on-demand
- Consider market timing in recommendations
- Validate stock symbols before analysis
- Access historical performance data

## Updated Development Phases

### Phase 1: MVP Enhancement
- **MCP Server Implementation**: Build market data MCP server with core tools
- **AI Integration**: Update AIResearchEngine to use MCP tools
- **Dynamic Analysis**: Enable LLMs to fetch market data during reasoning
- **Testing**: Comprehensive testing of MCP integration

### Phase 1.5: Market-Aware AI Analysis
- **Valuation Integration**: Combine fundamental analysis with current pricing
- **Risk Assessment**: Use market data for portfolio risk calculations  
- **Market Timing**: Consider market conditions in recommendations
- **Enhanced Metrics**: Advanced financial calculations via MCP tools
- **Performance Validation**: Backtest market-integrated recommendations

This MCP server approach transforms your AI investment application from static analysis to dynamic, market-aware intelligent decision making.