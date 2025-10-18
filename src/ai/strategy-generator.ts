import { generateObject, generateText } from 'ai';

import { PrismaClient } from '@prisma/client';
import { getAIProvider } from './providers';
import { z } from 'zod';

// Strategy types schema
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

// Investment strategy schema
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

export type InvestmentStrategy = z.infer<typeof investmentStrategySchema>;

// Strategy analysis schema
const strategyAnalysisSchema = z.object({
  marketConditions: z.string().describe('Current market conditions analysis'),
  opportunityScore: z.number().min(0).max(100).describe('Opportunity score (0-100)'),
  riskScore: z.number().min(0).max(100).describe('Risk score (0-100)'),
  recommendedAllocation: z.string().describe('Recommended portfolio allocation'),
  alternatives: z.array(z.string()).describe('Alternative strategies to consider'),
  marketTrends: z.array(z.string()).describe('Relevant market trends'),
  warnings: z.array(z.string()).describe('Important warnings and considerations')
});

export type StrategyAnalysis = z.infer<typeof strategyAnalysisSchema>;

export class DeFiStrategyGenerator {
  private prisma: PrismaClient;
  private aiProvider: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    
    // Initialize AI provider - Azure OpenAI only
    this.aiProvider = getAIProvider();
    if (!this.aiProvider) {
      console.warn('Azure OpenAI provider not available, falling back to basic functionality');
    }
  }

  private generateBasicStrategy(
    userQuery: string,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive',
    investmentAmount?: number
  ): InvestmentStrategy {
    const lowerQuery = userQuery.toLowerCase();
    
    // Determine strategy type based on keywords
    let strategyType = 'yield_farming';
    if (lowerQuery.includes('loop') || lowerQuery.includes('leverage')) {
      strategyType = 'looping';
    } else if (lowerQuery.includes('stable')) {
      strategyType = 'stables';
    } else if (lowerQuery.includes('airdrop')) {
      strategyType = 'airdrop';
    } else if (lowerQuery.includes('pair') || lowerQuery.includes('trade')) {
      strategyType = 'pair_trading';
    }

    // Generate basic strategy
    return {
      name: `${strategyType.charAt(0).toUpperCase() + strategyType.slice(1)} Strategy`,
      description: `A ${strategyType} strategy based on your request: ${userQuery}`,
      strategyType: strategyType as any,
      riskLevel: riskTolerance === 'conservative' ? 'low' : riskTolerance === 'moderate' ? 'medium' : 'high',
      expectedApy: riskTolerance === 'conservative' ? 5 : riskTolerance === 'moderate' ? 15 : 30,
      minInvestment: investmentAmount || 1000,
      maxInvestment: investmentAmount ? investmentAmount * 10 : undefined,
      tokens: ['SOL', 'USDC'],
      protocols: ['Jupiter Lend', 'Kamino'],
      steps: [
        'Research current market conditions',
        'Choose appropriate protocol',
        'Execute strategy with proper risk management',
        'Monitor and adjust as needed'
      ],
      risks: [
        'Market volatility',
        'Smart contract risk',
        'Liquidation risk',
        'Impermanent loss'
      ],
      monitoring: [
        'Token prices',
        'Protocol TVL',
        'APY changes',
        'Market conditions'
      ],
      exitStrategy: 'Exit when APY drops below target or market conditions deteriorate',
      capitalEfficiency: riskTolerance === 'conservative' ? 70 : riskTolerance === 'moderate' ? 80 : 90,
      complexity: riskTolerance === 'conservative' ? 3 : riskTolerance === 'moderate' ? 5 : 7,
      timeHorizon: riskTolerance === 'conservative' ? 'long' : riskTolerance === 'moderate' ? 'medium' : 'short',
      gasCosts: '0.01-0.05 SOL per transaction',
      liquidity: 'High liquidity required for optimal execution'
    };
  }

  private generateBasicAnalysis(strategy: InvestmentStrategy, marketData: any[]): StrategyAnalysis {
    return {
      marketConditions: 'Current market conditions are favorable for DeFi strategies',
      opportunityScore: strategy.riskLevel === 'low' ? 7 : strategy.riskLevel === 'medium' ? 8 : 9,
      riskScore: strategy.riskLevel === 'low' ? 3 : strategy.riskLevel === 'medium' ? 5 : 7,
      recommendedAllocation: strategy.riskLevel === 'low' ? '10-20%' : strategy.riskLevel === 'medium' ? '20-40%' : '40-60%',
      alternatives: ['Traditional yield farming', 'Staking', 'Liquidity provision'],
      marketTrends: ['Growing DeFi adoption', 'Increasing TVL', 'New protocol launches'],
      warnings: ['Monitor market volatility', 'Set stop-losses', 'Diversify across protocols']
    };
  }

  async generateStrategy(
    userQuery: string,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    investmentAmount?: number
  ): Promise<{ strategy: InvestmentStrategy; analysis: StrategyAnalysis; data: any[] }> {
    try {
      // First, analyze the market data to inform strategy generation
      const marketData = await this.analyzeMarketData();
      
      // Generate the investment strategy
      let strategy;
      if (this.aiProvider) {
        try {
          const { object: aiStrategy } = await generateObject({
            model: this.aiProvider.model,
        system: `You are an expert DeFi strategist with deep knowledge of:
        - Yield farming and liquidity provision
        - Leverage strategies and looping
        - Cross-protocol arbitrage opportunities
        - Risk management and portfolio optimization
        - Market making and pair trading
        - Airdrop farming and protocol incentives
        
        Current market data context:
        ${JSON.stringify(marketData, null, 2)}
        
        Generate sophisticated investment strategies based on real DeFi data.
        Consider current APYs, leverage opportunities, and risk factors.
        Provide actionable, executable strategies with specific steps.`,
        
        prompt: `Create a DeFi investment strategy based on this request: "${userQuery}"
        
        Risk tolerance: ${riskTolerance}
        ${investmentAmount ? `Investment amount: $${investmentAmount}` : ''}
        
        Focus on:
        1. Maximizing returns while managing risk
        2. Using current market opportunities
        3. Providing clear execution steps
        4. Including proper risk management
        5. Considering gas costs and liquidity requirements`,
        
        schema: investmentStrategySchema,
          });
          strategy = aiStrategy;
        } catch (error) {
          console.warn('AI strategy generation failed, using basic strategy:', error);
          strategy = this.generateBasicStrategy(userQuery, riskTolerance, investmentAmount);
        }
      } else {
        strategy = this.generateBasicStrategy(userQuery, riskTolerance, investmentAmount);
      }

      // Generate market analysis
      let analysis;
      if (this.aiProvider) {
        try {
          const { object: aiAnalysis } = await generateObject({
            model: this.aiProvider.model,
            system: `You are a DeFi market analyst. Analyze current market conditions and provide insights for investment strategies.`,
            
            prompt: `Analyze the market conditions for this strategy: "${strategy.name}"
            
            Strategy details:
            - Type: ${strategy.strategyType}
            - Risk Level: ${strategy.riskLevel}
            - Expected APY: ${strategy.expectedApy}%
            - Protocols: ${strategy.protocols.join(', ')}
            - Tokens: ${strategy.tokens.join(', ')}
            
            Provide market analysis, opportunity assessment, and recommendations.`,
            
            schema: strategyAnalysisSchema,
          });
          analysis = aiAnalysis;
        } catch (error) {
          console.warn('AI analysis generation failed, using basic analysis:', error);
          analysis = this.generateBasicAnalysis(strategy, marketData);
        }
      } else {
        analysis = this.generateBasicAnalysis(strategy, marketData);
      }

      return { strategy, analysis, data: marketData };
    } catch (error) {
      console.error('Error generating strategy:', error);
      throw new Error('Failed to generate investment strategy');
    }
  }

  private async analyzeMarketData(): Promise<any> {
    try {
      // Get current market data for strategy generation
      const [
        topLendingRates,
        topBorrowRates,
        leverageOpportunities,
        protocolTVLs,
        tokenPrices,
        recentStrategies
      ] = await Promise.all([
        // Top lending opportunities
        this.prisma.$queryRaw`
          SELECT 
            jlm.name,
            jlm.supplyRate,
            t.symbol,
            t.price,
            jlm.totalAssets
          FROM jupiter_lend_markets jlm
          JOIN tokens t ON jlm.assetId = t.id
          WHERE jlm.supplyRate > '100'
          ORDER BY CAST(jlm.supplyRate AS DECIMAL) DESC
          LIMIT 5
        `,
        
        // Top borrowing rates
        this.prisma.$queryRaw`
          SELECT 
            jbm.address,
            st.symbol as supply_token,
            bt.symbol as borrow_token,
            jbm.borrowRate,
            jbm.supplyRate
          FROM jupiter_borrow_markets jbm
          JOIN tokens st ON jbm.supplyTokenId = st.id
          JOIN tokens bt ON jbm.borrowTokenId = bt.id
          WHERE jbm.borrowRate > '0'
          ORDER BY CAST(jbm.borrowRate AS DECIMAL) DESC
          LIMIT 5
        `,
        
        // Leverage opportunities
        this.prisma.$queryRaw`
          SELECT 
            kv.marketName,
            kv.maxLeverage,
            kv.netApy,
            ct.symbol as collateral_token,
            dt.symbol as debt_token,
            kv.tvl
          FROM kamino_vaults kv
          JOIN tokens ct ON kv.collateralTokenId = ct.id
          JOIN tokens dt ON kv.debtTokenId = dt.id
          WHERE kv.maxLeverage > 3
          ORDER BY kv.maxLeverage DESC
          LIMIT 5
        `,
        
        // Protocol TVLs
        this.prisma.$queryRaw`
          SELECT 
            name,
            category,
            currentTvl,
            chains
          FROM defillama_protocols
          ORDER BY currentTvl DESC
          LIMIT 10
        `,
        
        // Token prices
        this.prisma.$queryRaw`
          SELECT 
            symbol,
            name,
            price,
            chainId
          FROM tokens
          WHERE price IS NOT NULL
          ORDER BY price DESC
          LIMIT 10
        `,
        
        // Recent strategies
        this.prisma.investmentStrategy.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return {
        topLendingRates,
        topBorrowRates,
        leverageOpportunities,
        protocolTVLs,
        tokenPrices,
        recentStrategies,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing market data:', error);
      return {};
    }
  }

  async findSimilarStrategies(
    strategyDescription: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // For now, use a simple text-based search since we don't have OpenAI embeddings
      // In production, you would generate embeddings using OpenAI's embedding API
      const similarStrategies = await this.prisma.$queryRaw`
        SELECT 
          name,
          description,
          "strategyType",
          "riskLevel",
          "expectedApy",
          protocols,
          tokens,
          0.5 as distance
        FROM investment_strategies
        WHERE 
          LOWER(description) LIKE LOWER(${`%${strategyDescription}%`}) OR
          LOWER(name) LIKE LOWER(${`%${strategyDescription}%`}) OR
          LOWER("strategyType") LIKE LOWER(${`%${strategyDescription}%`})
        ORDER BY 
          CASE 
            WHEN LOWER(description) LIKE LOWER(${`%${strategyDescription}%`}) THEN 1
            WHEN LOWER(name) LIKE LOWER(${`%${strategyDescription}%`}) THEN 2
            ELSE 3
          END
        LIMIT ${limit}
      `;

      return similarStrategies as any[];
    } catch (error) {
      console.error('Error finding similar strategies:', error);
      return [];
    }
  }

  async generateStrategyVariations(
    baseStrategy: InvestmentStrategy,
    variations: number = 3
  ): Promise<InvestmentStrategy[]> {
    try {
      const variationsList: InvestmentStrategy[] = [];
      
      for (let i = 0; i < variations; i++) {
        if (this.aiProvider) {
          try {
            const { object: variation } = await generateObject({
              model: this.aiProvider.model,
          system: `You are a DeFi strategist. Create variations of existing strategies by adjusting risk, protocols, or approach while maintaining the core concept.`,
          
          prompt: `Create a variation of this strategy: "${baseStrategy.name}"
          
          Original strategy:
          - Type: ${baseStrategy.strategyType}
          - Risk: ${baseStrategy.riskLevel}
          - APY: ${baseStrategy.expectedApy}%
          - Protocols: ${baseStrategy.protocols.join(', ')}
          
          Create variation ${i + 1} with different:
          - Risk level or approach
          - Protocol combinations
          - Token selections
          - Execution method
          
          Keep the core strategy concept but make it distinct.`,
          
              schema: investmentStrategySchema,
            });
            
            variationsList.push(variation);
          } catch (error) {
            console.warn(`AI variation ${i + 1} generation failed, skipping:`, error);
          }
        } else {
          // Generate basic variation
          const basicVariation = this.generateBasicStrategy(
            `${baseStrategy.name} Variation ${i + 1}`,
            baseStrategy.riskLevel === 'low' ? 'conservative' : baseStrategy.riskLevel === 'medium' ? 'moderate' : 'aggressive'
          );
          variationsList.push(basicVariation);
        }
      }
      
      return variationsList;
    } catch (error) {
      console.error('Error generating strategy variations:', error);
      return [];
    }
  }
}
