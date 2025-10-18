# AI DeFi Strategy API - Usage Examples

## 🚀 Quick Start

1. **Start the API server:**
   ```bash
   npm run api
   ```

2. **Test basic functionality:**
   ```bash
   npm run test:basic
   ```

3. **Test full AI system (requires OpenAI API key):**
   ```bash
   npm run test:ai
   ```

## 📊 API Endpoints

### 1. Main Command Endpoint (Primary)
```bash
POST /api/command
```

**Request Body:**
```json
{
  "command": "Give me SOL looping strategy to earn more"
}
```

**Response:**
```json
{
  "type": "opportunities",
  "title": "SOL Looping Opportunities",
  "summary": "Here are the best leverage opportunities for SOL looping strategies...",
  "opportunities": [
    {
      "marketName": "GM-Solblaze",
      "maxLeverage": "10",
      "netApy": "7.646885",
      "collateral_token": "BSOL",
      "debt_token": "WSOL",
      "tvl": "3440671.369658"
    }
  ],
  "nextSteps": [
    "Choose a leverage level that matches your risk tolerance",
    "Monitor the collateral and debt token prices",
    "Set up liquidation alerts"
  ],
  "confidence": 85,
  "originalCommand": "Give me SOL looping strategy to earn more",
  "processedAt": "2025-01-27T10:30:00.000Z"
}
```

### 2. Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "database": "connected"
}
```

### 2. Generate SQL Query
```bash
POST /api/sql/generate
```

**Request Body:**
```json
{
  "query": "Find the highest APY lending opportunities across all protocols",
  "explain": true
}
```

**Response:**
```json
{
  "query": "SELECT jlm.name, jlm.supplyRate, t.symbol, t.price FROM jupiter_lend_markets jlm JOIN tokens t ON jlm.assetId = t.id WHERE jlm.supplyRate > '100' ORDER BY CAST(jlm.supplyRate AS DECIMAL) DESC LIMIT 10",
  "explanation": "This query finds the highest APY lending opportunities by joining Jupiter lend markets with token data, filtering for rates above 100, and ordering by rate descending.",
  "complexity": "medium",
  "tables": ["jupiter_lend_markets", "tokens"],
  "purpose": "Identify the most profitable lending opportunities across protocols",
  "results": [
    {
      "name": "jupiter lend USDG",
      "supplyRate": "510",
      "symbol": "USDG",
      "price": "1.00"
    }
  ],
  "executed": true
}
```

### 3. Generate Investment Strategy
```bash
POST /api/strategies/generate
```

**Request Body:**
```json
{
  "query": "Create a stablecoin yield farming strategy with low risk",
  "riskTolerance": "conservative",
  "investmentAmount": 10000,
  "includeVariations": true
}
```

**Response:**
```json
{
  "strategy": {
    "name": "Conservative USDC Yield Farm",
    "description": "A low-risk strategy focusing on stablecoin yield farming across multiple protocols to maximize returns while minimizing volatility exposure.",
    "strategyType": "stables",
    "riskLevel": "low",
    "expectedApy": 12.5,
    "minInvestment": 1000,
    "maxInvestment": 100000,
    "protocols": ["Jupiter", "Kamino"],
    "tokens": ["USDC", "USDT"],
    "steps": [
      "Deposit USDC into Jupiter lending market",
      "Monitor APY changes daily",
      "Rebalance between protocols based on rates",
      "Compound rewards weekly"
    ],
    "risks": [
      "Smart contract risk",
      "APY volatility",
      "Liquidity risk"
    ],
    "monitoring": [
      "Daily APY checks",
      "Protocol health monitoring",
      "Market condition analysis"
    ],
    "exitStrategy": "Exit when APY drops below 8% or market conditions deteriorate",
    "capitalEfficiency": 85,
    "complexity": 3,
    "timeHorizon": "medium",
    "gasCosts": "Low",
    "liquidity": "High"
  },
  "analysis": {
    "marketConditions": "Current market shows stable lending rates with good liquidity across major stablecoins.",
    "opportunityScore": 78,
    "riskScore": 25,
    "recommendedAllocation": "15-25% of portfolio",
    "alternatives": ["USDT farming", "Multi-protocol staking"],
    "marketTrends": ["Rising stablecoin adoption", "Increased DeFi lending activity"],
    "warnings": ["Monitor for protocol changes", "Watch for regulatory updates"]
  },
  "variations": [
    {
      "name": "Multi-Stablecoin Diversified Farm",
      "strategyType": "stables",
      "riskLevel": "low",
      "expectedApy": 11.8,
      "protocols": ["Jupiter", "Drift", "Kamino"],
      "tokens": ["USDC", "USDT", "DAI"]
    }
  ],
  "generatedAt": "2025-01-27T10:30:00.000Z"
}
```

### 4. Find Similar Strategies
```bash
POST /api/strategies/similar
```

**Request Body:**
```json
{
  "description": "High yield stablecoin farming with low risk",
  "limit": 5
}
```

**Response:**
```json
{
  "similarStrategies": [
    {
      "name": "High Yield Lending",
      "description": "Lend USDC on Jupiter for high APY returns with low risk",
      "strategyType": "lending",
      "riskLevel": "low",
      "expectedApy": 12.5,
      "distance": 0.1234
    }
  ],
  "count": 1,
  "searchedAt": "2025-01-27T10:30:00.000Z"
}
```

### 5. Market Analysis
```bash
GET /api/market/analysis
```

**Response:**
```json
{
  "analysis": {
    "topLendingRates": [
      {
        "name": "jupiter lend USDG",
        "supplyRate": "510",
        "symbol": "USDG",
        "price": "1.00"
      }
    ],
    "leverageOpportunities": [
      {
        "marketName": "GM-Sanctum",
        "maxLeverage": "10",
        "netApy": "45.2",
        "collateral_token": "INF",
        "debt_token": "WSOL"
      }
    ],
    "protocolTVLs": [
      {
        "name": "Jupiter",
        "category": "Unknown",
        "currentTvl": "3627496692.84735"
      }
    ],
    "timestamp": "2025-01-27T10:30:00.000Z"
  },
  "generatedAt": "2025-01-27T10:30:00.000Z"
}
```

### 6. Strategy Types
```bash
GET /api/strategies/types
```

**Response:**
```json
{
  "strategyTypes": [
    {
      "type": "stables",
      "name": "Stablecoin Strategies",
      "description": "Low-risk strategies focused on stablecoin yield farming and lending",
      "riskLevel": "low",
      "examples": ["USDC lending", "DAI farming", "Stablecoin loops"]
    },
    {
      "type": "looping",
      "name": "Leverage Looping",
      "description": "Borrow against collateral to increase exposure and potential returns",
      "riskLevel": "high",
      "examples": ["SOL loop farming", "ETH leverage", "Token leverage strategies"]
    }
  ]
}
```

## 🎯 Strategy Types Available

1. **Stables** - Stablecoin yield farming and lending
2. **Looping** - Leverage strategies using borrowed capital
3. **Yield Farming** - Liquidity provision and reward farming
4. **Multi-Protocol** - Cross-protocol arbitrage and strategies
5. **Airdrop** - Protocol interaction for potential airdrops
6. **Pair Trading** - Token pair trading and arbitrage
7. **Liquidation Arbitrage** - MEV and liquidation opportunities
8. **Leverage Farming** - Leveraged liquidity provision
9. **Cross-Chain** - Multi-blockchain strategies
10. **Volatility Trading** - Volatility-based profit strategies

## 🔧 Example cURL Commands

### Main Command Endpoint (Recommended)
```bash
# SOL looping strategy
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Give me SOL looping strategy to earn more"
  }'

