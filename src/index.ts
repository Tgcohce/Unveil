/**
 * UNVEIL - Solana Privacy Protocol Benchmark
 * Main entry point and CLI
 */

import dotenv from 'dotenv';

dotenv.config();

const BANNER = `
╦ ╦╔╗╔╦  ╦╔═╗╦╦
║ ║║║║╚╗╔╝║╣ ║║
╚═╝╝╚╝ ╚╝ ╚═╝╩╩═╝
Solana Privacy Protocol Benchmark
`;

function printHelp() {
  console.log(BANNER);
  console.log('Usage: npm run <command>\n');
  console.log('Commands:');
  console.log('  db:init    Initialize database');
  console.log('  index      Index Privacy Cash transactions');
  console.log('  analyze    Run privacy analysis');
  console.log('  api        Start API server');
  console.log('  dashboard  Start dashboard (coming soon)\n');
  console.log('Quick Start:');
  console.log('  1. Get Helius API key: https://dev.helius.xyz');
  console.log('  2. Create .env file with HELIUS_API_KEY');
  console.log('  3. npm run db:init');
  console.log('  4. npm run index');
  console.log('  5. npm run analyze');
  console.log('  6. npm run api\n');
  console.log('For detailed instructions, see GETTING_STARTED.md');
}

// Check if required environment variables are set
function checkEnv() {
  if (!process.env.HELIUS_API_KEY) {
    console.error('❌ Error: HELIUS_API_KEY not found in environment');
    console.error('   Please create a .env file with your Helius API key');
    console.error('   Get your free API key at: https://dev.helius.xyz\n');
    process.exit(1);
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('UNVEIL v1.0.0');
    process.exit(0);
  }

  // Just show banner and help
  printHelp();
}

export { checkEnv, printHelp };
