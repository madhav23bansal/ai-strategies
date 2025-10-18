import { generateObject, generateText } from 'ai';

import { PrismaClient } from '@prisma/client';
import { getAIProvider } from './providers';
import { z } from 'zod';

// Strategy generation schemas
const strategyTypeSchema = z.enum([
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
]);

const investmentStrategySchema = z.object({
  name: z.string().describe('Strategy name'),
  description: z.string().describe('Detailed strategy description'),
  strategyType: strategyTypeSchema,
  riskLevel: z.enum(['low', 'medium', 'high', 'very_high']),
  expectedApy: z.number().describe('Expected APY percentage'),
  minInvestment: z.number().describe('Minimum investment amount in USD'),
  maxInvestment: z.number().optional().describe('Maximum investment amount in USD'),
  protocols: z.array(z.string()).describe('Protocols involved'),
  tokens: z.array(z.string()).describe('Tokens involved'),
  steps: z.array(z.string()).describe('Step-by-step execution instructions'),
  risks: z.array(z.string()).describe('Key risks to consider'),
  monitoring: z.array(z.string()).describe('What to monitor'),
  exitStrategy: z.string().describe('When and how to exit'),
  capitalEfficiency: z.number().min(0).max(100).describe('Capital efficiency score (0-100)'),
  complexity: z.number().min(1).max(10).describe('Complexity level (1-10)'),
  timeHorizon: z.enum(['short', 'medium', 'long']).describe('Recommended time horizon'),
  gasCosts: z.string().describe('Estimated gas costs'),
  liquidity: z.string().describe('Liquidity requirements')
});

const sqlQuerySchema = z.object({
  query: z.string().describe('SQL query to fetch relevant data'),
  description: z.string().describe('What data this query fetches'),
  tables: z.array(z.string()).describe('Database tables involved')
});

const marketAnalysisSchema = z.object({
  marketConditions: z.string().describe('Current market conditions analysis'),
  opportunityScore: z.number().min(0).max(100).describe('Opportunity score (0-100)'),
  riskScore: z.number().min(0).max(100).describe('Risk score (0-100)'),
  recommendedAllocation: z.string().describe('Recommended portfolio allocation'),
  alternatives: z.array(z.string()).describe('Alternative strategies to consider'),
  marketTrends: z.array(z.string()).describe('Relevant market trends'),
  warnings: z.array(z.string()).describe('Important warnings and considerations')
});

export type InvestmentStrategy = z.infer<typeof investmentStrategySchema>;
export type SQLQuery = z.infer<typeof sqlQuerySchema>;
export type MarketAnalysis = z.infer<typeof marketAnalysisSchema>;

export class DeFiStrategyFlow {
  private prisma: PrismaClient;
  private aiProvider: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.aiProvider = getAIProvider();
    
