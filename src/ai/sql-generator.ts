import { generateObject } from 'ai';
import { getAIProvider } from './providers';
import { z } from 'zod';

// Schema for SQL query generation
const sqlQuerySchema = z.object({
  query: z.string().describe('The SQL query to execute'),
  explanation: z.string().describe('Plain English explanation of what the query does'),
  parameters: z.array(z.string()).optional().describe('Any parameters that need to be substituted'),
  complexity: z.enum(['simple', 'medium', 'complex']).describe('Complexity level of the query'),
  tables: z.array(z.string()).describe('Database tables used in the query'),
  purpose: z.string().describe('The business purpose of this query')
});

export type SQLQuery = z.infer<typeof sqlQuerySchema>;

// Database schema context for the AI
const DATABASE_SCHEMA = `
-- Kamino DeFi Investment Strategies Database Schema

-- Tokens table - All tokens used in Kamino markets
CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  mint TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  "logoUrl" TEXT NOT NULL,
  "marketCapUsd" DECIMAL(20,6) NOT NULL,
  "volumeUsd" DECIMAL(20,6) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  priority INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Kamino Lending Markets - Market configurations
CREATE TABLE kamino_lending_markets (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  "lookupTable" TEXT NOT NULL,
  "isCurated" BOOLEAN DEFAULT FALSE,
  "isPrimary" BOOLEAN DEFAULT FALSE,
  "configKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Kamino Pairs - Trading pairs within lending markets
CREATE TABLE kamino_pairs (
  id TEXT PRIMARY KEY,
  "depositReserveAddress" TEXT NOT NULL,
  "borrowReserveAddress" TEXT NOT NULL,
  "pairType" TEXT NOT NULL,
  "strategyType" TEXT NOT NULL,
  "supplyApyType" TEXT NOT NULL,
  "supplyApyAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "lendingMarketId" TEXT REFERENCES kamino_lending_markets(id) ON DELETE CASCADE,
  "collateralTokenId" TEXT REFERENCES tokens(id),
  "debtTokenId" TEXT REFERENCES tokens(id),
  UNIQUE("depositReserveAddress", "borrowReserveAddress")
);

-- Kamino Filter Types - Categorization of pairs
CREATE TABLE kamino_filter_types (
  id TEXT PRIMARY KEY,
  "filterType" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "pairId" TEXT REFERENCES kamino_pairs(id) ON DELETE CASCADE,
  UNIQUE("pairId", "filterType")
);

-- Kamino Historical APY - Time-series APY data
CREATE TABLE kamino_historical_apy (
  id TEXT PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  "stakingApy" DECIMAL(10,6) NOT NULL,
  "debtApy" DECIMAL(10,6) NOT NULL,
  "timeRange" TEXT NOT NULL, -- '7D', '1M', '3M'
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "pairId" TEXT REFERENCES kamino_pairs(id) ON DELETE CASCADE,
  UNIQUE("pairId", date, "timeRange")
);

-- Kamino Data Import - Metadata about data imports
CREATE TABLE kamino_data_imports (
  id TEXT PRIMARY KEY,
  generatedAt TIMESTAMP NOT NULL,
  totalMarkets INTEGER NOT NULL,
  totalTokenMints INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  historicalApyFetchedAt TIMESTAMP NOT NULL,
  totalPairsProcessed INTEGER NOT NULL,
  totalPairs INTEGER NOT NULL,
  sources JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Key relationships:
-- - Tokens are referenced by pairs as collateral and debt tokens
-- - Pairs belong to lending markets
-- - Pairs have multiple filter types (volatile, perp, sol, etc.)
-- - Pairs have historical APY data across different time ranges
-- - All APY data is stored as decimal for precise calculations
-- - Strategy types include: directional, sol, etc.
-- - Pair types include: volatile, sol, etc.
-- - Filter types include: volatile, perp, sol, etc.
`;

export async function generateSQLQuery(userQuery: string): Promise<SQLQuery> {
  try {
    const aiProvider = getAIProvider();
    if (!aiProvider) {
      throw new Error('AI provider not available');
    }

    const { object: sqlQuery } = await generateObject({
      model: aiProvider.model,
      system: `You are an expert SQL analyst specializing in Kamino DeFi lending strategies. 
      
      You have access to a comprehensive Kamino database containing:
      - Token information (SOL, USDC, JLP, LSTs, etc.) with market cap and volume data
      - Kamino lending markets (12 different markets with various configurations)
      - Trading pairs (44+ pairs with collateral/debt token relationships)
      - Historical APY data (4,000+ records across 7D, 1M, 3M timeframes)
      - Filter types (volatile, perp, sol, etc.) for pair categorization
      - Strategy types (directional, sol, etc.) for different approaches
      
      Your task is to generate accurate SQL queries that answer user questions about Kamino lending strategies and opportunities.
      
      Important guidelines:
      1. Always use proper JOINs to get complete pair data with tokens and markets
      2. Focus on APY analysis and historical performance trends
      3. Consider strategy types (directional, sol) and pair types (volatile, sol)
      4. Use filter types to categorize and filter pairs appropriately
      5. Include token metadata (market cap, volume) for risk assessment
      6. Use proper aggregation for APY statistics and trends
      7. Handle NULL values appropriately
      8. Focus on SOL-related strategies and LST (Liquid Staking Token) opportunities
      9. Consider both staking APY and debt APY for net returns
      10. Use time-based filtering for recent data analysis
      
      CRITICAL COLUMN NAMING:
      - ALWAYS use double quotes around column names: "columnName" not columnName
      - Use "timeRange" not timeRange
      - Use "stakingApy" not stakingApy
      - Use "debtApy" not debtApy
      - Use "pairId" not pairId
      - Use "depositReserveAddress" not depositReserveAddress
      - Use "borrowReserveAddress" not borrowReserveAddress
      - Use "strategyType" not strategyType
      - Use "pairType" not pairType
      - Use "marketCapUsd" not marketCapUsd
      - Use "volumeUsd" not volumeUsd
      
      Common query patterns:
      - Find high APY pairs: JOIN kamino_pairs with kamino_historical_apy
      - SOL strategies: Filter by collateralToken.symbol = 'SOL' or debtToken.symbol = 'SOL'
      - LST strategies: Look for strategyType = 'sol' pairs
      - Volatile pairs: Filter by filterType = 'volatile'
      - Recent performance: Use timeRange = '7D' and recent dates
      
      Database Schema:
      ${DATABASE_SCHEMA}`,
      
      prompt: `Generate a SQL query for this Kamino DeFi investment question: "${userQuery}"
      
      Focus on:
      - Finding the best Kamino lending opportunities
      - Analyzing historical APY performance and trends
      - SOL and LST (Liquid Staking Token) strategies
      - Risk assessment based on token market cap and volume
      - Strategy type analysis (directional vs sol strategies)
      - Pair type filtering (volatile vs sol pairs)
      - Time-based performance analysis (7D, 1M, 3M)
      - Net APY calculations (staking APY - debt APY)
      
      Return a well-structured query with proper JOINs between:
      - kamino_pairs (main trading pairs)
      - tokens (collateral and debt token details)
      - kamino_lending_markets (market information)
      - kamino_historical_apy (APY data)
      - kamino_filter_types (pair categorization)`,
      
      schema: sqlQuerySchema,
    });

    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
}

// Helper function to execute SQL queries safely
export async function executeSQLQuery(query: string, prisma: any): Promise<any[]> {
  try {
    // Use Prisma's raw query execution
    const results = await prisma.$queryRawUnsafe(query);
    return results;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw new Error('Failed to execute SQL query');
  }
}
