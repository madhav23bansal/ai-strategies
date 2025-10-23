import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface HistoricalApy {
  data: Array<{
    date: string; // ISO date string
    stakingApy: number; // percentage
    debtApy: number; // percentage
  }>;
  timeRange: string; // e.g., '24H' | '7D' | '1M' | '3M' | '1Y'
}

interface BaseGetHistoricalApyParams {
  timeRange?: '24H' | '7D' | '1M' | '3M' | '1Y';
}

interface CollateralApyData {
  createdOn: string;
  stakingApy: string;
  borrowInterestApy: string;
}

interface DebtApyData {
  history: Array<{
    timestamp: string;
    metrics: {
      borrowInterestAPY: number;
    };
  }>;
}

interface PairData {
  depositReserveAddress: string;
  borrowReserveAddress: string;
  collTokenMint: string;
  debtTokenMint: string;
  collTokenSymbol: string;
  debtTokenSymbol: string;
  pairType: string;
  filterTypes: string[];
  strategyType: string;
  supplyApyType: string;
  supplyApyAddress: string;
  collTokenDetails?: any;
  debtTokenDetails?: any;
  debitTokenDetails?: any;
}

interface MarketData {
  lendingMarket: string;
  isPrimary: boolean;
  name: string;
  description: string;
  lookupTable: string;
  isCurated: boolean;
  configKey: string;
  pairs: PairData[];
}

interface ComprehensiveData {
  metadata: any;
  data: Record<string, MarketData>;
}

function getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case '24H':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7D':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '1M':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '1Y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month
  }

  return { startDate, endDate };
}

async function fetchHistoricalApyData(
  marketAddress: string,
  collateralReserveAddress: string,
  debtReserveAddress: string,
  startDate: Date,
  endDate: Date,
  isHistoryAvailable = true,
): Promise<{ collateralData: CollateralApyData[]; debtData: DebtApyData }> {
  // biome-ignore lint/style/noNonNullAssertion: ISO date string always has T separator
  const formatDate = (date: Date): string => date.toISOString().split('T')[0]!;

  // Collateral: choose endpoint based on history availability
  const collateralEndpoint = isHistoryAvailable
    ? `/kamino-market/${marketAddress}/reserves/${collateralReserveAddress}/borrow-and-staking-apys/history/median?env=mainnet-beta&start=${formatDate(startDate)}&end=${formatDate(endDate)}`
    : `/yields/${collateralReserveAddress}/history?env=mainnet-beta&start=${formatDate(startDate)}&end=${formatDate(endDate)}`;

  const debtEndpoint = `/kamino-market/${marketAddress}/reserves/${debtReserveAddress}/metrics/history?env=mainnet-beta&start=${formatDate(startDate)}&end=${formatDate(endDate)}&frequency=hour`;

  const collateralUrl = `https://api.kamino.finance${collateralEndpoint}`;
  const debtUrl = `https://api.kamino.finance${debtEndpoint}`;

  console.log({collateralUrl, debtUrl})

  try {
    // Fetch in parallel
    const [collateralResponse, debtResponse] = await Promise.all([
      axios.get(collateralUrl, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }),
      axios.get(debtUrl, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }),
    ]);

    let collateralData: CollateralApyData[] = [];
    if (isHistoryAvailable) {
      collateralData = collateralResponse.data || [];
    } else {
      const raw = collateralResponse.data || [];
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      collateralData = raw
        .filter((point: any) => point.createdOn >= startIso && point.createdOn <= endIso)
        .map((point: any) => ({
          createdOn: point.createdOn,
          stakingApy: point.apy,
          borrowInterestApy: '0',
        }));
    }

    return {
      collateralData,
      debtData: debtResponse.data || { history: [] },
    };
  } catch (error) {
    console.error(`Error fetching APY data for market ${marketAddress}:`, error);
    return {
      collateralData: [],
      debtData: { history: [] },
    };
  }
}

