import { DeFiStrategyFlow } from './ai/strategy-flow';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// 10 different user scenarios for testing
const userScenarios = [
  {
    id: 'conservative-stablecoin',
    name: 'Conservative Stablecoin Investor',
    prompt: 'I have $50,000 in USDC and want a safe, low-risk strategy with steady returns. I prefer stablecoin strategies and want to minimize volatility.',
    riskTolerance: 'conservative' as const,
    investmentAmount: 50000
  },
  {
    id: 'aggressive-sol-maximizer',
    name: 'Aggressive SOL Maximizer',
    prompt: 'I have 100 SOL tokens and want to maximize my returns using the highest APY strategies available. I\'m willing to take high risks for high rewards and want to leverage my SOL position.',
    riskTolerance: 'aggressive' as const,
    investmentAmount: 20000
  },
  {
    id: 'diversified-lst-farmer',
    name: 'Diversified LST Farmer',
    prompt: 'I have $25,000 in USDT and want to diversify across multiple Liquid Staking Tokens (LSTs) like mSOL, JitoSOL, and bbSOL. I want a balanced approach with moderate risk.',
    riskTolerance: 'moderate' as const,
    investmentAmount: 25000
  },
  {
    id: 'jlp-yield-hunter',
    name: 'JLP Yield Hunter',
    prompt: 'I see JLP has very high APY (49%+). I have $15,000 in USDC and want to capitalize on this high-yield opportunity. What\'s the best strategy to maximize JLP returns?',
    riskTolerance: 'aggressive' as const,
    investmentAmount: 15000
  },
  {
    id: 'bitcoin-holder-sol-explorer',
    name: 'Bitcoin Holder Exploring SOL',
    prompt: 'I have 2 cbBTC (Coinbase Wrapped BTC) and want to explore Solana DeFi opportunities. I\'m new to Solana but want to earn yield on my Bitcoin holdings.',
    riskTolerance: 'moderate' as const,
    investmentAmount: 80000
  },
  {
    id: 'small-budget-starter',
    name: 'Small Budget Starter',
    prompt: 'I only have $1,000 and want to start earning yield on Solana. I have SOL tokens and want to learn DeFi strategies without risking too much.',
    riskTolerance: 'conservative' as const,
    investmentAmount: 1000
  },
  {
    id: 'institutional-large-cap',
    name: 'Institutional Large Cap',
    prompt: 'I represent an institution with $500,000 to deploy. We want a sophisticated, diversified strategy across multiple Kamino markets with professional risk management and monitoring.',
    riskTolerance: 'moderate' as const,
    investmentAmount: 500000
  },
  {
    id: 'defi-veteran-optimizer',
    name: 'DeFi Veteran Optimizer',
    prompt: 'I\'m experienced in DeFi and want to optimize my existing portfolio. I have a mix of SOL, USDC, and various LSTs. I want advanced strategies like looping, leverage farming, and cross-margin strategies.',
    riskTolerance: 'aggressive' as const,
    investmentAmount: 75000
  },
  {
    id: 'retirement-income-seeker',
    name: 'Retirement Income Seeker',
    prompt: 'I\'m looking for steady income from my crypto holdings. I have $100,000 in USDC and want reliable, monthly income with minimal risk. I prefer stablecoin strategies and want to avoid high volatility.',
    riskTolerance: 'conservative' as const,
    investmentAmount: 100000
  },
  {
    id: 'yield-farmer-experimenter',
    name: 'Yield Farmer Experimenter',
    prompt: 'I want to experiment with different yield farming strategies on Kamino. I have $5,000 in various tokens (SOL, USDC, USDT, mSOL) and want to try different approaches to see what works best.',
    riskTolerance: 'moderate' as const,
    investmentAmount: 5000
  }
];

