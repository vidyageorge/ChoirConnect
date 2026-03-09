import { useEffect, useState } from 'react';
import { expensesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Expense } from '../types';

const CATEGORIES = [
  'Equipment',
  'Uniforms',
  'Travel',
  'Events',
  'Music/Books',
  'Venue',
  'Marketing',
  'Refreshments',
  'Other'
];

function Expenses() {
  const { user } = useAuth();
  const canEditExpenses = user?.role === 'admin';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; total: number }>>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [formData, setFormData] = useState({
    type: 'expense' as 'expense' | 'income',
    description: '',
    amount: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    paid_by: '',
    notes: ''
  });

  useEffect(() => {
    loadExpenses();
    loadStats();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await expensesAPI.getAll();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [breakdownData, categoryData] = await Promise.all([
        expensesAPI.getBreakdown(),
        expensesAPI.getByCategory()
      ]);
      setTotalExpenses(breakdownData.expenses ?? 0);
      setTotalIncome(breakdownData.income ?? 0);
      setCategoryStats(categoryData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const notesForSave =
      formData.type === 'income'
        ? (formData.notes.trim() ? formData.notes + '\nType: Income' : 'Type: Income')
        : (formData.notes || '').replace(/\n?Type: Income\n?/g, '').trim();

    try {
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        paid_by: formData.paid_by,
        notes: notesForSave
      };

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, expenseData);
      } else {
        await expensesAPI.create(expenseData);
      }
      
      setShowModal(false);
      resetForm();
      loadExpenses();
      loadStats();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const isIncome = expense.notes != null && expense.notes.includes('Type: Income');
    const notesWithoutType = (expense.notes || '').replace(/\n?Type: Income\n?/g, '').trim();
    setFormData({
      type: isIncome ? 'income' : 'expense',
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || 'Other',
      date: expense.date,
      paid_by: expense.paid_by || '',
      notes: notesWithoutType
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await expensesAPI.delete(id);
        loadExpenses();
        loadStats();
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      type: 'expense',
      description: '',
      amount: '',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      paid_by: '',
      notes: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isIncome = (expense: Expense) =>
    expense.notes != null && expense.notes.includes('Type: Income');

  const getYearFromDate = (dateStr: string) => parseInt(dateStr.substring(0, 4), 10);

  const yearWiseStats = (() => {
    const byYear: Record<number, { income: number; expenses: number }> = {};
    expenses.forEach((exp) => {
      const y = getYearFromDate(exp.date);
      if (!byYear[y]) byYear[y] = { income: 0, expenses: 0 };
      if (isIncome(exp)) byYear[y].income += exp.amount;
      else byYear[y].expenses += exp.amount;
    });
    return Object.entries(byYear)
      .map(([year, data]) => ({ year: parseInt(year, 10), ...data }))
      .sort((a, b) => b.year - a.year);
  })();

  const years = yearWiseStats.map((s) => s.year);
  const filteredExpenses =
    selectedYear === 'all'
      ? expenses
      : expenses.filter((e) => getYearFromDate(e.date) === selectedYear);

  const displayIncome =
    selectedYear === 'all'
      ? totalIncome
      : yearWiseStats.find((s) => s.year === selectedYear)?.income ?? 0;
  const displayExpenses =
    selectedYear === 'all'
      ? totalExpenses
      : yearWiseStats.find((s) => s.year === selectedYear)?.expenses ?? 0;

  const filteredCategoryStats =
    selectedYear === 'all'
      ? categoryStats
      : (() => {
          const map: Record<string, number> = {};
          filteredExpenses.filter((e) => !isIncome(e)).forEach((e) => {
            const cat = e.category || 'Other';
            map[cat] = (map[cat] || 0) + e.amount;
          });
          return Object.entries(map).map(([category, total]) => ({ category, total }));
        })();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Expense Management</h2>
        <p>Track and manage choir fund expenses</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 600 }}>Year:</span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '8rem' }}
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
            }
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon success">💰</div>
          <div className="stat-content">
            <h3>{formatCurrency(displayIncome)}</h3>
            <p>{selectedYear === 'all' ? 'Total Income' : `${selectedYear} Income`}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">💰</div>
          <div className="stat-content">
            <h3>{formatCurrency(displayExpenses)}</h3>
            <p>{selectedYear === 'all' ? 'Total Expenses' : `${selectedYear} Expenses`}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary">💰</div>
          <div className="stat-content">
            <h3 style={{ color: displayIncome - displayExpenses >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)' }}>
              {formatCurrency(displayIncome - displayExpenses)}
            </h3>
            <p>{selectedYear === 'all' ? 'Current Balance' : `${selectedYear} Balance`}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary">📊</div>
          <div className="stat-content">
            <h3>{filteredExpenses.length}</h3>
            <p>Transactions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">📈</div>
          <div className="stat-content">
            <h3>{filteredCategoryStats.length}</h3>
            <p>Active Categories</p>
          </div>
        </div>
      </div>

      {yearWiseStats.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Summary by year</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Income</th>
                  <th>Expenses</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {yearWiseStats.map((row) => (
                  <tr
                    key={row.year}
                    style={
                      selectedYear === row.year
                        ? { background: 'rgba(99, 102, 241, 0.08)' }
                        : undefined
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="btn-link"
                        style={{ fontWeight: 600 }}
                        onClick={() => setSelectedYear(row.year)}
                      >
                        {row.year}
                      </button>
                    </td>
                    <td style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>
                      {formatCurrency(row.income)}
                    </td>
                    <td style={{ color: 'var(--danger-color)', fontWeight: 600 }}>
                      {formatCurrency(row.expenses)}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: row.income - row.expenses >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)'
                      }}
                    >
                      {formatCurrency(row.income - row.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredCategoryStats.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Expenses by Category</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {filteredCategoryStats.map((stat, idx) => (
              <div key={idx} style={{ padding: '1rem', background: 'var(--background)', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
                  {formatCurrency(stat.total)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {stat.category || 'Uncategorized'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Expenses</h3>
          {canEditExpenses && (
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              + Add Expense
            </button>
          )}
        </div>

        <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {selectedYear === 'all' ? 'All transactions' : `Transactions in ${selectedYear}`}
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Paid By</th>
                  {canEditExpenses && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: isIncome(expense) ? 'var(--secondary-color)' : 'var(--danger-color)',
                          color: 'white'
                        }}
                      >
                        {isIncome(expense) ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td>
                      <strong>{expense.description}</strong>
                      {expense.notes && !expense.notes.includes('Type: Income') && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {expense.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {expense.category || 'Other'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '1.125rem', color: isIncome(expense) ? 'var(--secondary-color)' : 'var(--danger-color)' }}>
                      {formatCurrency(expense.amount)}
                    </td>
                    <td>{expense.paid_by || '-'}</td>
                    {canEditExpenses && (
                      <td>
                        <div className="actions">
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleEdit(expense)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDelete(expense.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <p>
              {selectedYear === 'all'
                ? 'No transactions yet. Add your first income or expense!'
                : `No transactions in ${selectedYear}.`}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingExpense ? 'Edit transaction' : 'Add income or expense'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })}
                  >
                    <option value="expense">Expense (money out)</option>
                    <option value="income">Income (money in)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={formData.type === 'income' ? 'e.g., Donation from parish' : 'e.g., New microphones for choir'}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paid By</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.paid_by}
                      onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                      placeholder="Person or organization"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update' : formData.type === 'income' ? 'Add income' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;

