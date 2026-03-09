/**
 * Seed full February 2026 attendance from the spreadsheet.
 * Dates: Sun 2/1, Sat 2/7, Sun 2/8, Sat 2/14, Sun 2/15, Wed 2/18 (special), Sat 2/21, Sun 2/22, Wed 2/25 (special).
 * Run from ChoirConnect folder: node scripts/seed-feb-2026-attendance.js
 */
const { initializeDatabase, memberQueries, attendanceQueries, db } = require('../server/database');

const FEB_DATES = [
  { date: '2026-02-01', type: 'sunday', name: 'Sunday Practice' },
  { date: '2026-02-07', type: 'saturday', name: 'Saturday Practice' },
  { date: '2026-02-08', type: 'sunday', name: 'Sunday Practice' },
  { date: '2026-02-14', type: 'saturday', name: 'Saturday Practice' },
  { date: '2026-02-15', type: 'sunday', name: 'Sunday Practice' },
  { date: '2026-02-18', type: 'special', name: 'Ash Wednesday' },
  { date: '2026-02-21', type: 'saturday', name: 'Saturday Practice' },
  { date: '2026-02-22', type: 'sunday', name: 'Sunday Practice' },
  { date: '2026-02-25', type: 'special', name: 'Way of the Cross' }
];

// Spreadsheet names -> one status per date (same order as FEB_DATES). X = present, A = absent
const ATTENDANCE_BY_NAME = {
  'Biju':           ['present','present','present','present','present','absent','present','present','present'],
  'Gia':             ['absent','absent','present','present','present','present','present','present','absent'],
  'Nadhiya':         ['present','present','present','present','present','present','present','present','present'],
  'Rachel':          ['absent','absent','present','absent','absent','absent','present','present','absent'],
  'Rihanna':         ['absent','absent','present','absent','absent','absent','present','present','absent'],
  'Richardson':      ['present','absent','present','absent','present','present','present','present','absent'],
  'Sherline':        ['present','present','present','present','absent','present','absent','absent','present'],
  'Vidya':           ['present','present','present','present','present','present','present','present','present'],
  'Veena':           ['absent','present','absent','absent','absent','absent','absent','absent','absent'],
  'Vinoth':          ['absent','present','present','absent','present','present','absent','present','present'],
  'Cicily':          ['present','absent','absent','present','present','present','present','present','present']
};

// Map DB member names to spreadsheet name (if different)
const NAME_TO_SHEET = {
  'John Benedict': 'Biju',
  'Vidya George': 'Vidya',
  'Vinoth Antony George': 'Vinoth',
  'Cikily': 'Cicily',
  'Cirily': 'Cicily',
  'Nadhlya': 'Nadhiya',
  'Shorline': 'Sherline'
};

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

function findSheetName(memberName) {
  const exact = NAME_TO_SHEET[memberName] || memberName;
  if (ATTENDANCE_BY_NAME[exact]) return exact;
  for (const key of Object.keys(ATTENDANCE_BY_NAME)) {
    if (normalize(memberName).startsWith(normalize(key)) || normalize(key).startsWith(normalize(memberName)))
      return key;
  }
  return null;
}

async function seed() {
  await initializeDatabase();
  const members = await memberQueries.getAll();
  if (members.length === 0) {
    console.log('No members found.');
    db.close(() => process.exit(1));
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const member of members) {
    const sheetName = findSheetName(member.name);
    const statuses = sheetName ? ATTENDANCE_BY_NAME[sheetName] : null;
    if (!statuses || statuses.length !== FEB_DATES.length) {
      skipped++;
      continue;
    }

    for (let i = 0; i < FEB_DATES.length; i++) {
      const d = FEB_DATES[i];
      const status = statuses[i];
      let record = await attendanceQueries.getByMemberDateType(member.id, d.date, d.type);
      if (!record) {
        await attendanceQueries.create(member.id, d.type, d.name, d.date, status, '');
        created++;
      } else if (record.status !== status) {
        await attendanceQueries.update(status, record.notes || '', record.id);
        updated++;
      }
    }
  }

  console.log('February 2026 attendance seeded.');
  console.log('  Created:', created, '| Updated:', updated, '| Members skipped (no match):', skipped);
  db.close(() => process.exit(0));
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
