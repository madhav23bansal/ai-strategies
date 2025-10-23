import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface DriftMarket {
  marketType: {
    spot?: {};
    perp?: {};
  };
  marketIndex: number;
  symbol: string;
  baseVolume: number;
  quoteVolume: number;
  baseVolume30D: number;
  quoteVolume30D: number;
  price24hAgo: number;
  pricePercentChange: number;
  priceHigh: number;
  priceLow: number;
  avgFunding?: number;
  avgLongFunding?: number;
  avgShortFunding?: number;
  marketCap?: number;
  dailyVolumeIncreaseZScore: number | null;
}

interface DriftMarketsResponse {
  data: DriftMarket[];
}

interface VolumeData {
  symbol: string;
  quoteVolume: string;
  baseVolume: string;
  marketIndex: number;
  marketType: string;
}

interface VolumeResponse {
  success: boolean;
  total: string;
  markets: VolumeData[];
}

interface PricePointData {
  marketIndex: number;
  pricePoints: number[];
  marketType: {
    perp?: {};
    spot?: {};
  };
}

interface PricePointsResponse {
  success: boolean;
  data: PricePointData[];
}

interface MergedMarketData {
  // Market details from markets24h
  marketType: {
    spot?: {};
    perp?: {};
  };
  marketIndex: number;
  symbol: string;
  baseVolume: number;
  quoteVolume: number;
  baseVolume30D: number;
  quoteVolume30D: number;
  price24hAgo: number;
  pricePercentChange: number;
  priceHigh: number;
  priceLow: number;
  avgFunding?: number;
  avgLongFunding?: number;
  avgShortFunding?: number;
  marketCap?: number;
  dailyVolumeIncreaseZScore: number | null;
  
  // 24h volume data
  volume24h?: {
    quoteVolume: string;
    baseVolume: string;
  };
  
  // Price points data
  pricePoints?: number[];
}

async function fetchMarketsData(): Promise<DriftMarket[]> {
  console.log('Fetching Drift markets data...');
  const response = await axios.get<DriftMarketsResponse>('https://mainnet-beta.api.drift.trade/markets24h');
  console.log(`Fetched ${response.data.data.length} total markets`);
  
  // Filter for perpetual markets only
  const perpMarkets = response.data.data.filter(market => 
    market.marketType.perp !== undefined || market.symbol.includes('PERP')
  );
  
  console.log(`Found ${perpMarkets.length} perpetual markets`);
  return perpMarkets;
}

async function fetchVolumeData(): Promise<VolumeData[]> {
  console.log('Fetching 24h volume data...');
  const response = await axios.get<VolumeResponse>('https://data.api.drift.trade/stats/markets/volume/24h');
  console.log(`Fetched volume data for ${response.data.markets.length} markets`);
  
  // Filter for perpetual markets only
  const perpVolumes = response.data.markets.filter(market => 
    market.marketType === 'perp' || market.symbol.includes('PERP')
  );
  
  console.log(`Found ${perpVolumes.length} perpetual volume records`);
  return perpVolumes;
}

async function fetchPricePointsData(): Promise<PricePointData[]> {
  console.log('Fetching 24h price points data...');
  const response = await axios.get<PricePointsResponse>('https://mainnet-beta.api.drift.trade/stats/24hAgoPricePoints');
  console.log(`Fetched price points for ${response.data.data.length} markets`);
  
  // Filter for perpetual markets only
  const perpPricePoints = response.data.data.filter(market => 
    market.marketType.perp !== undefined
  );
  
  console.log(`Found ${perpPricePoints.length} perpetual price point records`);
  return perpPricePoints;
}

async function getDriftPerpsWithVolumeAndPricePoints(): Promise<MergedMarketData[]> {
  try {
    // Fetch all data in parallel
    const [marketsData, volumeData, pricePointsData] = await Promise.all([
      fetchMarketsData(),
      fetchVolumeData(),
      fetchPricePointsData()
    ]);
    
    // Create lookup maps for efficient merging
    const volumeMap = new Map<number, VolumeData>();
    volumeData.forEach(volume => {
      volumeMap.set(volume.marketIndex, volume);
    });
    
    const pricePointsMap = new Map<number, PricePointData>();
    pricePointsData.forEach(pricePoint => {
      pricePointsMap.set(pricePoint.marketIndex, pricePoint);
    });
    
    // Merge all data
    const mergedData: MergedMarketData[] = marketsData.map(market => {
      const volumeInfo = volumeMap.get(market.marketIndex);
      const pricePointInfo = pricePointsMap.get(market.marketIndex);
      
      return {
        ...market,
        volume24h: volumeInfo ? {
          quoteVolume: volumeInfo.quoteVolume,
          baseVolume: volumeInfo.baseVolume
        } : undefined,
        pricePoints: pricePointInfo?.pricePoints
      };
    });
    
    console.log(`\nMerged data for ${mergedData.length} perpetual markets`);
    return mergedData;
    
  } catch (error) {
    console.error('Error fetching Drift data:', error);
    throw error;
  }
}

// Function to save data to file
function saveDataToFile(data: MergedMarketData[], filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `drift-perps-data.json`;
  const outputFilename = filename || defaultFilename;
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, outputFilename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data saved to: ${filePath}`);
    console.log(`📊 Total markets: ${data.length}`);
    console.log(`📁 File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error saving data to file:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  getDriftPerpsWithVolumeAndPricePoints()
    .then(mergedData => {
      console.log('\n=== COMPREHENSIVE PERPETUAL MARKETS DATA ===');
      
      // Save to file
      saveDataToFile(mergedData);
      
      // Also log a summary to console
      console.log('\n📈 Market Summary:');
      mergedData.forEach((market, index) => {
        console.log(`${index + 1}. ${market.symbol} - Volume: $${parseFloat(market.volume24h?.quoteVolume || '0').toLocaleString()} - Price: $${market.price24hAgo}`);
      });
    })
    .catch(error => {
      console.error('Failed to fetch comprehensive perpetual markets data:', error);
      process.exit(1);
    });
}

export { getDriftPerpsWithVolumeAndPricePoints, MergedMarketData };