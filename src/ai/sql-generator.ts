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
-- NOTE: Perps data is handled separately via API, do NOT reference perps_markets table in SQL queries

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
      system: `You are an expert SQL analyst specializing in Kamino DeFi lending strategies with Jupiter swap integration. 
      
      You have access to a comprehensive Kamino database containing:
      - Token information (SOL, USDC, USDT, JLP, LSTs, etc.) with market cap and volume data
      - Kamino lending markets (12 different markets with various configurations)
      - Trading pairs (44+ pairs with collateral/debt token relationships)
      - Historical APY data (4,000+ records across 7D, 1M, 3M timeframes)
      - Filter types (volatile, perp, sol, etc.) for pair categorization
      - Strategy types (directional, sol, etc.) for different approaches
      
      JUPITER SWAP INTEGRATION:
      - Users can have any token (SOL, USDC, USDT, etc.) and need to swap to Kamino strategy tokens
      - Jupiter is the primary DEX aggregator on Solana for token swaps
      - Available tokens for Kamino strategies: SOL, USDC, USDT, JLP, mSOL, JitoSOL, bbSOL, BNSOL, JupSOL, USDG, cbBTC, xBTC, and other LSTs
      - Swap considerations: liquidity, slippage, gas costs, and optimal routing
      
      Your task is to generate SIMPLE SQL queries that answer user questions about Kamino lending strategies and opportunities, considering token swapping needs.
      
      CRITICAL: Generate ONLY simple queries with:
      1. Basic SELECT statements with simple JOINs
      2. Basic WHERE clauses for filtering
      3. Simple ORDER BY for sorting
      4. NO complex CTEs, window functions, or advanced analytics
      5. NO complex aggregations or subqueries
      6. Focus on getting basic data that can be analyzed in the application layer
      7. Use simple string comparisons, avoid complex parameter casting
      8. Keep queries under 20 lines and very straightforward
      
      Important guidelines:
      1. Use simple JOINs to get pair data with tokens and markets
      2. Focus on basic APY data retrieval
      3. Use simple filters for strategy types and pair types
      4. Include basic token metadata for risk assessment
      5. Handle NULL values with COALESCE
      6. Focus on SOL-related strategies and LST opportunities
      7. Use simple time-based filtering
      
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
      
      prompt: `Generate a SIMPLE SQL query for this Kamino DeFi investment question: "${userQuery}"
      
      Generate a VERY SIMPLE query that:
      - Gets basic pair data with tokens and APY information
      - Uses simple WHERE clauses for filtering
      - Avoids complex parameter casting or type conversions
      - Focuses on getting raw data for analysis
      
      Example simple query structure:
      SELECT p.id, p."strategyType", c.symbol, d.symbol, h."stakingApy", h."debtApy"
      FROM kamino_pairs p
      JOIN tokens c ON p."collateralTokenId" = c.id
      JOIN tokens d ON p."debtTokenId" = d.id
      LEFT JOIN kamino_historical_apy h ON p.id = h."pairId"
      WHERE h."timeRange" = '7D'
      ORDER BY h."stakingApy" DESC
      LIMIT 20;
      
      IMPORTANT: 
      - Keep it SIMPLE - no complex logic
      - Use basic string comparisons only
      - Avoid parameter casting
      - Focus on getting data, not complex analysis`,
      
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
