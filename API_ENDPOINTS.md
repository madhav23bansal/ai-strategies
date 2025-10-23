# AI Strategies API Endpoints

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Health Check
**GET** `/health`
- **Description**: Check API and database status
- **Response**: 
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T11:16:18.741Z",
  "database": "connected"
}
```

### 2. Generate Strategy
**POST** `/strategy`
- **Description**: Generate AI-powered DeFi strategy
- **Body**:
```json
{
  "prompt": "Give me a SOL looping strategy",
  "riskTolerance": "moderate", // optional: "conservative" | "moderate" | "aggressive"
  "investmentAmount": 5000 // optional: number
}
```
- **Response**:
```json
{
  "success": true,
  "strategy": { /* detailed strategy object */ },
  "analysis": { /* market analysis */ },
  "dataPoints": 1,
  "sqlQueries": 1
}
```

### 3. Get Tokens
**GET** `/tokens`
- **Description**: List all available tokens with market data
- **Response**:
```json
{
  "success": true,
  "tokens": [
    {
      "id": "cmh3b6488000aw1bmhegijzda",
      "symbol": "SOL",
      "name": "Wrapped SOL",
      "marketCapUsd": "102978808716.4972",
      "volumeUsd": "11431021422.58715",
      "verified": true
    }
  ]
}
```

### 4. Get Markets
**GET** `/markets`
- **Description**: List Kamino lending markets
- **Response**:
```json
{
  "success": true,
  "markets": [
    {
      "id": "cmh3b649w0013w1bmzteisu31",
      "name": "Main Market",
      "description": "Primary market on mainnet",
      "isPrimary": true,
      "isCurated": false,
      "_count": { "pairs": 26 }
    }
  ]
}
```

### 5. Get High APY Pairs
**GET** `/pairs/high-apy?limit=10&minApy=5`
- **Description**: Get trading pairs with high APY
- **Query Parameters**:
  - `limit`: Number of results (default: 10)
  - `minApy`: Minimum APY threshold (default: 5)
- **Response**:
```json
{
  "success": true,
  "pairs": [
    {
      "id": "cmh3b64b0001ew1bm8kqj5x0y",
      "date": "2025-10-22T00:00:00.000Z",
      "stakingApy": 49.85867,
      "debtApy": 5.994791,
      "timeRange": "7D",
      "pair": {
        "collateralToken": { "symbol": "JLP", "name": "Jupiter Perps LP" },
        "debtToken": { "symbol": "USDC", "name": "USD Coin" },
        "lendingMarket": { "name": "JLP Market" }
      }
    }
  ]
}
```

### 6. Get SOL Strategies
**GET** `/strategies/sol`
- **Description**: Get SOL-related trading pairs and strategies
- **Response**:
```json
{
  "success": true,
  "pairs": [
    {
      "id": "cmh3b64b0001fw1bm9lqk6y1z",
      "strategyType": "sol",
      "collateralToken": { "symbol": "JupSOL", "name": "Jupiter Staked SOL" },
      "debtToken": { "symbol": "SOL", "name": "Wrapped SOL" },
      "lendingMarket": { "name": "Main Market" },
      "historicalApy": [
        {
          "stakingApy": 6.839731,
          "debtApy": 5.883186,
          "timeRange": "7D"
        }
      ]
    }
  ]
}
```

## Usage Examples

### Generate a Strategy
```bash
curl -X POST http://localhost:3000/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Give me a conservative USDC yield strategy",
    "riskTolerance": "conservative",
    "investmentAmount": 10000
  }'
```

### Get High APY Opportunities
```bash
curl "http://localhost:3000/pairs/high-apy?limit=5&minApy=10"
```

### Check Available Tokens
```bash
curl "http://localhost:3000/tokens"
```

## Error Responses
All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "details": "Additional error details (development only)"
}
```

## Status Codes
- `200`: Success
- `400`: Bad Request (missing required fields)
- `404`: Not Found
- `500`: Internal Server Error
