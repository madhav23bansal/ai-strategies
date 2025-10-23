import { generateObject, generateText } from 'ai';

import { PerpsDataLoader } from './perps-data-loader';
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
  private perpsLoader: PerpsDataLoader;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.aiProvider = getAIProvider();
    this.perpsLoader = new PerpsDataLoader();
    
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
    // Load current perps data for context
    const perpsContext = await this.perpsLoader.getFormattedContext();
    
    const { object: analysis } = await generateObject({
      model: this.aiProvider.model,
      system: `You are a senior DeFi strategist for Lomen, an AI-powered DeFi investment platform. You have deep expertise in both Kamino lending strategies and Solana perpetual trading.

      KAMINO STRATEGY TYPES AND ANALYSIS:
      - LOOPING: SOL leverage strategies using Kamino lending markets for borrowing against SOL/LST collateral
      - YIELD_FARMING: Maximizing returns through Kamino pair strategies and LST staking
      - STABLES: Low-risk USDC/USDT strategies using Kamino stablecoin pairs
      - SOL_STRATEGIES: SOL-focused strategies using liquid staking tokens (LSTs) and SOL pairs
      - LST_STRATEGIES: Liquid Staking Token strategies (mSOL, JitoSOL, etc.) for enhanced yields
      - VOLATILE_PAIRS: High-yield strategies using volatile token pairs on Kamino
      - DIRECTIONAL: Directional strategies based on market trends and APY opportunities

      SOLANA PERPS TRADING EXPERTISE:
      - DRIFT PROTOCOL: Leading decentralized perps exchange on Solana with advanced trading features
      - TRADING STRATEGIES: Long/short positions, funding rate arbitrage, cross-margin trading, delta-neutral strategies
      - RISK MANAGEMENT: Stop-losses, position sizing, funding rate monitoring, liquidation risk management

      COMBINED STRATEGY ANALYSIS FOCUS:
      - Current APY rates from Kamino historical data (staking APY vs debt APY)
      - SOL and LST performance across different timeframes (7D, 1M, 3M)
      - Strategy type effectiveness (directional vs sol strategies)
      - Pair type analysis (volatile vs sol pairs)
      - Market conditions based on Kamino lending market data
      - Risk assessment using token market cap and volume data
      - Perps trading opportunities for hedging and directional exposure
      - Capital efficiency across both yield farming and trading strategies
      - Recommended allocation balancing yield generation and trading components
      
      Be specific and data-driven in your analysis. Use actual APY numbers, token data, and market conditions from the Kamino data, combined with current perps market data to support your conclusions.`,
  
      prompt: `Analyze this market data for strategy generation:

      User Request: "${userPrompt}"
      
      CURRENT PERPS MARKET CONTEXT:
      ${perpsContext}
      
      KAMINO LENDING MARKET DATA:
      ${JSON.stringify(serializeForAI(marketData), null, 2)}
      
      Provide comprehensive market analysis including:
      1. Current market conditions and opportunities (be specific about rates, TVL, perps volume, etc.)
      2. Risk assessment and scoring (based on actual data from both Kamino and perps)
      3. Recommended portfolio allocation (justify with data from both sources)
      4. Alternative strategies to consider (based on available opportunities in both markets)
      5. Key market trends and warnings (derived from the combined data)
      6. Specific perps trading opportunities based on current market data
      7. How to combine Kamino yield strategies with perps trading for optimal returns
      
      IMPORTANT: Be concise and data-driven. Focus on specific numbers and actionable insights.`,
      
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
    // Load current perps data for strategy creation
    const perpsContext = await this.perpsLoader.getFormattedContext();
    
    const { object: strategy } = await generateObject({
      model: this.aiProvider.model,
      system: `You are a senior DeFi strategist for Lomen, an AI-powered DeFi investment platform. Create sophisticated, actionable strategies that combine Kamino lending with Solana perpetual trading.

      KAMINO STRATEGY CREATION EXPERTISE:
      - LOOPING: Design SOL leverage strategies using Kamino lending markets for borrowing against SOL/LST collateral
      - YIELD_FARMING: Maximize returns through Kamino pair strategies and LST staking opportunities
      - STABLES: Create low-risk USDC/USDT strategies using Kamino stablecoin pairs
      - SOL_STRATEGIES: SOL-focused strategies using liquid staking tokens (LSTs) and SOL pairs
      - LST_STRATEGIES: Liquid Staking Token strategies (mSOL, JitoSOL, bbSOL, etc.) for enhanced yields
      - VOLATILE_PAIRS: High-yield strategies using volatile token pairs on Kamino
      - DIRECTIONAL: Directional strategies based on market trends and APY opportunities

      SOLANA PERPS TRADING EXPERTISE:
      - DRIFT PROTOCOL: Leading decentralized perps exchange on Solana with advanced trading features
      - TRADING STRATEGIES: Long/short positions, funding rate arbitrage, cross-margin trading, delta-neutral strategies
      - RISK MANAGEMENT: Stop-losses, position sizing, funding rate monitoring, liquidation risk management

      COMBINED STRATEGY REQUIREMENTS:
      - Base strategy on actual Kamino market data provided
      - Use specific APY rates, token data, and opportunities from Kamino pairs
      - Integrate current perps trading opportunities for directional exposure and hedging
      - Focus on SOL and LST strategies for maximum impact
      - Consider both staking APY and debt APY for net returns
      - Include specific Kamino lending markets and token pairs from the data
      - Provide clear, executable steps for both Kamino and perps platforms
      - Reference actual APY numbers and market conditions from the data
      - Balance yield generation with trading opportunities
      - Include comprehensive risk management across both platforms
      - Use current perps market data to identify specific trading opportunities

      Available Kamino data: 12 lending markets, 44+ trading pairs, 4,000+ historical APY records
      Available tokens: SOL, USDC, USDT, JLP, mSOL, JitoSOL, bbSOL, and other LSTs
      Available perps platform: Drift Protocol (70 markets, $100M+ daily volume)`,
    
      prompt: `Create a DeFi investment strategy based on this request: "${userPrompt}"
      
      Risk Tolerance: ${riskTolerance}
      ${investmentAmount ? `Investment Amount: $${investmentAmount}` : ''}
      
      CURRENT PERPS MARKET CONTEXT:
      ${perpsContext}
      
      Market Analysis:
      ${JSON.stringify(analysis, null, 2)}
      
      Kamino Lending Market Data:
      ${JSON.stringify(serializeForAI(marketData), null, 2)}
      
      Create a comprehensive strategy that:
      1. Maximizes returns while managing risk
      2. Uses current market opportunities from both Kamino and perps data (cite specific rates/numbers)
      3. Provides clear execution steps for both platforms
      4. Includes proper risk management across both yield farming and trading
      5. Considers gas costs and liquidity requirements
      6. Is specific and actionable based on real data
      7. References actual protocols and tokens from both market data sources
      8. Combines yield generation with specific perps trading opportunities
      9. Includes specific perps tokens and trading strategies based on current market conditions
      
      IMPORTANT: Keep responses concise and precise. Focus on actionable steps with specific data points. Avoid unnecessary elaboration.`,
    
      schema: investmentStrategySchema
    });

    return strategy;
  }

}
