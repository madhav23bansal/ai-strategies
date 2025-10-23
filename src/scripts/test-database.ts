import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testDataCounts() {
  try {
    console.log('Testing data counts...');
    
    const tokenCount = await prisma.token.count();
    const marketCount = await prisma.kaminoLendingMarket.count();
    const pairCount = await prisma.kaminoPair.count();
    const filterTypeCount = await prisma.kaminoFilterType.count();
    const historicalApyCount = await prisma.kaminoHistoricalApy.count();
    const importCount = await prisma.kaminoDataImport.count();

    console.log('📊 Data counts:');
    console.log(`  - Tokens: ${tokenCount}`);
    console.log(`  - Lending Markets: ${marketCount}`);
    console.log(`  - Pairs: ${pairCount}`);
    console.log(`  - Filter Types: ${filterTypeCount}`);
    console.log(`  - Historical APY Records: ${historicalApyCount}`);
    console.log(`  - Data Imports: ${importCount}`);

    return tokenCount > 0 && marketCount > 0 && pairCount > 0;
  } catch (error) {
    console.error('❌ Error checking data counts:', error);
    return false;
  }
}

async function testSampleData() {
  try {
    console.log('Testing sample data...');
    
    // Get a sample pair with its related data
    const samplePair = await prisma.kaminoPair.findFirst({
      include: {
        lendingMarket: true,
        collateralToken: true,
        debtToken: true,
        filterTypes: true,
        historicalApy: {
          take: 5,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (samplePair) {
      console.log('📈 Sample pair data:');
      console.log(`  - Market: ${samplePair.lendingMarket.name}`);
      console.log(`  - Pair: ${samplePair.collateralToken.symbol}/${samplePair.debtToken.symbol}`);
      console.log(`  - Strategy: ${samplePair.strategyType}`);
      console.log(`  - Filter Types: ${samplePair.filterTypes.map(ft => ft.filterType).join(', ')}`);
      console.log(`  - Historical APY Records: ${samplePair.historicalApy.length}`);
      
      if (samplePair.historicalApy.length > 0) {
        const latestApy = samplePair.historicalApy[0];
        console.log(`  - Latest APY: Staking ${latestApy.stakingApy}%, Debt ${latestApy.debtApy}%`);
      }
    } else {
      console.log('❌ No sample data found');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing sample data:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing database setup and data...\n');
  
  try {
    // Test 1: Database connection
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      throw new Error('Database connection failed');
    }
    console.log('');

    // Test 2: Data counts
    const dataOk = await testDataCounts();
    if (!dataOk) {
      throw new Error('No data found in database');
    }
    console.log('');

    // Test 3: Sample data
    const sampleOk = await testSampleData();
    if (!sampleOk) {
      throw new Error('Sample data test failed');
    }

    console.log('\n✅ All tests passed! Database is properly set up with Kamino data.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main as testDatabase };