# Show looping strategies
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Show me looping strategies"
  }'

# Get stablecoin rates
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "What are the best stablecoin rates?"
  }'

# Find high yield opportunities
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Find me high yield opportunities"
  }'

# Compare protocols
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Compare Jupiter vs Kamino"
  }'
```

### Generate a Strategy
```bash
curl -X POST http://localhost:3000/api/strategies/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a leverage farming strategy for SOL with high returns",
    "riskTolerance": "aggressive",
    "investmentAmount": 50000
  }'
```

### Generate SQL Query
```bash
curl -X POST http://localhost:3000/api/sql/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find leverage vaults with more than 5x leverage and their APY",
    "explain": true
  }'
```

### Find Similar Strategies
```bash
curl -X POST http://localhost:3000/api/strategies/similar \
  -H "Content-Type: application/json" \
  -d '{
    "description": "High yield stablecoin farming with low risk",
    "limit": 3
  }'
```

## 🚀 Advanced Usage

### Custom Strategy Generation
```javascript
const response = await fetch('http://localhost:3000/api/strategies/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Design a multi-protocol arbitrage strategy across Jupiter and Kamino",
    riskTolerance: "moderate",
    investmentAmount: 25000,
    includeVariations: true
  })
});

const { strategy, analysis, variations } = await response.json();
console.log('Generated Strategy:', strategy.name);
console.log('Expected APY:', strategy.expectedApy + '%');
console.log('Risk Level:', strategy.riskLevel);
```

### SQL Query with Execution
```javascript
const response = await fetch('http://localhost:3000/api/sql/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Show me the best arbitrage opportunities between Jupiter and Drift",
    explain: true
  })
});

const { query, explanation, results } = await response.json();
console.log('SQL Query:', query);
console.log('Explanation:', explanation);
console.log('Results:', results);
```

## 🔍 Database Schema

The API works with a comprehensive DeFi database including:

- **Tokens** - Cryptocurrency metadata and prices
- **Jupiter Markets** - Lending and borrowing markets
- **Drift Markets** - Interest rates and utilization data
- **DeFiLlama Protocols** - TVL and protocol information
- **Kamino Vaults** - Leverage and farming opportunities
- **Investment Strategies** - AI-generated strategies with vector embeddings

## ⚠️ Important Notes

1. **OpenAI API Key Required** - Add your OpenAI API key to `.env` file for full AI functionality
2. **Database Connection** - Ensure PostgreSQL with pgvector is running
3. **Rate Limits** - Consider implementing rate limiting for production use
4. **Error Handling** - All endpoints include comprehensive error handling
5. **Vector Search** - Similar strategy search requires vector embeddings to be generated

## 🎉 Ready to Use!

Your AI DeFi Strategy API is now ready to generate sophisticated investment strategies using real market data and advanced AI capabilities!
