import { AzureOpenAIModel, getAIProvider } from './providers';
import { executeSQLQuery, generateSQLQuery } from './sql-generator';
import { generateObject, generateText } from 'ai';

import { DeFiStrategyGenerator } from './strategy-generator';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Command intent schema
const commandIntentSchema = z.object({
  intent: z.enum([
    'generate_strategy',
    'find_opportunities', 
    'analyze_market',
    'compare_protocols',
    'get_rates',
    'find_similar',
    'explain_strategy'
  ]),
  strategyType: z.string().optional().describe('Specific strategy type mentioned'),
  token: z.string().optional().describe('Token mentioned (SOL, USDC, etc.)'),
  riskLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
  amount: z.number().optional().describe('Investment amount mentioned'),
  timeframe: z.string().optional().describe('Time horizon mentioned'),
  action: z.string().describe('What the user wants to do'),
  context: z.string().describe('Additional context from the command')
});

export type CommandIntent = z.infer<typeof commandIntentSchema>;

// Response schema for command processing
const commandResponseSchema = z.object({
  type: z.enum(['strategy', 'opportunities', 'analysis', 'explanation', 'data']),
  title: z.string().describe('Title of the response'),
  summary: z.string().describe('Brief summary of what was found/generated'),
  data: z.any().optional().describe('Raw data if applicable'),
  strategies: z.array(z.any()).optional().describe('Generated strategies if applicable'),
  opportunities: z.array(z.any()).optional().describe('Found opportunities if applicable'),
  nextSteps: z.array(z.string()).optional().describe('Recommended next steps'),
  warnings: z.array(z.string()).optional().describe('Important warnings'),
  confidence: z.number().min(0).max(100).describe('Confidence level in the response')
});

export type CommandResponse = z.infer<typeof commandResponseSchema>;

export class DeFiCommandProcessor {
  private prisma: PrismaClient;
  private strategyGenerator: DeFiStrategyGenerator;
  private aiProvider: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.strategyGenerator = new DeFiStrategyGenerator(prisma);
    
