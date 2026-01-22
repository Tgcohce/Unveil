/**
 * Create realistic demo data for UNVEIL
 */
import { UnveilDatabase } from './src/indexer/db';
import { Deposit, Withdrawal } from './src/indexer/types';

const db = new UnveilDatabase('./data/unveil.db');

console.log('Creating demo data...\n');

// Generate 500 deposits
const deposits: Deposit[] = [];
const baseTime = Date.now() - 30 * 24 * 3600 * 1000; // 30 days ago

// Common amounts (in SOL converted to lamports)
const commonAmounts = [
  0.1 * 1e9,   // 0.1 SOL
  0.5 * 1e9,   // 0.5 SOL
  1 * 1e9,     // 1 SOL
  5 * 1e9,     // 5 SOL
  10 * 1e9,    // 10 SOL
];

for (let i = 0; i < 500; i++) {
  const timestamp = baseTime + Math.random() * 30 * 24 * 3600 * 1000;
  const amount = commonAmounts[Math.floor(Math.random() * commonAmounts.length)];

  // Some unique amounts for realism
  const finalAmount = Math.random() > 0.8 ?
    Math.floor(Math.random() * 20 * 1e9) :
    amount;

  deposits.push({
    signature: `demo_deposit_${i}_${Date.now()}`,
    timestamp,
    slot: 250000000 + i,
    amount: finalAmount,
    depositor: `demo_wallet_${Math.floor(Math.random() * 100)}`,
    commitment: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    spent: false,
  });
}

// Sort by timestamp
deposits.sort((a, b) => a.timestamp - b.timestamp);

// Generate 400 withdrawals (80% of deposits)
const withdrawals: Withdrawal[] = [];
for (let i = 0; i < 400; i++) {
  const deposit = deposits[i];

  // Random time between 1 hour and 7 days after deposit
  const minDelay = 3600 * 1000; // 1 hour
  const maxDelay = 7 * 24 * 3600 * 1000; // 7 days
  const delay = minDelay + Math.random() * (maxDelay - minDelay);

  const timestamp = deposit.timestamp + delay;
  const fee = 0.006 * 1e9; // 0.006 SOL fee

  withdrawals.push({
    signature: `demo_withdrawal_${i}_${Date.now()}`,
    timestamp,
    slot: deposit.slot + Math.floor(delay / 400),
    amount: deposit.amount,
    recipient: `demo_recipient_${Math.floor(Math.random() * 150)}`,
    nullifier: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    relayer: `demo_relayer_${Math.floor(Math.random() * 10)}`,
    fee,
  });

  // Mark deposit as spent
  deposit.spent = true;
  deposit.spentAt = timestamp;
  deposit.withdrawalSignature = withdrawals[i].signature;
}

// Insert into database
console.log('Inserting withdrawals first...');
db.insertWithdrawals(withdrawals);

console.log('Inserting deposits...');
// Clear the foreign key references for initial insert
const depositsWithoutFK = deposits.map(d => ({
  ...d,
  withdrawalSignature: undefined,
  spentAt: undefined,
  spent: false,
}));
db.insertDeposits(depositsWithoutFK);

// Now update the spent deposits
console.log('Updating spent deposits...');
for (let i = 0; i < 400; i++) {
  db.markDepositSpent(deposits[i].signature, withdrawals[i].signature, withdrawals[i].timestamp);
}

// Show stats
const stats = db.getStats();
console.log('\n✅ Demo data created!');
console.log(`   Deposits: ${stats.totalDeposits}`);
console.log(`   Withdrawals: ${stats.totalWithdrawals}`);
console.log(`   Unspent: ${stats.unspentDeposits}`);
console.log(`   TVL: ${(stats.tvl / 1e9).toFixed(2)} SOL`);
console.log(`   Unique depositors: ${stats.uniqueDepositors}`);

db.close();

console.log('\nNow run:');
console.log('  npm run analyze    - See privacy analysis');
console.log('  npm run api        - Start API server');
console.log('  Dashboard: http://localhost:5173');
