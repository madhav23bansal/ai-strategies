import { DeFiStrategyFlow } from './ai/strategy-flow';
import { PrismaClient } from '@prisma/client';

async function debugSingleTest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Starting Single Test Debug Session');
    console.log('=====================================');
    
    // Test 1: Check database connection
    console.log('\n📊 Step 1: Testing Database Connection');
    const tokenCount = await prisma.token.count();
    console.log(`✅ Database connected. Found ${tokenCount} tokens.`);
    
    // Test 2: Check if we have SOL data
    console.log('\n🔍 Step 2: Checking for SOL token data');
    const solTokens = await prisma.token.findMany({
      where: { symbol: 'SOL' },
      take: 3
    });
    console.log(`✅ Found ${solTokens.length} SOL tokens:`, solTokens.map((t: any) => ({ id: t.id, symbol: t.symbol, name: t.name })));
    
    // Test 3: Check Kamino reserves structure
    console.log('\n🔍 Step 3: Checking Kamino reserves table structure');
    try {
      const kaminoReserves = await prisma.kaminoReserve.findMany({ take: 1 });
      console.log(`✅ Kamino reserves table accessible. Sample record:`, kaminoReserves[0]);
    } catch (error) {
      console.log(`❌ Kamino reserves error:`, error);
    }
    
    // Test 4: Check Jupiter borrow markets structure
    console.log('\n🔍 Step 4: Checking Jupiter borrow markets table structure');
    try {
      const jupiterBorrow = await prisma.jupiterBorrowMarket.findMany({ take: 1 });
      console.log(`✅ Jupiter borrow markets table accessible. Sample record:`, jupiterBorrow[0]);
    } catch (error) {
      console.log(`❌ Jupiter borrow markets error:`, error);
    }
    
    // Test 5: Simple SQL query to test column names
    console.log('\n🔍 Step 5: Testing simple SQL query with correct column names');
    try {
      const simpleQuery = `
        SELECT 
          kr.id,
          kr."tokenId",
          t.symbol,
          kr."supplyRate",
          kr."borrowRate"
        FROM kamino_reserves kr
        JOIN tokens t ON kr."tokenId" = t.id
        WHERE t.symbol = 'SOL'
        LIMIT 3
      `;
      
      const result = await prisma.$queryRawUnsafe(simpleQuery);
      console.log(`✅ Simple query successful. Results:`, result);
    } catch (error) {
      console.log(`❌ Simple query failed:`, error);
    }
    
    // Test 6: Now try the strategy flow with detailed logging
    console.log('\n🎯 Step 6: Testing Strategy Flow with Detailed Logging');
    const strategyFlow = new DeFiStrategyFlow(prisma);
    
    const userPrompt = "Give me SOL looping strategy to earn more";
    console.log(`📝 User prompt: "${userPrompt}"`);
    
    try {
      const result = await strategyFlow.generateStrategy(userPrompt, 'moderate', 5000);
      console.log('🎉 Strategy generation successful!');
      console.log('Strategy:', JSON.stringify(result.strategy, null, 2));
    } catch (error) {
      console.log('❌ Strategy generation failed:', error);
      console.log('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
  } catch (error) {
    console.error('💥 Debug session failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug session
debugSingleTest().catch(console.error);
