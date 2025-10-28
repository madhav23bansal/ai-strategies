import { DeFiStrategyFlow } from './ai/strategy-flow';
import { PrismaClient } from '@prisma/client';

async function testSimpleFix() {
  const prisma = new PrismaClient();
  const strategyFlow = new DeFiStrategyFlow(prisma);
  
  try {
    console.log('🧪 Testing Simple Fix...');
    
    const result = await strategyFlow.generateStrategy(
      'I have $10,000 in USDC and want a safe strategy with steady returns.',
      'conservative',
      10000
    );
    
    console.log('✅ Test successful!');
    console.log('Strategy Name:', result.strategy.name);
    console.log('Expected APY:', result.strategy.expectedApy + '%');
    console.log('Strategy Type:', result.strategy.strategyType);
    console.log('Steps:', result.strategy.steps.length);
    
  } catch (error) {
    console.log('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.log('Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleFix();
