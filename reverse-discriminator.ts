/**
 * Try to reverse engineer what instruction name produces 0xd995828fdd34fc77
 */

import crypto from 'crypto';

function getDiscriminator(instructionName: string): Buffer {
  const preimage = `global:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

const TARGET = Buffer.from([217, 149, 130, 143, 221, 52, 252, 119]);

console.log('Target discriminator: 0x' + TARGET.toString('hex'));
console.log('Trying common instruction names...\n');

const candidates = [
  // Transaction/transfer related
  'transact',
  'transaction',
  'execute',
  'execute_transaction',
  'execute_transact',
  'transact_v1',
  'transact_v2',

  // Privacy/ZK related
  'verify',
  'verify_proof',
  'prove',
  'private_transfer',
  'confidential_transfer',
  'shielded_transfer',

  // Light protocol style
  'invoke',
  'invoke_transaction',
  'process',
  'process_transaction',

  // With underscores
  'private_transaction',
  'shield_transaction',

  // Specific to privacy cash
  'cash_transaction',
  'privacy_transaction',
  'mixer_transaction',

  // Simple verbs
  'send',
  'transfer',
  'move',
  'swap',
  'mix',

  // Anchor default
  'instruction',
  'ix',
];

let found = false;

for (const name of candidates) {
  const disc = getDiscriminator(name);
  if (disc.equals(TARGET)) {
    console.log(`✅ FOUND IT: "${name}"`);
    console.log(`   Discriminator: 0x${disc.toString('hex')}`);
    found = true;
    break;
  }
}

if (!found) {
  console.log('❌ Not found in common names');
  console.log('\nThis could mean:');
  console.log('1. Privacy Cash uses custom discriminator calculation');
  console.log('2. It\'s a different namespace (not "global:")');
  console.log('3. Check their GitHub: https://github.com/Privacy-Cash');
  console.log('4. Or check on-chain IDL with: anchor idl fetch 9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');
}
