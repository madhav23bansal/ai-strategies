# AI Strategies - Investment Data Platform

A Node.js TypeScript application that structures DeFi investment data for AI-powered strategy suggestions.

## 🚀 Features

- **PostgreSQL Database** with Docker Compose setup + **pgvector** extension
- **Prisma ORM** for type-safe database operations
- **Vector Similarity Search** for AI-powered strategy matching
- **Structured DeFi Data** from multiple protocols:
  - Jupiter Lend (Borrowing & Lending markets)
  - Drift (Borrow/Lend markets)
  - DeFiLlama (Protocol data)
  - Kamino (Multiply vaults & Lending markets)
- **Investment Strategy Framework** with vector embeddings for LLM integration
- **Real-time Data Analysis** and APY calculations
- **Cross-Protocol Analysis** for multi-protocol strategies

## 📊 Data Sources

The application processes data from various DeFi protocols:

- **Jupiter Lend**: 43 borrow markets, 6 lend markets
- **Drift**: 24 markets with interest rates and utilization
- **DeFiLlama**: 21 protocols with TVL data
- **Kamino**: 10 multiply vaults, 28 lending markets

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   ```

3. **Start PostgreSQL with Docker:**
   ```bash
   docker-compose up -d
   ```

4. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

5. **Push schema to database:**
   ```bash
   npm run db:push
   ```

6. **Seed the database with real data:**
   ```bash
   npm run db:seed
   ```

7. **Run the application:**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── data/                          # Raw JSON data files
│   ├── JupLend-borrowing.json    # Jupiter borrow markets
│   ├── JupLend-lending.json      # Jupiter lend markets
│   ├── borrow_lend_drift.json    # Drift markets
│   ├── DefiLLAMA.json            # DeFiLlama protocols
│   ├── multiply-vaults-kamino.json # Kamino vaults
│   └── lending-markets-kamino.json # Kamino lending
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Data seeding script
├── src/
│   └── index.ts                  # Main application
├── docker-compose.yml            # PostgreSQL setup
└── package.json                  # Dependencies & scripts
```

## 🗄️ Database Schema

### Core Models

- **Token**: Cryptocurrency tokens with metadata
- **JupiterBorrowMarket**: Jupiter lending borrow markets
- **JupiterLendMarket**: Jupiter lending supply markets
- **DriftMarket**: Drift protocol markets
- **DeFiLlamaProtocol**: DeFiLlama protocol data
- **KaminoVault**: Kamino multiply vaults
- **KaminoLendingMarket**: Kamino lending markets
- **KaminoReserve**: Individual reserves within lending markets
- **InvestmentStrategy**: AI-generated strategies with vector embeddings
- **Portfolio**: User investment tracking

### Key Relationships

- Tokens are referenced by all market types
- Investment strategies link to protocols and tokens
- Portfolios track user investments in strategies

## 🤖 LLM Integration Ready

The database is structured to support AI-powered investment strategy generation:

- **Strategy Types**: lending, borrowing, vault, arbitrage
- **Risk Levels**: low, medium, high
- **Protocol Integration**: Multi-protocol strategy support
- **APY Tracking**: Real-time yield calculations
- **Token Support**: Multi-asset strategies
- **Vector Embeddings**: 1536-dimensional embeddings for semantic similarity search
- **Risk Embeddings**: Separate risk profile vectors for risk-based matching
- **Similarity Search**: Cosine distance queries for finding similar strategies

## 📈 Available Scripts

- `npm run dev` - Run development server
- `npm run build` - Build TypeScript
- `npm run start` - Run compiled JavaScript
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with data
- `npm run db:studio` - Open Prisma Studio
- `npm run watch` - Watch mode for TypeScript

## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/ai_strategies?schema=public"
NODE_ENV=development
PORT=3000
```

### Docker Configuration

- **PostgreSQL**: Port 5432
- **Database**: ai_strategies
- **User**: postgres
- **Password**: postgres123

## 📊 Sample Data

The application includes sample investment strategies with vector embeddings:

1. **High Yield Lending** (12.5% APY, Low Risk) - Lend USDC on Jupiter
2. **Leveraged Vault Strategy** (45.2% APY, High Risk) - 6x leverage on JLP
3. **Arbitrage Opportunities** (25.8% APY, Medium Risk) - Cross-protocol arbitrage

### Real DeFi Data Seeded:
- **40 tokens** with price data
- **43 Jupiter borrow markets** with rates
- **6 Jupiter lend markets** with APY data
- **24 Drift markets** with interest rates
- **21 DeFiLlama protocols** with TVL data
- **10 Kamino multiply vaults** with leverage data
- **28 Kamino lending markets** with reserve counts

## 🤖 AI-Powered Strategy Generation

The platform now includes a complete AI system for generating investment strategies:

### **SQL Query Generation**
- **Natural Language to SQL**: Convert user queries to complex SQL
- **Database Schema Awareness**: Understands all DeFi data relationships
- **Query Explanation**: Provides plain English explanations
- **Automatic Execution**: Runs queries and returns results

### **Strategy Generation Engine**
- **10 Strategy Types**: Stables, Looping, Yield Farming, Multi-Protocol, Airdrop, Pair Trading, Liquidation Arbitrage, Leverage Farming, Cross-Chain, Volatility Trading
- **Risk Assessment**: Conservative, Moderate, Aggressive risk profiles
- **Market Analysis**: Real-time data-driven strategy recommendations
- **Vector Similarity**: Find similar strategies using embeddings
- **Strategy Variations**: Generate multiple variations of strategies

### **API Endpoints**
- `POST /api/strategies/generate` - Generate investment strategies
- `POST /api/sql/generate` - Generate and execute SQL queries
- `POST /api/strategies/similar` - Find similar strategies
- `GET /api/market/analysis` - Get market analysis
- `GET /api/strategies/types` - List available strategy types

## 🚀 Quick Start

### **1. Start the API Server**
```bash
npm run api
```

### **2. Test Command Processing (No OpenAI Required)**
```bash
npm run demo:commands
```

### **3. Test Full AI System (requires OpenAI API key)**
```bash
npm run test:ai
```

### **4. Example API Usage**
```bash
# Main command endpoint (recommended)
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
```

## 📊 Available Scripts

- `npm run dev` - Run development server
- `npm run api` - Start AI API server
- `npm run demo:commands` - Test command processing (no OpenAI required)
- `npm run test:ai` - Test full AI system (requires OpenAI key)
- `npm run build` - Build TypeScript
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with data
- `npm run db:studio` - Open Prisma Studio

## 📝 Notes

- Data is seeded from real DeFi protocols
- AI system requires OpenAI API key for full functionality
- Vector embeddings enable semantic strategy search
- All strategies are generated using real market data
- All monetary values are stored as Decimal for precision
- The schema supports both current and historical data
- Ready for production deployment with proper environment configuration
