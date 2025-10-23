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
    
    // Test 3: Check Kamino lending markets structure
    console.log('\n🔍 Step 3: Checking Kamino lending markets');
    try {
      const lendingMarkets = await prisma.kaminoLendingMarket.findMany({ 
        take: 3,
        include: { pairs: { take: 2 } }
      });
      console.log(`✅ Found ${lendingMarkets.length} lending markets. Sample:`, {
        name: lendingMarkets[0]?.name,
        pairs: lendingMarkets[0]?.pairs.length
      });
    } catch (error) {
      console.log(`❌ Kamino lending markets error:`, error);
    }
    
    // Test 4: Check Kamino pairs structure
    console.log('\n🔍 Step 4: Checking Kamino pairs with tokens');
    try {
      const pairs = await prisma.kaminoPair.findMany({ 
        take: 3,
        include: { 
          collateralToken: true,
          debtToken: true,
          lendingMarket: true,
          filterTypes: true
        }
      });
      console.log(`✅ Found ${pairs.length} pairs. Sample pair:`, {
        pair: `${pairs[0]?.collateralToken.symbol}/${pairs[0]?.debtToken.symbol}`,
        market: pairs[0]?.lendingMarket.name,
        strategy: pairs[0]?.strategyType,
        filters: pairs[0]?.filterTypes.map(ft => ft.filterType)
      });
    } catch (error) {
      console.log(`❌ Kamino pairs error:`, error);
    }
    
    // Test 5: Check historical APY data
    console.log('\n🔍 Step 5: Checking historical APY data');
    try {
      const apyData = await prisma.kaminoHistoricalApy.findMany({ 
        take: 5,
        include: { pair: { include: { collateralToken: true, debtToken: true } } },
        orderBy: { date: 'desc' }
      });
      console.log(`✅ Found ${apyData.length} APY records. Sample:`, {
        pair: `${apyData[0]?.pair.collateralToken.symbol}/${apyData[0]?.pair.debtToken.symbol}`,
        date: apyData[0]?.date,
        stakingApy: apyData[0]?.stakingApy,
        debtApy: apyData[0]?.debtApy,
        timeRange: apyData[0]?.timeRange
      });
    } catch (error) {
      console.log(`❌ Historical APY error:`, error);
    }
    
    // Test 6: Query SOL-related pairs
    console.log('\n🔍 Step 6: Finding SOL-related trading pairs');
    try {
      const solPairs = await prisma.kaminoPair.findMany({
        where: {
          OR: [
            { collateralToken: { symbol: 'SOL' } },
            { debtToken: { symbol: 'SOL' } }
          ]
        },
        include: {
          collateralToken: true,
          debtToken: true,
          lendingMarket: true,
          historicalApy: {
            where: { timeRange: '7D' },
            orderBy: { date: 'desc' },
            take: 1
          }
        },
        take: 5
      });
      
      console.log(`✅ Found ${solPairs.length} SOL-related pairs:`);
      solPairs.forEach((pair, index) => {
        const latestApy = pair.historicalApy[0];
        console.log(`  ${index + 1}. ${pair.collateralToken.symbol}/${pair.debtToken.symbol} (${pair.strategyType})`);
        console.log(`     Market: ${pair.lendingMarket.name}`);
        if (latestApy) {
          console.log(`     Latest APY: Staking ${latestApy.stakingApy}%, Debt ${latestApy.debtApy}%`);
        }
      });
    } catch (error) {
      console.log(`❌ SOL pairs query failed:`, error);
    }
    
    // Test 7: Now try the strategy flow with detailed logging
    console.log('\n🎯 Step 7: Testing Strategy Flow with Detailed Logging');
    const strategyFlow = new DeFiStrategyFlow(prisma);
    
    // Test 8: Show available data for strategy generation
    console.log('\n📊 Step 8: Analyzing Available Data for Strategy Generation');
    try {
      // Get high APY pairs for strategy suggestions
      const highApyPairs = await prisma.kaminoHistoricalApy.findMany({
        where: { 
          timeRange: '7D',
          stakingApy: { gt: 10 } // APY greater than 10%
        },
        include: { 
          pair: { 
            include: { 
              collateralToken: true, 
              debtToken: true,
              lendingMarket: true 
            } 
          } 
        },
        orderBy: { stakingApy: 'desc' },
        take: 5
      });
      
      console.log(`✅ Found ${highApyPairs.length} high APY pairs (>10%):`);
      highApyPairs.forEach((apy, index) => {
        console.log(`  ${index + 1}. ${apy.pair.collateralToken.symbol}/${apy.pair.debtToken.symbol}`);
        console.log(`     Market: ${apy.pair.lendingMarket.name}`);
        console.log(`     Strategy: ${apy.pair.strategyType}`);
        console.log(`     APY: ${apy.stakingApy}% (${apy.date.toISOString().split('T')[0]})`);
      });
      
      // Get available strategy types
      const strategyTypes = await prisma.kaminoPair.groupBy({
        by: ['strategyType'],
        _count: { strategyType: true }
      });
      
      console.log(`\n✅ Available strategy types:`);
      strategyTypes.forEach(st => {
        console.log(`  - ${st.strategyType}: ${st._count.strategyType} pairs`);
      });
      
    } catch (error) {
      console.log(`❌ Data analysis failed:`, error);
    }
    
    // Simple prompt to test brief responses
    const userPrompt = `Create a brief DeFi strategy combining Kamino yield farming with Drift perps trading for $10k investment.`;

    console.log(`\n📝 Enhanced User prompt: "${userPrompt}"`);
    
    try {
      const result = await strategyFlow.generateStrategy(userPrompt, 'moderate', 10000);
      console.log('🎉 Enhanced strategy generation successful!');
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
