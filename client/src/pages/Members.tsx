import { useEffect, useState } from 'react';
import { membersAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Member } from '../types';

function Members() {
  const { user, refreshUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [claimingMemberId, setClaimingMemberId] = useState<number | ''>('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    joined_date: new Date().toISOString().split('T')[0]
  });

  const isAdmin = user?.role === 'admin';
  const canAddMember = isAdmin;
  const canEditMember = (memberId: number) =>
    isAdmin || (user?.role === 'member' && user?.memberId === memberId);
  const canDeleteMember = isAdmin;
  const needsToClaimProfile = user?.role === 'member' && user?.memberId == null;
  const unlinkedMembers = members.filter((m) => m.user_id == null);

  const handleClaimProfile = async () => {
    if (!claimingMemberId) return;
    setClaimError('');
    setClaiming(true);
    try {
      const data = await membersAPI.claimProfile(Number(claimingMemberId));
      if (data.error) {
        setClaimError(data.error);
        return;
      }
      await refreshUser();
      setClaimingMemberId('');
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to link profile');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadUpcomingBirthdays();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await membersAPI.getAll();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingBirthdays = async () => {
    try {
      const data = await membersAPI.getUpcomingBirthdays();
      setUpcomingBirthdays(data);
    } catch (error) {
      console.error('Failed to load birthdays:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMember) {
        await membersAPI.update(editingMember.id, formData);
      } else {
        await membersAPI.create(formData);
      }

      setShowModal(false);
      resetForm();
      loadMembers();
      loadUpcomingBirthdays();
    } catch (error) {
      console.error('Failed to save member:', error);
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      birthday: member.birthday || '',
      joined_date: member.joined_date
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this member?')) {
      try {
        await membersAPI.delete(id);
        loadMembers();
      } catch (error) {
        console.error('Failed to delete member:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthday: '',
      joined_date: new Date().toISOString().split('T')[0]
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatBirthday = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Choir Members</h2>
        <p>Manage your choir members and their information</p>
      </div>

      {needsToClaimProfile && unlinkedMembers.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Link your profile</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Select your name below so you can edit your own details. You can only do this once.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '14rem' }}
              value={claimingMemberId}
              onChange={(e) => { setClaimingMemberId(e.target.value ? Number(e.target.value) : ''); setClaimError(''); }}
            >
              <option value="">Select your name...</option>
              {unlinkedMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!claimingMemberId || claiming}
              onClick={handleClaimProfile}
            >
              {claiming ? 'Linking...' : 'This is me'}
            </button>
          </div>
          {claimError && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--danger-color)' }}>{claimError}</p>
          )}
        </div>
      )}

      {upcomingBirthdays.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🎂 Upcoming Birthdays (Next 30 Days)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {upcomingBirthdays.map((member) => (
              <div key={member.id} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <strong>{member.name}</strong> - {formatBirthday(member.birthday)}
                {member.daysUntilBirthday !== undefined && (
                  <span style={{ marginLeft: '0.5rem', opacity: 0.9 }}>
                    ({member.daysUntilBirthday === 0 ? 'Today!' : `in ${member.daysUntilBirthday} days`})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Members ({members.length})</h3>
          {canAddMember && (
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              + Add Member
            </button>
          )}
        </div>

        {members.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Birthday</th>
                  <th>Joined</th>
                  {(canAddMember || canDeleteMember || members.some((m) => canEditMember(m.id))) && (
                    <th>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.name}</strong></td>
                    <td>{member.email || '-'}</td>
                    <td>{member.phone || '-'}</td>
                    <td>{formatBirthday(member.birthday)}</td>
                    <td>{formatDate(member.joined_date)}</td>
                    {(canAddMember || canDeleteMember || members.some((m) => canEditMember(m.id))) && (
                      <td>
                        <div className="actions">
                          {canEditMember(member.id) && (
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => handleEdit(member)}
                            >
                              Edit
                            </button>
                          )}
                          {canDeleteMember && (
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete(member.id)}
                            >
                              Delete
                            </button>
                          )}
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
            <div className="empty-state-icon">👥</div>
            <p>No members yet. Add your first member to get started!</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingMember ? 'Edit Member' : 'Add New Member'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Birthday</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joined Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.joined_date}
                      onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMember ? 'Update Member' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;

