#!/usr/bin/env node
/**
 * Database Schema Fix Script
 * Removes old webhook/polls tables from restored backup
 * Run this AFTER restoring a backup to fix schema conflicts
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'nexus.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing restored database schema...');
console.log(`📁 Database: ${dbPath}\n`);

db.serialize(() => {
  // Drop old webhook tables that cause crashes
  db.run('DROP TABLE IF EXISTS webhook_subscriptions', (err) => {
    if (err) console.error('❌ Error dropping webhook_subscriptions:', err.message);
    else console.log('✅ Dropped webhook_subscriptions (old schema)');
  });

  db.run('DROP TABLE IF EXISTS webhook_deliveries', (err) => {
    if (err) console.error('❌ Error dropping webhook_deliveries:', err.message);
    else console.log('✅ Dropped webhook_deliveries (old schema)');
  });

  // Drop old polls table
  db.run('DROP TABLE IF EXISTS polls', (err) => {
    if (err) console.error('❌ Error dropping polls:', err.message);
    else console.log('✅ Dropped old polls table');
  });

  setTimeout(() => {
    console.log('\n✅ Database schema fixed!');
    console.log('   Bot will recreate these tables with correct schema on startup.');
    console.log('   All your data (invite sources, configs, logs) is preserved!\n');
    db.close();
    process.exit(0);
  }, 500);
});
