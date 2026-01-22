/**
 * SQLite database layer for UNVEIL
 * Handles storage and retrieval of deposits, withdrawals, and metrics
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  Deposit,
  Withdrawal,
  AnonymitySetSnapshot,
  ConfidentialTransfer,
  ConfidentialAccount,
  ConfidentialMint,
  ShadowWireTransfer,
  ShadowWireAccount,
  SilentSwapInput,
  SilentSwapOutput,
  SilentSwapMatch,
  SilentSwapAccount,
  CTDeposit,
  CTWithdraw,
  CTMatch,
} from "./types";

export class UnveilDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.initSchema();
  }

  private initSchema() {
    // Deposits table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS deposits (
        signature TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        depositor TEXT NOT NULL,
        commitment TEXT NOT NULL,
        spent INTEGER DEFAULT 0,
        spent_at INTEGER,
        withdrawal_signature TEXT,
        FOREIGN KEY (withdrawal_signature) REFERENCES withdrawals(signature)
      );

      CREATE INDEX IF NOT EXISTS idx_deposits_timestamp ON deposits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_deposits_amount ON deposits(amount);
      CREATE INDEX IF NOT EXISTS idx_deposits_spent ON deposits(spent);
      CREATE INDEX IF NOT EXISTS idx_deposits_depositor ON deposits(depositor);
    `);

    // Withdrawals table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        signature TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        recipient TEXT NOT NULL,
        nullifier TEXT NOT NULL,
        relayer TEXT,
        fee INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_withdrawals_timestamp ON withdrawals(timestamp);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_amount ON withdrawals(amount);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_recipient ON withdrawals(recipient);
    `);

    // Anonymity set snapshots (time-series)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS anonymity_snapshots (
        timestamp INTEGER PRIMARY KEY,
        avg_size REAL NOT NULL,
        min_size INTEGER NOT NULL,
        max_size INTEGER NOT NULL,
        active_deposits INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON anonymity_snapshots(timestamp);
    `);

    // Indexer state
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_signature TEXT,
        last_slot INTEGER NOT NULL DEFAULT 0,
        total_indexed INTEGER NOT NULL DEFAULT 0,
        last_updated INTEGER NOT NULL
      );

      INSERT OR IGNORE INTO indexer_state (id, last_slot, total_indexed, last_updated)
      VALUES (1, 0, 0, 0);
    `);

    // Confidential Transfers tables (Token-2022)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS confidential_transfers (
        signature TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        mint TEXT NOT NULL,
        source TEXT NOT NULL,
        destination TEXT NOT NULL,
        source_owner TEXT NOT NULL,
        destination_owner TEXT NOT NULL,
        encrypted_amount TEXT NOT NULL,
        auditor_key TEXT,
        instruction_type TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ct_timestamp ON confidential_transfers(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ct_mint ON confidential_transfers(mint);
      CREATE INDEX IF NOT EXISTS idx_ct_source_owner ON confidential_transfers(source_owner);
      CREATE INDEX IF NOT EXISTS idx_ct_destination_owner ON confidential_transfers(destination_owner);
      CREATE INDEX IF NOT EXISTS idx_ct_auditor ON confidential_transfers(auditor_key);
    `);

    // Confidential accounts aggregation
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS confidential_accounts (
        address TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        mint TEXT NOT NULL,
        first_confidential_tx INTEGER NOT NULL,
        last_confidential_tx INTEGER NOT NULL,
        total_confidential_txs INTEGER NOT NULL,
        also_used_public INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_ct_accounts_owner ON confidential_accounts(owner);
      CREATE INDEX IF NOT EXISTS idx_ct_accounts_mint ON confidential_accounts(mint);
    `);

    // Confidential mints aggregation
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS confidential_mints (
        address TEXT PRIMARY KEY,
        auditor_key TEXT,
        total_confidential_txs INTEGER NOT NULL,
        unique_users INTEGER NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ct_mints_auditor ON confidential_mints(auditor_key);
    `);

    // ShadowWire tables (Bulletproof-based mixing)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shadowwire_transfers (
        signature TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount_hidden INTEGER NOT NULL,
        transfer_type TEXT NOT NULL,
        proof_pda TEXT,
        relayer_fee INTEGER NOT NULL,
        token TEXT NOT NULL,
        amount INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_sw_timestamp ON shadowwire_transfers(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sw_sender ON shadowwire_transfers(sender);
      CREATE INDEX IF NOT EXISTS idx_sw_recipient ON shadowwire_transfers(recipient);
      CREATE INDEX IF NOT EXISTS idx_sw_type ON shadowwire_transfers(transfer_type);
    `);

    // ShadowWire accounts aggregation
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shadowwire_accounts (
        wallet TEXT PRIMARY KEY,
        available INTEGER NOT NULL,
        deposited INTEGER NOT NULL,
        withdrawn_to_escrow INTEGER NOT NULL,
        pool_address TEXT NOT NULL,
        total_transfers INTEGER NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sw_accounts_pool ON shadowwire_accounts(pool_address);
    `);

    // SilentSwap tables (Cross-chain privacy routing via Secret Network)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS silentswap_inputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT UNIQUE NOT NULL,
        timestamp INTEGER NOT NULL,
        user_wallet TEXT NOT NULL,
        facilitator_wallet TEXT NOT NULL,
        amount INTEGER NOT NULL,
        token TEXT NOT NULL,
        bridge_provider TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ss_inputs_timestamp ON silentswap_inputs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ss_inputs_user ON silentswap_inputs(user_wallet);
      CREATE INDEX IF NOT EXISTS idx_ss_inputs_facilitator ON silentswap_inputs(facilitator_wallet);
      CREATE INDEX IF NOT EXISTS idx_ss_inputs_amount ON silentswap_inputs(amount);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS silentswap_outputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT UNIQUE NOT NULL,
        timestamp INTEGER NOT NULL,
        facilitator_wallet TEXT NOT NULL,
        destination_wallet TEXT NOT NULL,
        amount INTEGER NOT NULL,
        token TEXT NOT NULL,
        bridge_provider TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ss_outputs_timestamp ON silentswap_outputs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ss_outputs_facilitator ON silentswap_outputs(facilitator_wallet);
      CREATE INDEX IF NOT EXISTS idx_ss_outputs_destination ON silentswap_outputs(destination_wallet);
      CREATE INDEX IF NOT EXISTS idx_ss_outputs_amount ON silentswap_outputs(amount);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS silentswap_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_id INTEGER NOT NULL,
        output_id INTEGER NOT NULL,
        confidence REAL NOT NULL,
        time_delta_seconds INTEGER NOT NULL,
        amount_ratio REAL NOT NULL,
        match_reasons TEXT NOT NULL,
        FOREIGN KEY (input_id) REFERENCES silentswap_inputs(id),
        FOREIGN KEY (output_id) REFERENCES silentswap_outputs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_ss_matches_input ON silentswap_matches(input_id);
      CREATE INDEX IF NOT EXISTS idx_ss_matches_output ON silentswap_matches(output_id);
      CREATE INDEX IF NOT EXISTS idx_ss_matches_confidence ON silentswap_matches(confidence);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS silentswap_accounts (
        wallet TEXT PRIMARY KEY,
        wallet_type TEXT NOT NULL,
        total_inputs INTEGER NOT NULL,
        total_outputs INTEGER NOT NULL,
        total_volume INTEGER NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ss_accounts_type ON silentswap_accounts(wallet_type);
    `);

    // CT Deposits (PUBLIC amounts!) - for timing correlation attack
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ct_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT UNIQUE NOT NULL,
        timestamp INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        mint TEXT NOT NULL,
        owner TEXT NOT NULL,
        token_account TEXT NOT NULL,
        amount INTEGER NOT NULL,
        decimals INTEGER NOT NULL DEFAULT 9
      );

      CREATE INDEX IF NOT EXISTS idx_ct_deposits_timestamp ON ct_deposits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ct_deposits_owner ON ct_deposits(owner);
      CREATE INDEX IF NOT EXISTS idx_ct_deposits_amount ON ct_deposits(amount);
      CREATE INDEX IF NOT EXISTS idx_ct_deposits_mint ON ct_deposits(mint);
    `);

    // CT Withdrawals (PUBLIC amounts!) - for timing correlation attack
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ct_withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT UNIQUE NOT NULL,
        timestamp INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        mint TEXT NOT NULL,
        owner TEXT NOT NULL,
        token_account TEXT NOT NULL,
        amount INTEGER NOT NULL,
        decimals INTEGER NOT NULL DEFAULT 9
      );

      CREATE INDEX IF NOT EXISTS idx_ct_withdrawals_timestamp ON ct_withdrawals(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ct_withdrawals_owner ON ct_withdrawals(owner);
      CREATE INDEX IF NOT EXISTS idx_ct_withdrawals_amount ON ct_withdrawals(amount);
      CREATE INDEX IF NOT EXISTS idx_ct_withdrawals_mint ON ct_withdrawals(mint);
    `);

    // CT Matches (deposit → withdrawal correlations)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ct_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deposit_id INTEGER NOT NULL,
        withdraw_id INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        time_delta_hours REAL NOT NULL,
        amount_match INTEGER NOT NULL,
        match_reasons TEXT NOT NULL,
        FOREIGN KEY (deposit_id) REFERENCES ct_deposits(id),
        FOREIGN KEY (withdraw_id) REFERENCES ct_withdrawals(id)
      );

      CREATE INDEX IF NOT EXISTS idx_ct_matches_deposit ON ct_matches(deposit_id);
      CREATE INDEX IF NOT EXISTS idx_ct_matches_withdraw ON ct_matches(withdraw_id);
      CREATE INDEX IF NOT EXISTS idx_ct_matches_confidence ON ct_matches(confidence);
    `);
  }

  // ========== Deposit Operations ==========

  insertDeposit(deposit: Deposit): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO deposits
      (signature, timestamp, slot, amount, depositor, commitment, spent, spent_at, withdrawal_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      deposit.signature,
      deposit.timestamp,
      deposit.slot,
      deposit.amount,
      deposit.depositor,
      deposit.commitment,
      deposit.spent ? 1 : 0,
      deposit.spentAt ?? null,
      deposit.withdrawalSignature ?? null,
    );
  }

  insertDeposits(deposits: Deposit[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO deposits
      (signature, timestamp, slot, amount, depositor, commitment, spent, spent_at, withdrawal_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((deposits: Deposit[]) => {
      for (const deposit of deposits) {
        stmt.run(
          deposit.signature,
          deposit.timestamp,
          deposit.slot,
          deposit.amount,
          deposit.depositor,
          deposit.commitment,
          deposit.spent ? 1 : 0,
          deposit.spentAt ?? null,
          deposit.withdrawalSignature ?? null,
        );
      }
    });

    transaction(deposits);
  }

  getDeposit(signature: string): Deposit | undefined {
    const stmt = this.db.prepare("SELECT * FROM deposits WHERE signature = ?");
    const row = stmt.get(signature) as any;
    return row ? this.rowToDeposit(row) : undefined;
  }

  getDeposits(limit: number = 100, offset: number = 0): Deposit[] {
    const stmt = this.db.prepare(`
      SELECT * FROM deposits
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as any[];
    return rows.map(this.rowToDeposit);
  }

  getUnspentDeposits(): Deposit[] {
    const stmt = this.db.prepare(
      "SELECT * FROM deposits WHERE spent = 0 ORDER BY timestamp DESC",
    );
    const rows = stmt.all() as any[];
    return rows.map(this.rowToDeposit);
  }

  getDepositsByAmount(amount: number, unspentOnly: boolean = true): Deposit[] {
    const sql = unspentOnly
      ? "SELECT * FROM deposits WHERE amount = ? AND spent = 0 ORDER BY timestamp DESC"
      : "SELECT * FROM deposits WHERE amount = ? ORDER BY timestamp DESC";
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(amount) as any[];
    return rows.map(this.rowToDeposit);
  }

  getDepositsByTimeRange(startTime: number, endTime: number): Deposit[] {
    const stmt = this.db.prepare(`
      SELECT * FROM deposits
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(startTime, endTime) as any[];
    return rows.map(this.rowToDeposit);
  }

  markDepositSpent(
    signature: string,
    withdrawalSignature: string,
    spentAt: number,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE deposits
      SET spent = 1, spent_at = ?, withdrawal_signature = ?
      WHERE signature = ?
    `);
    stmt.run(spentAt, withdrawalSignature, signature);
  }

  private rowToDeposit(row: any): Deposit {
    return {
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      amount: row.amount,
      depositor: row.depositor,
      commitment: row.commitment,
      spent: row.spent === 1,
      spentAt: row.spent_at ?? undefined,
      withdrawalSignature: row.withdrawal_signature ?? undefined,
    };
  }

  // ========== Withdrawal Operations ==========

  insertWithdrawal(withdrawal: Withdrawal): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO withdrawals
      (signature, timestamp, slot, amount, recipient, nullifier, relayer, fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      withdrawal.signature,
      withdrawal.timestamp,
      withdrawal.slot,
      withdrawal.amount,
      withdrawal.recipient,
      withdrawal.nullifier,
      withdrawal.relayer,
      withdrawal.fee,
    );
  }

  insertWithdrawals(withdrawals: Withdrawal[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO withdrawals
      (signature, timestamp, slot, amount, recipient, nullifier, relayer, fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((withdrawals: Withdrawal[]) => {
      for (const withdrawal of withdrawals) {
        stmt.run(
          withdrawal.signature,
          withdrawal.timestamp,
          withdrawal.slot,
          withdrawal.amount,
          withdrawal.recipient,
          withdrawal.nullifier,
          withdrawal.relayer,
          withdrawal.fee,
        );
      }
    });

    transaction(withdrawals);
  }

  getWithdrawal(signature: string): Withdrawal | undefined {
    const stmt = this.db.prepare(
      "SELECT * FROM withdrawals WHERE signature = ?",
    );
    const row = stmt.get(signature) as any;
    return row ? this.rowToWithdrawal(row) : undefined;
  }

  getWithdrawals(limit: number = 100, offset: number = 0): Withdrawal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM withdrawals
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as any[];
    return rows.map(this.rowToWithdrawal);
  }

  getWithdrawalsByTimeRange(startTime: number, endTime: number): Withdrawal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM withdrawals
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(startTime, endTime) as any[];
    return rows.map(this.rowToWithdrawal);
  }

  private rowToWithdrawal(row: any): Withdrawal {
    return {
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      amount: row.amount,
      recipient: row.recipient,
      nullifier: row.nullifier,
      relayer: row.relayer,
      fee: row.fee,
    };
  }

  // ========== Snapshot Operations ==========

  insertSnapshot(snapshot: AnonymitySetSnapshot): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO anonymity_snapshots
      (timestamp, avg_size, min_size, max_size, active_deposits)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      snapshot.timestamp,
      snapshot.avgSize,
      snapshot.minSize,
      snapshot.maxSize,
      snapshot.activeDeposits,
    );
  }

  getSnapshots(startTime: number, endTime: number): AnonymitySetSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM anonymity_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(startTime, endTime) as any[];
    return rows.map((row) => ({
      timestamp: row.timestamp,
      avgSize: row.avg_size,
      minSize: row.min_size,
      maxSize: row.max_size,
      activeDeposits: row.active_deposits,
    }));
  }

  // ========== Indexer State ==========

  getIndexerState(): {
    lastSignature?: string;
    lastSlot: number;
    totalIndexed: number;
    lastUpdated: number;
  } {
    const stmt = this.db.prepare("SELECT * FROM indexer_state WHERE id = 1");
    const row = stmt.get() as any;
    return {
      lastSignature: row.last_signature ?? undefined,
      lastSlot: row.last_slot,
      totalIndexed: row.total_indexed,
      lastUpdated: row.last_updated,
    };
  }

  updateIndexerState(
    lastSignature: string | undefined,
    lastSlot: number,
    totalIndexed: number,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE indexer_state
      SET last_signature = ?, last_slot = ?, total_indexed = ?, last_updated = ?
      WHERE id = 1
    `);
    stmt.run(lastSignature ?? null, lastSlot, totalIndexed, Date.now());
  }

  // ========== Statistics ==========

  getStats() {
    const depositCount = this.db
      .prepare("SELECT COUNT(*) as count FROM deposits")
      .get() as { count: number };
    const withdrawalCount = this.db
      .prepare("SELECT COUNT(*) as count FROM withdrawals")
      .get() as { count: number };
    const unspentCount = this.db
      .prepare("SELECT COUNT(*) as count FROM deposits WHERE spent = 0")
      .get() as { count: number };
    const uniqueDepositors = this.db
      .prepare("SELECT COUNT(DISTINCT depositor) as count FROM deposits")
      .get() as { count: number };
    const tvl = this.db
      .prepare("SELECT SUM(amount) as total FROM deposits WHERE spent = 0")
      .get() as { total: number };

    return {
      totalDeposits: depositCount.count,
      totalWithdrawals: withdrawalCount.count,
      unspentDeposits: unspentCount.count,
      uniqueDepositors: uniqueDepositors.count,
      tvl: tvl.total ?? 0,
    };
  }

  close(): void {
    this.db.close();
  }

  // ========== Confidential Transfers Operations ==========

  insertConfidentialTransfer(ct: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO confidential_transfers
      (signature, timestamp, slot, mint, source, destination, source_owner, 
       destination_owner, encrypted_amount, auditor_key, instruction_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ct.signature,
      ct.timestamp,
      ct.slot,
      ct.mint,
      ct.source,
      ct.destination,
      ct.sourceOwner,
      ct.destinationOwner,
      ct.encryptedAmount,
      ct.auditorKey || null,
      ct.instructionType,
    );
  }

  insertConfidentialTransfers(transfers: any[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO confidential_transfers
      (signature, timestamp, slot, mint, source, destination, source_owner, 
       destination_owner, encrypted_amount, auditor_key, instruction_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((transfers: any[]) => {
      for (const ct of transfers) {
        stmt.run(
          ct.signature,
          ct.timestamp,
          ct.slot,
          ct.mint,
          ct.source,
          ct.destination,
          ct.sourceOwner,
          ct.destinationOwner,
          ct.encryptedAmount,
          ct.auditorKey || null,
          ct.instructionType,
        );
      }
    });

    transaction(transfers);
  }

  getConfidentialTransfers(limit: number = 1000): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM confidential_transfers
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit).map(this.rowToConfidentialTransfer);
  }

  getConfidentialTransfersByMint(mint: string, limit: number = 1000): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM confidential_transfers
      WHERE mint = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(mint, limit).map(this.rowToConfidentialTransfer);
  }

  getConfidentialTransfersByOwner(owner: string, limit: number = 1000): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM confidential_transfers
      WHERE source_owner = ? OR destination_owner = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(owner, owner, limit).map(this.rowToConfidentialTransfer);
  }

  getConfidentialTransfersStats(): any {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(DISTINCT mint) as unique_mints,
        COUNT(DISTINCT source_owner) as unique_source_owners,
        COUNT(DISTINCT destination_owner) as unique_destination_owners,
        COUNT(DISTINCT auditor_key) as unique_auditors,
        MIN(timestamp) as first_transfer,
        MAX(timestamp) as last_transfer
      FROM confidential_transfers
    `);

    return stmt.get();
  }

  private rowToConfidentialTransfer(row: any): any {
    return {
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      mint: row.mint,
      source: row.source,
      destination: row.destination,
      sourceOwner: row.source_owner,
      destinationOwner: row.destination_owner,
      encryptedAmount: row.encrypted_amount,
      auditorKey: row.auditor_key ?? undefined,
      instructionType: row.instruction_type,
    };
  }

  // Confidential accounts operations
  upsertConfidentialAccount(account: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO confidential_accounts
      (address, owner, mint, first_confidential_tx, last_confidential_tx, 
       total_confidential_txs, also_used_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.address,
      account.owner,
      account.mint,
      account.firstConfidentialTx,
      account.lastConfidentialTx,
      account.totalConfidentialTxs,
      account.alsoUsedPublic ? 1 : 0,
    );
  }

  getConfidentialAccounts(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM confidential_accounts
    `);

    return stmt.all().map((row: any) => ({
      address: row.address,
      owner: row.owner,
      mint: row.mint,
      firstConfidentialTx: row.first_confidential_tx,
      lastConfidentialTx: row.last_confidential_tx,
      totalConfidentialTxs: row.total_confidential_txs,
      alsoUsedPublic: row.also_used_public === 1,
    }));
  }

  // Confidential mints operations
  upsertConfidentialMint(mint: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO confidential_mints
      (address, auditor_key, total_confidential_txs, unique_users, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      mint.address,
      mint.auditorKey || null,
      mint.totalConfidentialTxs,
      mint.uniqueUsers,
      mint.firstSeen,
      mint.lastSeen,
    );
  }

  getConfidentialMints(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM confidential_mints
    `);

    return stmt.all().map((row: any) => ({
      address: row.address,
      auditorKey: row.auditor_key ?? undefined,
      totalConfidentialTxs: row.total_confidential_txs,
      uniqueUsers: row.unique_users,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    }));
  }

  // ========== ShadowWire Operations ==========

  insertShadowWireTransfer(transfer: ShadowWireTransfer): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shadowwire_transfers
      (signature, timestamp, sender, recipient, amount_hidden, transfer_type, 
       proof_pda, relayer_fee, token, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transfer.signature,
      transfer.timestamp,
      transfer.sender,
      transfer.recipient,
      transfer.amountHidden ? 1 : 0,
      transfer.transferType,
      transfer.proofPda || null,
      transfer.relayerFee,
      transfer.token,
      transfer.amount || null,
      transfer.decimals || 9,
    );
  }

  insertShadowWireTransfers(transfers: ShadowWireTransfer[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shadowwire_transfers
      (signature, timestamp, sender, recipient, amount_hidden, transfer_type, 
       proof_pda, relayer_fee, token, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(
      (transfers: ShadowWireTransfer[]) => {
        for (const transfer of transfers) {
          stmt.run(
            transfer.signature,
            transfer.timestamp,
            transfer.sender,
            transfer.recipient,
            transfer.amountHidden ? 1 : 0,
            transfer.transferType,
            transfer.proofPda || null,
            transfer.relayerFee,
            transfer.token,
            transfer.amount || null,
            transfer.decimals || 9,
          );
        }
      },
    );

    transaction(transfers);
  }

  getShadowWireTransfers(limit: number = 1000): ShadowWireTransfer[] {
    const stmt = this.db.prepare(`
      SELECT * FROM shadowwire_transfers
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit).map(this.rowToShadowWireTransfer);
  }

  getShadowWireTransfersByAddress(
    address: string,
    limit: number = 1000,
  ): ShadowWireTransfer[] {
    const stmt = this.db.prepare(`
      SELECT * FROM shadowwire_transfers
      WHERE sender = ? OR recipient = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(address, address, limit).map(this.rowToShadowWireTransfer);
  }

  getShadowWireStats(): any {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(DISTINCT sender) as unique_senders,
        COUNT(DISTINCT recipient) as unique_recipients,
        COUNT(DISTINCT token) as unique_tokens,
        SUM(CASE WHEN amount_hidden = 1 THEN 1 ELSE 0 END) as internal_transfers,
        SUM(CASE WHEN amount_hidden = 0 THEN 1 ELSE 0 END) as external_transfers,
        MIN(timestamp) as first_transfer,
        MAX(timestamp) as last_transfer
      FROM shadowwire_transfers
    `);

    return stmt.get();
  }

  private rowToShadowWireTransfer(row: any): ShadowWireTransfer {
    return {
      signature: row.signature,
      timestamp: row.timestamp,
      sender: row.sender,
      recipient: row.recipient,
      amountHidden: row.amount_hidden === 1,
      transferType: row.transfer_type as "internal" | "external",
      proofPda: row.proof_pda ?? undefined,
      relayerFee: row.relayer_fee,
      token: row.token,
      amount: row.amount ?? undefined,
      decimals: row.decimals ?? 9,
    };
  }

  upsertShadowWireAccount(account: ShadowWireAccount): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shadowwire_accounts
      (wallet, available, deposited, withdrawn_to_escrow, pool_address, 
       total_transfers, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.wallet,
      account.available,
      account.deposited,
      account.withdrawnToEscrow,
      account.poolAddress,
      account.totalTransfers,
      account.firstSeen,
      account.lastSeen,
    );
  }

  getShadowWireAccounts(): ShadowWireAccount[] {
    const stmt = this.db.prepare(`
      SELECT * FROM shadowwire_accounts
    `);

    return stmt.all().map((row: any) => ({
      wallet: row.wallet,
      available: row.available,
      deposited: row.deposited,
      withdrawnToEscrow: row.withdrawn_to_escrow,
      poolAddress: row.pool_address,
      totalTransfers: row.total_transfers,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    }));
  }

  getShadowWireAccount(wallet: string): ShadowWireAccount | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM shadowwire_accounts
      WHERE wallet = ?
    `);

    const row = stmt.get(wallet) as any;
    if (!row) return undefined;

    return {
      wallet: row.wallet,
      available: row.available,
      deposited: row.deposited,
      withdrawnToEscrow: row.withdrawn_to_escrow,
      poolAddress: row.pool_address,
      totalTransfers: row.total_transfers,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    };
  }

  // ========== SilentSwap Operations ==========

  insertSilentSwapInput(input: SilentSwapInput): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_inputs
      (signature, timestamp, user_wallet, facilitator_wallet, amount, token, bridge_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.signature,
      input.timestamp,
      input.userWallet,
      input.facilitatorWallet,
      input.amount,
      input.token,
      input.bridgeProvider,
    );

    return result.lastInsertRowid as number;
  }

  insertSilentSwapInputs(inputs: SilentSwapInput[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_inputs
      (signature, timestamp, user_wallet, facilitator_wallet, amount, token, bridge_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((inputs: SilentSwapInput[]) => {
      for (const input of inputs) {
        stmt.run(
          input.signature,
          input.timestamp,
          input.userWallet,
          input.facilitatorWallet,
          input.amount,
          input.token,
          input.bridgeProvider,
        );
      }
    });

    transaction(inputs);
  }

  getSilentSwapInputs(limit: number = 1000): SilentSwapInput[] {
    const stmt = this.db.prepare(`
      SELECT * FROM silentswap_inputs
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit).map(this.rowToSilentSwapInput);
  }

  getSilentSwapInputsByTimeRange(
    startTime: number,
    endTime: number,
  ): SilentSwapInput[] {
    const stmt = this.db.prepare(`
      SELECT * FROM silentswap_inputs
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(startTime, endTime).map(this.rowToSilentSwapInput);
  }

  private rowToSilentSwapInput(row: any): SilentSwapInput {
    return {
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      userWallet: row.user_wallet,
      facilitatorWallet: row.facilitator_wallet,
      amount: row.amount,
      token: row.token,
      bridgeProvider: row.bridge_provider as
        | "relay.link"
        | "debridge"
        | "unknown",
    };
  }

  insertSilentSwapOutput(output: SilentSwapOutput): number {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_outputs
      (signature, timestamp, facilitator_wallet, destination_wallet, amount, token, bridge_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      output.signature,
      output.timestamp,
      output.facilitatorWallet,
      output.destinationWallet,
      output.amount,
      output.token,
      output.bridgeProvider,
    );

    return result.lastInsertRowid as number;
  }

  insertSilentSwapOutputs(outputs: SilentSwapOutput[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_outputs
      (signature, timestamp, facilitator_wallet, destination_wallet, amount, token, bridge_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((outputs: SilentSwapOutput[]) => {
      for (const output of outputs) {
        stmt.run(
          output.signature,
          output.timestamp,
          output.facilitatorWallet,
          output.destinationWallet,
          output.amount,
          output.token,
          output.bridgeProvider,
        );
      }
    });

    transaction(outputs);
  }

  getSilentSwapOutputs(limit: number = 1000): SilentSwapOutput[] {
    const stmt = this.db.prepare(`
      SELECT * FROM silentswap_outputs
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit).map(this.rowToSilentSwapOutput);
  }

  getSilentSwapOutputsByTimeRange(
    startTime: number,
    endTime: number,
  ): SilentSwapOutput[] {
    const stmt = this.db.prepare(`
      SELECT * FROM silentswap_outputs
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(startTime, endTime).map(this.rowToSilentSwapOutput);
  }

  private rowToSilentSwapOutput(row: any): SilentSwapOutput {
    return {
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      facilitatorWallet: row.facilitator_wallet,
      destinationWallet: row.destination_wallet,
      amount: row.amount,
      token: row.token,
      bridgeProvider: row.bridge_provider as
        | "relay.link"
        | "debridge"
        | "unknown",
    };
  }

  insertSilentSwapMatch(match: SilentSwapMatch): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_matches
      (input_id, output_id, confidence, time_delta_seconds, amount_ratio, match_reasons)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      match.inputId,
      match.outputId,
      match.confidence,
      match.timeDeltaSeconds,
      match.amountRatio,
      JSON.stringify(match.matchReasons),
    );
  }

  insertSilentSwapMatches(matches: SilentSwapMatch[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_matches
      (input_id, output_id, confidence, time_delta_seconds, amount_ratio, match_reasons)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((matches: SilentSwapMatch[]) => {
      for (const match of matches) {
        stmt.run(
          match.inputId,
          match.outputId,
          match.confidence,
          match.timeDeltaSeconds,
          match.amountRatio,
          JSON.stringify(match.matchReasons),
        );
      }
    });

    transaction(matches);
  }

  getSilentSwapMatches(limit: number = 1000): SilentSwapMatch[] {
    const stmt = this.db.prepare(`
      SELECT m.*, 
             i.signature as input_signature, i.timestamp as input_timestamp, 
             i.user_wallet, i.facilitator_wallet as input_facilitator, i.amount as input_amount,
             i.token as input_token, i.bridge_provider as input_bridge,
             o.signature as output_signature, o.timestamp as output_timestamp,
             o.facilitator_wallet as output_facilitator, o.destination_wallet, o.amount as output_amount,
             o.token as output_token, o.bridge_provider as output_bridge
      FROM silentswap_matches m
      JOIN silentswap_inputs i ON m.input_id = i.id
      JOIN silentswap_outputs o ON m.output_id = o.id
      ORDER BY m.confidence DESC
      LIMIT ?
    `);

    return stmt.all(limit).map((row: any) => ({
      inputId: row.input_id,
      outputId: row.output_id,
      input: {
        id: row.input_id,
        signature: row.input_signature,
        timestamp: row.input_timestamp,
        userWallet: row.user_wallet,
        facilitatorWallet: row.input_facilitator,
        amount: row.input_amount,
        token: row.input_token,
        bridgeProvider: row.input_bridge,
      },
      output: {
        id: row.output_id,
        signature: row.output_signature,
        timestamp: row.output_timestamp,
        facilitatorWallet: row.output_facilitator,
        destinationWallet: row.destination_wallet,
        amount: row.output_amount,
        token: row.output_token,
        bridgeProvider: row.output_bridge,
      },
      confidence: row.confidence,
      timeDeltaSeconds: row.time_delta_seconds,
      amountRatio: row.amount_ratio,
      matchReasons: JSON.parse(row.match_reasons),
    }));
  }

  upsertSilentSwapAccount(account: SilentSwapAccount): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO silentswap_accounts
      (wallet, wallet_type, total_inputs, total_outputs, total_volume, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.wallet,
      account.walletType,
      account.totalInputs,
      account.totalOutputs,
      account.totalVolume,
      account.firstSeen,
      account.lastSeen,
    );
  }

  getSilentSwapAccounts(): SilentSwapAccount[] {
    const stmt = this.db.prepare(`
      SELECT * FROM silentswap_accounts
    `);

    return stmt.all().map((row: any) => ({
      wallet: row.wallet,
      walletType: row.wallet_type as "user" | "facilitator",
      totalInputs: row.total_inputs,
      totalOutputs: row.total_outputs,
      totalVolume: row.total_volume,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    }));
  }

  getSilentSwapStats(): any {
    const inputStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_inputs,
        COUNT(DISTINCT user_wallet) as unique_users,
        COUNT(DISTINCT facilitator_wallet) as unique_facilitators,
        SUM(amount) as total_input_volume,
        MIN(timestamp) as first_input,
        MAX(timestamp) as last_input
      FROM silentswap_inputs
    `,
      )
      .get() as any;

    const outputStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_outputs,
        COUNT(DISTINCT destination_wallet) as unique_destinations,
        SUM(amount) as total_output_volume,
        MIN(timestamp) as first_output,
        MAX(timestamp) as last_output
      FROM silentswap_outputs
    `,
      )
      .get() as any;

    const matchStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_matches,
        AVG(confidence) as avg_confidence,
        AVG(time_delta_seconds) as avg_time_delta,
        AVG(amount_ratio) as avg_amount_ratio
      FROM silentswap_matches
    `,
      )
      .get() as any;

    return {
      ...inputStats,
      ...outputStats,
      ...matchStats,
    };
  }

  // ========== CT Deposits Operations (PUBLIC amounts!) ==========

  insertCTDeposit(deposit: CTDeposit): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ct_deposits
      (signature, timestamp, slot, mint, owner, token_account, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      deposit.signature,
      deposit.timestamp,
      deposit.slot,
      deposit.mint,
      deposit.owner,
      deposit.tokenAccount,
      deposit.amount,
      deposit.decimals,
    );
  }

  insertCTDeposits(deposits: CTDeposit[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ct_deposits
      (signature, timestamp, slot, mint, owner, token_account, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((deposits: CTDeposit[]) => {
      for (const deposit of deposits) {
        stmt.run(
          deposit.signature,
          deposit.timestamp,
          deposit.slot,
          deposit.mint,
          deposit.owner,
          deposit.tokenAccount,
          deposit.amount,
          deposit.decimals,
        );
      }
    });

    transaction(deposits);
  }

  getCTDeposits(limit: number = 1000): CTDeposit[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ct_deposits
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      mint: row.mint,
      owner: row.owner,
      tokenAccount: row.token_account,
      amount: row.amount,
      decimals: row.decimals,
    }));
  }

  getCTDepositsByAmount(amount: number): CTDeposit[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ct_deposits
      WHERE amount = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(amount) as any[];
    return rows.map((row) => ({
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      mint: row.mint,
      owner: row.owner,
      tokenAccount: row.token_account,
      amount: row.amount,
      decimals: row.decimals,
    }));
  }

  // ========== CT Withdrawals Operations (PUBLIC amounts!) ==========

  insertCTWithdraw(withdraw: CTWithdraw): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ct_withdrawals
      (signature, timestamp, slot, mint, owner, token_account, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      withdraw.signature,
      withdraw.timestamp,
      withdraw.slot,
      withdraw.mint,
      withdraw.owner,
      withdraw.tokenAccount,
      withdraw.amount,
      withdraw.decimals,
    );
  }

  insertCTWithdrawals(withdrawals: CTWithdraw[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ct_withdrawals
      (signature, timestamp, slot, mint, owner, token_account, amount, decimals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((withdrawals: CTWithdraw[]) => {
      for (const withdraw of withdrawals) {
        stmt.run(
          withdraw.signature,
          withdraw.timestamp,
          withdraw.slot,
          withdraw.mint,
          withdraw.owner,
          withdraw.tokenAccount,
          withdraw.amount,
          withdraw.decimals,
        );
      }
    });

    transaction(withdrawals);
  }

  getCTWithdrawals(limit: number = 1000): CTWithdraw[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ct_withdrawals
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      mint: row.mint,
      owner: row.owner,
      tokenAccount: row.token_account,
      amount: row.amount,
      decimals: row.decimals,
    }));
  }

  getCTWithdrawalsByAmount(amount: number): CTWithdraw[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ct_withdrawals
      WHERE amount = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(amount) as any[];
    return rows.map((row) => ({
      id: row.id,
      signature: row.signature,
      timestamp: row.timestamp,
      slot: row.slot,
      mint: row.mint,
      owner: row.owner,
      tokenAccount: row.token_account,
      amount: row.amount,
      decimals: row.decimals,
    }));
  }

  // ========== CT Matches Operations ==========

  insertCTMatch(match: CTMatch): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ct_matches
      (deposit_id, withdraw_id, confidence, time_delta_hours, amount_match, match_reasons)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      match.depositId,
      match.withdrawId,
      match.confidence,
      match.timeDeltaHours,
      match.amountMatch ? 1 : 0,
      JSON.stringify(match.matchReasons),
    );
  }

  getCTMatches(limit: number = 1000): CTMatch[] {
    const stmt = this.db.prepare(`
      SELECT 
        m.*,
        d.signature as deposit_signature,
        d.timestamp as deposit_timestamp,
        d.mint as deposit_mint,
        d.owner as deposit_owner,
        d.token_account as deposit_token_account,
        d.amount as deposit_amount,
        d.decimals as deposit_decimals,
        w.signature as withdraw_signature,
        w.timestamp as withdraw_timestamp,
        w.mint as withdraw_mint,
        w.owner as withdraw_owner,
        w.token_account as withdraw_token_account,
        w.amount as withdraw_amount,
        w.decimals as withdraw_decimals
      FROM ct_matches m
      JOIN ct_deposits d ON m.deposit_id = d.id
      JOIN ct_withdrawals w ON m.withdraw_id = w.id
      ORDER BY m.confidence DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      depositId: row.deposit_id,
      withdrawId: row.withdraw_id,
      deposit: {
        id: row.deposit_id,
        signature: row.deposit_signature,
        timestamp: row.deposit_timestamp,
        slot: 0,
        mint: row.deposit_mint,
        owner: row.deposit_owner,
        tokenAccount: row.deposit_token_account,
        amount: row.deposit_amount,
        decimals: row.deposit_decimals,
      },
      withdraw: {
        id: row.withdraw_id,
        signature: row.withdraw_signature,
        timestamp: row.withdraw_timestamp,
        slot: 0,
        mint: row.withdraw_mint,
        owner: row.withdraw_owner,
        tokenAccount: row.withdraw_token_account,
        amount: row.withdraw_amount,
        decimals: row.withdraw_decimals,
      },
      confidence: row.confidence,
      timeDeltaHours: row.time_delta_hours,
      amountMatch: row.amount_match === 1,
      matchReasons: JSON.parse(row.match_reasons || "[]"),
    }));
  }

  getCTStats(): any {
    const depositStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_deposits,
        COUNT(DISTINCT owner) as unique_depositors,
        COUNT(DISTINCT mint) as unique_mints,
        SUM(amount) as total_deposit_volume,
        MIN(timestamp) as first_deposit,
        MAX(timestamp) as last_deposit
      FROM ct_deposits
    `,
      )
      .get() as any;

    const withdrawStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_withdrawals,
        COUNT(DISTINCT owner) as unique_withdrawers,
        SUM(amount) as total_withdraw_volume,
        MIN(timestamp) as first_withdraw,
        MAX(timestamp) as last_withdraw
      FROM ct_withdrawals
    `,
      )
      .get() as any;

    const matchStats = this.db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_matches,
        AVG(confidence) as avg_confidence,
        AVG(time_delta_hours) as avg_time_delta_hours,
        SUM(amount_match) as exact_amount_matches
      FROM ct_matches
    `,
      )
      .get() as any;

    return {
      ...depositStats,
      ...withdrawStats,
      ...matchStats,
    };
  }
}

// CLI entry point for database initialization
if (require.main === module) {
  const dbPath = process.env.DATABASE_PATH || "./data/unveil.db";
  console.log(`Initializing database at: ${dbPath}`);
  const db = new UnveilDatabase(dbPath);
  console.log("Database initialized successfully!");
  db.close();
}
