import { DeFiStrategyFlow } from '../ai/strategy-flow';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const prisma = new PrismaClient();
const strategyFlow = new DeFiStrategyFlow(prisma);

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
    database: 'connected',
    service: 'DeFi Strategy Generator'
  });
});

// Main strategy generation endpoint
app.post('/api/strategy/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      riskTolerance = 'moderate', 
      investmentAmount 
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required',
        example: {
          prompt: 'Give me SOL looping strategy to earn more',
          riskTolerance: 'moderate',
          investmentAmount: 5000
        }
      });
    }

    console.log(`🎯 Generating strategy for: "${prompt}"`);
    
    const result = await strategyFlow.generateStrategy(
      prompt,
      riskTolerance as 'conservative' | 'moderate' | 'aggressive',
      investmentAmount
    );
    
    res.json({
      success: true,
      strategy: result.strategy,
      analysis: result.analysis,
      marketData: result.data,
      sqlQueries: result.sqlQueries,
      generatedAt: new Date().toISOString(),
      flow: {
        step1: 'Generated SQL queries based on user prompt',
        step2: 'Executed queries to fetch market data from database',
        step3: 'Analyzed market data for opportunities and risks',
        step4: 'Created comprehensive strategy based on data and analysis'
      }
    });
  } catch (error) {
    console.error('Strategy generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate strategy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available strategy types
app.get('/api/strategy/types', (req, res) => {
  res.json({
    strategyTypes: [
      'stables',
      'looping', 
      'yield_farming',
      'multi_protocol',
      'airdrop',
      'pair_trading',
      'liquidation_arbitrage',
      'leverage_farming',
      'cross_chain',
      'volatility_trading'
    ],
    riskLevels: ['conservative', 'moderate', 'aggressive'],
    timeHorizons: ['short', 'medium', 'long']
  });
});

// Get market data overview
app.get('/api/market/overview', async (req, res) => {
  try {
    const overview = await prisma.$queryRaw`
      SELECT 
        'Jupiter Lend' as protocol,
        COUNT(*) as markets,
        AVG(CAST("supplyRate" AS DECIMAL)) as avg_supply_rate,
        AVG(CAST("borrowRate" AS DECIMAL)) as avg_borrow_rate
      FROM "jupiter_lend_markets"
      WHERE CAST("supplyRate" AS DECIMAL) > 0
      UNION ALL
      SELECT 
        'Kamino Vaults' as protocol,
        COUNT(*) as markets,
        AVG("netApy") as avg_supply_rate,
        0 as avg_borrow_rate
      FROM "kamino_vaults"
      WHERE "netApy" > 0
    `;

    res.json({
      overview,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'POST /api/strategy/generate',
      'GET /api/strategy/types',
      'GET /api/market/overview',
      'GET /health'
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 DeFi Strategy Generator API running on port ${PORT}`);
  console.log(`📊 Database connected: Yes`);
  console.log(`🤖 AI Strategy Flow ready`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/strategy/generate - Generate DeFi strategies`);
  console.log(`  GET  /api/strategy/types - Get available strategy types`);
  console.log(`  GET  /api/market/overview - Get market data overview`);
  console.log(`  GET  /health - Health check`);
});

export default app;
