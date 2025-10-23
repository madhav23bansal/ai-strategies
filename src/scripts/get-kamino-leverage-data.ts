import fs from 'fs';
import path from 'path';

async function fetchKaminoResources() {
  try {
    console.log('Fetching Kamino resources data...');
    
    const response = await fetch('https://cdn.kamino.finance/resources.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched data from Kamino API');
    
    // Create fetched directory if it doesn't exist
    const fetchedDir = path.join(process.cwd(), 'fetched');
    if (!fs.existsSync(fetchedDir)) {
      fs.mkdirSync(fetchedDir, { recursive: true });
      console.log('Created fetched directory');
    }
    
    // Write data to resources.ts file
    const resourcesPath = path.join(fetchedDir, 'resources.ts');
    const fileContent = `// Auto-generated file from Kamino API
// Generated at: ${new Date().toISOString()}
// Source: https://cdn.kamino.finance/resources.json

export const kaminoResources = ${JSON.stringify(data, null, 2)} as const;

export default kaminoResources;
`;
    
    fs.writeFileSync(resourcesPath, fileContent, 'utf8');
    console.log(`Data written to ${resourcesPath}`);
    
    // Also save as JSON for reference
    const jsonPath = path.join(fetchedDir, 'resources.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`JSON backup written to ${jsonPath}`);
    
    console.log('✅ Kamino resources data fetched and saved successfully!');
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching Kamino resources:', error);
    throw error;
  }
}

async function fetchKaminoLendConfig() {
  try {
    console.log('Fetching Kamino lending config data...');
    
    const response = await fetch('https://cdn.kamino.finance/kamino_lend_config_v3.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched lending config data from Kamino API');
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching Kamino lending config:', error);
    throw error;
  }
}

async function fetchKaminoTokens() {
  try {
    console.log('Fetching Kamino token details...');
    
    const response = await fetch('https://api.kamino.finance/kamino-swap/tokens');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${(data as any[]).length} token details from Kamino API`);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching Kamino tokens:', error);
    throw error;
  }
}

async function fetchReserveHistoricalMetrics(reserveAddress: string, marketAddress: string, startDate: string = '2025-09-23', endDate: string = '2025-10-24'): Promise<any> {
  try {
    console.log(`Fetching historical metrics for reserve ${reserveAddress}...`);
    
    const url = `https://api.kamino.finance/kamino-market/${marketAddress}/reserves/${reserveAddress}/metrics/history?env=mainnet-beta&start=${startDate}&end=${endDate}&frequency=hour`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for reserve ${reserveAddress}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched historical metrics for reserve ${reserveAddress}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching historical metrics for reserve ${reserveAddress}:`, error);
    throw error;
  }
}

async function fetchAllReserveMetrics(finalData: any): Promise<any> {
  try {
    console.log('🚀 Starting reserve metrics fetch process...');
    
    const reserveMetrics: any = {};
    const uniqueReserves = new Set<string>();
    const marketAddresses: string[] = [];
    
    // Extract all unique reserve addresses and their corresponding market addresses
    for (const [marketAddress, marketData] of Object.entries(finalData)) {
      marketAddresses.push(marketAddress);
      
      if (marketData && (marketData as any).pairs) {
        for (const pair of (marketData as any).pairs) {
          if (pair.depositReserveAddress) {
            uniqueReserves.add(pair.depositReserveAddress);
          }
          if (pair.borrowReserveAddress) {
            uniqueReserves.add(pair.borrowReserveAddress);
          }
        }
      }
    }
    
    console.log(`Found ${uniqueReserves.size} unique reserves across ${marketAddresses.length} markets`);
    
    // Fetch metrics for each unique reserve
    let processedCount = 0;
    for (const reserveAddress of uniqueReserves) {
      try {
        // Find the market address for this reserve
        let marketAddress = '';
        for (const [mktAddr, marketData] of Object.entries(finalData)) {
          if (marketData && (marketData as any).pairs) {
            const hasReserve = (marketData as any).pairs.some((pair: any) => 
              pair.depositReserveAddress === reserveAddress || pair.borrowReserveAddress === reserveAddress
            );
            if (hasReserve) {
              marketAddress = mktAddr;
              break;
            }
          }
        }
        
        if (marketAddress) {
          const metrics = await fetchReserveHistoricalMetrics(reserveAddress, marketAddress);
          reserveMetrics[reserveAddress] = {
            reserveAddress,
            marketAddress,
            metrics,
            fetchedAt: new Date().toISOString()
          };
          
          processedCount++;
          console.log(`✅ Processed ${processedCount}/${uniqueReserves.size} reserves`);
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Failed to fetch metrics for reserve ${reserveAddress}:`, error);
        // Continue with other reserves even if one fails
      }
    }
    
    console.log(`✅ Successfully fetched metrics for ${Object.keys(reserveMetrics).length} reserves`);
    return reserveMetrics;
  } catch (error) {
    console.error('❌ Error in fetchAllReserveMetrics:', error);
    throw error;
  }
}

function extractMarketAddressesFromResources(resourcesData: any): string[] {
  const multiplyVaultPairsByMarket = (resourcesData as any)['mainnet-beta']?.multiplyVaultPairsByMarket || {};
  const marketAddresses = Object.keys(multiplyVaultPairsByMarket);
  
  console.log(`Found ${marketAddresses.length} market addresses from multiplyVaultPairsByMarket`);
  return marketAddresses;
}

function getMarketDetailsFromLendingConfig(lendConfigData: any, marketAddresses: string[]): any[] {
  const marketDetails: any[] = [];
  
  // Search through all lending markets to find details for our market addresses
  for (const [key, markets] of Object.entries(lendConfigData)) {
    if (Array.isArray(markets)) {
      for (const market of markets) {
        if (market.lendingMarket && marketAddresses.includes(market.lendingMarket)) {
          marketDetails.push({
            ...market,
            configKey: key // Track which config section this came from
          });
        }
      }
    }
  }
  
  console.log(`Found details for ${marketDetails.length} markets in lending config`);
  return marketDetails;
}

function extractTokenMintsFromPairs(multiplyVaultPairsByMarket: any): string[] {
  const tokenMints = new Set<string>();
  
  for (const [marketAddress, pairs] of Object.entries(multiplyVaultPairsByMarket)) {
    if (Array.isArray(pairs)) {
      for (const pair of pairs) {
        if (pair.collTokenMint) {
          tokenMints.add(pair.collTokenMint);
        }
        if (pair.debtTokenMint) {
          tokenMints.add(pair.debtTokenMint);
        }
      }
    }
  }
  
  console.log(`Found ${tokenMints.size} unique token mints from vault pairs`);
  return Array.from(tokenMints);
}

function createTokenMap(tokens: any[]): Map<string, any> {
  const tokenMap = new Map<string, any>();
  
  for (const token of tokens) {
    if (token.mint) {
      tokenMap.set(token.mint, token);
    }
  }
  
  console.log(`Created token map with ${tokenMap.size} tokens`);
  return tokenMap;
}

function constructFinalData(
  multiplyVaultPairsByMarket: any,
  marketDetails: any[],
  tokenMap: Map<string, any>
): any {
  const finalData: any = {};
  
  // Create a map of market addresses to market details for quick lookup
  const marketDetailsMap = new Map<string, any>();
  for (const market of marketDetails) {
    marketDetailsMap.set(market.lendingMarket, market);
  }
  
  for (const [marketAddress, pairs] of Object.entries(multiplyVaultPairsByMarket)) {
    const marketDetail = marketDetailsMap.get(marketAddress);
    
    if (marketDetail) {
      finalData[marketAddress] = {
        ...marketDetail,
        pairs: []
      };
      
      if (Array.isArray(pairs)) {
        for (const pair of pairs) {
          const enhancedPair = { ...pair };
          
          // Add token details for debitTokenMint
          if (pair.debitTokenMint && tokenMap.has(pair.debitTokenMint)) {
            enhancedPair.debitTokenDetails = tokenMap.get(pair.debitTokenMint);
          }
          
          // Add token details for collTokenMint
          if (pair.collTokenMint && tokenMap.has(pair.collTokenMint)) {
            enhancedPair.collTokenDetails = tokenMap.get(pair.collTokenMint);
          }
          
          // Add token details for debtTokenMint
          if (pair.debtTokenMint && tokenMap.has(pair.debtTokenMint)) {
            enhancedPair.debtTokenDetails = tokenMap.get(pair.debtTokenMint);
          }
          
          finalData[marketAddress].pairs.push(enhancedPair);
        }
      }
    }
  }
  
  console.log(`Constructed final data for ${Object.keys(finalData).length} markets`);
  return finalData;
}

async function fetchAllKaminoData() {
  try {
    console.log('🚀 Starting Kamino data fetch process...');
    
    // Step 1: Fetch resources data
    const resourcesData = await fetchKaminoResources();
    
    // Step 2: Fetch lending config data
    const lendConfigData = await fetchKaminoLendConfig();
    
    // Step 3: Fetch token details
    const tokensData = await fetchKaminoTokens();
    
    // Step 4: Extract market addresses from multiplyVaultPairsByMarket in resources data
    const marketAddresses = extractMarketAddressesFromResources(resourcesData);
    
    // Step 5: Get complete market details from lending config using the market addresses
    const marketDetails = getMarketDetailsFromLendingConfig(lendConfigData, marketAddresses);
    
    // Step 6: Extract token mints from vault pairs
    const multiplyVaultPairsByMarket = (resourcesData as any)['mainnet-beta']?.multiplyVaultPairsByMarket || {};
    const tokenMints = extractTokenMintsFromPairs(multiplyVaultPairsByMarket);
    
    // Step 7: Create token map for quick lookup
    const tokenMap = createTokenMap(tokensData as any[]);
    
    // Step 8: Construct final comprehensive data structure
    const finalData = constructFinalData(multiplyVaultPairsByMarket, marketDetails, tokenMap);
    
    // Step 9: Save final comprehensive data
    const fetchedDir = path.join(process.cwd(), 'fetched');
    const finalDataPath = path.join(fetchedDir, 'kamino-comprehensive-data.json');
    
    const finalDataContent = {
      metadata: {
        generatedAt: new Date().toISOString(),
        sources: {
          resources: 'https://cdn.kamino.finance/resources.json',
          lendingConfig: 'https://cdn.kamino.finance/kamino_lend_config_v3.json',
          tokens: 'https://api.kamino.finance/kamino-swap/tokens'
        },
        totalMarkets: Object.keys(finalData).length,
        totalTokenMints: tokenMints.length,
        totalTokens: (tokensData as any[]).length
      },
      data: finalData
    };
    
    fs.writeFileSync(finalDataPath, JSON.stringify(finalDataContent, null, 2), 'utf8');
    console.log(`✅ Final comprehensive data written to ${finalDataPath}`);
    
    // Step 10: Fetch reserve historical metrics
    console.log('📊 Starting reserve metrics fetch...');
    const reserveMetrics = await fetchAllReserveMetrics(finalData);
    
    // Step 11: Save reserve metrics to separate file
    const reserveMetricsPath = path.join(fetchedDir, 'kamino-reserve-metrics.json');
    const reserveMetricsContent = {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'https://api.kamino.finance/kamino-market/{market}/reserves/{reserve}/metrics/history',
        totalReserves: Object.keys(reserveMetrics).length,
        dateRange: {
          start: '2025-09-23',
          end: '2025-10-24',
          frequency: 'hour'
        }
      },
      data: reserveMetrics
    };
    
    fs.writeFileSync(reserveMetricsPath, JSON.stringify(reserveMetricsContent, null, 2), 'utf8');
    console.log(`✅ Reserve metrics written to ${reserveMetricsPath}`);
    
    // Step 12: Clean up old files
    const filesToDelete = [
      path.join(fetchedDir, 'resources.ts'),
      path.join(fetchedDir, 'resources.json'),
      path.join(fetchedDir, 'marketDetails.json'),
      path.join(fetchedDir, 'multiplyMarkets.json')
    ];
    
    for (const filePath of filesToDelete) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted ${path.basename(filePath)}`);
      }
    }
    
    console.log('🎉 All Kamino data fetched and processed successfully!');
    console.log(`📁 Final data saved to: ${finalDataPath}`);
    console.log(`📊 Reserve metrics saved to: ${reserveMetricsPath}`);
    
    return {
      finalData,
      reserveMetrics,
      marketAddresses,
      tokenMints,
      totalTokens: (tokensData as any[]).length
    };
  } catch (error) {
    console.error('❌ Error in fetchAllKaminoData:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fetchAllKaminoData()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { fetchKaminoResources, fetchKaminoLendConfig, fetchKaminoTokens, fetchReserveHistoricalMetrics, fetchAllReserveMetrics, fetchAllKaminoData };
