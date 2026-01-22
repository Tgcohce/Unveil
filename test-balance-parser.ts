/**
 * Test the balance parser on real Privacy Cash transactions
 */

import dotenv from 'dotenv';
import { HeliusClient } from './src/indexer/helius';
import { PrivacyCashBalanceParser } from './src/indexer/privacy-cash-balance';

dotenv.config();

const PROGRAM_ID = '9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD';

async function test() {
  console.log('🧪 Testing Balance Parser on Real Privacy Cash Transactions\n');

  const helius = new HeliusClient(process.env.HELIUS_API_KEY!);
  const parser = new PrivacyCashBalanceParser();

  // Enable debug logging
  process.env.DEBUG_PRIVACY_CASH = 'true';

  console.log('Fetching 20 recent transactions...\n');

  // Get signatures
  const signatures = await helius.getSignaturesForAddress(PROGRAM_ID, 20);
  console.log(`✅ Fetched ${signatures.length} signatures\n`);

  // Fetch full transactions with balance data
  const transactions = await helius.getTransactions(
    signatures.map(s => s.signature),
    5
  );

  console.log(`✅ Fetched ${transactions.length} full transactions\n`);
  console.log('='.repeat(80));

  // Parse each transaction
  let deposits = 0;
  let withdrawals = 0;
  let unknown = 0;

  for (const tx of transactions) {
    const parsed = parser.parsePrivacyCashTransaction(tx);

    if (!parsed) {
      unknown++;
      console.log(`\n❌ UNKNOWN: ${tx.signature.slice(0, 8)}...`);
      continue;
    }

    if (parsed.type === 'deposit') {
      deposits++;
      console.log(`\n✅ DEPOSIT: ${parsed.signature.slice(0, 8)}...`);
      console.log(`   Amount: ${(parsed.amount / 1e9).toFixed(4)} SOL`);
      console.log(`   Depositor: ${parsed.userWallet.slice(0, 8)}...`);
    } else if (parsed.type === 'withdrawal') {
      withdrawals++;
      console.log(`\n✅ WITHDRAWAL: ${parsed.signature.slice(0, 8)}...`);
      console.log(`   Amount: ${(parsed.amount / 1e9).toFixed(4)} SOL`);
      console.log(`   Recipient: ${parsed.userWallet.slice(0, 8)}...`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`   Deposits: ${deposits}`);
  console.log(`   Withdrawals: ${withdrawals}`);
  console.log(`   Unknown: ${unknown}`);
  console.log(`   Success Rate: ${((deposits + withdrawals) / transactions.length * 100).toFixed(1)}%`);

  if (deposits + withdrawals > 0) {
    console.log('\n✅ Parser is working! Found actual deposits/withdrawals.');
    console.log('   Ready to run full indexer.');
  } else {
    console.log('\n❌ Parser found 0 deposits/withdrawals.');
    console.log('   Check pool account address or balance change thresholds.');
  }
}

test().catch(console.error);
