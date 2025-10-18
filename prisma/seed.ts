import * as fs from 'fs';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple embedding generation function (in production, use OpenAI embeddings)
function generateEmbedding(text: string): number[] {
  // This is a simple hash-based embedding for demo purposes
  // In production, replace with actual OpenAI embeddings
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(1536).fill(0);
  
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const position = Math.abs(hash) % 1536;
    embedding[position] += (index + 1) * 0.1;
  });
  
  // Normalize the embedding
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

function generateRiskEmbedding(riskLevel: string, expectedApy: number, strategyType: string): number[] {
  // Generate risk-based embedding
  const riskFactors = {
    low: [1, 0, 0],
    medium: [0, 1, 0], 
    high: [0, 0, 1]
  };
  
  const apyFactor = Math.min(expectedApy / 100, 1); // Normalize APY
  const typeFactors = {
    lending: [1, 0, 0, 0],
    borrowing: [0, 1, 0, 0],
    vault: [0, 0, 1, 0],
    arbitrage: [0, 0, 0, 1]
  };
  
  const baseEmbedding = [
    ...riskFactors[riskLevel as keyof typeof riskFactors],
    apyFactor,
    ...typeFactors[strategyType as keyof typeof typeFactors] || [0, 0, 0, 0]
  ];
  
  // Pad to 1536 dimensions
  const embedding = new Array(1536).fill(0);
  baseEmbedding.forEach((val, index) => {
    if (index < 1536) embedding[index] = val;
  });
  
  return embedding;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Seed Jupiter Borrow Markets
    console.log('📊 Seeding Jupiter Borrow Markets...');
    const jupiterBorrowData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/JupLend-borrowing.json'), 'utf8')
    );

    for (const market of jupiterBorrowData) {
      // Create or update tokens
      const supplyToken = await prisma.token.upsert({
        where: { address: market.supplyToken.address },
        update: {
          price: market.supplyToken.price ? parseFloat(market.supplyToken.price) : null,
        },
        create: {
          address: market.supplyToken.address,
          chainId: market.supplyToken.chainId,
          name: market.supplyToken.name,
          symbol: market.supplyToken.symbol,
          decimals: market.supplyToken.decimals,
          logoUrl: market.supplyToken.logoUrl,
          price: market.supplyToken.price ? parseFloat(market.supplyToken.price) : null,
          coingeckoId: market.supplyToken.coingeckoId,
        },
      });

      const borrowToken = await prisma.token.upsert({
        where: { address: market.borrowToken.address },
        update: {
          price: market.borrowToken.price ? parseFloat(market.borrowToken.price) : null,
        },
        create: {
          address: market.borrowToken.address,
          chainId: market.borrowToken.chainId,
          name: market.borrowToken.name,
          symbol: market.borrowToken.symbol,
          decimals: market.borrowToken.decimals,
          logoUrl: market.borrowToken.logoUrl,
          price: market.borrowToken.price ? parseFloat(market.borrowToken.price) : null,
          coingeckoId: market.borrowToken.coingeckoId,
        },
      });

      // Create Jupiter Borrow Market
      await prisma.jupiterBorrowMarket.upsert({
        where: { address: market.address },
        update: {
          totalSupply: market.totalSupply,
          totalSupplyLiquidity: market.totalSupplyLiquidity,
          totalBorrow: market.totalBorrow,
          totalBorrowLiquidity: market.totalBorrowLiquidity,
          supplyRate: market.supplyRate,
          borrowRate: market.borrowRate,
        },
        create: {
          address: market.address,
          totalSupply: market.totalSupply,
          totalSupplyLiquidity: market.totalSupplyLiquidity,
          totalBorrow: market.totalBorrow,
          totalBorrowLiquidity: market.totalBorrowLiquidity,
          absorbedSupply: market.absorbedSupply,
          absorbedBorrow: market.absorbedBorrow,
          supplyRateMagnifier: market.supplyRateMagnifier,
          borrowRateMagnifier: market.borrowRateMagnifier,
          borrowFee: market.borrowFee,
          collateralFactor: market.collateralFactor,
          liquidationThreshold: market.liquidationThreshold,
          liquidationMaxLimit: market.liquidationMaxLimit,
          liquidationPenalty: market.liquidationPenalty,
          withdrawalGap: market.withdrawalGap,
          supplyRate: market.supplyRate,
          supplyRateLiquidity: market.supplyRateLiquidity,
          borrowRate: market.borrowRate,
          borrowRateLiquidity: market.borrowRateLiquidity,
          withdrawLimit: market.withdrawLimit,
          withdrawableUntilLimit: market.withdrawableUntilLimit,
          withdrawable: market.withdrawable,
          borrowLimit: market.borrowLimit,
          borrowableUntilLimit: market.borrowableUntilLimit,
          borrowable: market.borrowable,
          borrowLimitUtilization: market.borrowLimitUtilization,
          minimumBorrowing: market.minimumBorrowing,
          supplyTokenId: supplyToken.id,
          borrowTokenId: borrowToken.id,
        },
      });
    }

    // Seed Jupiter Lend Markets
    console.log('💰 Seeding Jupiter Lend Markets...');
    const jupiterLendData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/JupLend-lending.json'), 'utf8')
    );

    for (const market of jupiterLendData) {
      const asset = await prisma.token.upsert({
        where: { address: market.asset.address },
        update: {
          price: market.asset.price ? parseFloat(market.asset.price) : null,
        },
        create: {
          address: market.asset.address,
          chainId: market.asset.chainId,
          name: market.asset.name,
          symbol: market.asset.symbol,
          decimals: market.asset.decimals,
          logoUrl: market.asset.logoUrl,
          price: market.asset.price ? parseFloat(market.asset.price) : null,
          coingeckoId: market.asset.coingeckoId,
        },
      });

      await prisma.jupiterLendMarket.upsert({
        where: { address: market.address },
        update: {
          totalAssets: market.totalAssets,
          totalSupply: market.totalSupply,
          supplyRate: market.supplyRate,
        },
        create: {
          address: market.address,
          name: market.name,
          symbol: market.symbol,
          decimals: market.decimals,
          assetAddress: market.assetAddress,
          totalAssets: market.totalAssets,
          totalSupply: market.totalSupply,
          convertToShares: market.convertToShares,
          convertToAssets: market.convertToAssets,
          rewardsRate: market.rewardsRate,
          supplyRate: market.supplyRate,
          totalRate: market.totalRate,
          rebalanceDifference: market.rebalanceDifference,
          assetId: asset.id,
        },
      });
    }

    // Seed Drift Markets
    console.log('🌊 Seeding Drift Markets...');
    const driftData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/borrow_lend_drift.json'), 'utf8')
    );

    for (const market of driftData.markets) {
      await prisma.driftMarket.upsert({
        where: { marketIndex: market.marketIndex },
        update: {
          depositInterestRate: market.currentState.depositInterestRate,
          borrowInterestRate: market.currentState.borrowInterestRate,
          utilizationRate: market.currentState.utilizationRate,
          totalDeposits: market.currentState.totalDeposits,
          totalBorrows: market.currentState.totalBorrows,
          availableLiquidity: market.currentState.availableLiquidity,
          oraclePrice: market.currentState.oraclePrice,
          totalDepositsUSD: market.currentState.totalDepositsUSD,
          totalBorrowsUSD: market.currentState.totalBorrowsUSD,
        },
        create: {
          marketIndex: market.marketIndex,
          symbol: market.symbol,
          mint: market.mint,
          oracle: market.oracle,
          pubkey: market.pubkey,
          totalSpotFee: market.currentState.totalSpotFee,
          depositBalance: market.currentState.depositBalance,
          borrowBalance: market.currentState.borrowBalance,
          cumulativeDepositInterest: market.currentState.cumulativeDepositInterest,
          cumulativeBorrowInterest: market.currentState.cumulativeBorrowInterest,
          depositInterestRate: market.currentState.depositInterestRate,
          borrowInterestRate: market.currentState.borrowInterestRate,
          utilizationRate: market.currentState.utilizationRate,
          totalDeposits: market.currentState.totalDeposits,
          totalBorrows: market.currentState.totalBorrows,
          availableLiquidity: market.currentState.availableLiquidity,
          optimalUtilization: market.currentState.optimalUtilization,
          optimalBorrowRate: market.currentState.optimalBorrowRate,
          maxBorrowRate: market.currentState.maxBorrowRate,
          minBorrowRate: market.currentState.minBorrowRate,
          oraclePrice: market.currentState.oraclePrice,
          oracleConfidence: market.currentState.oracleConfidence,
          depositTokenTwap: market.currentState.depositTokenTwap,
          borrowTokenTwap: market.currentState.borrowTokenTwap,
          totalFeeEarned: market.currentState.totalFeeEarned,
          totalDepositsUSD: market.currentState.totalDepositsUSD,
          totalBorrowsUSD: market.currentState.totalBorrowsUSD,
        },
      });
    }

    // Seed DeFiLlama Protocols (sample)
    console.log('🦙 Seeding DeFiLlama Protocols...');
    const defillamaData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/DefiLLAMA.json'), 'utf8')
    );

    // Process first 100 protocols to avoid memory issues
    const sampleProtocols = defillamaData.slice(0, 100);
    for (const protocol of sampleProtocols) {
      await prisma.deFiLlamaProtocol.upsert({
        where: { protocolId: protocol.pageProps.id },
        update: {
          currentTvl: protocol.pageProps.currentTvlByChain?.Solana || 0,
        },
        create: {
          protocolId: protocol.pageProps.id,
          name: protocol.pageProps.name,
          category: protocol.pageProps.category || "Unknown",
          chains: protocol.pageProps.chains || [],
          currentTvl: protocol.pageProps.currentTvlByChain?.Solana || 0,
          description: protocol.pageProps.description,
          website: protocol.pageProps.website,
          twitter: protocol.pageProps.twitter,
          safeHarbor: protocol.pageProps.safeHarbor || false,
          github: Array.isArray(protocol.pageProps.github) ? protocol.pageProps.github[0] : protocol.pageProps.github,
          methodology: protocol.pageProps.methodology,
          methodologyUrl: protocol.pageProps.methodologyURL,
        },
      });
    }

    // Seed Kamino Multiply Vaults
    console.log('🏦 Seeding Kamino Multiply Vaults...');
    const kaminoVaultsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/multiply-vaults-kamino.json'), 'utf8')
    );

    for (const [marketName, vaults] of Object.entries(kaminoVaultsData)) {
      for (const vault of vaults as any[]) {
        // Create or update collateral token
        const collateralToken = await prisma.token.upsert({
          where: { address: vault.collTokenMint },
          update: {},
          create: {
            address: vault.collTokenMint,
            chainId: "solana",
            name: vault.collTokenSymbol,
            symbol: vault.collTokenSymbol,
            decimals: 6, // Default, would need actual data
            logoUrl: null,
            price: null,
            coingeckoId: null,
          },
        });

        // Create or update debt token
        const debtToken = await prisma.token.upsert({
          where: { address: vault.debtTokenMint },
          update: {},
          create: {
            address: vault.debtTokenMint,
            chainId: "solana",
            name: vault.debtTokenSymbol,
            symbol: vault.debtTokenSymbol,
            decimals: 6, // Default, would need actual data
            logoUrl: null,
            price: null,
            coingeckoId: null,
          },
        });

        // Create Kamino Vault
        await prisma.kaminoVault.upsert({
          where: { marketAddress: vault.marketAddress },
          update: {
            maxLeverage: vault.maxLeverage || 0,
            averageLeverage: vault.averageLeverage || 0,
            totalDepositedUsd: vault.totalDepositedUsd || 0,
            totalBorrowedUsd: vault.totalBorrowedUsd || 0,
            netApy: vault.netApy || 0,
            stakingApy: vault.stakingApy || 0,
            borrowCost: vault.borrowCost || 0,
            tvl: vault.apiMetrics?.tvl || 0,
          },
          create: {
            marketAddress: vault.marketAddress,
            marketName: vault.marketName,
            pairType: vault.pairType,
            strategyType: vault.strategyType,
            maxLeverage: vault.maxLeverage || 0,
            averageLeverage: vault.averageLeverage || 0,
            totalDepositedUsd: vault.totalDepositedUsd || 0,
            totalBorrowedUsd: vault.totalBorrowedUsd || 0,
            netApy: vault.netApy || 0,
            stakingApy: vault.stakingApy || 0,
            borrowCost: vault.borrowCost || 0,
            tvl: vault.apiMetrics?.tvl || 0,
            collateralTokenId: collateralToken.id,
            debtTokenId: debtToken.id,
          },
        });
      }
    }

    // Seed Kamino Lending Markets (simplified - just markets without complex reserves)
    console.log('🏦 Seeding Kamino Lending Markets...');
    const kaminoLendingData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/lending-markets-kamino.json'), 'utf8')
    );

    for (const [marketAddress, marketData] of Object.entries(kaminoLendingData)) {
      // Create Kamino Lending Market
      await prisma.kaminoLendingMarket.upsert({
        where: { marketAddress: marketAddress },
        update: {
          marketName: (marketData as any).marketName,
          description: (marketData as any).description,
          isCurated: (marketData as any).isCurated || false,
          isPrimary: (marketData as any).isPrimary || false,
          programId: (marketData as any).programId,
          reserveCount: (marketData as any).reserveCount || 0,
        },
        create: {
          marketAddress: marketAddress,
          marketName: (marketData as any).marketName || `Market ${marketAddress.slice(0, 8)}`,
          description: (marketData as any).description,
          isCurated: (marketData as any).isCurated || false,
          isPrimary: (marketData as any).isPrimary || false,
          programId: (marketData as any).programId || '',
          reserveCount: (marketData as any).reserveCount || 0,
        },
      });
    }

    // Create sample investment strategies
    console.log('💡 Creating sample investment strategies...');
    const strategies = [
      {
        name: "High Yield Lending",
        description: "Lend USDC on Jupiter for high APY returns with low risk",
        strategyType: "lending",
        riskLevel: "low",
        expectedApy: 12.5,
        minInvestment: 1000,
        maxInvestment: 100000,
        protocols: ["Jupiter", "Kamino"],
        tokens: ["USDC", "WSOL"],
      },
      {
        name: "Leveraged Vault Strategy",
        description: "Use Kamino multiply vaults for leveraged exposure to JLP with 6x leverage",
        strategyType: "vault",
        riskLevel: "high",
        expectedApy: 45.2,
        minInvestment: 5000,
        maxInvestment: 500000,
        protocols: ["Kamino"],
        tokens: ["JLP", "USDC"],
      },
      {
        name: "Arbitrage Opportunities",
        description: "Identify and exploit price differences across lending protocols",
        strategyType: "arbitrage",
        riskLevel: "medium",
        expectedApy: 25.8,
        minInvestment: 2000,
        maxInvestment: 200000,
        protocols: ["Jupiter", "Drift", "Kamino"],
        tokens: ["USDC", "WSOL", "JLP"],
      },
    ];

    for (const strategy of strategies) {
      // Generate embeddings for the strategy
      const strategyText = `${strategy.name} ${strategy.description} ${strategy.strategyType} ${strategy.protocols.join(' ')} ${strategy.tokens.join(' ')}`;
      const embedding = generateEmbedding(strategyText);
      const riskEmbedding = generateRiskEmbedding(strategy.riskLevel, strategy.expectedApy, strategy.strategyType);

      // First create/update the strategy without embeddings
      const createdStrategy = await prisma.investmentStrategy.upsert({
        where: { name: strategy.name },
        update: {
          expectedApy: strategy.expectedApy,
        },
        create: strategy,
      });

      // Then update with embeddings using raw SQL
      await prisma.$executeRaw`
        UPDATE "investment_strategies" 
        SET embedding = ${JSON.stringify(embedding)}::vector, 
            "riskEmbedding" = ${JSON.stringify(riskEmbedding)}::vector
        WHERE id = ${createdStrategy.id}
      `;
    }

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
