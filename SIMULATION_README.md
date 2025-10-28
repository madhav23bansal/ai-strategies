# Solana Transaction Simulation

This script simulates SOL transfers using the Termina SVM Engine API without executing real transactions.

## Setup

### 1. Configuration

Edit `src/index.ts` to set your configuration:

```typescript
const SENDER_PRIVATE_KEY = 'YOUR_BASE58_PRIVATE_KEY';
const RECIPIENT_ADDRESS = 'RECIPIENT_WALLET_ADDRESS';
const AMOUNT_TO_SEND = 0.01; // SOL amount
```

### 2. API Key (Optional)

The Termina simulator may require an API key. Set it using:

```bash
export SIMULATION_API_KEY='your_api_key'
```

Or set it in the script:

```typescript
const SIMULATION_API_KEY = process.env.SIMULATION_API_KEY || 'your_api_key';
```

### 3. Custom RPC (Optional)

```bash
export SOLANA_RPC_URL='https://your-rpc-endpoint.com'
```

## Usage

```bash
npm run dev
```

## Output

The script will output:

```
✅ Transaction would succeed
Compute Units Consumed: 12345

Account States:
  Address: ...
    Lamports: X.XXXXXX SOL
    Owner: ...
    Executable: false
    Rent Epoch: ...
```

## Environment Variables

```bash
# Required
WALLET_PRIVATE_KEY='your_private_key_base58'

# Optional
SIMULATION_API_KEY='your_api_key'
SIMULATION_URL='https://staging.simulator.termina.technology'
SOLANA_RPC_URL='https://mainnet.helius-rpc.com/...'
RECIPIENT_ADDRESS='recipient_address'
```

## Note

⚠️ This script simulates transactions and does NOT execute real transactions on-chain.

