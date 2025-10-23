import fs from 'fs';
import path from 'path';

export interface DriftPerpMarket {
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
  volume24h?: {
    quoteVolume: string;
    baseVolume: string;
  };
  pricePoints?: number[];
}

export interface PerpsContext {
  totalMarkets: number;
  topMarketsByVolume: DriftPerpMarket[];
  topMarketsByPriceChange: DriftPerpMarket[];
  fundingRates: {
    positive: DriftPerpMarket[];
    negative: DriftPerpMarket[];
    neutral: DriftPerpMarket[];
  };
  marketSummary: {
    totalVolume24h: number;
    averagePriceChange: number;
    mostVolatile: DriftPerpMarket[];
    leastVolatile: DriftPerpMarket[];
  };
  tradingOpportunities: {
    highVolume: DriftPerpMarket[];
    highFunding: DriftPerpMarket[];
    trendingUp: DriftPerpMarket[];
    trendingDown: DriftPerpMarket[];
  };
}

export class PerpsDataLoader {
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.cwd(), 'fetched', 'drift-perps-data.json');
  }

  /**
   * Load and parse the Drift perps data from JSON file
   */
  async loadPerpsData(): Promise<DriftPerpMarket[]> {
    try {
      if (!fs.existsSync(this.dataPath)) {
        console.warn(`⚠️  Perps data file not found at ${this.dataPath}`);
        return [];
      }

      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      const data: DriftPerpMarket[] = JSON.parse(rawData);
      
      console.log(`📊 Loaded ${data.length} Drift perpetual markets`);
      return data;
    } catch (error) {
      console.error('❌ Error loading perps data:', error);
      return [];
    }
  }

  /**
   * Process the perps data into structured context for AI
   */
  async getPerpsContext(): Promise<PerpsContext> {
    const markets = await this.loadPerpsData();
    
    if (markets.length === 0) {
      return this.getEmptyContext();
    }

    // Calculate total 24h volume
    const totalVolume24h = markets.reduce((sum, market) => {
      const volume = parseFloat(market.volume24h?.quoteVolume || '0');
      return sum + volume;
    }, 0);

    // Calculate average price change
    const averagePriceChange = markets.reduce((sum, market) => {
      return sum + market.pricePercentChange;
    }, 0) / markets.length;

    // Sort markets by volume (24h)
    const topMarketsByVolume = [...markets]
      .sort((a, b) => {
        const volumeA = parseFloat(a.volume24h?.quoteVolume || '0');
        const volumeB = parseFloat(b.volume24h?.quoteVolume || '0');
        return volumeB - volumeA;
      })
      .slice(0, 10);

    // Sort markets by price change
    const topMarketsByPriceChange = [...markets]
      .sort((a, b) => b.pricePercentChange - a.pricePercentChange)
      .slice(0, 10);

    // Categorize by funding rates
    const fundingRates = {
      positive: markets.filter(m => (m.avgFunding || 0) > 0.001),
      negative: markets.filter(m => (m.avgFunding || 0) < -0.001),
      neutral: markets.filter(m => Math.abs(m.avgFunding || 0) <= 0.001)
    };

    // Find most/least volatile markets
    const mostVolatile = [...markets]
      .sort((a, b) => Math.abs(b.pricePercentChange) - Math.abs(a.pricePercentChange))
      .slice(0, 5);

    const leastVolatile = [...markets]
      .sort((a, b) => Math.abs(a.pricePercentChange) - Math.abs(b.pricePercentChange))
      .slice(0, 5);

    // Trading opportunities
    const tradingOpportunities = {
      highVolume: markets
        .filter(m => parseFloat(m.volume24h?.quoteVolume || '0') > 1000000)
        .slice(0, 10),
      highFunding: markets
        .filter(m => Math.abs(m.avgFunding || 0) > 0.005)
        .slice(0, 10),
      trendingUp: markets
        .filter(m => m.pricePercentChange > 5)
        .slice(0, 10),
      trendingDown: markets
        .filter(m => m.pricePercentChange < -5)
        .slice(0, 10)
    };

    return {
      totalMarkets: markets.length,
      topMarketsByVolume,
      topMarketsByPriceChange,
      fundingRates,
      marketSummary: {
        totalVolume24h,
        averagePriceChange,
        mostVolatile,
        leastVolatile
      },
      tradingOpportunities
    };
  }

  /**
   * Get a formatted context string for AI prompts
   */
  async getFormattedContext(): Promise<string> {
    const context = await this.getPerpsContext();
    
    if (context.totalMarkets === 0) {
      return "No perps data available. Using general Solana perps knowledge.";
    }

    const formatMarket = (market: DriftPerpMarket) => 
      `${market.symbol}: $${parseFloat(market.volume24h?.quoteVolume || '0').toLocaleString()} vol, ${market.pricePercentChange.toFixed(2)}% change, ${((market.avgFunding || 0) * 100).toFixed(4)}% funding`;

    return `
CURRENT DRIFT PROTOCOL PERPS DATA (${context.totalMarkets} markets):
- Total 24h Volume: $${context.marketSummary.totalVolume24h.toLocaleString()}
- Average Price Change: ${context.marketSummary.averagePriceChange.toFixed(2)}%

TOP MARKETS BY VOLUME:
${context.topMarketsByVolume.slice(0, 5).map(formatMarket).join('\n')}

TOP GAINERS (24h):
${context.topMarketsByPriceChange.slice(0, 5).map(formatMarket).join('\n')}

FUNDING RATE OPPORTUNITIES:
- Positive Funding (${context.fundingRates.positive.length} markets): ${context.fundingRates.positive.slice(0, 3).map(m => `${m.symbol} (${((m.avgFunding || 0) * 100).toFixed(4)}%)`).join(', ')}
- Negative Funding (${context.fundingRates.negative.length} markets): ${context.fundingRates.negative.slice(0, 3).map(m => `${m.symbol} (${((m.avgFunding || 0) * 100).toFixed(4)}%)`).join(', ')}

HIGH VOLUME TRADING OPPORTUNITIES:
${context.tradingOpportunities.highVolume.slice(0, 5).map(formatMarket).join('\n')}

TRENDING MARKETS:
- Up: ${context.tradingOpportunities.trendingUp.slice(0, 3).map(m => `${m.symbol} (+${m.pricePercentChange.toFixed(2)}%)`).join(', ')}
- Down: ${context.tradingOpportunities.trendingDown.slice(0, 3).map(m => `${m.symbol} (${m.pricePercentChange.toFixed(2)}%)`).join(', ')}
`;
  }

  private getEmptyContext(): PerpsContext {
    return {
      totalMarkets: 0,
      topMarketsByVolume: [],
      topMarketsByPriceChange: [],
      fundingRates: { positive: [], negative: [], neutral: [] },
      marketSummary: {
        totalVolume24h: 0,
        averagePriceChange: 0,
        mostVolatile: [],
        leastVolatile: []
      },
      tradingOpportunities: {
        highVolume: [],
        highFunding: [],
        trendingUp: [],
        trendingDown: []
      }
    };
  }
}
