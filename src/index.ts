import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import axios from 'axios';
import bs58 from 'bs58';
import https from 'https';

/**
 * Standalone script to simulate SOL transfer from one account to another on Solana
 * Uses Termina SVM Engine for transaction simulation without executing real transactions
 * 
 * Usage:
 * 1. Set your wallet private key in BASE58 format (from Sollet, Phantom, etc.)
 * 2. Set the recipient address
 * 3. Set the amount to send in SOL
 * 4. Run: npm run dev
 * 
 * Note: This script simulates transactions and does NOT execute real transactions
 */

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=6a01c832-320e-4aeb-83d3-af0adaaa3324'; // Change to mainnet-beta for production
const SIMULATION_URL = process.env.SIMULATION_URL || 'https://staging.simulator.termina.technology';
const SIMULATION_API_KEY = process.env.SIMULATION_API_KEY;
const AMOUNT_TO_SEND = 0.01; // Amount in SOL to send

// Your wallet private key (BASE58 format)
// !!! IMPORTANT: Never commit real private keys to version control !!!
// This is just for demo purposes - use environment variables in production
const SENDER_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '5iJfjG3R1uLbH2EPzaUSNkdraeyQow4GyAb39YKgyWptqggUH5Aejg2p8DC6EDZwE82QgpCJ3KsZ5DLinm3nRs3M';

// Recipient address
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || 'Ea9AhyB7skC36zqwv3yZ6uda6nmnFA54aEDjPtY9aSxX';

/**
 * Convert a BASE58 private key to a Solana Keypair
 */
function getKeypairFromPrivateKey(privateKey: string): Keypair {
  try {
    const decodedKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    throw new Error('Invalid private key format. Please provide a BASE58 encoded private key.');
  }
}

/**
 * Simulate a transaction using Termina SVM Engine
 */
async function simulateSolTransaction(
  fromKeypair: Keypair, 
  toPublicKey: PublicKey, 
  amount: number,
  connection: Connection
) {
  try {
    console.log('Creating transaction...');
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amount * 1e9, // Convert SOL to lamports (1 SOL = 1e9 lamports)
      })
    );
    
    // Get recent blockhash
    console.log('Fetching recent blockhash...');
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;
    
    // Sign the transaction
    console.log('Signing transaction...');
    transaction.sign(fromKeypair);
    
    // Serialize the transaction to base64
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    const base64Transaction = serializedTransaction.toString('base64');
    
    // Send to simulation API
    console.log('Sending to simulation API...');
    
    const requestPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'runSimulationGroup',
      params: {
        groups: [
          {
            transactions: [base64Transaction],
            account_addresses: [
              fromKeypair.publicKey.toBase58(), // Sender address
              toPublicKey.toBase58(), // Recipient address
            ],
          },
        ],
      },
    };
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if provided
    if (SIMULATION_API_KEY) {
      headers['Authorization'] = `Bearer ${SIMULATION_API_KEY}`;
    }
    
    const response = await axios.post(SIMULATION_URL, requestPayload, {
      headers,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Allow self-signed certificates for staging
      }),
    });
    
    const result = response.data.result?.[0]?.[0];
    
    if (!result) {
      throw new Error('No simulation result returned');
    }
    
    console.log('\n📊 Simulation Results:');
    console.log('=' .repeat(50));
    
    if (result.success) {
      console.log('✅ Transaction would succeed');
      console.log(`Compute Units Consumed: ${result.compute_units_consumed}`);
      
      if (result.logs && result.logs.length > 0) {
        console.log('\nTransaction Logs:');
        result.logs.slice(0, 5).forEach((log: string, index: number) => {
          console.log(`  ${index + 1}. ${log.substring(0, 100)}${log.length > 100 ? '...' : ''}`);
        });
      }
      
      console.log('\nAccount States:');
      if (result.account_states) {
        Object.entries(result.account_states).forEach(([address, state]: [string, any]) => {
          if (state) {
            console.log(`\n  Address: ${address}`);
            console.log(`    Lamports: ${(state.lamports / 1e9).toFixed(9)} SOL`);
            console.log(`    Owner: ${state.owner || 'N/A'}`);
            console.log(`    Executable: ${state.executable}`);
            console.log(`    Rent Epoch: ${state.rent_epoch}`);
          } else {
            console.log(`\n  Address: ${address} - Deleted/Non-existent`);
          }
        });
      }
    } else {
      console.log('❌ Transaction would fail');
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    }
    
    console.log('=' .repeat(50));
    
    return result;
  } catch (error: any) {
    console.error('❌ Error simulating transaction:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
      
      // Provide helpful error message for 401
      if (error.response.status === 401) {
        console.error('\n💡 Tip: The simulation API may require authentication.');
        console.error('   Set SIMULATION_API_KEY environment variable if you have an API key.');
      }
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Solana transaction script...\n');
    
    // Validate configuration
    if (!SENDER_PRIVATE_KEY || SENDER_PRIVATE_KEY === 'YOUR_BASE58_PRIVATE_KEY_HERE') {
      console.error('❌ Error: Private key is required');
      console.log('\nPlease provide your wallet private key using one of these methods:');
      console.log('1. Set WALLET_PRIVATE_KEY environment variable');
      console.log('2. Update SENDER_PRIVATE_KEY in the script');
      console.log('\nTo get your private key:');
      console.log('- Phantom: Settings > Export Private Key');
      console.log('- Sollet: Settings > Export Key');
      process.exit(1);
    }
    
    if (SENDER_PRIVATE_KEY.length < 80) {
      console.error('❌ Error: Invalid private key format');
      console.log('Private key should be BASE58 encoded and at least 80 characters long');
      process.exit(1);
    }
    
    // Parse the private key
    console.log('Parsing private key...');
    const senderKeypair = getKeypairFromPrivateKey(SENDER_PRIVATE_KEY);
    console.log(`Sender address: ${senderKeypair.publicKey.toBase58()}`);
    
    // Parse recipient address
    console.log('Parsing recipient address...');
    let recipientPublicKey: PublicKey;
    try {
      recipientPublicKey = new PublicKey(RECIPIENT_ADDRESS);
      console.log(`Recipient address: ${recipientPublicKey.toBase58()}`);
    } catch (error) {
      throw new Error(`Invalid recipient address: ${RECIPIENT_ADDRESS}`);
    }
    
    // Connect to Solana
    console.log('Connecting to Solana...');
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    
    // Get current balance
    const balance = await connection.getBalance(senderKeypair.publicKey);
    console.log(`Current balance: ${balance / 1e9} SOL`);
    
    // Simulate the transaction
    console.log(`\nSimulating transfer of ${AMOUNT_TO_SEND} SOL to ${recipientPublicKey.toBase58()}...`);
    await simulateSolTransaction(senderKeypair, recipientPublicKey, AMOUNT_TO_SEND, connection);
    
    console.log('\n✨ Simulation completed successfully!');
    console.log('\n⚠️  This was a simulation - no real transaction was sent');
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { simulateSolTransaction, getKeypairFromPrivateKey };

