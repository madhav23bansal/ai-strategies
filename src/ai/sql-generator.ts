import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
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
-- DeFi Investment Strategies Database Schema

-- Tokens table
CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  chainId TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  logoUrl TEXT,
  price DECIMAL(20,8),
  coingeckoId TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Jupiter Borrow Markets
CREATE TABLE jupiter_borrow_markets (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  totalSupply TEXT NOT NULL,
  totalSupplyLiquidity TEXT NOT NULL,
  totalBorrow TEXT NOT NULL,
  totalBorrowLiquidity TEXT NOT NULL,
  absorbedSupply TEXT NOT NULL,
  absorbedBorrow TEXT NOT NULL,
  supplyRateMagnifier TEXT NOT NULL,
  borrowRateMagnifier TEXT NOT NULL,
  borrowFee TEXT NOT NULL,
  collateralFactor TEXT NOT NULL,
  liquidationThreshold TEXT NOT NULL,
  liquidationMaxLimit TEXT NOT NULL,
  liquidationPenalty TEXT NOT NULL,
  withdrawalGap TEXT NOT NULL,
  supplyRate TEXT NOT NULL,
  supplyRateLiquidity TEXT NOT NULL,
  borrowRate TEXT NOT NULL,
  borrowRateLiquidity TEXT NOT NULL,
  withdrawLimit TEXT NOT NULL,
  withdrawableUntilLimit TEXT NOT NULL,
  withdrawable TEXT NOT NULL,
  borrowLimit TEXT NOT NULL,
  borrowableUntilLimit TEXT NOT NULL,
  borrowable TEXT NOT NULL,
  borrowLimitUtilization TEXT NOT NULL,
  minimumBorrowing TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  supplyTokenId TEXT REFERENCES tokens(id),
  borrowTokenId TEXT REFERENCES tokens(id)
);

-- Jupiter Lend Markets
CREATE TABLE jupiter_lend_markets (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  assetAddress TEXT NOT NULL,
  totalAssets TEXT NOT NULL,
  totalSupply TEXT NOT NULL,
  convertToShares TEXT NOT NULL,
  convertToAssets TEXT NOT NULL,
  rewardsRate TEXT NOT NULL,
  supplyRate TEXT NOT NULL,
  totalRate TEXT NOT NULL,
  rebalanceDifference TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  assetId TEXT REFERENCES tokens(id)
);

