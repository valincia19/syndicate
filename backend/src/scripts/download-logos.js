/**
 * Cryptocurrency Logo Downloader (Super Optimized)
 * 
 * Fetches all/most coins from CoinGecko Markets API using pagination,
 * filters out already-downloaded logos instantly without delays,
 * downloads remaining logos in parallel batches, and uses randomized delays to prevent rate limits.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Target folder for logos
const TARGET_DIR = path.join(__dirname, '../../crypto_logos');

// Configuration
const COINGECKO_API = 'https://api.coingecko.com/api/v3/coins/markets';
const VS_CURRENCY = 'usd';
const PER_PAGE_LIMIT = 250;     // CoinGecko max per page
const MAX_PAGES = 20;           // Fetch up to 5000 coins (20 pages * 250)
const CONCURRENCY_LIMIT = 8;    // Number of parallel downloads at once

/**
 * Helper delay function
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a random delay between min and max milliseconds
 */
const getRandomDelay = (min = 400, max = 1200) => Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Downloads a single file from URL and saves it locally
 */
async function downloadImage(url, filename) {
  const destPath = path.join(TARGET_DIR, filename);

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 15000 // 15s timeout
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve({ status: 'SUCCESS', message: `Downloaded: ${filename}` });
      });
      writer.on('error', (err) => {
        writer.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    });
  } catch (error) {
    if (error.response) {
      return { status: 'ERROR', code: error.response.status, message: `HTTP Error ${error.response.status} (${error.response.statusText})` };
    }
    return { status: 'ERROR', code: 'NETWORK_ERROR', message: `Network/Timeout error: ${error.message}` };
  }
}

/**
 * Makes a GET request with automatic retry on 429 rate limit
 */
async function fetchWithRetry(url, config, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const waitTime = 60000; // Wait 60 seconds on rate limit
        console.warn(`\n⚠️ [RATE LIMIT] CoinGecko returned HTTP 429. Pausing for ${waitTime / 1000}s before retrying...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded on HTTP 429 Rate Limit');
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🚀 Starting CoinGecko Logo Downloader (Super Optimized)...');

  // Create target directory if it doesn't exist
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created directory: ${TARGET_DIR}`);
  }

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📦 [PAGE ${page}/${MAX_PAGES}] Fetching next ${PER_PAGE_LIMIT} coins from CoinGecko...`);
    console.log(`--------------------------------------------------`);

    let coins = [];
    try {
      const response = await fetchWithRetry(COINGECKO_API, {
        params: {
          vs_currency: VS_CURRENCY,
          order: 'market_cap_desc',
          per_page: PER_PAGE_LIMIT,
          page: page,
          sparkline: false
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      coins = response.data;
      if (!Array.isArray(coins) || coins.length === 0) {
        console.log('ℹ️ No more coins returned from API. Ending process.');
        break;
      }
    } catch (error) {
      console.error(`❌ Failed to fetch coin list for Page ${page}:`, error.message);
      console.log('Skipping to next page...');
      await delay(5000);
      continue;
    }

    console.log(`Fetched metadata for ${coins.length} coins on Page ${page}. Filtering already downloaded files...`);

    // Step 1: Filter and skip existing files INSTANTLY (without delays)
    const downloadQueue = [];
    
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const symbol = coin.symbol.toLowerCase();
      const originalUrl = coin.image;
      const coinIndex = (page - 1) * PER_PAGE_LIMIT + (i + 1);

      if (!originalUrl) {
        console.log(`[${coinIndex}] ⚠️ [SKIP - NO IMAGE] ${coin.name} (${symbol.toUpperCase()})`);
        totalFailed++;
        continue;
      }

      // Convert image URL to HD Standard size if it contains '/large/'
      let hdImageUrl = originalUrl;
      if (originalUrl.includes('/large/')) {
        hdImageUrl = originalUrl.replace('/large/', '/standard/');
      }

      const fileExtension = path.extname(new URL(hdImageUrl).pathname) || '.png';
      const filename = `${symbol}${fileExtension}`;
      const destPath = path.join(TARGET_DIR, filename);

      if (fs.existsSync(destPath)) {
        // Log instantly, no delay
        console.log(`[${coinIndex}] ⏭️ [SKIP - EXISTS] ${coin.name} (${symbol.toUpperCase()}) -> ${filename}`);
        totalSkipped++;
      } else {
        downloadQueue.push({
          index: coinIndex,
          coinName: coin.name,
          symbol: symbol.toUpperCase(),
          hdImageUrl,
          originalUrl,
          filename
        });
      }
    }

    if (downloadQueue.length === 0) {
      console.log(`✨ All ${coins.length} coins on Page ${page} already exist in local directory.`);
      continue;
    }

    console.log(`\n📥 Starting parallel download for ${downloadQueue.length} remaining coins (Concurrency limit: ${CONCURRENCY_LIMIT})...`);

    // Step 2: Download queue using concurrent worker pools
    const runWorker = async () => {
      while (downloadQueue.length > 0) {
        const item = downloadQueue.shift();
        if (!item) break;

        // Perform random delay before starting each download to mimic human behavior
        await delay(getRandomDelay(200, 700));

        let downloadResult = await downloadImage(item.hdImageUrl, item.filename);

        if (downloadResult.status === 'SUCCESS') {
          console.log(`[${item.index}] ✅ [DOWNLOAD SUCCESS] ${item.coinName} (${item.symbol}) -> ${item.filename}`);
          totalDownloaded++;
        } else {
          console.warn(`[${item.index}] ❌ [HD FAILED] ${item.coinName} (${item.symbol}) -> ${downloadResult.message}`);
          
          // Fallback to original resolution
          if (item.hdImageUrl !== item.originalUrl) {
            console.log(`[${item.index}] 🔄 [RETRY FALLBACK] ${item.coinName} (${item.symbol}) -> Fetching original resolution...`);
            let fallbackResult = await downloadImage(item.originalUrl, item.filename);

            if (fallbackResult.status === 'SUCCESS') {
              console.log(`[${item.index}] 🎉 [FALLBACK SUCCESS] ${item.coinName} (${item.symbol}) -> Downloaded original resolution.`);
              totalDownloaded++;
            } else {
              console.error(`[${item.index}] 🚫 [FATAL FAILED] ${item.coinName} (${item.symbol}) -> Both HD and Original failed: ${fallbackResult.message}`);
              totalFailed++;
            }
          } else {
            totalFailed++;
          }
        }
      }
    };

    // Run workers in parallel
    const workers = Array(Math.min(CONCURRENCY_LIMIT, downloadQueue.length))
      .fill(null)
      .map(() => runWorker());

    await Promise.all(workers);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 LOGO DOWNLOADING WORKFLOW COMPLETE!`);
  console.log(`==================================================`);
  console.log(`✅ Total Successfully Downloaded : ${totalDownloaded}`);
  console.log(`⏭️ Total Skipped (Already exists): ${totalSkipped}`);
  console.log(`❌ Total Failed/Unreachable      : ${totalFailed}`);
  console.log(`📂 Output Folder                 : ${TARGET_DIR}`);
  console.log(`==================================================\n`);
}

main();
