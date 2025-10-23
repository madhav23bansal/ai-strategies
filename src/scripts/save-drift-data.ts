#!/usr/bin/env ts-node

import fs from 'fs';
import { getDriftPerpsWithVolumeAndPricePoints } from './get-drift-perps';
import path from 'path';

// Function to save data to file
function saveDataToFile(data: any[], filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `drift-perps-data-${timestamp}.json`;
  const outputFilename = filename || defaultFilename;
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, outputFilename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data saved to: ${filePath}`);
    console.log(`📊 Total markets: ${data.length}`);
    console.log(`📁 File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error saving data to file:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Fetching Drift perpetual markets data...');
    
    const mergedData = await getDriftPerpsWithVolumeAndPricePoints();
    
    // Get filename from command line argument or use default
    const customFilename = process.argv[2];
    
    // Save to file
    saveDataToFile(mergedData, customFilename);
    
    // Show summary
    console.log('\n📈 Top 10 Markets by Volume:');
    const sortedByVolume = mergedData
      .sort((a, b) => parseFloat(b.volume24h?.quoteVolume || '0') - parseFloat(a.volume24h?.quoteVolume || '0'))
      .slice(0, 10);
    
    sortedByVolume.forEach((market, index) => {
      const volume = parseFloat(market.volume24h?.quoteVolume || '0');
      console.log(`${index + 1}. ${market.symbol} - $${volume.toLocaleString()} - Price: $${market.price24hAgo}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}
