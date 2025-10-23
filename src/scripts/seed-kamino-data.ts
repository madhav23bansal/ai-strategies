import { KaminoComprehensiveData, TokenDetails } from '../types/kamino';

import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

interface ProcessedToken {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl: string;
  marketCapUsd: number;
  volumeUsd: number;
  verified: boolean;
  priority: number;
}

interface ProcessedLendingMarket {
  address: string;
  name: string;
  description: string;
  lookupTable: string;
  isCurated: boolean;
  isPrimary: boolean;
  configKey: string;
}

interface ProcessedPair {
  depositReserveAddress: string;
  borrowReserveAddress: string;
  pairType: string;
  strategyType: string;
  supplyApyType: string;
  supplyApyAddress: string;
  collateralTokenMint: string;
  debtTokenMint: string;
  filterTypes: string[];
  historicalApy: any;
}

async function loadKaminoData(): Promise<KaminoComprehensiveData> {
  const dataPath = join(process.cwd(), 'fetched', 'kamino-comprehensive-data-with-apy.json');
  console.log(`Loading data from: ${dataPath}`);
  const rawData = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);
  console.log(`Loaded data with ${Object.keys(data.data).length} markets`);
  console.log(`First market keys: ${Object.keys(data.data)[0]}`);
  return data;
}

async function processTokens(data: KaminoComprehensiveData): Promise<Map<string, string>> {
  console.log('Processing tokens...');
  const tokenMap = new Map<string, string>();
  const uniqueTokens = new Map<string, ProcessedToken>();

  // Extract all unique tokens from the data
  for (const market of Object.values(data.data)) {
    console.log(`Processing market: ${market.name} with ${market.pairs.length} pairs`);
    for (const pair of market.pairs) {
      // Add collateral token
      const collToken = pair.collTokenDetails;
      if (!collToken) {
        console.warn(`Missing collTokenDetails for pair: ${pair.collTokenSymbol}/${pair.debtTokenSymbol}`);
        // Create a basic token entry from available data
        const basicCollToken = {
          mint: pair.collTokenMint,
          name: pair.collTokenSymbol,
          symbol: pair.collTokenSymbol,
          decimals: 9, // Default for SOL-based tokens
          logoUrl: '',
          marketCapUsd: '0',
          volumeUsd: '0',
          verified: false,
          priority: 999,
        };
        if (!uniqueTokens.has(basicCollToken.mint)) {
          uniqueTokens.set(basicCollToken.mint, {
            mint: basicCollToken.mint,
            name: basicCollToken.name,
            symbol: basicCollToken.symbol,
            decimals: basicCollToken.decimals,
            logoUrl: basicCollToken.logoUrl,
            marketCapUsd: parseFloat(basicCollToken.marketCapUsd),
            volumeUsd: parseFloat(basicCollToken.volumeUsd),
            verified: basicCollToken.verified,
            priority: basicCollToken.priority,
          });
        }
        continue;
      }
      if (collToken && collToken.mint && !uniqueTokens.has(collToken.mint)) {
        uniqueTokens.set(collToken.mint, {
          mint: collToken.mint,
          name: collToken.name,
          symbol: collToken.symbol,
          decimals: collToken.decimals,
          logoUrl: collToken.logoUrl || '',
          marketCapUsd: parseFloat(collToken.marketCapUsd),
          volumeUsd: parseFloat(collToken.volumeUsd),
          verified: collToken.verified,
          priority: collToken.priority,
        });
      }

      // Add debt token
      const debtToken = pair.debtTokenDetails;
      if (!debtToken) {
        console.warn(`Missing debtTokenDetails for pair: ${pair.collTokenSymbol}/${pair.debtTokenSymbol}`);
        // Create a basic token entry from available data
        const basicDebtToken = {
          mint: pair.debtTokenMint,
          name: pair.debtTokenSymbol,
          symbol: pair.debtTokenSymbol,
          decimals: 9, // Default for SOL-based tokens
          logoUrl: '',
          marketCapUsd: '0',
          volumeUsd: '0',
          verified: false,
          priority: 999,
        };
        if (!uniqueTokens.has(basicDebtToken.mint)) {
          uniqueTokens.set(basicDebtToken.mint, {
            mint: basicDebtToken.mint,
            name: basicDebtToken.name,
            symbol: basicDebtToken.symbol,
            decimals: basicDebtToken.decimals,
            logoUrl: basicDebtToken.logoUrl,
            marketCapUsd: parseFloat(basicDebtToken.marketCapUsd),
            volumeUsd: parseFloat(basicDebtToken.volumeUsd),
            verified: basicDebtToken.verified,
            priority: basicDebtToken.priority,
          });
        }
        continue;
      }
      if (debtToken && debtToken.mint && !uniqueTokens.has(debtToken.mint)) {
        uniqueTokens.set(debtToken.mint, {
          mint: debtToken.mint,
          name: debtToken.name,
          symbol: debtToken.symbol,
          decimals: debtToken.decimals,
          logoUrl: debtToken.logoUrl || '',
          marketCapUsd: parseFloat(debtToken.marketCapUsd),
          volumeUsd: parseFloat(debtToken.volumeUsd),
          verified: debtToken.verified,
          priority: debtToken.priority,
        });
      }
    }
  }

  // Insert tokens into database
  for (const [mint, tokenData] of uniqueTokens) {
    try {
      const token = await prisma.token.upsert({
        where: { mint },
        update: tokenData,
        create: tokenData,
      });
      tokenMap.set(mint, token.id);
      console.log(`Processed token: ${tokenData.symbol} (${mint})`);
    } catch (error) {
      console.error(`Error processing token ${mint}:`, error);
    }
  }

  console.log(`Processed ${tokenMap.size} unique tokens`);
  return tokenMap;
}

