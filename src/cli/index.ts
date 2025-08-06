#!/usr/bin/env node

import { Command } from 'commander';
import { PortfolioManager } from '../services/PortfolioManager';
import { config, validateConfig } from '../config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { table } from 'table';

const program = new Command();
const portfolioManager = new PortfolioManager();

program
  .name('smart-invest')
  .description('AI-powered investment portfolio management CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize the application and create your first portfolio')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Welcome to Smart Investment AI!'));
      console.log(chalk.gray('Let\'s set up your first investment portfolio.\n'));

      validateConfig();
      await portfolioManager.initialize();

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'portfolioName',
          message: 'What would you like to name your portfolio?',
          default: 'My AI Portfolio'
        },
        {
          type: 'number',
          name: 'initialCapital',
          message: 'How much initial capital do you want to start with? ($)',
          default: 10000,
          validate: (value) => value > 0 || 'Please enter a positive amount'
        }
      ]);

      const portfolioId = await portfolioManager.createPortfolio(
        answers.portfolioName,
        answers.initialCapital
      );

      console.log(chalk.green('\n✅ Portfolio created successfully!'));
      console.log(chalk.gray(`Portfolio ID: ${portfolioId}`));
      console.log(chalk.gray(`Initial Capital: $${answers.initialCapital.toLocaleString()}`));
      console.log(chalk.yellow('\nNext steps:'));
      console.log(chalk.gray('• Add investment criteria: smart-invest criteria add'));
      console.log(chalk.gray('• Get AI recommendations: smart-invest recommend'));
      console.log(chalk.gray('• View portfolio status: smart-invest portfolio list'));

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('portfolio')
  .description('Manage portfolios')
  .addCommand(
    new Command('list')
      .description('List all portfolios')
      .action(async () => {
        try {
          await portfolioManager.initialize();
          const portfolios = portfolioManager.getAllPortfolios();

          if (portfolios.length === 0) {
            console.log(chalk.yellow('No portfolios found. Run "smart-invest init" to create your first portfolio.'));
            return;
          }

          console.log(chalk.blue('\n📊 Your Portfolios:\n'));

          for (const portfolio of portfolios) {
            const performance = await portfolioManager.getPortfolioPerformance(portfolio.getId());
            
            console.log(chalk.cyan(`${portfolio.getName()}`));
            console.log(chalk.gray(`ID: ${portfolio.getId()}`));
            console.log(chalk.gray(`Cash: $${portfolio.getCurrentCash().toLocaleString()}`));
            console.log(chalk.gray(`Total Value: $${performance.totalValue.toLocaleString()}`));
            console.log(chalk.gray(`Returns: ${performance.percentageReturns > 0 ? chalk.green(`+${performance.percentageReturns.toFixed(2)}%`) : chalk.red(`${performance.percentageReturns.toFixed(2)}%`)}`));
            console.log(chalk.gray(`Holdings: ${portfolio.getHoldings().length} positions\n`));
          }
        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show detailed portfolio information')
      .argument('<portfolioId>', 'Portfolio ID to display')
      .action(async (portfolioId) => {
        try {
          await portfolioManager.initialize();
          const portfolio = portfolioManager.getPortfolio(portfolioId);

          if (!portfolio) {
            console.error(chalk.red('Portfolio not found'));
            return;
          }

          const performance = await portfolioManager.getPortfolioPerformance(portfolioId);
          const holdings = portfolio.getHoldings();
          const transactions = portfolioManager.getTransactionHistory(portfolioId);

          console.log(chalk.blue(`\n📊 ${portfolio.getName()}\n`));
          
          // Portfolio overview
          console.log(chalk.cyan('Portfolio Overview:'));
          console.log(`Cash: $${portfolio.getCurrentCash().toLocaleString()}`);
          console.log(`Total Value: $${performance.totalValue.toLocaleString()}`);
          console.log(`Total Returns: ${performance.percentageReturns > 0 ? chalk.green(`+$${performance.totalReturns.toLocaleString()} (+${performance.percentageReturns.toFixed(2)}%)`) : chalk.red(`$${performance.totalReturns.toLocaleString()} (${performance.percentageReturns.toFixed(2)}%)`)}`);
          
          // Holdings
          if (holdings.length > 0) {
            console.log(chalk.cyan('\nHoldings:'));
            const holdingsData = [
              ['Symbol', 'Shares', 'Avg Cost', 'Current Price', 'Value', 'Gain/Loss']
            ];

            for (const holding of holdings) {
              const currentValue = (holding.currentPrice || holding.averageCost) * holding.quantity;
              const costBasis = holding.averageCost * holding.quantity;
              const gainLoss = currentValue - costBasis;
              const gainLossPercent = (gainLoss / costBasis) * 100;

              holdingsData.push([
                holding.symbol,
                holding.quantity.toString(),
                `$${holding.averageCost.toFixed(2)}`,
                `$${(holding.currentPrice || holding.averageCost).toFixed(2)}`,
                `$${currentValue.toLocaleString()}`,
                gainLoss >= 0 ? 
                  chalk.green(`+$${gainLoss.toFixed(2)} (+${gainLossPercent.toFixed(2)}%)`) :
                  chalk.red(`$${gainLoss.toFixed(2)} (${gainLossPercent.toFixed(2)}%)`)
              ]);
            }

            console.log(table(holdingsData));
          }

          // Recent transactions
          if (transactions.length > 0) {
            console.log(chalk.cyan('\nRecent Transactions:'));
            const recentTransactions = transactions.slice(0, 5);
            
            for (const tx of recentTransactions) {
              const color = tx.type === 'BUY' ? chalk.green : chalk.red;
              console.log(
                `${color(tx.type)} ${tx.quantity} shares of ${tx.symbol} at $${tx.price.toFixed(2)} ` +
                chalk.gray(`(${tx.timestamp.toLocaleDateString()})`)
              );
            }
          }

        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        }
      })
  );

program
  .command('criteria')
  .description('Manage investment criteria')
  .addCommand(
    new Command('add')
      .description('Add investment criteria to a portfolio')
      .argument('<portfolioId>', 'Portfolio ID')
      .action(async (portfolioId) => {
        try {
          await portfolioManager.initialize();
          const portfolio = portfolioManager.getPortfolio(portfolioId);

          if (!portfolio) {
            console.error(chalk.red('Portfolio not found'));
            return;
          }

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'description',
              message: 'Describe your investment criteria:',
              validate: (input) => input.trim().length > 0 || 'Please enter a description'
            },
            {
              type: 'number',
              name: 'weight',
              message: 'How important is this criteria? (1-10)',
              default: 5,
              validate: (value) => (value >= 1 && value <= 10) || 'Please enter a value between 1 and 10'
            }
          ]);

          portfolio.addCriteria(answers.description, answers.weight);
          
          console.log(chalk.green('✅ Criteria added successfully!'));
          console.log(chalk.gray(`Criteria: ${answers.description}`));
          console.log(chalk.gray(`Weight: ${answers.weight}/10`));

        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        }
      })
  );

