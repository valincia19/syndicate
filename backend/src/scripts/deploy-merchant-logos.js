/**
 * Merchant Crypto Logo Deployer
 * 
 * 1. Fetches active merchant coins from NOWPayments API.
 * 2. Matches active coin tickers (e.g., 'usdttrc20') to base logos (e.g., 'usdt.png') 
 *    in backend/crypto_logos.
 * 3. Copies matched logos to the frontend public folder with their active ticker name.
 * 4. Generates a mapping config file in frontend/src/config/crypto-logos.json.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const BASE_URL = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io';

const SOURCE_DIR = path.join(__dirname, '../../crypto_logos');
const TARGET_DIR = path.join(__dirname, '../../../frontend/public/logos/payment/crypto');
const CONFIG_FILE = path.join(__dirname, '../../../frontend/src/config/crypto-logos.json');

/**
 * Helper to clean ticker name to its base symbol
 */
function cleanTicker(code) {
  let ticker = code.toLowerCase();
  const suffixes = ['trc20', 'erc20', 'bsc', 'bep20', 'sol', 'matic', 'polygon', 'algo', 'avax', 'ftm', 'op', 'arb'];
  for (const suffix of suffixes) {
    if (ticker.endsWith(suffix) && ticker !== suffix) {
      ticker = ticker.slice(0, -suffix.length);
    }
  }
  if (ticker.startsWith('usdt')) ticker = 'usdt';
  if (ticker.startsWith('usdc')) ticker = 'usdc';
  return ticker;
}

async function main() {
  console.log('🚀 Starting Merchant Crypto Logo Deployer...');

  if (!API_KEY) {
    console.error('❌ Error: NOWPAYMENTS_API_KEY is not defined in backend/.env');
    process.exit(1);
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created target directory: ${TARGET_DIR}`);
  }

  // Ensure source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Error: Source directory ${SOURCE_DIR} does not exist. Please run download-logos.js first.`);
    process.exit(1);
  }

  try {
    console.log('Fetching active merchant coins from NOWPayments...');
    const response = await axios.get(`${BASE_URL}/v1/merchant/coins`, {
      headers: { 'x-api-key': API_KEY }
    });

    const activeTickers = response.data?.selectedCurrencies;
    if (!Array.isArray(activeTickers)) {
      console.error('❌ Error: Invalid response structure from NOWPayments API', response.data);
      process.exit(1);
    }

    console.log(`Successfully fetched ${activeTickers.length} active currencies from merchant profile.`);

    // Read all files in source directory once
    const sourceFiles = fs.readdirSync(SOURCE_DIR);
    
    // Map filename without extension to its actual filename
    // e.g., 'btc' -> 'btc.png', 'hype' -> 'hype.jpg'
    const logoMap = {};
    for (const file of sourceFiles) {
      const ext = path.extname(file);
      const name = path.basename(file, ext).toLowerCase();
      logoMap[name] = file;
    }

    const deployedLogos = {};
    let copiedCount = 0;
    let missingCount = 0;

    for (const ticker of activeTickers) {
      const cleanSymbol = cleanTicker(ticker);
      const matchedLogoFile = logoMap[cleanSymbol];

      if (matchedLogoFile) {
        const sourcePath = path.join(SOURCE_DIR, matchedLogoFile);
        const fileExt = path.extname(matchedLogoFile);
        const targetFilename = `${ticker.toLowerCase()}${fileExt}`;
        const targetPath = path.join(TARGET_DIR, targetFilename);

        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        
        // Add to mapping
        deployedLogos[ticker.toLowerCase()] = `/logos/payment/crypto/${targetFilename}`;
        copiedCount++;
        
        console.log(`✅ Deployed: ${ticker} -> ${targetFilename} (matched from ${matchedLogoFile})`);
      } else {
        console.warn(`⚠️ Warning: No local logo found for ticker: ${ticker} (base symbol: ${cleanSymbol})`);
        missingCount++;
      }
    }

    // Write config file to frontend
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(deployedLogos, null, 2));
    console.log(`📝 Generated config file at: ${CONFIG_FILE}`);

    console.log('\n==================================================');
    console.log('🎉 MERCHANT LOGO DEPLOYMENT COMPLETE!');
    console.log('==================================================');
    console.log(`✅ Logos Deployed Successfully : ${copiedCount}`);
    console.log(`⚠️ Active Coins Missing Logo    : ${missingCount}`);
    console.log(`📂 Target Folder               : ${TARGET_DIR}`);
    console.log('==================================================\n');

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('❌ Deployer encountered a critical error:', errorMsg);
  }
}

main();
