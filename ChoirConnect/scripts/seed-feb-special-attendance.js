/**
 * Seed February 2026 special event attendance (Ash Wednesday Feb 18, Way of the Cross Feb 25).
 * Ensures all members have a record, then sets present/absent from the provided data.
 * Run from ChoirConnect folder: node scripts/seed-feb-special-attendance.js
 */
const { initializeDatabase, memberQueries, attendanceQueries, db } = require('../server/database');

const SPECIAL_EVENTS = [
  { date: '2026-02-18', name: 'Ash Wednesday' },
  { date: '2026-02-25', name: 'Way of the Cross' }
];

// Who was present (X) on each date. Everyone else is set absent (A).
// Names must match member.name in the database (e.g. "Vidyu George", "Vinath Antony George").
const PRESENT_BY_DATE = {
  '2026-02-18': ['Nadhiya', 'Richardson', 'Sherline', 'Vidyu George', 'Cirily'],
  '2026-02-25': ['Nadhiya', 'Sherline', 'Vidyu George', 'Vinath Antony George', 'Cirily']
};

function normalizeName(name) {
  return (name || '').trim().toLowerCase();
}

async function seedFebruarySpecialAttendance() {
  await initializeDatabase();
  const members = await memberQueries.getAll();
  if (members.length === 0) {
    console.log('No members found. Add members first.');
    db.close(() => process.exit(1));
    return;
  }

  let created = 0;
  let updated = 0;

  for (const event of SPECIAL_EVENTS) {
    const presentNames = new Set((PRESENT_BY_DATE[event.date] || []).map(normalizeName));

    for (const member of members) {
      let record = await attendanceQueries.getByMemberDateType(member.id, event.date, 'special');
      if (!record) {
        await attendanceQueries.create(
          member.id,
          'special',
          event.name,
          event.date,
          'not-joined',
          ''
        );
        record = await attendanceQueries.getByMemberDateType(member.id, event.date, 'special');
        created++;
      }
      const status = presentNames.has(normalizeName(member.name)) ? 'present' : 'absent';
      if (record.status !== status) {
        await attendanceQueries.update(status, record.notes || '', record.id);
        updated++;
      }
    }
  }

  console.log('February special attendance seeded.');
  console.log('  Records created (if any):', created);
  console.log('  Records updated to present/absent:', updated);
  db.close(() => process.exit(0));
}

seedFebruarySpecialAttendance().catch((err) => {
  console.error(err);
  process.exit(1);
});
