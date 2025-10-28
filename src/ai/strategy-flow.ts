import { generateObject, generateText } from 'ai';

import { PrismaClient } from '@prisma/client';
import { generateSQLQuery } from './sql-generator';
import { getAIProvider } from './providers';
import { z } from 'zod';

// Utility function to handle BigInt serialization
function serializeForAI(data: any): any {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

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
  name: z.string().describe('Brief strategy name (max 5 words)'),
  description: z.string().describe('Brief strategy description (max 2 sentences)'),
  strategyType: strategyTypeSchema,
  riskLevel: z.enum(['low', 'medium', 'high', 'very_high']),
  expectedApy: z.number().describe('Expected APY percentage'),
  minInvestment: z.number().describe('Minimum investment amount in USD'),
  maxInvestment: z.number().optional().describe('Maximum investment amount in USD'),
  protocols: z.array(z.string()).describe('Protocols involved (max 5)'),
  tokens: z.array(z.string()).describe('Tokens involved (max 8)'),
  steps: z.array(z.string()).describe('Brief step-by-step instructions (max 8 steps, 1 sentence each)'),
  risks: z.array(z.string()).describe('Key risks (max 5, 1 sentence each)'),
  monitoring: z.array(z.string()).describe('What to monitor (max 5, 1 sentence each)'),
  exitStrategy: z.string().describe('Exit strategy (max 2 sentences)'),
  capitalEfficiency: z.number().min(0).max(100).describe('Capital efficiency score (0-100)'),
  complexity: z.number().min(1).max(10).describe('Complexity level (1-10)'),
  timeHorizon: z.enum(['short', 'medium', 'long']).describe('Recommended time horizon'),
  gasCosts: z.string().describe('Estimated gas costs (max 1 sentence)'),
  liquidity: z.string().describe('Liquidity requirements (max 1 sentence)')
});

const sqlQuerySchema = z.object({
  query: z.string().describe('SQL query to fetch relevant data'),
  description: z.string().describe('What data this query fetches'),
  tables: z.array(z.string()).describe('Database tables involved')
});