    // Initialize AI provider - Azure OpenAI only
    this.aiProvider = getAIProvider();
    if (!this.aiProvider) {
      console.warn('Azure OpenAI provider not available, falling back to basic functionality');
    }
  }

  async processCommand(userCommand: string): Promise<CommandResponse> {
    try {
      // First, understand the user's intent
      const intent = await this.parseCommandIntent(userCommand);
      
      console.log(`🎯 Parsed intent: ${intent.intent} for ${intent.strategyType || 'general'} strategy`);

      // Process based on intent
      switch (intent.intent) {
        case 'generate_strategy':
          return await this.generateStrategyResponse(userCommand, intent);
        
        case 'find_opportunities':
          return await this.findOpportunitiesResponse(userCommand, intent);
        
        case 'analyze_market':
          return await this.analyzeMarketResponse(userCommand, intent);
        
        case 'compare_protocols':
          return await this.compareProtocolsResponse(userCommand, intent);
        
        case 'get_rates':
          return await this.getRatesResponse(userCommand, intent);
        
        case 'find_similar':
          return await this.findSimilarResponse(userCommand, intent);
        
        case 'explain_strategy':
          return await this.explainStrategyResponse(userCommand, intent);
        
        default:
          return await this.generateStrategyResponse(userCommand, intent);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      return {
        type: 'explanation',
        title: 'Error Processing Command',
        summary: 'Sorry, I encountered an error processing your request. Please try rephrasing your command.',
        confidence: 0,
        warnings: ['Command processing failed']
      };
    }
  }

  private async parseCommandIntent(command: string): Promise<CommandIntent> {
    // If no AI provider available, use basic keyword matching
    if (!this.aiProvider) {
      return this.parseCommandIntentBasic(command);
    }

    try {
      const { object: intent } = await generateObject({
        model: this.aiProvider.model,
        system: `You are an expert at understanding DeFi investment commands. Parse user commands to extract:
        - What they want to do (generate strategy, find opportunities, etc.)
        - Strategy type mentioned (looping, stables, yield farming, etc.)
        - Token mentioned (SOL, USDC, etc.)
        - Risk level implied
        - Investment amount mentioned
        - Timeframe mentioned
        
        Common patterns:
        - "Give me SOL looping strategy" -> generate_strategy, strategyType: looping, token: SOL
        - "Show me looping strategies" -> find_opportunities, strategyType: looping
        - "What are the best rates?" -> get_rates
        - "Compare Jupiter vs Kamino" -> compare_protocols
        - "Explain this strategy" -> explain_strategy`,
        
        prompt: `Parse this DeFi command: "${command}"`,
        
        schema: commandIntentSchema,
      });

      return intent;
    } catch (error) {
      console.warn('AI parsing failed, falling back to basic parsing:', error);
      return this.parseCommandIntentBasic(command);
    }
  }

  private parseCommandIntentBasic(command: string): CommandIntent {
    const lowerCommand = command.toLowerCase();
    
    // Basic keyword matching
    let intent: string = 'generate_strategy';
    let strategyType: string | undefined;
    let token: string | undefined;
    let riskLevel: string | undefined;
    let amount: number | undefined;
    
    // Detect intent
    if (lowerCommand.includes('show') || lowerCommand.includes('find') || lowerCommand.includes('list')) {
      intent = 'find_opportunities';
    } else if (lowerCommand.includes('compare')) {
      intent = 'compare_protocols';
    } else if (lowerCommand.includes('rate') || lowerCommand.includes('apy')) {
      intent = 'get_rates';
    } else if (lowerCommand.includes('explain')) {
      intent = 'explain_strategy';
    } else if (lowerCommand.includes('analysis') || lowerCommand.includes('market')) {
      intent = 'analyze_market';
    }
    
    // Detect strategy type
    if (lowerCommand.includes('looping') || lowerCommand.includes('leverage')) {
      strategyType = 'looping';
    } else if (lowerCommand.includes('stable') || lowerCommand.includes('stablecoin')) {
      strategyType = 'stables';
    } else if (lowerCommand.includes('yield') || lowerCommand.includes('farming')) {
      strategyType = 'yield_farming';
    } else if (lowerCommand.includes('airdrop')) {
      strategyType = 'airdrop';
    }
    
    // Detect token
    if (lowerCommand.includes('sol')) {
      token = 'SOL';
    } else if (lowerCommand.includes('usdc')) {
      token = 'USDC';
    } else if (lowerCommand.includes('usdt')) {
      token = 'USDT';
    }
    
    // Detect risk level
    if (lowerCommand.includes('low') || lowerCommand.includes('conservative')) {
      riskLevel = 'low';
    } else if (lowerCommand.includes('high') || lowerCommand.includes('aggressive')) {
      riskLevel = 'high';
    } else if (lowerCommand.includes('medium') || lowerCommand.includes('moderate')) {
      riskLevel = 'medium';
    }
    
    // Extract amount (basic regex)
    const amountMatch = command.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    
    return {
      intent: intent as any,
      strategyType,
      token,
      riskLevel: riskLevel as any,
      amount,
      action: command,
      context: `Basic parsing: ${intent}${strategyType ? ` (${strategyType})` : ''}${token ? ` for ${token}` : ''}`
    };
  }

  private async generateStrategyResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      // Generate the strategy using the strategy generator
      const result = await this.strategyGenerator.generateStrategy(
        command,
        this.mapRiskLevel(intent.riskLevel),
        intent.amount
      );

      // Generate a more conversational response
      let explanation = `Here's your ${result.strategy.strategyType} strategy: ${result.strategy.name}. `;
      explanation += `It's a ${result.strategy.riskLevel} risk strategy with ${result.strategy.expectedApy}% expected APY. `;
      explanation += `You'll be working with ${result.strategy.tokens.join(' and ')} tokens on ${result.strategy.protocols.join(' and ')} protocols. `;
      explanation += `Key steps: ${result.strategy.steps.join(' ')}. `;
      explanation += `Watch out for: ${result.strategy.risks.join(', ')}.`;

      if (this.aiProvider) {
        try {
          const { text: aiExplanation } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi expert explaining investment strategies. Make it conversational and actionable.`,
            prompt: `Explain this strategy in a friendly, actionable way:
            
            Strategy: ${result.strategy.name}
            Type: ${result.strategy.strategyType}
            Risk: ${result.strategy.riskLevel}
            Expected APY: ${result.strategy.expectedApy}%
            Tokens: ${result.strategy.tokens.join(', ')}
            Protocols: ${result.strategy.protocols.join(', ')}
            
            Make it sound like you're giving advice to a friend. Include the key steps and what to watch out for.`
          });
          explanation = aiExplanation;
        } catch (error) {
          console.warn('AI explanation failed, using basic explanation:', error);
        }
      }

      return {
        type: 'strategy',
        title: result.strategy.name,
        summary: explanation,
        strategies: [result.strategy],
        data: result.data,
        nextSteps: result.strategy.steps,
        warnings: result.strategy.risks,
        confidence: 85
      };
    } catch (error) {
      console.error('Error generating strategy:', error);
      return {
        type: 'explanation',
        title: 'Strategy Generation Failed',
        summary: 'I had trouble generating a strategy for your request. Please try being more specific about what you want to achieve.',
        confidence: 0,
        warnings: ['Strategy generation failed']
      };
    }
  }

  private async findOpportunitiesResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      // Query the database for relevant opportunities
      let sqlQuery = '';
      
      if (intent.strategyType === 'looping') {
        sqlQuery = `
          SELECT 
            kv."marketName",
            kv."maxLeverage",
            kv."netApy",
            ct.symbol as collateral_token,
            dt.symbol as debt_token,
            kv.tvl,
            'Kamino Vault' as protocol
          FROM "kamino_vaults" kv
          JOIN tokens ct ON kv."collateralTokenId" = ct.id
          JOIN tokens dt ON kv."debtTokenId" = dt.id
          WHERE kv."maxLeverage" > 3
          ORDER BY kv."maxLeverage" DESC
          LIMIT 10
        `;
      } else if (intent.strategyType === 'stables') {
        sqlQuery = `
          SELECT 
            jlm.name,
            jlm."supplyRate",
            t.symbol,
            t.price,
            jlm."totalAssets",
            'Jupiter Lend' as protocol
          FROM "jupiter_lend_markets" jlm
          JOIN tokens t ON jlm."assetId" = t.id
          WHERE jlm."supplyRate" > '100'
          ORDER BY CAST(jlm."supplyRate" AS DECIMAL) DESC
          LIMIT 10
        `;
      } else {
        // General opportunities query
        sqlQuery = `
          SELECT 
            'Jupiter Lend' as protocol,
            jlm.name as opportunity,
            jlm."supplyRate" as apy,
            t.symbol as token
          FROM "jupiter_lend_markets" jlm
          JOIN tokens t ON jlm."assetId" = t.id
          WHERE jlm."supplyRate" > '100'
          UNION ALL
          SELECT 
            'Kamino Vault' as protocol,
            kv."marketName" as opportunity,
            kv."netApy" as apy,
            CONCAT(ct.symbol, '/', dt.symbol) as token
          FROM "kamino_vaults" kv
          JOIN tokens ct ON kv."collateralTokenId" = ct.id
          JOIN tokens dt ON kv."debtTokenId" = dt.id
          WHERE kv."maxLeverage" > 3
          ORDER BY apy DESC
          LIMIT 15
        `;
      }

      const opportunities = await this.prisma.$queryRawUnsafe(sqlQuery);

      let summary = `Found ${(opportunities as any[]).length} ${intent.strategyType || 'DeFi'} opportunities. `;
      summary += `Here are the top options: ${(opportunities as any[]).slice(0, 3).map((opp, i) => `${i + 1}. ${opp.opportunity || opp.name} (${opp.protocol})`).join(', ')}. `;
      summary += `These opportunities offer good potential returns with varying risk levels.`;

      if (this.aiProvider) {
        try {
          const { text: aiSummary } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi expert summarizing opportunities. Be encouraging and highlight the best options.`,
            prompt: `Summarize these DeFi opportunities for the user:
            
            Command: "${command}"
            Strategy Type: ${intent.strategyType || 'general'}
            Token: ${intent.token || 'any'}
            
            Opportunities found: ${JSON.stringify(opportunities, null, 2)}
            
            Highlight the top 3-5 opportunities and explain why they're good.`
          });
          summary = aiSummary;
        } catch (error) {
          console.warn('AI summary failed, using basic summary:', error);
        }
      }

      return {
        type: 'opportunities',
        title: `${intent.strategyType || 'DeFi'} Opportunities Found`,
        summary: summary,
        opportunities: opportunities as any[],
        nextSteps: [
          'Review the opportunities above',
          'Check current market conditions',
          'Consider your risk tolerance',
          'Start with smaller amounts to test'
        ],
        confidence: 90
      };
    } catch (error) {
      console.error('Error finding opportunities:', error);
      return {
        type: 'explanation',
        title: 'Opportunities Search Failed',
        summary: 'I had trouble finding opportunities for your request. Please try being more specific.',
        confidence: 0,
        warnings: ['Opportunities search failed']
      };
    }
  }

  private async analyzeMarketResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      const marketData = await this.strategyGenerator['analyzeMarketData']();
      
      let analysis = `Current DeFi market analysis shows ${Object.keys(marketData).length} data points. `;
      analysis += `Key insights: Market conditions are active with various opportunities across protocols. `;
      analysis += `Consider current APY rates and risk factors before investing.`;

      if (this.aiProvider) {
        try {
          const { text: aiAnalysis } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi market analyst. Provide clear, actionable market insights.`,
            prompt: `Analyze this DeFi market data and provide insights:
            
            Command: "${command}"
            Market Data: ${JSON.stringify(marketData, null, 2)}
            
            Focus on what the user should know about current market conditions and opportunities.`
          });
          analysis = aiAnalysis;
        } catch (error) {
          console.warn('AI analysis failed, using basic analysis:', error);
        }
      }

      return {
        type: 'analysis',
        title: 'DeFi Market Analysis',
        summary: analysis,
        data: marketData,
        confidence: 85
      };
    } catch (error) {
      console.error('Error analyzing market:', error);
      return {
        type: 'explanation',
        title: 'Market Analysis Failed',
        summary: 'I had trouble analyzing the market. Please try again.',
        confidence: 0,
        warnings: ['Market analysis failed']
      };
    }
  }

  private async compareProtocolsResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      const comparison = await this.prisma.$queryRaw`
        SELECT 
          'Jupiter' as protocol,
          COUNT(*) as markets,
          AVG(CAST("supplyRate" AS DECIMAL)) as avg_rate,
          'Lending' as type
        FROM "jupiter_lend_markets"
        UNION ALL
        SELECT 
          'Kamino' as protocol,
          COUNT(*) as markets,
          AVG("netApy") as avg_rate,
          'Vaults' as type
        FROM "kamino_vaults"
        UNION ALL
        SELECT 
          'Drift' as protocol,
          COUNT(*) as markets,
          AVG("depositInterestRate") as avg_rate,
          'Markets' as type
        FROM "drift_markets"
      `;

      let summary = `Protocol comparison shows ${(comparison as any[]).length} protocols. `;
      summary += `Each protocol has different strengths: `;
      (comparison as any[]).forEach((comp, i) => {
        summary += `${comp.protocol} (${comp.type}): ${comp.markets} markets, avg rate ${comp.avg_rate?.toFixed(2)}%. `;
      });

      if (this.aiProvider) {
        try {
          const { text: aiSummary } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi expert comparing protocols. Be objective and helpful.`,
            prompt: `Compare these DeFi protocols based on the data:
            
            Command: "${command}"
            Protocol Data: ${JSON.stringify(comparison, null, 2)}
            
            Provide a clear comparison highlighting strengths and use cases for each protocol.`
          });
          summary = aiSummary;
        } catch (error) {
          console.warn('AI comparison failed, using basic comparison:', error);
        }
      }

      return {
        type: 'analysis',
        title: 'Protocol Comparison',
        summary: summary,
        data: comparison,
        confidence: 80
      };
    } catch (error) {
      console.error('Error comparing protocols:', error);
      return {
        type: 'explanation',
        title: 'Protocol Comparison Failed',
        summary: 'I had trouble comparing protocols. Please try again.',
        confidence: 0,
        warnings: ['Protocol comparison failed']
      };
    }
  }

  private async getRatesResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      const rates = await this.prisma.$queryRaw`
        SELECT 
          'Jupiter Lend' as protocol,
          jlm.name,
          jlm."supplyRate" as rate,
          t.symbol,
          'Lending' as type
        FROM "jupiter_lend_markets" jlm
        JOIN tokens t ON jlm."assetId" = t.id
        WHERE jlm."supplyRate" > '50'
        UNION ALL
        SELECT 
          'Drift' as protocol,
          dm.symbol as name,
          dm."depositInterestRate" as rate,
          dm.symbol,
          'Deposit' as type
        FROM "drift_markets" dm
        WHERE dm."depositInterestRate" > 0.01
        ORDER BY rate DESC
        LIMIT 20
      `;

      let summary = `Current DeFi rates show ${(rates as any[]).length} opportunities. `;
      summary += `Top rates: ${(rates as any[]).slice(0, 3).map((rate, i) => `${rate.name} (${rate.protocol}): ${rate.rate}%`).join(', ')}. `;
      summary += `These rates represent current lending and deposit opportunities across protocols.`;

      if (this.aiProvider) {
        try {
          const { text: aiSummary } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi expert explaining rates. Highlight the best opportunities.`,
            prompt: `Explain these DeFi rates to the user:
            
            Command: "${command}"
            Rates: ${JSON.stringify(rates, null, 2)}
            
            Highlight the top rates and explain what they mean.`
          });
          summary = aiSummary;
        } catch (error) {
          console.warn('AI rates explanation failed, using basic explanation:', error);
        }
      }

      return {
        type: 'data',
        title: 'Current DeFi Rates',
        summary: summary,
        data: rates,
        confidence: 90
      };
    } catch (error) {
      console.error('Error getting rates:', error);
      return {
        type: 'explanation',
        title: 'Rates Query Failed',
        summary: 'I had trouble getting current rates. Please try again.',
        confidence: 0,
        warnings: ['Rates query failed']
      };
    }
  }

  private async findSimilarResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      const similarStrategies = await this.strategyGenerator.findSimilarStrategies(command, 5);
      
      let summary = `Found ${similarStrategies.length} similar strategies. `;
      summary += `These strategies are related to your request: `;
      similarStrategies.slice(0, 3).forEach((strategy, i) => {
        summary += `${i + 1}. ${strategy.name} (${strategy.strategyType}): ${strategy.description}. `;
      });

      if (this.aiProvider) {
        try {
          const { text: aiSummary } = await generateText({
            model: this.aiProvider.model,
            system: `You are a DeFi expert explaining similar strategies.`,
            prompt: `Explain these similar strategies to the user:
            
            Command: "${command}"
            Similar Strategies: ${JSON.stringify(similarStrategies, null, 2)}
            
            Explain how these strategies relate to what they're looking for.`
          });
          summary = aiSummary;
        } catch (error) {
          console.warn('AI similar strategies explanation failed, using basic explanation:', error);
        }
      }

      return {
        type: 'strategy',
        title: 'Similar Strategies Found',
        summary: summary,
        strategies: similarStrategies,
        confidence: 75
      };
    } catch (error) {
      console.error('Error finding similar strategies:', error);
      return {
        type: 'explanation',
        title: 'Similar Strategies Search Failed',
        summary: 'I had trouble finding similar strategies. Please try again.',
        confidence: 0,
        warnings: ['Similar strategies search failed']
      };
    }
  }

  private async explainStrategyResponse(command: string, intent: CommandIntent): Promise<CommandResponse> {
    try {
      const { text: explanation } = await generateText({
        model: this.aiProvider.model,
        system: `You are a DeFi expert explaining strategies. Be clear and educational.`,
        prompt: `Explain this DeFi strategy request: "${command}"
        
        Provide a clear explanation of what this strategy involves, how it works, and what to consider.`
      });

      return {
        type: 'explanation',
        title: 'Strategy Explanation',
        summary: explanation,
        confidence: 80
      };
    } catch (error) {
      console.error('Error explaining strategy:', error);
      return {
        type: 'explanation',
        title: 'Explanation Failed',
        summary: 'I had trouble explaining this strategy. Please try rephrasing.',
        confidence: 0,
        warnings: ['Strategy explanation failed']
      };
    }
  }

  private mapRiskLevel(riskLevel?: string): 'conservative' | 'moderate' | 'aggressive' {
    switch (riskLevel) {
      case 'low': return 'conservative';
      case 'medium': return 'moderate';
      case 'high':
      case 'very_high': return 'aggressive';
      default: return 'moderate';
    }
  }
}