async function getHistoricalApyOnChain(params: {
  marketAddress: string;
  collateralMint: string;
  debtMint: string;
  timeRange: string;
  depositReserveAddress: string;
  borrowReserveAddress: string;
  isHistoryAvailable?: boolean;
}): Promise<HistoricalApy> {
  console.log(`Fetching historical APY for market ${params.marketAddress}, collateral ${params.collateralMint}, debt ${params.debtMint}, timeRange ${params.timeRange}`);
  
  const { startDate, endDate } = getDateRange(params.timeRange.toUpperCase());

  let { collateralData, debtData } = await fetchHistoricalApyData(
    params.marketAddress,
    params.depositReserveAddress,
    params.borrowReserveAddress,
    startDate,
    endDate,
    params.isHistoryAvailable, 
  );

  if (!collateralData?.length || !debtData?.history?.length) {
    console.log(`No data available for pair ${params.collateralMint}/${params.debtMint}`);
    return {
      data: [],
      timeRange: params.timeRange,
    };
  }

  const formatted: {
    date: string;
    collateralApy: number;
    debtApy: number;
  }[] = [];
  const debtMap = new Map<string, number>();
  
  for (const d of debtData.history) {
    if (d.timestamp?.endsWith('T00:00:00.000Z')) {
      debtMap.set(d.timestamp, d.metrics.borrowInterestAPY);
    }
  }
  
  for (const c of collateralData) {
    if (c.createdOn?.endsWith('T00:00:00.000Z')) {
      const debtApy = debtMap.get(c.createdOn);
      if (debtApy !== undefined) {
        const collApy = Number.parseFloat(c.stakingApy);
        if (!Number.isNaN(collApy) && !Number.isNaN(debtApy)) {
          formatted.push({
            date: c.createdOn,
            collateralApy: collApy * 100,
            debtApy: debtApy * 100,
          });
        }
      }
    }
  }

  const resp: HistoricalApy = {
    data: formatted.map((item) => ({
      date: item.date,
      stakingApy: item.collateralApy,
      debtApy: item.debtApy,
    })),
    timeRange: params.timeRange,
  };
  
  return resp;
}

async function fetchHistoricalApyForAllPairs(): Promise<void> {
  try {
    console.log('🚀 Starting historical APY fetch process...');
    
    // Load the comprehensive data
    const fetchedDir = path.join(process.cwd(), 'fetched');
    const dataPath = path.join(fetchedDir, 'kamino-comprehensive-data.json');
    
    if (!fs.existsSync(dataPath)) {
      throw new Error('Comprehensive data file not found. Please run the main data fetch script first.');
    }
    
    const comprehensiveData: ComprehensiveData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Loaded data for ${Object.keys(comprehensiveData.data).length} markets`);
    
    // Process each market and its pairs
    let totalPairs = 0;
    let processedPairs = 0;
    
    for (const [marketAddress, marketData] of Object.entries(comprehensiveData.data)) {
      console.log(`\n📊 Processing market: ${marketData.name} (${marketAddress})`);
      
      for (const pair of marketData.pairs) {
        totalPairs++;
        console.log(`  🔄 Processing pair: ${pair.collTokenSymbol}/${pair.debtTokenSymbol}`);
        
        try {
          // Fetch historical APY for different time ranges
          const timeRanges: Array<'24H' | '7D' | '1M' | '3M' | '1Y'> = ['7D', '1M', '3M'];
          const historicalApyData: Record<string, HistoricalApy> = {};

          let finalCollateralReserveAddress =  pair.depositReserveAddress;
          let isHistoryAvailable = true;
          
          if(pair.supplyApyAddress){
            finalCollateralReserveAddress = pair.supplyApyAddress;
            isHistoryAvailable = false;
          }
        
          
          for (const timeRange of timeRanges) {
            const apyData = await getHistoricalApyOnChain({
              marketAddress: marketAddress,
              collateralMint: pair.collTokenMint,
              debtMint: pair.debtTokenMint,
              timeRange: timeRange,
              depositReserveAddress: finalCollateralReserveAddress,
              borrowReserveAddress: pair.borrowReserveAddress,
              isHistoryAvailable: isHistoryAvailable
            });
            
            historicalApyData[timeRange] = apyData;
          }
          
          // Add historical APY data to the pair
          (pair as any).historicalApy = historicalApyData;
          processedPairs++;
          
          console.log(`    ✅ Added historical APY data for ${Object.keys(historicalApyData).length} time ranges`);
          
        } catch (error) {
          console.error(`    ❌ Error fetching APY for pair ${pair.collTokenSymbol}/${pair.debtTokenSymbol}:`, error);
          // Add empty historical APY data on error
          (pair as any).historicalApy = {
            '7D': { data: [], timeRange: '7D' },
            '1M': { data: [], timeRange: '1M' },
            '3M': { data: [], timeRange: '3M' }
          };
        }
      }
    }
    
    // Update metadata
    comprehensiveData.metadata.historicalApyFetchedAt = new Date().toISOString();
    comprehensiveData.metadata.totalPairsProcessed = processedPairs;
    comprehensiveData.metadata.totalPairs = totalPairs;
    
    // Save updated data
    const updatedDataPath = path.join(fetchedDir, 'kamino-comprehensive-data-with-apy.json');
    fs.writeFileSync(updatedDataPath, JSON.stringify(comprehensiveData, null, 2), 'utf8');
    
    console.log(`\n🎉 Historical APY fetch completed successfully!`);
    console.log(`📊 Processed ${processedPairs}/${totalPairs} pairs`);
    console.log(`📁 Updated data saved to: ${updatedDataPath}`);
    
    // Replace the original file
    fs.copyFileSync(updatedDataPath, dataPath);
    console.log(`📁 Original file updated: ${dataPath}`);
    
  } catch (error) {
    console.error('❌ Error in fetchHistoricalApyForAllPairs:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fetchHistoricalApyForAllPairs()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { fetchHistoricalApyForAllPairs, getHistoricalApyOnChain };