-- Drift Markets
CREATE TABLE drift_markets (
  id TEXT PRIMARY KEY,
  marketIndex INTEGER UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  mint TEXT NOT NULL,
  oracle TEXT NOT NULL,
  pubkey TEXT NOT NULL,
  totalSpotFee TEXT NOT NULL,
  depositBalance TEXT NOT NULL,
  borrowBalance TEXT NOT NULL,
  cumulativeDepositInterest TEXT NOT NULL,
  cumulativeBorrowInterest TEXT NOT NULL,
  depositInterestRate DECIMAL(10,6) NOT NULL,
  borrowInterestRate DECIMAL(10,6) NOT NULL,
  utilizationRate DECIMAL(10,6) NOT NULL,
  totalDeposits DECIMAL(20,6) NOT NULL,
  totalBorrows DECIMAL(20,6) NOT NULL,
  availableLiquidity DECIMAL(20,6) NOT NULL,
  optimalUtilization DECIMAL(10,6) NOT NULL,
  optimalBorrowRate DECIMAL(10,6) NOT NULL,
  maxBorrowRate DECIMAL(10,6) NOT NULL,
  minBorrowRate DECIMAL(10,6) NOT NULL,
  oraclePrice DECIMAL(20,6) NOT NULL,
  oracleConfidence DECIMAL(10,6) NOT NULL,
  depositTokenTwap TEXT NOT NULL,
  borrowTokenTwap TEXT NOT NULL,
  totalFeeEarned DECIMAL(20,6) NOT NULL,
  totalDepositsUSD DECIMAL(20,6) NOT NULL,
  totalBorrowsUSD DECIMAL(20,6) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- DeFiLlama Protocols
CREATE TABLE defillama_protocols (
  id TEXT PRIMARY KEY,
  protocolId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  chains TEXT[] NOT NULL,
  currentTvl DECIMAL(20,6) NOT NULL,
  description TEXT,
  website TEXT,
  twitter TEXT,
  safeHarbor BOOLEAN DEFAULT FALSE,
  github TEXT,
  methodology TEXT,
  methodologyUrl TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Kamino Multiply Vaults
CREATE TABLE kamino_vaults (
  id TEXT PRIMARY KEY,
  marketAddress TEXT UNIQUE NOT NULL,
  marketName TEXT NOT NULL,
  pairType TEXT NOT NULL,
  strategyType TEXT NOT NULL,
  maxLeverage DECIMAL(10,2) NOT NULL,
  averageLeverage DECIMAL(10,2) NOT NULL,
  totalDepositedUsd DECIMAL(20,6) NOT NULL,
  totalBorrowedUsd DECIMAL(20,6) NOT NULL,
  netApy DECIMAL(10,6) NOT NULL,
  stakingApy DECIMAL(10,6) NOT NULL,
  borrowCost DECIMAL(10,6) NOT NULL,
  tvl DECIMAL(20,6) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  collateralTokenId TEXT REFERENCES tokens(id),
  debtTokenId TEXT REFERENCES tokens(id)
);

-- Kamino Lending Markets
CREATE TABLE kamino_lending_markets (
  id TEXT PRIMARY KEY,
  marketAddress TEXT UNIQUE NOT NULL,
  marketName TEXT NOT NULL,
  description TEXT,
  isCurated BOOLEAN DEFAULT FALSE,
  isPrimary BOOLEAN DEFAULT FALSE,
  programId TEXT NOT NULL,
  reserveCount INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Investment Strategies
CREATE TABLE investment_strategies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  strategyType TEXT NOT NULL,
  riskLevel TEXT NOT NULL,
  expectedApy DECIMAL(10,6) NOT NULL,
  minInvestment DECIMAL(20,6) NOT NULL,
  maxInvestment DECIMAL(20,6),
  protocols TEXT[] NOT NULL,
  tokens TEXT[] NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  embedding VECTOR(1536),
  riskEmbedding VECTOR(1536),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Key relationships:
-- - Tokens are referenced by all market types
-- - Investment strategies link to protocols and tokens
-- - All rates are stored as strings to preserve precision
-- - Vector embeddings enable similarity search
`;

export async function generateSQLQuery(userQuery: string): Promise<SQLQuery> {
  try {
    const { object: sqlQuery } = await generateObject({
      model: openai('gpt-4o'),
      system: `You are an expert SQL analyst specializing in DeFi investment data. 
      
      You have access to a comprehensive database containing:
      - Token information (prices, metadata)
      - Jupiter lending markets (borrow/lend rates)
      - Drift markets (interest rates, utilization)
      - DeFiLlama protocols (TVL data)
      - Kamino vaults (leverage, APY data)
      - Investment strategies (with vector embeddings)
      
      Your task is to generate accurate SQL queries that answer user questions about DeFi investment opportunities.
      
      Important guidelines:
      1. Always use proper JOINs to get complete data
      2. Convert string rates to numeric for calculations (CAST(rate AS DECIMAL))
      3. Use vector similarity search when appropriate (embedding <=> query_embedding)
      4. Consider APY calculations and risk assessments
      5. Include relevant token information in results
      6. Use proper aggregation for summary statistics
      7. Handle NULL values appropriately
      
      Database Schema:
      ${DATABASE_SCHEMA}`,
      
      prompt: `Generate a SQL query for this DeFi investment question: "${userQuery}"
      
      Focus on:
      - Finding the best investment opportunities
      - Calculating APYs and returns
      - Risk assessment and diversification
      - Cross-protocol analysis
      - Token performance and correlations
      
      Return a well-structured query with proper JOINs and calculations.`,
      
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
