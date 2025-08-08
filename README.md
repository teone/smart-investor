# Smart Investment AI

An AI-powered investment application that uses Large Language Models (LLMs) to identify investment opportunities, manage portfolios, and provide ongoing investment recommendations based on user-defined criteria.

## Phase 1 MVP Features

- **Command-line interface** for portfolio management
- **AI-driven company research** using Google Gemini/OpenAI/Anthropic
- **Real-time market data** via Yahoo Finance API
- **Portfolio tracking** with performance metrics
- **Manual buy/sell execution** with transaction history
- **Investment criteria** customization

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Google API key
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Initialize your first portfolio**:
   ```bash
   npm run dev init
   ```

## Available Commands

### Portfolio Management
```bash
# Initialize new portfolio
npm run dev init

# List all portfolios
npm run dev portfolio list

# Show portfolio details
npm run dev portfolio show <portfolioId>
```

### Investment Criteria
```bash
# Add investment criteria
npm run dev criteria add <portfolioId>
```

### AI Recommendations
```bash
# Get AI-powered recommendations
npm run dev recommend <portfolioId>
```

### Trading
```bash
# Buy stock manually
npm run dev buy <portfolioId> <symbol> <quantity>

# Sell stock manually  
npm run dev sell <portfolioId> <symbol> <quantity>
```

## Example Usage

1. **Create a portfolio**:
   ```bash
   npm run dev init
   ```

2. **Add investment criteria**:
   ```bash
   npm run dev criteria add your-portfolio-id
   # Example: "Companies focused on renewable energy and sustainability"
   ```

3. **Get AI recommendations**:
   ```bash
   npm run dev recommend your-portfolio-id
   ```

4. **Execute trades**:
   ```bash
   npm run dev buy your-portfolio-id TSLA 10
   ```

## Configuration

The application requires a Google Gemini API key for AI research functionality by default. Yahoo Finance API is used for market data (no API key required).

Required environment variables:
- `GOOGLE_API_KEY`: Your Google Gemini API key

Optional environment variables:
- `OPENAI_API_KEY`: Alternative to Google Gemini
- `ANTHROPIC_API_KEY`: Alternative to Google/OpenAI
- `LLM_PROVIDER`: Choose between 'google', 'openai', or 'anthropic'
- `DATA_PATH`: Custom data storage location

## Data Storage

- Portfolios are stored in `./data/portfolios.json`
- Transactions are stored in `./data/transactions.json`
- Data persists between CLI sessions

## Development

```bash
# Run in development mode
npm run dev <command>

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Run built version
npm start <command>
```

## Releases

This project uses automated releases via GitHub Actions:

### Release Process
1. Update version in `package.json` to a release version (no pre-release suffix)
2. Push to main branch
3. GitHub Actions will automatically:
   - Run CI checks (lint, typecheck, build, test)
   - Create and push a Git tag (e.g., `v1.0.0`)

### Version Format
- **Release versions**: `1.0.0`, `1.2.3`, `2.0.0`
- **Pre-release versions**: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`

Only release versions (without pre-release suffixes) trigger automated releases.

## Disclaimer

This application is for educational and research purposes only. It does not execute real trades or connect to actual brokerage accounts. All investment decisions should be made with proper research and consideration of your financial situation.

## Next Steps (Phase 2+)

- Web interface dashboard
- Automated portfolio rebalancing
- Advanced backtesting engine
- News monitoring and alerts
- Real brokerage integration (optional)