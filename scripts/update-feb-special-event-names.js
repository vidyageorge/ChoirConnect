/**
 * Set display names for Feb 18 and Feb 25 special events:
 * Feb 18 = Ash Wednesday, Feb 25 = Way of the Cross.
 * Run from ChoirConnect folder: node scripts/update-feb-special-event-names.js
 */
const { db } = require('../server/database');

const UPDATES = [
  { date: '2026-02-18', eventName: 'Ash Wednesday' },
  { date: '2026-02-25', eventName: 'Way of the Cross' }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

async function main() {
  for (const { date, eventName } of UPDATES) {
    const { changes } = await run(
      "UPDATE attendance SET event_name = ? WHERE date = ? AND event_type = 'special'",
      [eventName, date]
    );
    console.log(`${date} -> "${eventName}": ${changes} record(s) updated`);
  }
  db.close(() => process.exit(0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
