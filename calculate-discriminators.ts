/**
 * Calculate Anchor instruction discriminators
 * Discriminator = sha256("global:<instruction_name>")[0:8]
 */

import crypto from 'crypto';

function getDiscriminator(instructionName: string): Buffer {
  const preimage = `global:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

console.log('=== Calculating Anchor Discriminators ===\n');

// Common instruction names for privacy/mixer protocols
const instructionNames = [
  // Standard names
  'deposit',
  'withdraw',
  'shield',
  'unshield',

  // Camel case variants
  'Deposit',
  'Withdraw',
  'Shield',
  'Unshield',

  // Snake case variants
  'deposit_funds',
  'withdraw_funds',
  'shield_funds',
  'unshield_funds',

  // Initialize
  'initialize',
  'init',

  // Other possible names
  'transfer_in',
  'transfer_out',
  'add_note',
  'spend_note',
];

console.log('Instruction Name'.padEnd(25) + 'Discriminator (hex)'.padEnd(20) + 'Discriminator (decimal array)');
console.log('='.repeat(80));

for (const name of instructionNames) {
  const disc = getDiscriminator(name);
  const hex = disc.toString('hex');
  const arr = Array.from(disc).join(', ');
  console.log(name.padEnd(25) + hex.padEnd(20) + `[${arr}]`);
}

console.log('\n=== What We Currently Have (WRONG) ===\n');
console.log('DEPOSIT_DISCRIMINATOR:  [242, 35, 198, 137, 82, 225, 242, 182]');
console.log('                        0x' + Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]).toString('hex'));
console.log('WITHDRAW_DISCRIMINATOR: [183, 18, 70, 156, 148, 109, 161, 34]');
console.log('                        0x' + Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]).toString('hex'));

console.log('\n=== Next Steps ===\n');
console.log('1. Check Solscan for recent transactions: https://solscan.io/account/9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');
console.log('2. Find a transaction with SOL transfer TO the program (deposit)');
console.log('3. Copy the instruction data hex');
console.log('4. Compare first 8 bytes with discriminators above');
console.log('5. Or run debug-transactions.ts to see what discriminators appear in real txs');
