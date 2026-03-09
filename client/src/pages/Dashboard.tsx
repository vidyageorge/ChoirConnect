import { useEffect, useState } from 'react';
import { dashboardAPI } from '../api';
import { DashboardData } from '../types';

/** Running feed: date, piece, and lineup (role - name). */
const RUNNING_FEED: Array<{ date: string; dateLabel: string; piece: string; lineup: string[] }> = [
  { date: '2026-03-08', dateLabel: 'March 8th', piece: 'Psalm 95', lineup: ['Vidya George', 'Keyboardist - John Benedict'] },
];

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customRanking, setCustomRanking] = useState<any>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await dashboardAPI.getData();
      setData(result);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCustomRanking = async () => {
    if (!startMonth || !endMonth) {
      alert('Please select both start and end months');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/attendance/ranking?start=${startMonth}&end=${endMonth}`);
      const result = await response.json();
      setCustomRanking(result);
    } catch (error) {
      console.error('Failed to calculate custom ranking:', error);
      alert('Error calculating rankings');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="empty-state">Failed to load dashboard data</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your choir's activities</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">👥</div>
          <div className="stat-content">
            <h3>{data.totalMembers}</h3>
            <p>Total Members</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">🎂</div>
          <div className="stat-content">
            <h3>{data.upcomingBirthdays}</h3>
            <p>Birthdays This Week</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">💵</div>
          <div className="stat-content">
            <h3>{formatCurrency(data.totalIncome)}</h3>
            <p>Total Income</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">💸</div>
          <div className="stat-content">
            <h3>{formatCurrency(data.totalExpenses)}</h3>
            <p>Total Expenses</p>
          </div>
        </div>

        <div className="stat-card" style={{ 
          gridColumn: 'span 2',
          background: data.currentBalance >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          border: `2px solid ${data.currentBalance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}`
        }}>
          <div className="stat-icon" style={{ 
            background: data.currentBalance >= 0 ? 'var(--success-color)' : 'var(--danger-color)' 
          }}>
            {data.currentBalance >= 0 ? '✅' : '⚠️'}
          </div>
          <div className="stat-content">
            <h3 style={{ 
              color: data.currentBalance >= 0 ? 'var(--success-color)' : 'var(--danger-color)',
              fontSize: '2rem'
            }}>
              {formatCurrency(data.currentBalance)}
            </h3>
            <p style={{ fontWeight: 600 }}>Current Choir Balance</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden', padding: 0 }}>
        <h3 className="card-title" style={{ marginBottom: 0, padding: '1rem 1.5rem' }}>Running feed</h3>
        <div
          className="dashboard-running-feed-strip"
          style={{
            overflow: 'hidden',
            padding: '1rem 0',
            background: '#2c1810',
            color: '#e8dcc8',
          }}
        >
          <div
            className="dashboard-running-feed-ticker"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3rem',
              width: 'max-content',
              animation: 'dashboard-ticker 25s linear infinite',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {[...RUNNING_FEED, ...RUNNING_FEED].map((entry, idx) => (
              <span key={idx} style={{ whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {entry.dateLabel} — {entry.piece}
                </span>
                <span style={{ margin: '0 0.5rem', fontSize: '1rem', opacity: 0.9 }}>·</span>
                <span style={{ fontWeight: 400 }}>
                  {entry.lineup.map((line, i) => {
                    const dash = line.indexOf(' - ');
                    const largeStyle = { fontSize: '1.125rem', fontWeight: 600 };
                    if (dash >= 0) {
                      const role = line.slice(0, dash + 3);
                      const name = line.slice(dash + 3);
                      return (
                        <span key={i}>
                          {i > 0 && <span style={{ margin: '0 0.35rem', fontSize: '0.9375rem' }}>·</span>}
                          <span style={largeStyle}>{role}</span>
                          <span style={largeStyle}>{name}</span>
                        </span>
                      );
                    }
                    return (
                      <span key={i}>
                        {i > 0 && <span style={{ margin: '0 0.35rem', fontSize: '0.9375rem' }}>·</span>}
                        <span style={largeStyle}>{line}</span>
                      </span>
                    );
                  })}
                </span>
                <span style={{ marginLeft: '1rem', fontSize: '0.75rem' }}>★</span>
              </span>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes dashboard-ticker {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
        `}</style>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title">
              📊 Q{data.currentQuarter} {new Date().getFullYear()} Attendance Rankings
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Highest to lowest attendance this quarter
            </p>
          </div>
          <button 
            className="btn btn-primary btn-small"
            onClick={() => setShowCustomRange(!showCustomRange)}
          >
            {showCustomRange ? '📅 Hide Custom Range' : '📅 Custom Date Range'}
          </button>
        </div>
        {data.quarterlyAttendance.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Member</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Percentage</th>
                  <th style={{ width: '200px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.quarterlyAttendance.map((record, index) => {
                  // Calculate proper rank considering ties
                  let rank = 1;
                  for (let i = 0; i < index; i++) {
                    if (data.quarterlyAttendance[i].percentage > record.percentage) {
                      rank++;
                    } else if (data.quarterlyAttendance[i].percentage === record.percentage) {
                      // Same percentage = same rank, don't increment
                    }
                  }
                  
                  // Assign medals based on rank (all tied at rank 1 get gold, etc.)
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                  const isTop3 = rank <= 3;
                  
                  return (
                    <tr key={record.member_id} style={{ 
                      background: isTop3 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' 
                    }}>
                      <td style={{ 
                        fontWeight: 600, 
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        {medal || rank}
                      </td>
                      <td style={{ fontWeight: isTop3 ? 600 : 400 }}>{record.member_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{record.present}</td>
                      <td style={{ textAlign: 'center' }}>{record.total}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${
                          record.percentage >= 90 ? 'success' :
                          record.percentage >= 75 ? 'primary' :
                          record.percentage >= 50 ? 'warning' : 'danger'
                        }`}>
                          {record.percentage}%
                        </span>
                      </td>
                      <td>
                        <div style={{ 
                          width: '100%', 
                          height: '24px', 
                          background: 'var(--border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${record.percentage}%`,
                            height: '100%',
                            background: record.percentage >= 90 ? 'var(--success-color)' :
                                       record.percentage >= 75 ? 'var(--primary-color)' :
                                       record.percentage >= 50 ? 'var(--warning-color)' : 'var(--danger-color)',
                            transition: 'width 0.3s ease',
                            borderRadius: '12px'
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No attendance data for this quarter yet</p>
          </div>
        )}
      </div>

      {/* Last Quarter Attendance */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            📊 Last Quarter (Q{data.lastQuarter ?? 4} {data.lastQuarterYear ?? (new Date().getFullYear() - 1)}) Attendance Rankings
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Previous quarter attendance
          </p>
        </div>
        {data.lastQuarterAttendance?.some(r => r.total > 0) ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Member</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Percentage</th>
                  <th style={{ width: '200px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.lastQuarterAttendance.filter(r => r.total > 0).map((record, index) => {
                  let rank = 1;
                  const filtered = (data.lastQuarterAttendance ?? []).filter(r => r.total > 0);
                  for (let i = 0; i < index; i++) {
                    if (filtered[i].percentage > record.percentage) rank++;
                  }
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                  const isTop3 = rank <= 3;
                  return (
                    <tr key={record.member_id} style={{ background: isTop3 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 600, fontSize: '1.1rem', textAlign: 'center' }}>{medal || rank}</td>
                      <td style={{ fontWeight: isTop3 ? 600 : 400 }}>{record.member_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{record.present}</td>
                      <td style={{ textAlign: 'center' }}>{record.total}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${record.percentage >= 90 ? 'success' : record.percentage >= 75 ? 'primary' : record.percentage >= 50 ? 'warning' : 'danger'}`}>
                          {record.percentage}%
                        </span>
                      </td>
                      <td>
                        <div style={{ width: '100%', height: '24px', background: 'var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ width: `${record.percentage}%`, height: '100%', background: record.percentage >= 90 ? 'var(--success-color)' : record.percentage >= 75 ? 'var(--primary-color)' : record.percentage >= 50 ? 'var(--warning-color)' : 'var(--danger-color)', borderRadius: '12px' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No attendance data for last quarter</p>
          </div>
        )}
      </div>

      {/* Month-wise Attendance */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">📅 Month-wise Attendance ({data.currentYear ?? new Date().getFullYear()})</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Each member&apos;s attendance percentage by month
          </p>
        </div>
        {(data.monthlyAttendance?.length ?? 0) > 0 ? (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1, minWidth: '140px' }}>Member</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, i) => (
                    <th key={i} style={{ textAlign: 'center', minWidth: '44px' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.monthlyAttendance ?? []).map((row) => (
                  <tr key={row.member_id}>
                    <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>{row.member_name}</td>
                    {row.byMonth.map((m, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>
                        {m.percentage !== null ? (
                          <span className={`badge badge-${m.percentage >= 90 ? 'success' : m.percentage >= 75 ? 'primary' : m.percentage >= 50 ? 'warning' : 'danger'}`} style={{ fontSize: '0.75rem' }}>
                            {m.percentage}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No month-wise data yet</p>
          </div>
        )}
      </div>

      {/* Custom Date Range Selector */}
      {showCustomRange && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', border: '2px solid var(--primary-color)' }}>
          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary-color)' }}>📅 Calculate Custom Period Ranking</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  Start Month *
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  min="2024-01"
                  max="2026-12"
                  placeholder="Select start month"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--primary-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: 'white'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {startMonth ? `Selected: ${new Date(startMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Click to select'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  End Month *
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  min="2024-01"
                  max="2026-12"
                  placeholder="Select end month"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--primary-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: 'white'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {endMonth ? `Selected: ${new Date(endMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Click to select'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={calculateCustomRanking}
                  style={{ width: '100%', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 600 }}
                  disabled={!startMonth || !endMonth}
                >
                  📊 Calculate Rankings
                </button>
              </div>
            </div>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'white', 
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}>
              <strong>💡 How to use:</strong>
              <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                <li>Click on the <strong>Start Month</strong> field and select a month</li>
                <li>Click on the <strong>End Month</strong> field and select a month</li>
                <li>Click <strong>Calculate Rankings</strong> to see results</li>
              </ol>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                <em>Example: Select "May 2025" to "October 2025" for 6-month rankings</em>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Ranking Results */}
      {customRanking && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              🎯 Custom Period Rankings
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {new Date(startMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {new Date(endMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Member</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Percentage</th>
                  <th style={{ width: '200px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {customRanking.map((record: any, index: number) => {
                  // Calculate proper rank considering ties
                  let rank = 1;
                  for (let i = 0; i < index; i++) {
                    if (customRanking[i].percentage > record.percentage) {
                      rank++;
                    } else if (customRanking[i].percentage === record.percentage) {
                      // Same percentage = same rank, don't increment
                    }
                  }
                  
                  // Assign medals based on rank (all tied at rank 1 get gold, etc.)
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                  const isTop3 = rank <= 3;
                  
                  return (
                    <tr key={record.member_id} style={{ 
                      background: isTop3 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' 
                    }}>
                      <td style={{ 
                        fontWeight: 600, 
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        {medal || rank}
                      </td>
                      <td style={{ fontWeight: isTop3 ? 600 : 400 }}>{record.member_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{record.present}</td>
                      <td style={{ textAlign: 'center' }}>{record.total}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${
                          record.percentage >= 90 ? 'success' :
                          record.percentage >= 75 ? 'primary' :
                          record.percentage >= 50 ? 'warning' : 'danger'
                        }`}>
                          {record.percentage}%
                        </span>
                      </td>
                      <td>
                        <div style={{ 
                          width: '100%', 
                          height: '24px', 
                          background: 'var(--border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${record.percentage}%`,
                            height: '100%',
                            background: record.percentage >= 90 ? 'var(--success-color)' :
                                       record.percentage >= 75 ? 'var(--primary-color)' :
                                       record.percentage >= 50 ? 'var(--warning-color)' : 'var(--danger-color)',
                            transition: 'width 0.3s ease',
                            borderRadius: '12px'
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="card-title">Recent Attendance</h3>
          {data.recentAttendance.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ 
                padding: '0.5rem 1rem', 
                background: 'rgba(16, 185, 129, 0.1)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-color)' }}>
                    {data.recentAttendance.filter(r => r.status === 'present').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present</div>
                </div>
              </div>
              <div style={{ 
                padding: '0.5rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>✗</span>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger-color)' }}>
                    {data.recentAttendance.filter(r => r.status === 'absent').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Absent</div>
                </div>
              </div>
            </div>
          )}
        </div>
        {data.recentAttendance.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAttendance.map((record) => (
                  <tr key={record.id}>
                    <td>{record.member_name}</td>
                    <td>
                      <span className={`badge badge-${
                        record.event_type === 'saturday' ? 'primary' :
                        record.event_type === 'sunday' ? 'success' : 'warning'
                      }`}>
                        {record.event_type === 'saturday' ? 'Saturday' :
                         record.event_type === 'sunday' ? 'Sunday' : record.event_name}
                      </span>
                    </td>
                    <td>{formatDate(record.date)}</td>
                    <td>
                      <span className={`badge badge-${
                        record.status === 'present' ? 'success' : 
                        record.status === 'medical' ? 'warning' :
                        record.status === 'break' ? 'primary' :
                        record.status === 'not-joined' ? 'secondary' :
                        record.status === 'left-choir' ? 'danger' :
                        record.status === 'no-practice' ? 'no-practice' : 'danger'
                      }`}>
                        {record.status === 'present' ? 'Present' :
                         record.status === 'absent' ? 'Absent' :
                         record.status === 'medical' ? 'Medical' :
                         record.status === 'break' ? 'Break' :
                         record.status === 'left-choir' ? 'Left Choir' :
                         record.status === 'no-practice' ? 'No Practice' : 'Not Joined'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No attendance records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

