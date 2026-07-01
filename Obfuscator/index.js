#!/usr/bin/env node

/**
 * VALINC SYNDICATE - Professional Source Code Obfuscator Compiler
 * Command Line Interface & Processing Engine
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { glob } = require('glob');
const presets = require('./obfuscator.config');

// ANSI Terminal Colors for Professional Reporting
const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function printBanner() {
  console.log(`
${COLORS.cyan}${COLORS.bold}==================================================================
        VALINC SYNDICATE :: SOURCE CODE SECURE COMPILER v1.0.0
==================================================================${COLORS.reset}
  `);
}

function printUsage() {
  console.log(`
${COLORS.bold}Usage:${COLORS.reset}
  node index.js --input <dir_or_file> --output <dir> [options]

${COLORS.bold}Options:${COLORS.reset}
  -i, --input <path>      Input directory or single Javascript file (Required)
  -o, --output <path>     Output directory to write compiled code (Required)
  -p, --preset <level>    Obfuscation intensity preset: 'lite' | 'medium' | 'ultra' (Default: 'medium')
  -w, --watermark <text>  Watermark comment to inject at the top of files
  -s, --silent            Suppress detailed progress messages

${COLORS.bold}Examples:${COLORS.reset}
  node index.js -i ../backend/src -o ../backend/dist -p ultra -w "PROTECTED BY VALINC SECURE V1"
  node index.js -i my-script.js -o ./dist -p lite
  `);
}

// Parse Command Line Arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: null,
    preset: 'medium',
    watermark: 'VALINC SYNDICATE SECURITY ENFORCED - UNAUTHORIZED ACCESS PROHIBITED',
    silent: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-i' || arg === '--input') {
      options.input = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '-p' || arg === '--preset') {
      options.preset = args[++i];
    } else if (arg === '-w' || arg === '--watermark') {
      options.watermark = args[++i];
    } else if (arg === '-s' || arg === '--silent') {
      options.silent = true;
    } else if (arg === '-h' || arg === '--help') {
      printBanner();
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

// Recursively ensure output directories exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

async function main() {
  printBanner();
  const options = parseArgs();

  if (!options.input || !options.output) {
    console.error(`${COLORS.red}${COLORS.bold}Error: Missing required parameters --input or --output.${COLORS.reset}`);
    printUsage();
    process.exit(1);
  }

  const presetConfig = presets[options.preset.toLowerCase()];
  if (!presetConfig) {
    console.error(`${COLORS.red}${COLORS.bold}Error: Invalid preset level '${options.preset}'. Available presets: lite, medium, ultra.${COLORS.reset}`);
    process.exit(1);
  }

  const absoluteInput = path.resolve(options.input);
  const absoluteOutput = path.resolve(options.output);

  if (!fs.existsSync(absoluteInput)) {
    console.error(`${COLORS.red}${COLORS.bold}Error: Input path '${options.input}' does not exist.${COLORS.reset}`);
    process.exit(1);
  }

  // Resolve files to process
  let files = [];
  const stat = fs.statSync(absoluteInput);

  if (stat.isFile()) {
    files = [absoluteInput];
  } else {
    // Read all .js files (excluding node_modules or output directory if nested)
    const globPattern = path.join(absoluteInput, '**/*.js').replace(/\\/g, '/');
    files = await glob(globPattern, {
      ignore: ['**/node_modules/**', `${absoluteOutput.replace(/\\/g, '/')}/**`]
    });
  }

  if (files.length === 0) {
    console.warn(`${COLORS.yellow}Warning: No Javascript (.js) files found to process in the input path.${COLORS.reset}`);
    process.exit(0);
  }

  console.log(`${COLORS.bold}Build Parameters:${COLORS.reset}`);
  console.log(`  - Input:        ${absoluteInput}`);
  console.log(`  - Output:       ${absoluteOutput}`);
  console.log(`  - Preset:       ${COLORS.magenta}${options.preset.toUpperCase()}${COLORS.reset}`);
  console.log(`  - Files Count:  ${files.length}`);
  console.log(`  - Watermark:    "${options.watermark}"\n`);
  console.log(`${COLORS.yellow}Starting Secure Compiling...${COLORS.reset}\n`);

  const startTime = Date.now();
  const buildHash = crypto.randomBytes(8).toString('hex').toUpperCase();
  const stats = {
    totalFiles: files.length,
    processed: 0,
    failed: 0,
    originalBytes: 0,
    obfuscatedBytes: 0
  };

  const fileReports = [];

  for (const file of files) {
    try {
      const relativePath = stat.isFile() 
        ? path.basename(file) 
        : path.relative(absoluteInput, file);
      
      const destinationPath = path.join(absoluteOutput, relativePath);
      const fileContent = fs.readFileSync(file, 'utf8');

      // Check if file is Typescript (inform user they should run tsc first)
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        console.warn(`${COLORS.yellow}[Warning] Skipped '${relativePath}': Found TypeScript source. Please compile your TS project to JS before obfuscation.${COLORS.reset}`);
        stats.failed++;
        continue;
      }

      stats.originalBytes += Buffer.byteLength(fileContent, 'utf8');

      // Execute Obfuscation Core Engine
      const obfuscationResult = JavaScriptObfuscator.obfuscate(fileContent, {
        ...presetConfig,
        // Injects self defending checks bound to the output file structure
        sourceMap: false
      });

      let finalCode = obfuscationResult.getObfuscatedCode();

      // Inject watermarks at top of file
      if (options.watermark) {
        const timestamp = new Date().toISOString();
        const watermarkComment = `/**\n * ${options.watermark}\n * Build Hash: ${buildHash}\n * Timestamp: ${timestamp}\n */\n\n`;
        finalCode = watermarkComment + finalCode;
      }

      // Write code to destination
      ensureDirectoryExistence(destinationPath);
      fs.writeFileSync(destinationPath, finalCode, 'utf8');

      const finalSize = Buffer.byteLength(finalCode, 'utf8');
      stats.obfuscatedBytes += finalSize;
      stats.processed++;

      if (!options.silent) {
        console.log(`${COLORS.green}✔ Compiled:${COLORS.reset} ${relativePath} (${COLORS.bold}${Buffer.byteLength(fileContent, 'utf8')} B${COLORS.reset} -> ${COLORS.bold}${finalSize} B${COLORS.reset})`);
      }

      fileReports.push({
        file: relativePath,
        originalSize: Buffer.byteLength(fileContent, 'utf8'),
        obfuscatedSize: finalSize,
        status: 'success'
      });
    } catch (err) {
      stats.failed++;
      console.error(`${COLORS.red}✘ Failed to compile:${COLORS.reset} ${file}`);
      console.error(`${COLORS.red}  Error Details: ${err.message}${COLORS.reset}`);
      fileReports.push({
        file,
        status: 'failed',
        error: err.message
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const sizeReduction = ((1 - (stats.obfuscatedBytes / stats.originalBytes)) * 100).toFixed(1);
  const sizeDiffWord = stats.obfuscatedBytes > stats.originalBytes ? 'Expansion' : 'Compression';
  const sizeDiffPct = Math.abs(parseFloat(sizeReduction)).toFixed(1);

  // Write compilation report to disk (Audit Trial Log)
  const reportPath = path.join(absoluteOutput, `build-report-${buildHash}.json`);
  const reportData = {
    buildHash,
    preset: options.preset,
    timestamp: new Date().toISOString(),
    durationSeconds: parseFloat(duration),
    summary: stats,
    files: fileReports
  };
  ensureDirectoryExistence(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');

  // GORGEOUS BUILD REPORT OUTPUT
  console.log(`
${COLORS.green}${COLORS.bold}==================================================================
                     SECURE BUILD SUMMARY REPORT
==================================================================${COLORS.reset}
  - Unique Build Hash:   ${COLORS.yellow}${COLORS.bold}${buildHash}${COLORS.reset}
  - Elapsed Time:        ${duration} seconds
  - Successfully Built:  ${stats.processed} / ${stats.totalFiles} files
  - Build Presets Used:  ${options.preset.toUpperCase()}
  - Total Raw Size:      ${(stats.originalBytes / 1024).toFixed(2)} KB
  - Total Obfuscated:    ${(stats.obfuscatedBytes / 1024).toFixed(2)} KB
  - Code Size ${sizeDiffWord}:   ${sizeDiffPct}%
  - Security Audit Log:  ${reportPath}
${COLORS.green}${COLORS.bold}==================================================================${COLORS.reset}
  `);
}

main();
