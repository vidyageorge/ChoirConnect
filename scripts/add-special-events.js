/**
 * Add special events: Ash Wednesday (Feb 18) and Way of the Cross (Feb 25) for 2026.
 * Creates attendance rows for all active members so you can mark attendance in the app.
 * Run from ChoirConnect folder: node scripts/add-special-events.js
 */
const { initializeDatabase, memberQueries, attendanceQueries, db } = require('../server/database');

const SPECIAL_EVENTS_2026 = [
  { date: '2026-02-18', name: 'Ash Wednesday' },
  { date: '2026-02-25', name: 'Way of the Cross' }
];

async function addSpecialEvents() {
  await initializeDatabase();
  const members = await memberQueries.getAll();
  if (members.length === 0) {
    console.log('No members found. Add members first.');
    return;
  }

  let added = 0;
  let skipped = 0;

  for (const event of SPECIAL_EVENTS_2026) {
    for (const member of members) {
      const existing = await attendanceQueries.getByMemberDateType(
        member.id,
        event.date,
        'special'
      );
      if (existing) {
        skipped++;
        continue;
      }
      await attendanceQueries.create(
        member.id,
        'special',
        event.name,
        event.date,
        'not-joined',
        ''
      );
      added++;
    }
  }

  console.log('Special events added.');
  console.log('  Created:', added, 'attendance record(s)');
  if (skipped) console.log('  Skipped (already exist):', skipped);
  console.log('  Events: Ash Wednesday (2026-02-18), Way of the Cross (2026-02-25)');
  db.close(() => process.exit(0));
}

addSpecialEvents().catch((err) => {
  console.error(err);
  process.exit(1);
});
