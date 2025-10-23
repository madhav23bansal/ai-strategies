// TypeScript types for Kamino comprehensive data

export interface KaminoMetadata {
  generatedAt: string;
  sources: {
    resources: string;
    lendingConfig: string;
    tokens: string;
  };
  totalMarkets: number;
  totalTokenMints: number;
  totalTokens: number;
  historicalApyFetchedAt: string;
  totalPairsProcessed: number;
  totalPairs: number;
}

export interface TokenDetails {
  mint: string;
  logoUrl: string;
  name: string;
  symbol: string;
  decimals: number;
  marketCapUsd: string;
  volumeUsd: string;
  verified: boolean;
  priority: number;
}

export interface HistoricalApyDataPoint {
  date: string;
  stakingApy: number;
  debtApy: number;
}

export interface HistoricalApyTimeRange {
  data: HistoricalApyDataPoint[];
  timeRange: string;
}

export interface HistoricalApy {
  "7D": HistoricalApyTimeRange;
  "1M": HistoricalApyTimeRange;
  "3M": HistoricalApyTimeRange;
}

export interface KaminoPair {
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
  collTokenDetails: TokenDetails;
  debtTokenDetails: TokenDetails;
  historicalApy: HistoricalApy;
}

export interface KaminoLendingMarket {
  lendingMarket: string;
  isPrimary: boolean;
  name: string;
  description: string;
  lookupTable: string;
  isCurated: boolean;
  configKey: string;
  pairs: KaminoPair[];
}

export interface KaminoComprehensiveData {
  metadata: KaminoMetadata;
  data: Record<string, KaminoLendingMarket>;
}

// Database model types for Prisma
export interface DatabaseToken {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl: string;
  marketCapUsd: number;
  volumeUsd: number;
  verified: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseLendingMarket {
  id: string;
  address: string;
  name: string;
  description: string;
  lookupTable: string;
  isCurated: boolean;
  isPrimary: boolean;
  configKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabasePair {
  id: string;
  depositReserveAddress: string;
  borrowReserveAddress: string;
  pairType: string;
  strategyType: string;
  supplyApyType: string;
  supplyApyAddress: string;
  lendingMarketId: string;
  collateralTokenId: string;
  debtTokenId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseHistoricalApy {
  id: string;
  pairId: string;
  date: Date;
  stakingApy: number;
  debtApy: number;
  timeRange: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseFilterType {
  id: string;
  pairId: string;
  filterType: string;
  createdAt: Date;
  updatedAt: Date;
}
