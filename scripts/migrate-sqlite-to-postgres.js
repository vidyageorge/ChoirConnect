/**
 * Migrate data from local SQLite (choir.db) to PostgreSQL (DATABASE_URL).
 * Run from ChoirConnect folder with Postgres URL set:
 *   set DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
 *   node scripts/migrate-sqlite-to-postgres.js
 * Or on Unix: DATABASE_URL="postgresql://..." node scripts/migrate-sqlite-to-postgres.js
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'choir.db');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Set DATABASE_URL to your PostgreSQL connection string (e.g. from Render Postgres).');
  process.exit(1);
}

const sqliteDb = new sqlite3.Database(SQLITE_PATH);

function sqliteAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/** Postgres DATE/TIMESTAMP does not accept empty string; use null. */
function toDateVal(v) {
  return v == null || v === '' ? null : v;
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined
  });

  const userIdMap = {};
  const memberIdMap = {};

  try {
    console.log('Reading from SQLite:', SQLITE_PATH);
    const users = await sqliteAll('SELECT id, username, password_hash, role, created_at FROM users ORDER BY id');
    const members = await sqliteAll('SELECT id, name, email, phone, birthday, joined_date, active, created_at, user_id FROM members ORDER BY id');
    const attendance = await sqliteAll('SELECT id, member_id, event_type, event_name, date, status, notes, created_at FROM attendance ORDER BY id');
    const expenses = await sqliteAll('SELECT id, description, amount, category, date, paid_by, notes, created_at FROM expenses ORDER BY id');
    const corrections = await sqliteAll('SELECT id, member_id, date, event_type, event_name, current_status, requested_status, reason, request_status, created_at, decided_by, decided_at FROM attendance_correction_requests ORDER BY id');

    console.log('Found:', users.length, 'users,', members.length, 'members,', attendance.length, 'attendance,', expenses.length, 'expenses,', corrections.length, 'correction requests');

    console.log('Creating tables if not exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birthday DATE,
        joined_date DATE DEFAULT CURRENT_DATE,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES members(id),
        event_type TEXT NOT NULL,
        event_name TEXT,
        date DATE NOT NULL,
        status TEXT DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category TEXT,
        date DATE NOT NULL,
        paid_by TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_correction_requests (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES members(id),
        date DATE NOT NULL,
        event_type TEXT NOT NULL,
        event_name TEXT,
        current_status TEXT NOT NULL,
        requested_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        request_status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        decided_by INTEGER REFERENCES users(id),
        decided_at TIMESTAMP
      )
    `);

    console.log('Truncating PostgreSQL tables...');
    await pool.query('TRUNCATE attendance_correction_requests, attendance, expenses, members, users RESTART IDENTITY CASCADE');

    for (const row of users) {
      const r = await pool.query(
        'INSERT INTO users (username, password_hash, role, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
        [row.username, row.password_hash, row.role, toDateVal(row.created_at)]
      );
      userIdMap[row.id] = r.rows[0].id;
    }
    console.log('Inserted', users.length, 'users');

    for (const row of members) {
      const newUserId = row.user_id != null ? userIdMap[row.user_id] : null;
      const r = await pool.query(
        'INSERT INTO members (name, email, phone, birthday, joined_date, active, created_at, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [row.name, row.email, row.phone, toDateVal(row.birthday), toDateVal(row.joined_date), row.active, toDateVal(row.created_at), newUserId]
      );
      memberIdMap[row.id] = r.rows[0].id;
    }
    console.log('Inserted', members.length, 'members');

    for (const row of attendance) {
      const newMemberId = memberIdMap[row.member_id];
      if (newMemberId == null) continue;
      await pool.query(
        'INSERT INTO attendance (member_id, event_type, event_name, date, status, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newMemberId, row.event_type, row.event_name, toDateVal(row.date), row.status || 'present', row.notes || '', toDateVal(row.created_at)]
      );
    }
    console.log('Inserted', attendance.length, 'attendance rows');

    for (const row of expenses) {
      await pool.query(
        'INSERT INTO expenses (description, amount, category, date, paid_by, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [row.description, row.amount, row.category, toDateVal(row.date), row.paid_by || '', row.notes || '', toDateVal(row.created_at)]
      );
    }
    console.log('Inserted', expenses.length, 'expenses');

    for (const row of corrections) {
      const newMemberId = memberIdMap[row.member_id];
      const newDecidedBy = row.decided_by != null ? userIdMap[row.decided_by] : null;
      if (newMemberId == null) continue;
      await pool.query(
        'INSERT INTO attendance_correction_requests (member_id, date, event_type, event_name, current_status, requested_status, reason, request_status, created_at, decided_by, decided_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [newMemberId, toDateVal(row.date), row.event_type, row.event_name, row.current_status, row.requested_status, row.reason, row.request_status || 'pending', toDateVal(row.created_at), newDecidedBy, toDateVal(row.decided_at)]
      );
    }
    console.log('Inserted', corrections.length, 'correction requests');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    sqliteDb.close(() => process.exit(0));
  }
}

main();