    if (!this.aiProvider) {
      throw new Error('Azure OpenAI provider not available. Please set AZURE_OPENAI_API_KEY environment variable.');
    }
  }

  /**
   * Main strategy generation flow
   * User prompt -> Create SQL Commands -> Get data from db -> Analyze data -> Create strategy
   */
  async generateStrategy(
    userPrompt: string,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    investmentAmount?: number
  ): Promise<{
    strategy: InvestmentStrategy;
    analysis: MarketAnalysis;
    data: any[];
    sqlQueries: SQLQuery[];
  }> {
    try {
      console.log(`🎯 Starting strategy generation for: "${userPrompt}"`);

      // Step 1: Generate SQL queries based on user prompt
      const sqlQueries = await this.generateSQLQueries(userPrompt);
      console.log(`📊 Generated ${sqlQueries.length} SQL queries`);

      // Step 2: Execute SQL queries to get data from database
      const marketData = await this.executeSQLQueries(sqlQueries);
      console.log(`📈 Fetched ${marketData.length} data points from database`);

      // Step 3: Analyze the market data
      const analysis = await this.analyzeMarketData(marketData, userPrompt);
      console.log(`🔍 Market analysis completed`);

      // Step 4: Generate strategy based on prompt, data, and analysis
      const strategy = await this.createStrategy(userPrompt, marketData, analysis, riskTolerance, investmentAmount);
      console.log(`💡 Strategy generated: ${strategy.name}`);

      return {
        strategy,
        analysis,
        data: marketData,
        sqlQueries
      };
    } catch (error) {
      console.error('Error in strategy generation flow:', error);
      throw new Error('Failed to generate strategy');
    }
  }

  /**
   * Step 1: Generate SQL queries based on user prompt
   */
  private async generateSQLQueries(userPrompt: string): Promise<SQLQuery[]> {
        const { object: queries } = await generateObject({
          model: this.aiProvider.model,
          system: `You are an expert DeFi strategist and data analyst for Lomen, a sophisticated DeFi investment platform. 

          PRODUCT CONTEXT:
          Lomen is an AI-powered DeFi investment platform that helps users discover and execute profitable DeFi strategies. Our platform analyzes real-time market data from multiple protocols (Jupiter, Drift, Kamino, DeFiLlama) to generate personalized investment strategies.

          AVAILABLE STRATEGY TYPES AND THEIR MEANINGS:
          1. STABLES - Low-risk strategies focused on stablecoins (USDC, USDT) with yield farming, lending, and liquidity provision
          2. LOOPING - Leverage strategies where users borrow against collateral to increase exposure and potential returns
          3. YIELD_FARMING - Strategies that maximize returns through liquidity provision, staking, and reward token farming
          4. MULTI_PROTOCOL - Cross-protocol arbitrage and yield optimization strategies
          5. AIRDROP - Strategies focused on earning protocol tokens through participation and farming
          6. PAIR_TRADING - Market-neutral strategies involving correlated token pairs
          7. LIQUIDATION_ARBITRAGE - Strategies that profit from liquidation events and market inefficiencies
          8. LEVERAGE_FARMING - High-leverage strategies using borrowed funds for farming
          9. CROSS_CHAIN - Strategies involving multiple blockchain networks
          10. VOLATILITY_TRADING - Strategies that profit from price volatility and market movements

          DATABASE SCHEMA:
      
      -- Tokens/Assets
      CREATE TABLE tokens (
        id          TEXT PRIMARY KEY,
        address     TEXT UNIQUE NOT NULL,
        chainId     TEXT NOT NULL,
        name        TEXT NOT NULL,
        symbol      TEXT NOT NULL,
        decimals    INTEGER NOT NULL,
        logoUrl     TEXT,
        price       DECIMAL(20,8),
        coingeckoId TEXT,
        createdAt   TIMESTAMP DEFAULT NOW(),
        updatedAt   TIMESTAMP DEFAULT NOW()
      );

      -- Jupiter Lend Borrowing Markets
      CREATE TABLE jupiter_borrow_markets (
        id                    TEXT PRIMARY KEY,
        address               TEXT UNIQUE NOT NULL,
        "totalSupply"         TEXT NOT NULL,
        "totalSupplyLiquidity" TEXT NOT NULL,
        "totalBorrow"         TEXT NOT NULL,
        "totalBorrowLiquidity" TEXT NOT NULL,
        "absorbedSupply"      TEXT NOT NULL,
        "absorbedBorrow"      TEXT NOT NULL,
        "supplyRateMagnifier" TEXT NOT NULL,
        "borrowRateMagnifier" TEXT NOT NULL,
        "borrowFee"           TEXT NOT NULL,
        "collateralFactor"    TEXT NOT NULL,
        "liquidationThreshold" TEXT NOT NULL,
        "liquidationMaxLimit" TEXT NOT NULL,
        "liquidationPenalty"  TEXT NOT NULL,
        "withdrawalGap"       TEXT NOT NULL,
        "supplyRate"          TEXT NOT NULL,
        "supplyRateLiquidity" TEXT NOT NULL,
        "borrowRate"          TEXT NOT NULL,
        "borrowRateLiquidity" TEXT NOT NULL,
        "withdrawLimit"       TEXT NOT NULL,
        "withdrawableUntilLimit" TEXT NOT NULL,
        withdrawable          TEXT NOT NULL,
        "borrowLimit"         TEXT NOT NULL,
        "borrowableUntilLimit" TEXT NOT NULL,
        borrowable            TEXT NOT NULL,
        "borrowLimitUtilization" TEXT NOT NULL,
        "minimumBorrowing"    TEXT NOT NULL,
        "createdAt"           TIMESTAMP DEFAULT NOW(),
        "updatedAt"           TIMESTAMP DEFAULT NOW(),
        "supplyTokenId"       TEXT REFERENCES tokens(id),
        "borrowTokenId"       TEXT REFERENCES tokens(id)
      );

      -- Jupiter Lend Lending Markets
      CREATE TABLE jupiter_lend_markets (
        id                    TEXT PRIMARY KEY,
        address               TEXT UNIQUE NOT NULL,
        name                  TEXT NOT NULL,
        symbol                TEXT NOT NULL,
        decimals              INTEGER NOT NULL,
        "assetAddress"        TEXT NOT NULL,
        "totalAssets"         TEXT NOT NULL,
        "totalSupply"         TEXT NOT NULL,
        "convertToShares"     TEXT NOT NULL,
        "convertToAssets"     TEXT NOT NULL,
        "rewardsRate"         TEXT NOT NULL,
        "supplyRate"          TEXT NOT NULL,
        "totalRate"           TEXT NOT NULL,
        "rebalanceDifference" TEXT NOT NULL,
        "createdAt"           TIMESTAMP DEFAULT NOW(),
        "updatedAt"           TIMESTAMP DEFAULT NOW(),
        "assetId"             TEXT REFERENCES tokens(id)
      );

      -- Drift Borrow/Lend Markets
      CREATE TABLE drift_markets (
        id                    TEXT PRIMARY KEY,
        "marketIndex"         INTEGER UNIQUE NOT NULL,
        symbol                TEXT NOT NULL,
        mint                  TEXT NOT NULL,
        oracle                TEXT NOT NULL,
        pubkey                TEXT NOT NULL,
        "totalSpotFee"        TEXT NOT NULL,
        "depositBalance"      TEXT NOT NULL,
        "borrowBalance"       TEXT NOT NULL,
        "cumulativeDepositInterest" TEXT NOT NULL,
        "cumulativeBorrowInterest" TEXT NOT NULL,
        "depositInterestRate" DECIMAL(10,6) NOT NULL,
        "borrowInterestRate"  DECIMAL(10,6) NOT NULL,
        "utilizationRate"     DECIMAL(10,6) NOT NULL,
        "totalDeposits"       DECIMAL(20,6) NOT NULL,
        "totalBorrows"        DECIMAL(20,6) NOT NULL,
        "availableLiquidity"  DECIMAL(20,6) NOT NULL,
        "optimalUtilization"  DECIMAL(10,6) NOT NULL,
        "optimalBorrowRate"   DECIMAL(10,6) NOT NULL,
        "maxBorrowRate"       DECIMAL(10,6) NOT NULL,
        "minBorrowRate"       DECIMAL(10,6) NOT NULL,
        "oraclePrice"         DECIMAL(20,6) NOT NULL,
        "oracleConfidence"    DECIMAL(10,6) NOT NULL,
        "depositTokenTwap"    TEXT NOT NULL,
        "borrowTokenTwap"     TEXT NOT NULL,
        "totalFeeEarned"      DECIMAL(20,6) NOT NULL,
        "totalDepositsUSD"    DECIMAL(20,6) NOT NULL,
        "totalBorrowsUSD"     DECIMAL(20,6) NOT NULL,
        "createdAt"           TIMESTAMP DEFAULT NOW(),
        "updatedAt"           TIMESTAMP DEFAULT NOW()
      );

      -- DeFiLlama Protocols
      CREATE TABLE defillama_protocols (
        id              TEXT PRIMARY KEY,
        "protocolId"    TEXT UNIQUE NOT NULL,
        name            TEXT NOT NULL,
        category        TEXT NOT NULL,
        chains          TEXT[] NOT NULL,
        "currentTvl"    DECIMAL(20,6) NOT NULL,
        description     TEXT,
        website         TEXT,
        twitter         TEXT,
        "safeHarbor"    BOOLEAN DEFAULT FALSE,
        github          TEXT,
        methodology     TEXT,
        "methodologyUrl" TEXT,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );

      -- Kamino Multiply Vaults
      CREATE TABLE kamino_vaults (
        id                    TEXT PRIMARY KEY,
        "marketAddress"       TEXT UNIQUE NOT NULL,
        "marketName"          TEXT NOT NULL,
        "pairType"            TEXT NOT NULL,
        "strategyType"        TEXT NOT NULL,
        "maxLeverage"         DECIMAL(10,2) NOT NULL,
        "averageLeverage"     DECIMAL(10,2) NOT NULL,
        "totalDepositedUsd"   DECIMAL(20,6) NOT NULL,
        "totalBorrowedUsd"    DECIMAL(20,6) NOT NULL,
        "netApy"              DECIMAL(10,6) NOT NULL,
        "stakingApy"          DECIMAL(10,6) NOT NULL,
        "borrowCost"          DECIMAL(10,6) NOT NULL,
        tvl                   DECIMAL(20,6) NOT NULL,
        "createdAt"           TIMESTAMP DEFAULT NOW(),
        "updatedAt"           TIMESTAMP DEFAULT NOW(),
        "collateralTokenId"   TEXT REFERENCES tokens(id),
        "debtTokenId"         TEXT REFERENCES tokens(id)
      );

      -- Kamino Lending Markets
      CREATE TABLE kamino_lending_markets (
        id              TEXT PRIMARY KEY,
        "marketAddress" TEXT UNIQUE NOT NULL,
        "marketName"    TEXT NOT NULL,
        description     TEXT,
        "isCurated"     BOOLEAN DEFAULT FALSE,
        "isPrimary"     BOOLEAN DEFAULT FALSE,
        "programId"     TEXT NOT NULL,
        "reserveCount"  INTEGER NOT NULL,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );

      -- Kamino Reserves (within lending markets)
      CREATE TABLE kamino_reserves (
        id                    TEXT PRIMARY KEY,
        address               TEXT UNIQUE NOT NULL,
        symbol                TEXT NOT NULL,
        name                  TEXT NOT NULL,
        decimals              INTEGER NOT NULL,
        mint                  TEXT NOT NULL,
        supply                DECIMAL(20,6) NOT NULL,
        "supplyUsd"           DECIMAL(20,6) NOT NULL,
        borrow                DECIMAL(20,6) NOT NULL,
        "borrowUsd"           DECIMAL(20,6) NOT NULL,
        "availableLiquidity"  DECIMAL(20,6) NOT NULL,
        "availableLiquidityUsd" DECIMAL(20,6) NOT NULL,
        "borrowRate"          DECIMAL(10,6) NOT NULL,
        "supplyRate"          DECIMAL(10,6) NOT NULL,
        "utilizationRate"     DECIMAL(10,6) NOT NULL,
        ltv                   DECIMAL(10,6) NOT NULL,
        "liquidationThreshold" DECIMAL(10,6) NOT NULL,
        "liquidationPenalty"  DECIMAL(10,6) NOT NULL,
        "createdAt"           TIMESTAMP DEFAULT NOW(),
        "updatedAt"           TIMESTAMP DEFAULT NOW(),
        "marketId"            TEXT REFERENCES kamino_lending_markets(id),
        "tokenId"             TEXT REFERENCES tokens(id)
      );

      -- Investment Strategies (for LLM suggestions)
      CREATE TABLE investment_strategies (
        id              TEXT PRIMARY KEY,
        name            TEXT UNIQUE NOT NULL,
        description     TEXT NOT NULL,
        "strategyType"  TEXT NOT NULL,
        "riskLevel"     TEXT NOT NULL,
        "expectedApy"   DECIMAL(10,6) NOT NULL,
        "minInvestment" DECIMAL(20,6) NOT NULL,
        "maxInvestment" DECIMAL(20,6),
        protocols       TEXT[] NOT NULL,
        tokens          TEXT[] NOT NULL,
        "isActive"      BOOLEAN DEFAULT TRUE,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );

      -- User Portfolios (for tracking investments)
      CREATE TABLE portfolios (
        id              TEXT PRIMARY KEY,
        "userId"        TEXT NOT NULL,
        "strategyId"    TEXT REFERENCES investment_strategies(id),
        amount          DECIMAL(20,6) NOT NULL,
        "currentValue"  DECIMAL(20,6) NOT NULL,
        "profitLoss"    DECIMAL(20,6) NOT NULL,
        "isActive"      BOOLEAN DEFAULT TRUE,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );

          Generate 3-5 SQL queries that will provide comprehensive market data for the user's strategy request.
          Focus on:
          1. Current APY rates and lending opportunities
          2. Leverage and looping opportunities  
          3. Protocol TVL and market size
          4. Token prices and volatility
          5. Cross-protocol arbitrage opportunities

          Each query should be specific and actionable for DeFi strategy generation.
          Use proper JOINs to get token information and ensure all column names match the schema exactly.
          
          CRITICAL: Use the exact column names from the schema above with proper quoting:
          - Use "tokenId" not "token_id" (always quote column names with double quotes)
          - Use "supplyRate" not "supply_rate" 
          - Use "borrowRate" not "borrow_rate"
          - Use "availableLiquidityUsd" not "available_liquidity_usd"
          - Use "totalSupplyUsd" not "total_supply_usd"
          - Use "totalBorrowUsd" not "total_borrow_usd"
          - ALWAYS wrap column names in double quotes: "columnName" not columnName
          
          IMPORTANT: 
          - All TEXT fields in the schema are stored as TEXT, so use proper casting for numeric operations
          - Use 'WSOL' instead of 'SOL' for Solana token queries (the database contains WSOL, not SOL)
          - Generate ONLY ONE SQL query per query object - do not include multiple SELECT statements separated by semicolons
          - Each query should be a single, complete SELECT statement
          - For DECIMAL casting, use appropriate precision: DECIMAL(38,12) for large numbers, DECIMAL(20,6) for rates and percentages
          - Be aware that some tables may be empty (like kamino_reserves), so use LEFT JOINs and handle NULL values`,
      
      prompt: `Generate SQL queries for this DeFi strategy request: "${userPrompt}"
      
      As a Lomen DeFi strategist, I need to analyze the current market data to create a profitable strategy. Based on the user's request, I should focus on:
      
      FOR LOOPING STRATEGIES (like SOL looping):
      - Current lending rates (supply rates) where users can earn yield
      - Borrowing rates and costs for leverage
      - Available liquidity and TVL for safe execution
      - Protocol-specific opportunities (Jupiter, Drift, Kamino)
      - Token prices and market conditions
      
      FOR YIELD FARMING STRATEGIES:
      - Highest APY opportunities across protocols
      - Liquidity pool sizes and stability
      - Reward token distributions
      - Risk factors and impermanent loss
      
      FOR STABLECOIN STRATEGIES:
      - USDC/USDT lending rates
      - Stablecoin-specific opportunities
      - Risk-adjusted returns
      
      Generate 3-5 focused SQL queries that will provide the most relevant data for this specific strategy type.
      
      CRITICAL REQUIREMENTS:
      - Use 'WSOL' instead of 'SOL' (database contains WSOL, not SOL)
      - Always quote column names: "supplyRate" not supplyRate
      - Use appropriate DECIMAL precision: DECIMAL(38,12) for large numbers, DECIMAL(20,6) for rates
      - Generate ONE query per query object (no semicolons separating multiple statements)
      - Focus on data that directly supports the requested strategy type`,
      
      schema: z.object({
        queries: z.array(sqlQuerySchema).min(3).max(5)
      })
    });

    return queries.queries;
  }

  /**
   * Step 2: Execute SQL queries to get data from database
   */
  private async executeSQLQueries(sqlQueries: SQLQuery[]): Promise<any[]> {
    const allData: any[] = [];

    for (const sqlQuery of sqlQueries) {
      console.log(`🔍 Executing: ${sqlQuery.description}`);
      try {
        const data = await this.prisma.$queryRawUnsafe(sqlQuery.query);
        allData.push({
          query: sqlQuery.description,
          data: data,
          tables: sqlQuery.tables
        });
      } catch (error) {
        throw new Error(`Failed to execute SQL query "${sqlQuery.description}": ${error instanceof Error ? error.message : 'Unknown error'}. Query: ${sqlQuery.query}`);
      }
    }

    if (allData.length === 0) {
      throw new Error('No data could be retrieved from the database. All SQL queries failed.');
    }

    return allData;
  }

  /**
   * Step 3: Analyze market data
   */
  private async analyzeMarketData(marketData: any[], userPrompt: string): Promise<MarketAnalysis> {
        const { object: analysis } = await generateObject({
          model: this.aiProvider.model,
          system: `You are a senior DeFi market analyst for Lomen, an AI-powered DeFi investment platform. You have deep expertise in:

          STRATEGY TYPES AND ANALYSIS:
          - LOOPING: Leverage strategies using borrowed funds against collateral
          - YIELD_FARMING: Maximizing returns through liquidity provision and staking
          - STABLES: Low-risk stablecoin strategies for conservative investors
          - MULTI_PROTOCOL: Cross-protocol arbitrage and yield optimization
          - AIRDROP: Protocol token earning through participation
          - PAIR_TRADING: Market-neutral strategies with correlated pairs
          - LIQUIDATION_ARBITRAGE: Profiting from liquidation events
          - LEVERAGE_FARMING: High-leverage farming strategies
          - CROSS_CHAIN: Multi-blockchain strategies
          - VOLATILITY_TRADING: Volatility-based profit strategies

          ANALYSIS FOCUS:
          - Current market conditions and opportunities (be specific about rates, TVL, etc.)
          - Risk assessment and scoring (based on actual data)
          - Recommended portfolio allocation (justify with data)
          - Alternative strategies to consider (based on available opportunities)
          - Key market trends and warnings (derived from the data)
          
          Be specific and data-driven in your analysis. Use the actual numbers from the market data to support your conclusions.`,
      
      prompt: `Analyze this market data for strategy generation:

      User Request: "${userPrompt}"
      
      Market Data:
      ${JSON.stringify(marketData, null, 2)}
      
      Provide comprehensive market analysis including:
      1. Current market conditions and opportunities (be specific about rates, TVL, etc.)
      2. Risk assessment and scoring (based on actual data)
      3. Recommended portfolio allocation (justify with data)
      4. Alternative strategies to consider (based on available opportunities)
      5. Key market trends and warnings (derived from the data)`,
      
      schema: marketAnalysisSchema
    });

    return analysis;
  }

  /**
   * Step 4: Create strategy based on prompt, data, and analysis
   */
  private async createStrategy(
    userPrompt: string,
    marketData: any[],
    analysis: MarketAnalysis,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive',
    investmentAmount?: number
  ): Promise<InvestmentStrategy> {
        const { object: strategy } = await generateObject({
          model: this.aiProvider.model,
          system: `You are a senior DeFi strategist for Lomen, an AI-powered DeFi investment platform. Create sophisticated, actionable investment strategies based on real market data.

          STRATEGY CREATION EXPERTISE:
          - LOOPING: Design leverage strategies where users borrow against collateral to increase exposure
          - YIELD_FARMING: Maximize returns through liquidity provision, staking, and reward farming
          - STABLES: Create low-risk stablecoin strategies for conservative investors
          - MULTI_PROTOCOL: Develop cross-protocol arbitrage and yield optimization strategies
          - AIRDROP: Design strategies focused on earning protocol tokens
          - PAIR_TRADING: Create market-neutral strategies with correlated token pairs
          - LIQUIDATION_ARBITRAGE: Develop strategies that profit from liquidation events
          - LEVERAGE_FARMING: Design high-leverage farming strategies
          - CROSS_CHAIN: Create multi-blockchain strategies
          - VOLATILITY_TRADING: Develop volatility-based profit strategies

          STRATEGY REQUIREMENTS:
          - Base strategy on actual market data provided
          - Use specific rates, TVL numbers, and opportunities from the data
          - Provide clear, executable steps with risk management
          - Consider current APYs, leverage opportunities, and risk factors
          - Include specific protocols and tokens from the market data

          Available protocols: Jupiter Lend, Drift, Kamino, DeFiLlama
          Available tokens: WSOL, USDC, USDT, and others from the database`,
      
      prompt: `Create a DeFi investment strategy based on this request: "${userPrompt}"
      
      Risk Tolerance: ${riskTolerance}
      ${investmentAmount ? `Investment Amount: $${investmentAmount}` : ''}
      
      Market Analysis:
      ${JSON.stringify(analysis, null, 2)}
      
      Market Data Context:
      ${JSON.stringify(marketData, null, 2)}
      
      Create a comprehensive strategy that:
      1. Maximizes returns while managing risk
      2. Uses current market opportunities from the data (cite specific rates/numbers)
      3. Provides clear execution steps
      4. Includes proper risk management
      5. Considers gas costs and liquidity requirements
      6. Is specific and actionable based on real data
      7. References actual protocols and tokens from the market data`,
      
      schema: investmentStrategySchema
    });

    return strategy;
  }

}