const marketAnalysisSchema = z.object({
  marketConditions: z.string().describe('Brief market conditions (max 2 sentences)'),
  opportunityScore: z.number().min(0).max(100).describe('Opportunity score (0-100)'),
  riskScore: z.number().min(0).max(100).describe('Risk score (0-100)'),
  recommendedAllocation: z.string().describe('Portfolio allocation (max 1 sentence)'),
  alternatives: z.array(z.string()).describe('Alternative strategies (max 3, 1 sentence each)'),
  marketTrends: z.array(z.string()).describe('Market trends (max 3, 1 sentence each)'),
  warnings: z.array(z.string()).describe('Key warnings (max 3, 1 sentence each)')
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
    try {
      // Use the SQL generator to create a single comprehensive query
      const sqlQuery = await generateSQLQuery(userPrompt);
      
      // Convert the single query to the expected array format
      return [{
        query: sqlQuery.query,
        description: sqlQuery.explanation,
        tables: sqlQuery.tables
      }];
    } catch (error) {
      console.error('Error generating SQL queries:', error);
      throw new Error('Failed to generate SQL queries');
    }
  }

  /**
   * Step 2: Execute SQL queries to get data from database
   */
  private async executeSQLQueries(sqlQueries: SQLQuery[]): Promise<any[]> {
    const allData: any[] = [];

    for (const sqlQuery of sqlQueries) {
      console.log(`🔍 Executing: ${sqlQuery.description}`);
      try {
        // Simple parameters - most queries don't need complex parameters
        const defaultParams: any[] = [];
        
        const data = await this.prisma.$queryRawUnsafe(sqlQuery.query, ...defaultParams);
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
      system: `You are a senior DeFi strategist for Lomen, an AI-powered DeFi investment platform. You have deep expertise in Kamino lending strategies, yield farming, and Jupiter token swapping.

      KAMINO STRATEGY TYPES AND ANALYSIS:
      - LOOPING: SOL leverage strategies using Kamino lending markets for borrowing against SOL/LST collateral
      - YIELD_FARMING: Maximizing returns through Kamino pair strategies and LST staking
      - STABLES: Low-risk USDC/USDT strategies using Kamino stablecoin pairs
      - SOL_STRATEGIES: SOL-focused strategies using liquid staking tokens (LSTs) and SOL pairs
      - LST_STRATEGIES: Liquid Staking Token strategies (mSOL, JitoSOL, etc.) for enhanced yields
      - VOLATILE_PAIRS: High-yield strategies using volatile token pairs on Kamino
      - DIRECTIONAL: Directional strategies based on market trends and APY opportunities

      JUPITER SWAP INTEGRATION:
      - Users may have any token (SOL, USDC, USDT, etc.) and need to swap to Kamino strategy tokens
      - Jupiter is the primary DEX aggregator on Solana for optimal token swaps
      - Available Kamino tokens: SOL, USDC, USDT, JLP, mSOL, JitoSOL, bbSOL, BNSOL, JupSOL, USDG, cbBTC, xBTC, and other LSTs
      - Swap considerations: liquidity, slippage, gas costs, and optimal routing
      - Always include swap steps when user's tokens don't match strategy requirements

      KAMINO STRATEGY ANALYSIS FOCUS:
      - Current APY rates from Kamino historical data (staking APY vs debt APY)
      - SOL and LST performance across different timeframes (7D, 1M, 3M)
      - Strategy type effectiveness (directional vs sol strategies)
      - Pair type analysis (volatile vs sol pairs)
      - Market conditions based on Kamino lending market data
      - Risk assessment using token market cap and volume data
      - Capital efficiency across yield farming strategies
      - Token swapping requirements and optimal routing
      - Recommended allocation for optimal yield generation
      
      Be specific and data-driven in your analysis. Use actual APY numbers, token data, and market conditions from the Kamino data to support your conclusions.`,
  
      prompt: `BRIEF market analysis for: "${userPrompt}"
      
      KAMINO DATA: ${JSON.stringify(serializeForAI(marketData), null, 2)}
      
      Provide SHORT analysis:
      • Market conditions (2 sentences max)
      • Opportunity/risk scores (0-100)
      • Portfolio allocation (1 sentence)
      • 3 alternatives, 3 trends, 3 warnings (1 sentence each)
      
      CRITICAL: BE BRIEF. NO LONG PARAGRAPHS.`,
      
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
      system: `You are a senior DeFi strategist for Lomen, an AI-powered DeFi investment platform. Create sophisticated, actionable strategies that combine Jupiter token swapping with Kamino lending and yield farming.

      KAMINO STRATEGY CREATION EXPERTISE:
      - LOOPING: Design SOL leverage strategies using Kamino lending markets for borrowing against SOL/LST collateral
      - YIELD_FARMING: Maximize returns through Kamino pair strategies and LST staking opportunities
      - STABLES: Create low-risk USDC/USDT strategies using Kamino stablecoin pairs
      - SOL_STRATEGIES: SOL-focused strategies using liquid staking tokens (LSTs) and SOL pairs
      - LST_STRATEGIES: Liquid Staking Token strategies (mSOL, JitoSOL, bbSOL, etc.) for enhanced yields
      - VOLATILE_PAIRS: High-yield strategies using volatile token pairs on Kamino
      - DIRECTIONAL: Directional strategies based on market trends and APY opportunities

      JUPITER SWAP INTEGRATION:
      - Users may have any token (SOL, USDC, USDT, etc.) and need to swap to Kamino strategy tokens
      - Jupiter is the primary DEX aggregator on Solana for optimal token swaps
      - Available Kamino tokens: SOL, USDC, USDT, JLP, mSOL, JitoSOL, bbSOL, BNSOL, JupSOL, USDG, cbBTC, xBTC, and other LSTs
      - Always include swap steps when user's tokens don't match strategy requirements
      - Consider swap costs, slippage, and liquidity in strategy planning
      - Use Jupiter's optimal routing for best swap rates

      KAMINO STRATEGY REQUIREMENTS:
      - Base strategy on actual Kamino market data provided
      - Use specific APY rates, token data, and opportunities from Kamino pairs
      - Include Jupiter swap steps when tokens don't match strategy requirements
      - Focus on SOL and LST strategies for maximum impact
      - Consider both staking APY and debt APY for net returns
      - Include specific Kamino lending markets and token pairs from the data
      - Provide clear, executable steps for both Jupiter swaps and Kamino platform
      - Reference actual APY numbers and market conditions from the data
      - Focus on yield generation and capital efficiency
      - Include comprehensive risk management for both swapping and lending strategies
      - Consider total costs including swap fees and gas costs

      Available Kamino data: 12 lending markets, 44+ trading pairs, 4,000+ historical APY records
      Available tokens: SOL, USDC, USDT, JLP, mSOL, JitoSOL, bbSOL, BNSOL, JupSOL, USDG, cbBTC, xBTC, and other LSTs`,
    
      prompt: `Create a BRIEF Kamino strategy with Jupiter swaps for: "${userPrompt}"
      
      Risk: ${riskTolerance} | Investment: ${investmentAmount ? `$${investmentAmount}` : 'Flexible'}
      
      KAMINO DATA: ${JSON.stringify(serializeForAI(marketData), null, 2)}
      
      ANALYSIS: ${JSON.stringify(analysis, null, 2)}
      
      REQUIREMENTS:
      • Use real Kamino data only
      • Include Jupiter swap steps if user's tokens don't match strategy requirements
      • Consider swap costs, slippage, and liquidity
      • Keep responses SHORT and DIRECT
      • Max 8 steps, 5 risks, 5 monitoring items
      • Use bullet points and short sentences
      • Focus on key numbers and essential actions only
      • Include both swap and lending steps
      
      CRITICAL: BE BRIEF. NO LONG PARAGRAPHS.`,
    
      schema: investmentStrategySchema
    });

    return strategy;
  }

}
