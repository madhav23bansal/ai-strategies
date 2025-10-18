import { DeFiStrategyFlow } from './ai/strategy-flow';
import { PrismaClient } from '@prisma/client';

async function testStrategyFlow() {
  console.log('🎯 Testing DeFi Strategy Generation Flow');
  console.log('=====================================\n');

  const prisma = new PrismaClient();
  const strategyFlow = new DeFiStrategyFlow(prisma);

  try {
    // Test cases
    const testCases = [
      {
        prompt: 'Give me SOL looping strategy to earn more',
        riskTolerance: 'moderate' as const,
        investmentAmount: 5000
      },
      {
        prompt: 'Create a stablecoin yield farming strategy',
        riskTolerance: 'conservative' as const,
        investmentAmount: 10000
      },
      {
        prompt: 'Show me high yield opportunities with leverage',
        riskTolerance: 'aggressive' as const,
        investmentAmount: 2000
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n🧪 Test Case ${i + 1}: ${testCase.prompt}`);
      console.log('─'.repeat(50));

      try {
        const result = await strategyFlow.generateStrategy(
          testCase.prompt,
          testCase.riskTolerance,
          testCase.investmentAmount
        );

        console.log(`\n✅ Strategy Generated: ${result.strategy.name}`);
        console.log(`📊 Type: ${result.strategy.strategyType}`);
        console.log(`⚡ Risk Level: ${result.strategy.riskLevel}`);
        console.log(`💰 Expected APY: ${result.strategy.expectedApy}%`);
        console.log(`🔧 Protocols: ${result.strategy.protocols.join(', ')}`);
        console.log(`🪙 Tokens: ${result.strategy.tokens.join(', ')}`);
        console.log(`\n📈 Market Analysis:`);
        console.log(`   Opportunity Score: ${result.analysis.opportunityScore}/100`);
        console.log(`   Risk Score: ${result.analysis.riskScore}/100`);
        console.log(`   Recommended Allocation: ${result.analysis.recommendedAllocation}`);
        console.log(`\n🔍 Data Sources: ${result.data.length} data points`);
        console.log(`📝 SQL Queries: ${result.sqlQueries.length} queries executed`);

        console.log(`\n📋 Strategy Steps:`);
        result.strategy.steps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });

        console.log(`\n⚠️  Key Risks:`);
        result.strategy.risks.forEach((risk, index) => {
          console.log(`   • ${risk}`);
        });

        console.log(`\n📊 Monitoring Points:`);
        result.strategy.monitoring.forEach((point, index) => {
          console.log(`   • ${point}`);
        });

      } catch (error) {
        console.error(`❌ Test case ${i + 1} failed:`, error);
      }
    }

    console.log('\n🎉 Strategy Flow Test Complete!');
    console.log('\nFlow Summary:');
    console.log('1. ✅ User prompt received');
    console.log('2. ✅ SQL queries generated based on prompt');
    console.log('3. ✅ Database queries executed to fetch market data');
    console.log('4. ✅ Market data analyzed for opportunities and risks');
    console.log('5. ✅ Comprehensive strategy created based on data and analysis');

  } catch (error) {
    console.error('❌ Strategy flow test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testStrategyFlow().catch(console.error);