async function processLendingMarkets(data: KaminoComprehensiveData): Promise<Map<string, string>> {
  console.log('Processing lending markets...');
  const marketMap = new Map<string, string>();

  for (const [address, market] of Object.entries(data.data)) {
    try {
      const lendingMarket = await prisma.kaminoLendingMarket.upsert({
        where: { address },
        update: {
          name: market.name,
          description: market.description,
          lookupTable: market.lookupTable,
          isCurated: market.isCurated,
          isPrimary: market.isPrimary,
          configKey: market.configKey,
        },
        create: {
          address,
          name: market.name,
          description: market.description,
          lookupTable: market.lookupTable,
          isCurated: market.isCurated,
          isPrimary: market.isPrimary,
          configKey: market.configKey,
        },
      });
      marketMap.set(address, lendingMarket.id);
      console.log(`Processed lending market: ${market.name} (${address})`);
    } catch (error) {
      console.error(`Error processing lending market ${address}:`, error);
    }
  }

  console.log(`Processed ${marketMap.size} lending markets`);
  return marketMap;
}

async function processPairs(
  data: KaminoComprehensiveData,
  tokenMap: Map<string, string>,
  marketMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('Processing pairs...');
  const pairMap = new Map<string, string>();
  let pairCount = 0;

  for (const [marketAddress, market] of Object.entries(data.data)) {
    const marketId = marketMap.get(marketAddress);
    if (!marketId) {
      console.error(`Market ID not found for address: ${marketAddress}`);
      continue;
    }

    for (const pair of market.pairs) {
      try {
        const collateralTokenId = tokenMap.get(pair.collTokenMint);
        const debtTokenId = tokenMap.get(pair.debtTokenMint);

        if (!collateralTokenId || !debtTokenId) {
          console.error(`Token IDs not found for pair: ${pair.collTokenSymbol}/${pair.debtTokenSymbol}`);
          continue;
        }

        const pairId = `${pair.depositReserveAddress}-${pair.borrowReserveAddress}`;
        
        // Check if pair already exists
        const existingPair = await prisma.kaminoPair.findFirst({
          where: {
            depositReserveAddress: pair.depositReserveAddress,
            borrowReserveAddress: pair.borrowReserveAddress,
          }
        });

        let kaminoPair;
        if (existingPair) {
          kaminoPair = await prisma.kaminoPair.update({
            where: { id: existingPair.id },
            data: {
              pairType: pair.pairType,
              strategyType: pair.strategyType,
              supplyApyType: pair.supplyApyType,
              supplyApyAddress: pair.supplyApyAddress || '',
              lendingMarketId: marketId,
              collateralTokenId,
              debtTokenId,
            }
          });
        } else {
          kaminoPair = await prisma.kaminoPair.create({
            data: {
              depositReserveAddress: pair.depositReserveAddress,
              borrowReserveAddress: pair.borrowReserveAddress,
              pairType: pair.pairType,
              strategyType: pair.strategyType,
              supplyApyType: pair.supplyApyType,
              supplyApyAddress: pair.supplyApyAddress || '',
              lendingMarketId: marketId,
              collateralTokenId,
              debtTokenId,
            }
          });
        }

        pairMap.set(pairId, kaminoPair.id);
        pairCount++;

        // Process filter types
        for (const filterType of pair.filterTypes) {
          const existingFilterType = await prisma.kaminoFilterType.findFirst({
            where: {
              pairId: kaminoPair.id,
              filterType,
            }
          });

          if (!existingFilterType) {
            await prisma.kaminoFilterType.create({
              data: {
                pairId: kaminoPair.id,
                filterType,
              },
            });
          }
        }

        // Process historical APY data
        await processHistoricalApy(kaminoPair.id, pair.historicalApy);

        console.log(`Processed pair: ${pair.collTokenSymbol}/${pair.debtTokenSymbol} (${pairCount})`);
      } catch (error) {
        console.error(`Error processing pair ${pair.collTokenSymbol}/${pair.debtTokenSymbol}:`, error);
      }
    }
  }

  console.log(`Processed ${pairCount} pairs`);
  return pairMap;
}

