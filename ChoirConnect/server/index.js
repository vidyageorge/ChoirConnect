const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { initializeDatabase, memberQueries, attendanceQueries, expenseQueries, userQueries } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'choirmate-dev-secret-change-in-production';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please log in.' });
  }
  next();
}

async function loadAuthUser(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.authUser = null;
    return next();
  }
  try {
    const user = await userQueries.getById(req.session.userId);
    if (!user) {
      req.session.userId = null;
      req.authUser = null;
      return next();
    }
    let memberId = null;
    if (user.role === 'member') {
      const member = await memberQueries.getByUserId(user.id);
      if (member) memberId = member.id;
    }
    req.authUser = { id: user.id, username: user.username, role: user.role, memberId };
  } catch (e) {
    req.authUser = null;
  }
  next();
}

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

async function seedDefaultAdmin() {
  const existing = await userQueries.getByUsername('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin', 10);
    await userQueries.create('admin', hash, 'admin');
    console.log('Default admin user created: username=admin, password=admin');
  }
}

(async () => {
  await initializeDatabase();
  await seedDefaultAdmin();
})();

app.use('/api', loadAuthUser);

// ============= AUTH ROUTES =============

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    const user = await userQueries.getByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    req.session.userId = user.id;
    let memberId = null;
    if (user.role === 'member') {
      const member = await memberQueries.getByUserId(user.id);
      if (member) memberId = member.id;
    }
    res.json({
      user: { id: user.id, username: user.username, role: user.role, memberId }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const trimmed = (username || '').trim();
    if (!trimmed || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }
    const existing = await userQueries.getByUsername(trimmed);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }
    const hash = bcrypt.hashSync(password, 10);
    await userQueries.create(trimmed, hash, 'member');
    res.status(201).json({ message: 'Account created. You can sign in now.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json({ user: req.authUser });
});

// ============= MEMBER ROUTES (require auth) =============

app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const members = await memberQueries.getAll();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get member by ID
app.get('/api/members/:id', requireAuth, async (req, res) => {
  try {
    const member = await memberQueries.getById(req.params.id);
    if (member) {
      res.json(member);
    } else {
      res.status(404).json({ error: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create member (admin only)
app.post('/api/members', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members.' });
    }
    const { name, email, phone, birthday, joined_date } = req.body;
    const result = await memberQueries.create(name, email, phone, birthday, joined_date || new Date().toISOString().split('T')[0]);
    res.status(201).json({ id: result.lastID, message: 'Member created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim profile: link logged-in member user to a choir member row (so they can edit own details)
app.post('/api/members/claim', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'member') {
      return res.status(403).json({ error: 'Only members can claim a profile.' });
    }
    if (req.authUser.memberId != null) {
      return res.status(400).json({ error: 'You have already linked your profile.' });
    }
    const memberId = parseInt(req.body?.memberId, 10);
    if (!memberId) {
      return res.status(400).json({ error: 'memberId required.' });
    }
    const member = await memberQueries.getById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }
    if (member.user_id != null) {
      return res.status(400).json({ error: 'This profile is already linked to another account.' });
    }
    await memberQueries.linkUser(req.authUser.id, memberId);
    res.json({ message: 'Profile linked. You can now edit your details.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update member (admin: any; member: only own row)
app.put('/api/members/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.authUser.role === 'member' && req.authUser.memberId !== id) {
      return res.status(403).json({ error: 'You can only update your own details.' });
    }
    const { name, email, phone, birthday, joined_date } = req.body;
    await memberQueries.update(name, email, phone, birthday, joined_date || null, id);
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete member (soft delete) – admin only
app.delete('/api/members/:id', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members.' });
    }
    await memberQueries.delete(req.params.id);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming birthdays
app.get('/api/members/birthdays/upcoming', requireAuth, async (req, res) => {
  try {
    const members = await memberQueries.getUpcomingBirthdays();
    
    // Calculate upcoming birthdays (next 30 days)
    const now = new Date();
    // Normalize to midnight for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcoming = members.filter(member => {
      if (!member.birthday) return false;
      
      const birthday = new Date(member.birthday);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      
      // If birthday already passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntil = Math.floor((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
      member.daysUntilBirthday = daysUntil;
      
      return daysUntil <= 30;
    });
    
    upcoming.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ATTENDANCE ROUTES =============

// Get all attendance records
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const { date, event_type } = req.query;
    let records;
    
    if (date && event_type) {
      records = await attendanceQueries.getByDateAndType(date, event_type);
    } else if (date) {
      records = await attendanceQueries.getByDate(date);
    } else {
      records = await attendanceQueries.getAll();
    }
    
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance by member
app.get('/api/attendance/member/:memberId', requireAuth, async (req, res) => {
  try {
    const records = await attendanceQueries.getByMember(req.params.memberId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance statistics
app.get('/api/attendance/stats', requireAuth, async (req, res) => {
  try {
    const stats = await attendanceQueries.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create attendance record
app.post('/api/attendance', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can record attendance.' });
    }
    const { member_id, event_type, event_name, date, status, notes } = req.body;
    const result = await attendanceQueries.create(member_id, event_type, event_name, date, status || 'present', notes);
    res.status(201).json({ id: result.lastID, message: 'Attendance recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create attendance records
app.post('/api/attendance/bulk', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can record attendance.' });
    }
    const { records } = req.body; // Array of attendance records
    const results = [];
    
    for (const record of records) {
      const { member_id, event_type, event_name, date, status, notes } = record;
      const result = await attendanceQueries.create(member_id, event_type, event_name, date, status || 'present', notes);
      results.push(result.lastID);
    }
    
    res.status(201).json({ ids: results, message: 'Attendance records created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update attendance record
app.put('/api/attendance/:id', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update attendance.' });
    }
    const { status, notes } = req.body;
    await attendanceQueries.update(status, notes, req.params.id);
    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete attendance record
app.delete('/api/attendance/:id', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete attendance.' });
    }
    await attendanceQueries.delete(req.params.id);
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= EXPENSE ROUTES =============

// Get all expenses
app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let expenses;
    
    if (startDate && endDate) {
      expenses = await expenseQueries.getByDateRange(startDate, endDate);
    } else {
      expenses = await expenseQueries.getAll();
    }
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expense by ID
app.get('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    const expense = await expenseQueries.getById(req.params.id);
    if (expense) {
      res.json(expense);
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total expenses (all rows - legacy)
app.get('/api/expenses/stats/total', requireAuth, async (req, res) => {
  try {
    const result = await expenseQueries.getTotal();
    res.json({ total: result.total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Income vs expenses (rows with 'Type: Income' in notes = income; rest = expenses). Matches dashboard.
app.get('/api/expenses/stats/breakdown', requireAuth, async (req, res) => {
  try {
    const result = await expenseQueries.getTotalByType();
    res.json({ income: result.income || 0, expenses: result.expenses || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses by category (expense rows only, excludes income - matches dashboard)
app.get('/api/expenses/stats/by-category', requireAuth, async (req, res) => {
  try {
    const stats = await expenseQueries.getTotalByCategoryExpensesOnly();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create expense
app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add expenses.' });
    }
    const { description, amount, category, date, paid_by, notes } = req.body;
    const result = await expenseQueries.create(description, amount, category, date, paid_by, notes);
    res.status(201).json({ id: result.lastID, message: 'Expense created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
app.put('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update expenses.' });
    }
    const { description, amount, category, date, paid_by, notes } = req.body;
    await expenseQueries.update(description, amount, category, date, paid_by, notes, req.params.id);
    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete expenses.' });
    }
    await expenseQueries.delete(req.params.id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DASHBOARD ROUTE =============

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const members = await memberQueries.getAll();
    const totalMembers = members.length;
    
    const allBirthdays = await memberQueries.getUpcomingBirthdays();
    const now = new Date();
    // Normalize to midnight for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcomingBirthdays = allBirthdays.filter(member => {
      if (!member.birthday) return false;
      const birthday = new Date(member.birthday);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      const daysUntil = Math.floor((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length;
    
    const allExpenses = await expenseQueries.getAll();
    
    // Calculate total income and total expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    
    allExpenses.forEach(expense => {
      // Check notes to determine if it's income or expense
      if (expense.notes && expense.notes.includes('Type: Income')) {
        totalIncome += expense.amount;
      } else {
        totalExpenses += expense.amount;
      }
    });
    
    const currentBalance = totalIncome - totalExpenses;
    
    // Get attendance from the most recent date only
    const allAttendance = await attendanceQueries.getAll();
    let recentAttendance = [];
    if (allAttendance.length > 0) {
      const mostRecentDate = allAttendance[0].date;
      recentAttendance = allAttendance.filter(record => record.date === mostRecentDate);
    }
    
    // Calculate quarterly attendance rankings
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentQuarter = Math.floor(currentMonth / 3) + 1; // 1-4
    
    // Parse record date as YYYY-MM-DD (no timezone) so it matches Attendance page logic
    const recordYearMonth = (dateStr) => {
      const parts = dateStr.split('-').map(Number);
      return { y: parts[0], m: parts[1] };
    };
    const recordQuarter = (dateStr) => {
      const { y, m } = recordYearMonth(dateStr);
      return { year: y, quarter: Math.floor((m - 1) / 3) + 1 };
    };
    const inQuarter = (dateStr, q, year) => {
      const rq = recordQuarter(dateStr);
      return rq.year === year && rq.quarter === q;
    };
    const inMonth = (dateStr, year, month1Based) => {
      const { y, m } = recordYearMonth(dateStr);
      return y === year && m === month1Based;
    };

    // Calculate attendance for each member in current quarter (use date-string logic to match Attendance page)
    const quarterlyAttendance = members.map(member => {
      const memberAttendance = allAttendance.filter(record =>
        record.member_id === member.id && inQuarter(record.date, currentQuarter, currentYear)
      );
      
      // Only count relevant statuses (exclude 'not-joined', 'break', 'left-choir', 'no-practice')
      const relevantRecords = memberAttendance.filter(
        r => r.status !== 'not-joined' && r.status !== 'break' && r.status !== 'left-choir' && r.status !== 'no-practice'
      );
      const present = relevantRecords.filter(r => r.status === 'present').length;
      const total = relevantRecords.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return {
        member_id: member.id,
        member_name: member.name,
        present,
        total,
        percentage
      };
    });
    
    // Sort by percentage (highest first), then by total attendance
    quarterlyAttendance.sort((a, b) => {
      if (b.percentage === a.percentage) {
        return b.total - a.total;
      }
      return b.percentage - a.percentage;
    });

    // Last quarter attendance (previous quarter)
    const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const lastQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;

    const lastQuarterAttendance = members.map(member => {
      const memberAttendance = allAttendance.filter(record =>
        record.member_id === member.id && inQuarter(record.date, lastQuarter, lastQuarterYear)
      );
      const relevantRecords = memberAttendance.filter(
        r => r.status !== 'not-joined' && r.status !== 'break' && r.status !== 'left-choir' && r.status !== 'no-practice'
      );
      const present = relevantRecords.filter(r => r.status === 'present').length;
      const total = relevantRecords.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        member_id: member.id,
        member_name: member.name,
        present,
        total,
        percentage
      };
    });
    lastQuarterAttendance.sort((a, b) => {
      if (b.percentage === a.percentage) return b.total - a.total;
      return b.percentage - a.percentage;
    });

    // Month-wise attendance for current year (use date-string month so it matches Attendance page)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyAttendance = members.map(member => {
      const byMonth = [];
      for (let month = 0; month < 12; month++) {
        const month1Based = month + 1;
        const memberAttendance = allAttendance.filter(record =>
          record.member_id === member.id && inMonth(record.date, currentYear, month1Based)
        );
        const relevantRecords = memberAttendance.filter(
          r => r.status !== 'not-joined' && r.status !== 'break' && r.status !== 'left-choir' && r.status !== 'no-practice'
        );
        const present = relevantRecords.filter(r => r.status === 'present').length;
        const total = relevantRecords.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : null;
        byMonth.push({ month: month + 1, label: monthLabels[month], present, total, percentage });
      }
      return {
        member_id: member.id,
        member_name: member.name,
        byMonth
      };
    });
    
    res.json({
      totalMembers,
      upcomingBirthdays,
      totalIncome,
      totalExpenses,
      currentBalance,
      recentAttendance,
      quarterlyAttendance,
      currentQuarter,
      lastQuarterAttendance,
      lastQuarter,
      lastQuarterYear,
      monthlyAttendance,
      currentYear
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get custom period attendance rankings
app.get('/api/attendance/ranking', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Parse start and end dates (format: YYYY-MM)
    const startDate = new Date(start + '-01');
    const endParts = end.split('-');
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]), 0); // Last day of end month
    
    const members = await memberQueries.getAll();
    const allAttendance = await attendanceQueries.getAll();
    
    // Calculate attendance for each member in the date range
    const rankings = members.map(member => {
      const memberAttendance = allAttendance.filter(record => {
        const recordDate = new Date(record.date);
        return record.member_id === member.id && 
               recordDate >= startDate && 
               recordDate <= endDate;
      });
      
      // Only count relevant statuses (exclude 'not-joined', 'break', 'left-choir', 'no-practice')
      const relevantRecords = memberAttendance.filter(
        r => r.status !== 'not-joined' && r.status !== 'break' && r.status !== 'left-choir' && r.status !== 'no-practice'
      );
      const present = relevantRecords.filter(r => r.status === 'present').length;
      const total = relevantRecords.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return {
        member_id: member.id,
        member_name: member.name,
        present,
        total,
        percentage
      };
    });
    
    // Sort by percentage (highest first), then by total attendance
    rankings.sort((a, b) => {
      if (b.percentage === a.percentage) {
        return b.total - a.total;
      }
      return b.percentage - a.percentage;
    });
    
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for any other routes (must be last)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