async function generateStrategies() {
  const prisma = new PrismaClient();
  const strategyFlow = new DeFiStrategyFlow(prisma);
  
  // Create strategies folder
  const strategiesDir = path.join(process.cwd(), 'strategies');
  if (!fs.existsSync(strategiesDir)) {
    fs.mkdirSync(strategiesDir, { recursive: true });
  }
  
  console.log('🚀 Starting Multi-Strategy Generation Test');
  console.log('==========================================');
  console.log(`📊 Testing ${userScenarios.length} different user scenarios\n`);
  
  const results = [];
  
  for (let i = 0; i < userScenarios.length; i++) {
    const scenario = userScenarios[i];
    console.log(`\n🎯 Scenario ${i + 1}/${userScenarios.length}: ${scenario.name}`);
    console.log(`💰 Investment: $${scenario.investmentAmount.toLocaleString()}`);
    console.log(`⚖️  Risk: ${scenario.riskTolerance}`);
    console.log(`📝 Prompt: "${scenario.prompt}"`);
    console.log('─'.repeat(80));
    
    try {
      const startTime = Date.now();
      const result = await strategyFlow.generateStrategy(
        scenario.prompt,
        scenario.riskTolerance,
        scenario.investmentAmount
      );
      const endTime = Date.now();
      
      console.log(`✅ Strategy Generated: "${result.strategy.name}"`);
      console.log(`⏱️  Generation Time: ${endTime - startTime}ms`);
      console.log(`📈 Expected APY: ${result.strategy.expectedApy}%`);
      console.log(`🎯 Strategy Type: ${result.strategy.strategyType}`);
      console.log(`⚡ Capital Efficiency: ${result.strategy.capitalEfficiency}%`);
      
      // Save strategy to file
      const filename = `${scenario.id}-${result.strategy.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.txt`;
      const filepath = path.join(strategiesDir, filename);
      
      const strategyContent = `# ${scenario.name}
## Strategy: ${result.strategy.name}

**Investment Amount:** $${scenario.investmentAmount.toLocaleString()}
**Risk Tolerance:** ${scenario.riskTolerance}
**Expected APY:** ${result.strategy.expectedApy}%
**Strategy Type:** ${result.strategy.strategyType}
**Capital Efficiency:** ${result.strategy.capitalEfficiency}%

## Description
${result.strategy.description}

## Protocols Used
${result.strategy.protocols.join(', ')}

## Tokens Involved
${result.strategy.tokens.join(', ')}

## Execution Steps
${result.strategy.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Risk Factors
${result.strategy.risks.map((risk, index) => `${index + 1}. ${risk}`).join('\n')}

## Monitoring Requirements
${result.strategy.monitoring.map((monitor, index) => `${index + 1}. ${monitor}`).join('\n')}

## Exit Strategy
${result.strategy.exitStrategy}

## Additional Details
- **Complexity Level:** ${result.strategy.complexity}/10
- **Time Horizon:** ${result.strategy.timeHorizon}
- **Gas Costs:** ${result.strategy.gasCosts}
- **Liquidity Requirements:** ${result.strategy.liquidity}

## Market Analysis
**Market Conditions:** ${result.analysis.marketConditions}
**Opportunity Score:** ${result.analysis.opportunityScore}/100
**Risk Score:** ${result.analysis.riskScore}/100
**Recommended Allocation:** ${result.analysis.recommendedAllocation}

**Alternatives:**
${result.analysis.alternatives.map((alt, index) => `${index + 1}. ${alt}`).join('\n')}

**Market Trends:**
${result.analysis.marketTrends.map((trend, index) => `${index + 1}. ${trend}`).join('\n')}

**Warnings:**
${result.analysis.warnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n')}

---
*Generated on: ${new Date().toISOString()}*
*Generation Time: ${endTime - startTime}ms*
`;

      fs.writeFileSync(filepath, strategyContent);
      console.log(`💾 Strategy saved to: ${filename}`);
      
      results.push({
        scenario: scenario.name,
        strategy: result.strategy.name,
        success: true,
        generationTime: endTime - startTime,
        filename: filename,
        apy: result.strategy.expectedApy,
        riskLevel: result.strategy.riskLevel
      });
      
    } catch (error) {
      console.log(`❌ Strategy generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      results.push({
        scenario: scenario.name,
        strategy: 'Failed',
        success: false,
        generationTime: 0,
        filename: null,
        apy: 0,
        riskLevel: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Add delay between requests to avoid rate limiting
    if (i < userScenarios.length - 1) {
      console.log('⏳ Waiting 2 seconds before next strategy...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate summary report
  console.log('\n📊 GENERATION SUMMARY');
  console.log('====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`⏱️  Average Generation Time: ${successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + r.generationTime, 0) / successful.length) : 0}ms`);
  
  if (successful.length > 0) {
    console.log(`📈 Average Expected APY: ${(successful.reduce((sum, r) => sum + r.apy, 0) / successful.length).toFixed(2)}%`);
    
    const riskLevels = successful.reduce((acc, r) => {
      acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🎯 Risk Level Distribution:');
    Object.entries(riskLevels).forEach(([level, count]) => {
      console.log(`  - ${level}: ${count} strategies`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Scenarios:');
    failed.forEach(f => {
      console.log(`  - ${f.scenario}: ${f.error}`);
    });
  }
  
  console.log(`\n📁 All strategies saved to: ${strategiesDir}`);
  console.log('\n🎉 Multi-Strategy Generation Complete!');
  
  await prisma.$disconnect();
  return results;
}

// Run the test
generateStrategies().catch(console.error);
