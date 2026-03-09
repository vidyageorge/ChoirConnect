/**
 * Reset password for a user by username.
 * Run from ChoirConnect folder: node scripts/reset-password.js <username> <newPassword>
 * Example: node scripts/reset-password.js vgvidyageorge@gmail.com MyNewPassword
 */
const bcrypt = require('bcrypt');
const { db, userQueries } = require('../server/database');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error('Usage: node scripts/reset-password.js <username> <newPassword>');
  process.exit(1);
}

if (newPassword.length < 4) {
  console.error('Password must be at least 4 characters.');
  process.exit(1);
}

async function main() {
  const user = await userQueries.getByUsername(username);
  if (!user) {
    console.error('User not found:', username);
    db.close(() => process.exit(1));
    return;
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await userQueries.updatePassword(username, hash);
  console.log('Password reset successfully for:', username);
  db.close(() => process.exit(0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