program
  .command('recommend')
  .description('Get AI-powered investment recommendations')
  .argument('<portfolioId>', 'Portfolio ID')
  .action(async (portfolioId) => {
    try {
      await portfolioManager.initialize();
      const portfolio = portfolioManager.getPortfolio(portfolioId);

      if (!portfolio) {
        console.error(chalk.red('Portfolio not found'));
        return;
      }

      const criteria = portfolio.getCriteria();
      if (criteria.length === 0) {
        console.log(chalk.yellow('No investment criteria found. Add criteria first with: smart-invest criteria add'));
        return;
      }

      console.log(chalk.blue('🤖 Generating AI recommendations...'));
      console.log(chalk.gray('This may take a moment as we research companies.\n'));

      const recommendations = await portfolioManager.generateRecommendations(portfolioId);

      if (recommendations.length === 0) {
        console.log(chalk.yellow('No recommendations found based on your criteria.'));
        return;
      }

      console.log(chalk.green(`✅ Found ${recommendations.length} recommendations:\n`));

      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        console.log(chalk.cyan(`${i + 1}. ${rec.symbol}`));
        console.log(chalk.gray(`Action: ${rec.action}`));
        console.log(chalk.gray(`Confidence: ${(rec.confidence * 100).toFixed(0)}%`));
        console.log(chalk.gray(`Reasoning: ${rec.reasoning}\n`));
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    }
  });

program
  .command('buy')
  .description('Buy stock manually')
  .argument('<portfolioId>', 'Portfolio ID')
  .argument('<symbol>', 'Stock symbol')
  .argument('<quantity>', 'Number of shares to buy')
  .action(async (portfolioId, symbol, quantityStr) => {
    try {
      await portfolioManager.initialize();
      const quantity = parseInt(quantityStr);

      if (quantity <= 0) {
        console.error(chalk.red('Quantity must be a positive number'));
        return;
      }

      console.log(chalk.blue(`💰 Buying ${quantity} shares of ${symbol}...`));

      await portfolioManager.buyStock(portfolioId, symbol.toUpperCase(), quantity);

      console.log(chalk.green('✅ Purchase completed successfully!'));

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    }
  });

program
  .command('sell')
  .description('Sell stock manually')
  .argument('<portfolioId>', 'Portfolio ID')
  .argument('<symbol>', 'Stock symbol')
  .argument('<quantity>', 'Number of shares to sell')
  .action(async (portfolioId, symbol, quantityStr) => {
    try {
      await portfolioManager.initialize();
      const quantity = parseInt(quantityStr);

      if (quantity <= 0) {
        console.error(chalk.red('Quantity must be a positive number'));
        return;
      }

      console.log(chalk.blue(`💸 Selling ${quantity} shares of ${symbol}...`));

      await portfolioManager.sellStock(portfolioId, symbol.toUpperCase(), quantity);

      console.log(chalk.green('✅ Sale completed successfully!'));

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    }
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse();