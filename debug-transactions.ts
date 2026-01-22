/**
 * Debug script to see what discriminators are actually in Privacy Cash transactions
 */

import { HeliusClient } from './src/indexer/helius';
import dotenv from 'dotenv';

dotenv.config();

const DEPOSIT_DISC = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
const WITHDRAW_DISC = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);

const PROGRAM_ID = '9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD';

async function debug() {
  const helius = new HeliusClient(process.env.HELIUS_API_KEY!);

  console.log('Fetching 10 recent Privacy Cash transactions...\n');

  // Get signatures
  const signatures = await helius.getSignaturesForAddress(PROGRAM_ID, 10);

  console.log(`Found ${signatures.length} signatures\n`);

  // Fetch full transactions
  const transactions = await helius.getTransactions(
    signatures.map(s => s.signature),
    10
  );

  console.log(`Successfully fetched ${transactions.length} transactions\n`);
  console.log('='.repeat(80));

  for (const tx of transactions) {
    console.log(`\nTransaction: ${tx.signature.slice(0, 8)}...`);
    console.log(`Slot: ${tx.slot}, Time: ${new Date(tx.timestamp).toISOString()}`);
    console.log(`Instructions: ${tx.instructions.length}`);

    for (let i = 0; i < tx.instructions.length; i++) {
      const instr = tx.instructions[i];
      console.log(`\n  [${i}] Program: ${instr.programId}`);

      if (instr.programId === PROGRAM_ID) {
        console.log(`      *** THIS IS PRIVACY CASH ***`);
        console.log(`      Data length: ${instr.data.length} bytes`);

        if (instr.data.length >= 8) {
          const disc = instr.data.slice(0, 8);
          console.log(`      Discriminator: [${Array.from(disc).join(', ')}]`);
          console.log(`      Discriminator hex: 0x${disc.toString('hex')}`);

          if (disc.equals(DEPOSIT_DISC)) {
            console.log(`      ✅ MATCHES DEPOSIT!`);
          } else if (disc.equals(WITHDRAW_DISC)) {
            console.log(`      ✅ MATCHES WITHDRAW!`);
          } else {
            console.log(`      ❌ UNKNOWN INSTRUCTION`);
          }
        } else {
          console.log(`      ⚠️ Data too short (no discriminator)`);
        }
      } else {
        console.log(`      Data length: ${instr.data.length} bytes`);
      }
    }

    console.log('\n' + '-'.repeat(80));
  }
}

debug().catch(console.error);
