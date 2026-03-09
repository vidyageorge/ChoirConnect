import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceCorrectionsAPI, membersAPI } from '../api';
import type { AttendanceCorrectionRequest, Member, AttendanceStatus } from '../types';

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'medical', 'break', 'not-joined', 'left-choir', 'no-practice'];
const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  medical: 'Medical Leave',
  break: 'Break from Choir',
  'not-joined': 'Not Joined Yet',
  'left-choir': 'Left Choir',
  'no-practice': 'No Practice',
};
const REQUEST_STATUS_STYLE: Record<string, string> = {
  pending: 'var(--warning-color)',
  approved: 'var(--success-color)',
  rejected: 'var(--danger-color)',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatEventType(eventType: string, eventName: string | null): string {
  if (eventType === 'saturday') return 'Saturday';
  if (eventType === 'sunday') return 'Sunday';
  return eventName || 'Special';
}

function AttendanceCorrections() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState<AttendanceCorrectionRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    member_id: 0,
    date: '',
    event_type: 'sunday' as 'saturday' | 'sunday' | 'special',
    event_name: '',
    current_status: 'absent' as AttendanceStatus,
    requested_status: 'present' as AttendanceStatus,
    reason: '',
  });

  useEffect(() => {
    loadList();
    if (isAdmin) loadMembers();
  }, [isAdmin]);

  const loadList = async () => {
    try {
      const data = await attendanceCorrectionsAPI.getAll();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await membersAPI.getAll();
      setMembers(Array.isArray(data) ? data : []);
      if (data?.length && !form.member_id) setForm((f) => ({ ...f, member_id: data[0].id }));
    } catch (e) {
      console.error('Failed to load members:', e);
    }
  };

  const handleOpenNew = () => {
    setError('');
    setForm({
      member_id: isAdmin && members.length ? members[0].id : (user?.memberId ?? 0),
      date: '',
      event_type: 'sunday',
      event_name: '',
      current_status: 'absent',
      requested_status: 'present',
      reason: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const memberId = isAdmin ? form.member_id : user?.memberId;
    if (!memberId || !form.date.trim() || !form.reason.trim()) {
      setError('Date and reason are required.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await attendanceCorrectionsAPI.create({
        member_id: memberId,
        date: form.date,
        event_type: form.event_type,
        event_name: form.event_type === 'special' ? form.event_name : undefined,
        current_status: form.current_status,
        requested_status: form.requested_status,
        reason: form.reason.trim(),
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      setShowModal(false);
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (id: number, request_status: 'approved' | 'rejected') => {
    setError('');
    try {
      const data = await attendanceCorrectionsAPI.approveOrReject(id, request_status);
      if (data.error) {
        setError(data.error);
        return;
      }
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const filtered = list.filter(
    (r) =>
      !search ||
      r.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.date.includes(search) ||
      r.reason.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice(0, pageSize);
  const total = filtered.length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Attendance correction request</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Request a change when attendance was entered wrongly.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenNew}>
          New request +
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            Show
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '2px solid var(--border)' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            entries
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            Search:
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Member, date, reason..."
              style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '2px solid var(--border)', minWidth: '180px' }}
            />
          </label>
        </div>

        {error && (
          <p style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</p>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Event</th>
                    {isAdmin && (
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Member</th>
                    )}
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Current</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Requested</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
                    {isAdmin && (
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 7} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No correction requests. Click &quot;New request +&quot; to submit one.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((r, idx) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>{(idx + 1)}</td>
                        <td style={{ padding: '0.75rem' }}>{formatDate(r.date)}</td>
                        <td style={{ padding: '0.75rem' }}>{formatEventType(r.event_type, r.event_name)}</td>
                        {isAdmin && (
                          <td style={{ padding: '0.75rem' }}>{r.member_name}</td>
                        )}
                        <td style={{ padding: '0.75rem' }}>{STATUS_LABELS[r.current_status] || r.current_status}</td>
                        <td style={{ padding: '0.75rem' }}>{STATUS_LABELS[r.requested_status] || r.requested_status}</td>
                        <td style={{ padding: '0.75rem', maxWidth: '200px' }}>{r.reason}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ color: REQUEST_STATUS_STYLE[r.request_status] || 'inherit', fontWeight: 600 }}>
                            {r.request_status.charAt(0).toUpperCase() + r.request_status.slice(1)}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '0.75rem' }}>
                            {r.request_status === 'pending' && (
                              <span style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-success btn-small"
                                  onClick={() => handleApproveReject(r.id, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-small"
                                  onClick={() => handleApproveReject(r.id, 'rejected')}
                                >
                                  Reject
                                </button>
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing 1 to {Math.min(pageSize, total)} of {total} entries
            </p>
          </>
        )}
      </div>

      {showModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1000,
            }}
            onClick={() => setShowModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1001,
              width: '90%',
              maxWidth: 480,
              padding: '1.5rem',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>New correction request</h3>
            <form onSubmit={handleSubmit}>
              {isAdmin && members.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Member</label>
                  <select
                    className="form-input"
                    value={form.member_id}
                    onChange={(e) => setForm((f) => ({ ...f, member_id: Number(e.target.value) }))}
                    required
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Event type</label>
                <select
                  className="form-input"
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as 'saturday' | 'sunday' | 'special' }))}
                >
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                  <option value="special">Special</option>
                </select>
              </div>
              {form.event_type === 'special' && (
                <div className="form-group">
                  <label className="form-label">Event name (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.event_name}
                    onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
                    placeholder="e.g. Good Friday"
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Current status (as recorded)</label>
                <select
                  className="form-input"
                  value={form.current_status}
                  onChange={(e) => setForm((f) => ({ ...f, current_status: e.target.value as AttendanceStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Requested status (correct status)</label>
                <select
                  className="form-input"
                  value={form.requested_status}
                  onChange={(e) => setForm((f) => ({ ...f, requested_status: e.target.value as AttendanceStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-input"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  required
                  placeholder="Why should this be changed?"
                />
              </div>
              {error && (
                <p style={{ color: 'var(--danger-color)', marginBottom: '0.5rem' }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default AttendanceCorrections;
