/**
 * Check if a username exists. Run from ChoirConnect folder: node scripts/check-user.js [username]
 * With no argument, lists all users.
 */
const { promisify } = require('util');
const { db, userQueries } = require('../server/database');

const dbAll = promisify(db.all.bind(db));
const username = process.argv[2] || '';

async function main() {
  if (!username) {
    const rows = await dbAll('SELECT id, username, role FROM users ORDER BY id');
    console.log('Users in database:', rows.length);
    rows.forEach((r) => console.log('  ', r.id, r.username, r.role));
    db.close(() => process.exit(0));
    return;
  }
  const user = await userQueries.getByUsername(username);
  if (user) {
    console.log('Yes. User exists:', user.username, '(role:', user.role + ')');
  } else {
    console.log('No. User not found:', username);
  }
  db.close(() => process.exit(0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
