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
    database: 'connected'
  });
});

// Generate DeFi strategy
app.post('/strategy', async (req, res) => {
  try {
    const { prompt, riskTolerance = 'moderate', investmentAmount } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await strategyFlow.generateStrategy(prompt, riskTolerance, investmentAmount);
    
    res.json({
      success: true,
      strategy: result.strategy,
      analysis: result.analysis,
      dataPoints: result.data.length,
      sqlQueries: result.sqlQueries.length
    });
  } catch (error) {
    console.error('Strategy generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate strategy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available tokens
app.get('/tokens', async (req, res) => {
  try {
    const tokens = await prisma.token.findMany({
      select: {
        id: true,
        symbol: true,
        name: true,
        marketCapUsd: true,
        volumeUsd: true,
        verified: true
      },
      orderBy: { priority: 'asc' }
    });
    
    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get Kamino markets
app.get('/markets', async (req, res) => {
  try {
    const markets = await prisma.kaminoLendingMarket.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isPrimary: true,
        isCurated: true,
        _count: {
          select: { pairs: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({ success: true, markets });
  } catch (error) {
    console.error('Markets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get high APY pairs
app.get('/pairs/high-apy', async (req, res) => {
  try {
    const { limit = 10, minApy = 5 } = req.query;
    
    const pairs = await prisma.kaminoHistoricalApy.findMany({
      where: {
        stakingApy: { gte: Number(minApy) },
        timeRange: '7D'
      },
      include: {
        pair: {
          include: {
            collateralToken: { select: { symbol: true, name: true } },
            debtToken: { select: { symbol: true, name: true } },
            lendingMarket: { select: { name: true } }
          }
        }
      },
      orderBy: { stakingApy: 'desc' },
      take: Number(limit)
    });
    
    res.json({ success: true, pairs });
  } catch (error) {
    console.error('High APY pairs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch high APY pairs' });
  }
});

// Get SOL strategies
app.get('/strategies/sol', async (req, res) => {
  try {
    const pairs = await prisma.kaminoPair.findMany({
      where: {
        OR: [
          { strategyType: 'sol' },
          { collateralToken: { symbol: 'SOL' } },
          { debtToken: { symbol: 'SOL' } }
        ]
      },
      include: {
        collateralToken: { select: { symbol: true, name: true } },
        debtToken: { select: { symbol: true, name: true } },
        lendingMarket: { select: { name: true } },
        historicalApy: {
          where: { timeRange: '7D' },
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, pairs });
  } catch (error) {
    console.error('SOL strategies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch SOL strategies' });
  }
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
