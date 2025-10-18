import { executeSQLQuery, generateSQLQuery } from '../ai/sql-generator';

import { DeFiCommandProcessor } from '../ai/command-processor';
import { DeFiStrategyGenerator } from '../ai/strategy-generator';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const prisma = new PrismaClient();
const strategyGenerator = new DeFiStrategyGenerator(prisma);
const commandProcessor = new DeFiCommandProcessor(prisma);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Main command endpoint - handles natural language commands
app.post('/api/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    console.log(`🎯 Processing command: "${command}"`);
    
    const response = await commandProcessor.processCommand(command);
    
    res.json({
      ...response,
      originalCommand: command,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Command processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process command',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// SQL Query Generation endpoint
app.post('/api/sql/generate', async (req, res) => {
  try {
    const { query, explain = false } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const sqlQuery = await generateSQLQuery(query);
    
    if (explain) {
      // Execute the query and return results
      try {
        const results = await executeSQLQuery(sqlQuery.query, prisma);
        res.json({
          ...sqlQuery,
          results,
          executed: true
        });
      } catch (executionError) {
        res.json({
          ...sqlQuery,
          error: 'Query generated but failed to execute',
          executionError: executionError instanceof Error ? executionError.message : 'Unknown error'
        });
      }
    } else {
      res.json(sqlQuery);
    }
  } catch (error) {
    console.error('SQL generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate SQL query',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Strategy Generation endpoint
app.post('/api/strategies/generate', async (req, res) => {
  try {
    const { 
      query, 
      riskTolerance = 'moderate', 
      investmentAmount,
      includeVariations = false 
    } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await strategyGenerator.generateStrategy(
      query, 
      riskTolerance as 'conservative' | 'moderate' | 'aggressive',
      investmentAmount
    );

    let variations: any[] = [];
    if (includeVariations) {
      variations = await strategyGenerator.generateStrategyVariations(
        result.strategy, 
        3
      );
    }

    res.json({
      strategy: result.strategy,
      analysis: result.analysis,
      marketData: result.data,
      variations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Strategy generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate strategy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Find Similar Strategies endpoint
app.post('/api/strategies/similar', async (req, res) => {
  try {
    const { description, limit = 5 } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const similarStrategies = await strategyGenerator.findSimilarStrategies(
      description, 
      limit
    );

    res.json({
      similarStrategies,
      count: similarStrategies.length,
      searchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Similar strategies error:', error);
    res.status(500).json({ 
      error: 'Failed to find similar strategies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Market Analysis endpoint
app.get('/api/market/analysis', async (req, res) => {
  try {
    const analysis = await strategyGenerator['analyzeMarketData']();
    
    res.json({
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Market analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze market data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Strategy Types endpoint
app.get('/api/strategies/types', (req, res) => {
  res.json({
    strategyTypes: [
      {
        type: 'stables',
        name: 'Stablecoin Strategies',
        description: 'Low-risk strategies focused on stablecoin yield farming and lending',
        riskLevel: 'low',
        examples: ['USDC lending', 'DAI farming', 'Stablecoin loops']
      },
      {
        type: 'looping',
        name: 'Leverage Looping',
        description: 'Borrow against collateral to increase exposure and potential returns',
        riskLevel: 'high',
        examples: ['SOL loop farming', 'ETH leverage', 'Token leverage strategies']
      },
      {
        type: 'yield_farming',
        name: 'Yield Farming',
        description: 'Provide liquidity to earn rewards and fees from DeFi protocols',
        riskLevel: 'medium',
        examples: ['LP token farming', 'Liquidity provision', 'Reward farming']
      },
      {
        type: 'multi_protocol',
        name: 'Multi-Protocol',
        description: 'Strategies spanning multiple DeFi protocols for diversification',
        riskLevel: 'medium',
        examples: ['Cross-protocol arbitrage', 'Multi-DEX strategies', 'Protocol hopping']
      },
      {
        type: 'airdrop',
        name: 'Airdrop Farming',
        description: 'Interact with protocols to qualify for potential token airdrops',
        riskLevel: 'medium',
        examples: ['Protocol interaction', 'Governance participation', 'Testnet activities']
      },
      {
        type: 'pair_trading',
        name: 'Pair Trading',
        description: 'Trading strategies based on token pair relationships and correlations',
        riskLevel: 'high',
        examples: ['Arbitrage trading', 'Mean reversion', 'Momentum trading']
      },
      {
        type: 'liquidation_arbitrage',
        name: 'Liquidation Arbitrage',
        description: 'Capitalize on liquidation opportunities in lending protocols',
        riskLevel: 'very_high',
        examples: ['Liquidation botting', 'MEV strategies', 'Liquidation farming']
      },
      {
        type: 'leverage_farming',
        name: 'Leverage Farming',
        description: 'Use leverage to amplify farming rewards and returns',
        riskLevel: 'high',
        examples: ['Leveraged LP positions', 'Borrowed capital farming', 'Leverage vaults']
      },
      {
        type: 'cross_chain',
        name: 'Cross-Chain',
        description: 'Strategies involving multiple blockchain networks',
        riskLevel: 'high',
        examples: ['Bridge arbitrage', 'Cross-chain farming', 'Multi-chain strategies']
      },
      {
        type: 'volatility_trading',
        name: 'Volatility Trading',
        description: 'Strategies that profit from market volatility',
        riskLevel: 'very_high',
        examples: ['Options strategies', 'Volatility farming', 'Delta neutral positions']
      }
    ]
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 AI Strategies API server running on port ${PORT}`);
  console.log(`📊 Database connected: ${prisma ? 'Yes' : 'No'}`);
  console.log(`🤖 AI Strategy Generator ready`);
});

export default app;