async function processHistoricalApy(pairId: string, historicalApy: any): Promise<void> {
  const timeRanges = ['7D', '1M', '3M'] as const;
  
  for (const timeRange of timeRanges) {
    if (historicalApy[timeRange]?.data) {
      for (const dataPoint of historicalApy[timeRange].data) {
        try {
          const existingApy = await prisma.kaminoHistoricalApy.findFirst({
            where: {
              pairId,
              date: new Date(dataPoint.date),
              timeRange,
            }
          });

          if (existingApy) {
            await prisma.kaminoHistoricalApy.update({
              where: { id: existingApy.id },
              data: {
                stakingApy: dataPoint.stakingApy,
                debtApy: dataPoint.debtApy,
              }
            });
          } else {
            await prisma.kaminoHistoricalApy.create({
              data: {
                pairId,
                date: new Date(dataPoint.date),
                stakingApy: dataPoint.stakingApy,
                debtApy: dataPoint.debtApy,
                timeRange,
              }
            });
          }
        } catch (error) {
          console.error(`Error processing historical APY for pair ${pairId}:`, error);
        }
      }
    }
  }
}

async function saveDataImport(data: KaminoComprehensiveData): Promise<void> {
  console.log('Saving data import metadata...');
  
  try {
    await prisma.kaminoDataImport.create({
      data: {
        generatedAt: new Date(data.metadata.generatedAt),
        totalMarkets: data.metadata.totalMarkets,
        totalTokenMints: data.metadata.totalTokenMints,
        totalTokens: data.metadata.totalTokens,
        historicalApyFetchedAt: new Date(data.metadata.historicalApyFetchedAt),
        totalPairsProcessed: data.metadata.totalPairsProcessed,
        totalPairs: data.metadata.totalPairs,
        sources: data.metadata.sources,
      },
    });
    console.log('Data import metadata saved successfully');
  } catch (error) {
    console.error('Error saving data import metadata:', error);
  }
}

async function main() {
  try {
    console.log('Starting Kamino data seeding...');
    
    // Load the data
    const data = await loadKaminoData();
    console.log(`Loaded data with ${Object.keys(data.data).length} markets`);

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('Clearing existing data...');
    await prisma.kaminoHistoricalApy.deleteMany();
    await prisma.kaminoFilterType.deleteMany();
    await prisma.kaminoPair.deleteMany();
    await prisma.kaminoLendingMarket.deleteMany();
    await prisma.token.deleteMany();
    await prisma.kaminoDataImport.deleteMany();

    // Process data in order
    const tokenMap = await processTokens(data);
    const marketMap = await processLendingMarkets(data);
    const pairMap = await processPairs(data, tokenMap, marketMap);
    await saveDataImport(data);

    console.log('Kamino data seeding completed successfully!');
    console.log(`Summary:`);
    console.log(`- Tokens: ${tokenMap.size}`);
    console.log(`- Lending Markets: ${marketMap.size}`);
    console.log(`- Pairs: ${pairMap.size}`);

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { main as seedKaminoData };
