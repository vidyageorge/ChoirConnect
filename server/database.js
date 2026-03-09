const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'choir.db');
const dbDir = path.dirname(dbPath);
if (dbDir && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath);

// Promisify database methods
// Custom dbRun that returns lastID and changes
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize database tables
async function initializeDatabase() {
  try {
    // Members table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birthday DATE,
        joined_date DATE DEFAULT CURRENT_DATE,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance table with migration support
    await dbRun(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_name TEXT,
        date DATE NOT NULL,
        status TEXT DEFAULT 'present',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
      )
    `);

    // Check if old 'present' column exists and migrate
    try {
      const tableInfo = await dbAll("PRAGMA table_info(attendance)");
      const hasPresentColumn = tableInfo.some(col => col.name === 'present');
      const hasStatusColumn = tableInfo.some(col => col.name === 'status');
      
      if (hasPresentColumn && !hasStatusColumn) {
        console.log('Migrating attendance table from present to status...');
        
        // Add status column
        await dbRun("ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'present'");
        
        // Migrate data: present=1 -> 'present', present=0 -> 'absent'
        await dbRun("UPDATE attendance SET status = CASE WHEN present = 1 THEN 'present' ELSE 'absent' END WHERE status IS NULL");
        
        console.log('Migration completed successfully');
      }
    } catch (migrationError) {
      console.log('No migration needed or already completed');
    }

    // Expenses table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        date DATE NOT NULL,
        paid_by TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance correction requests (member requests change when attendance entered wrongly)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS attendance_correction_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        date DATE NOT NULL,
        event_type TEXT NOT NULL,
        event_name TEXT,
        current_status TEXT NOT NULL,
        requested_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        request_status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        decided_by INTEGER,
        decided_at DATETIME,
        FOREIGN KEY (member_id) REFERENCES members(id),
        FOREIGN KEY (decided_by) REFERENCES users(id)
      )
    `);

    // Users table (app login roles: admin | member)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await addUserIdToMembersIfMissing();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

/** User queries for app login (roles: admin, member). */
const userQueries = {
  getByUsername: (username) => dbGet('SELECT * FROM users WHERE username = ?', [username]),
  getById: (id) => dbGet('SELECT id, username, role FROM users WHERE id = ?', [id]),
  create: (username, passwordHash, role) =>
    dbRun('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, passwordHash, role]),
  updatePassword: (username, passwordHash) =>
    dbRun('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, username]),
};

/** Add user_id to members if missing (links app user to choir member for self-edit). */
async function addUserIdToMembersIfMissing() {
  try {
    const tableInfo = await dbAll('PRAGMA table_info(members)');
    const hasUserId = tableInfo.some(col => col.name === 'user_id');
    if (!hasUserId) {
      await dbRun('ALTER TABLE members ADD COLUMN user_id INTEGER REFERENCES users(id)');
    }
  } catch (e) {
    // Column may already exist
  }
}

// Member queries
const memberQueries = {
  getAll: () => dbAll('SELECT * FROM members WHERE active = 1 ORDER BY name'),
  getById: (id) => dbGet('SELECT * FROM members WHERE id = ?', [id]),
  getByUserId: (userId) => dbGet('SELECT * FROM members WHERE user_id = ? AND active = 1', [userId]),
  create: (name, email, phone, birthday, joined_date) =>
    dbRun('INSERT INTO members (name, email, phone, birthday, joined_date) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, birthday, joined_date]),
  update: (name, email, phone, birthday, joined_date, id) =>
    dbRun('UPDATE members SET name = ?, email = ?, phone = ?, birthday = ?, joined_date = ? WHERE id = ?',
      [name, email, phone, birthday, joined_date, id]),
  linkUser: (userId, memberId) =>
    dbRun('UPDATE members SET user_id = ? WHERE id = ?', [userId, memberId]),
  delete: (id) => dbRun('UPDATE members SET active = 0 WHERE id = ?', [id]),
  getUpcomingBirthdays: () =>
    dbAll('SELECT * FROM members WHERE active = 1 AND birthday IS NOT NULL ORDER BY strftime(\'%m-%d\', birthday)')
};

// Attendance queries
const attendanceQueries = {
  getAll: () => dbAll(`
    SELECT a.*, m.name as member_name 
    FROM attendance a 
    JOIN members m ON a.member_id = m.id 
    ORDER BY a.date DESC, m.name
  `),
  getByDate: (date) => dbAll(`
    SELECT a.*, m.name as member_name 
    FROM attendance a 
    JOIN members m ON a.member_id = m.id 
    WHERE a.date = ? 
    ORDER BY m.name
  `, [date]),
  getByDateAndType: (date, eventType) => dbAll(`
    SELECT a.*, m.name as member_name 
    FROM attendance a 
    JOIN members m ON a.member_id = m.id 
    WHERE a.date = ? AND a.event_type = ?
    ORDER BY m.name
  `, [date, eventType]),
  getByMember: (memberId) => dbAll(
    'SELECT * FROM attendance WHERE member_id = ? ORDER BY date DESC', 
    [memberId]
  ),
  getByMemberDateType: (memberId, date, eventType) => dbGet(
    'SELECT * FROM attendance WHERE member_id = ? AND date = ? AND event_type = ? LIMIT 1',
    [memberId, date, eventType]
  ),
  getById: (id) => dbGet('SELECT * FROM attendance WHERE id = ?', [id]),
  create: (member_id, event_type, event_name, date, status, notes) => 
    dbRun('INSERT INTO attendance (member_id, event_type, event_name, date, status, notes) VALUES (?, ?, ?, ?, ?, ?)', 
      [member_id, event_type, event_name, date, status, notes]),
  update: (status, notes, id) => 
    dbRun('UPDATE attendance SET status = ?, notes = ? WHERE id = ?', 
      [status, notes, id]),
  delete: (id) => dbRun('DELETE FROM attendance WHERE id = ?', [id]),
  getStats: () => dbAll(`
    SELECT 
      event_type,
      COUNT(*) as total_records,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present
    FROM attendance
    GROUP BY event_type
  `)
};

// Expense queries
const expenseQueries = {
  getAll: () => dbAll('SELECT * FROM expenses ORDER BY date DESC, created_at DESC'),
  getById: (id) => dbGet('SELECT * FROM expenses WHERE id = ?', [id]),
  getByDateRange: (startDate, endDate) => 
    dbAll('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC', 
      [startDate, endDate]),
  create: (description, amount, category, date, paid_by, notes) => 
    dbRun('INSERT INTO expenses (description, amount, category, date, paid_by, notes) VALUES (?, ?, ?, ?, ?, ?)', 
      [description, amount, category, date, paid_by, notes]),
  update: (description, amount, category, date, paid_by, notes, id) => 
    dbRun('UPDATE expenses SET description = ?, amount = ?, category = ?, date = ?, paid_by = ?, notes = ? WHERE id = ?', 
      [description, amount, category, date, paid_by, notes, id]),
  delete: (id) => dbRun('DELETE FROM expenses WHERE id = ?', [id]),
  getTotal: () => dbGet('SELECT SUM(amount) as total FROM expenses'),
  /** Income = rows with 'Type: Income' in notes; expenses = all other rows. Matches dashboard logic. */
  getTotalByType: () => dbGet(`
    SELECT
      COALESCE(SUM(CASE WHEN notes LIKE '%Type: Income%' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN notes NOT LIKE '%Type: Income%' OR notes IS NULL THEN amount ELSE 0 END), 0) as expenses
    FROM expenses
  `),
  getTotalByCategory: () => dbAll(`
    SELECT category, SUM(amount) as total 
    FROM expenses 
    GROUP BY category
  `),
  /** Category totals for expense rows only (excludes 'Type: Income'). Matches dashboard. */
  getTotalByCategoryExpensesOnly: () => dbAll(`
    SELECT category, SUM(amount) as total 
    FROM expenses 
    WHERE notes NOT LIKE '%Type: Income%' OR notes IS NULL
    GROUP BY category
  `)
};

/** Attendance correction requests (request to change wrongly entered attendance). */
const correctionRequestQueries = {
  getAll: () => dbAll(`
    SELECT r.*, m.name as member_name
    FROM attendance_correction_requests r
    JOIN members m ON r.member_id = m.id
    ORDER BY r.created_at DESC
  `),
  getByMember: (memberId) => dbAll(`
    SELECT r.*, m.name as member_name
    FROM attendance_correction_requests r
    JOIN members m ON r.member_id = m.id
    WHERE r.member_id = ?
    ORDER BY r.created_at DESC
  `, [memberId]),
  getById: (id) => dbGet(`
    SELECT r.*, m.name as member_name
    FROM attendance_correction_requests r
    JOIN members m ON r.member_id = m.id
    WHERE r.id = ?
  `, [id]),
  create: (memberId, date, eventType, eventName, currentStatus, requestedStatus, reason) =>
    dbRun(
      'INSERT INTO attendance_correction_requests (member_id, date, event_type, event_name, current_status, requested_status, reason, request_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [memberId, date, eventType, eventName || null, currentStatus, requestedStatus, reason, 'pending']
    ),
  updateStatus: (id, requestStatus, decidedBy) =>
    dbRun(
      'UPDATE attendance_correction_requests SET request_status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?',
      [requestStatus, decidedBy, id]
    ),
};

module.exports = {
  db,
  initializeDatabase,
  memberQueries,
  attendanceQueries,
  expenseQueries,
  userQueries,
  correctionRequestQueries,
};
