import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membersAPI, attendanceAPI } from '../api';
import { Member, Attendance as AttendanceType, AttendanceStatus } from '../types';

export type EventTypeFilter = 'sunday-only' | 'saturday-sunday' | 'all';

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: '✓' },
  absent: { label: 'Absent', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: '✗' },
  medical: { label: 'Medical Leave', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: '🏥' },
  break: { label: 'Break from Choir', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', icon: '⏸' },
  'not-joined': { label: 'Not Joined Yet', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)', icon: '—' },
  'left-choir': { label: 'Left Choir', color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.1)', icon: '👋' },
  'no-practice': { label: 'No Practice', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: '🚫' }
};

function Attendance() {
  const { user } = useAuth();
  const isMemberView = user?.role === 'member' && user?.memberId != null;
  const [members, setMembers] = useState<Member[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [savingStatus, setSavingStatus] = useState<string>('');
  const [showStatusMenu, setShowStatusMenu] = useState<{ memberId: number; date: string; eventType: 'saturday' | 'sunday' | 'special' } | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');

  // Format date to YYYY-MM-DD without timezone conversion
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadMembers();
    loadAttendance();
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

  const loadAttendance = async () => {
    try {
      const data = await attendanceAPI.getAll();
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const addSpecialEvent = async () => {
    if (!newEventDate || !newEventName) {
      alert('Please enter both date and event name');
      return;
    }

    try {
      setSavingStatus('Adding special event...');
      
      // Create attendance records for all members for this special date
      const promises = members.map(member => 
        attendanceAPI.create({
          member_id: member.id,
          event_type: 'special',
          event_name: newEventName,
          date: newEventDate,
          status: 'not-joined', // Default status
          notes: ''
        })
      );

      await Promise.all(promises);
      
      // Reload attendance
      await loadAttendance();
      
      // Reset form and close modal
      setNewEventDate('');
      setNewEventName('');
      setShowAddEventModal(false);
      setSavingStatus('Special event added!');
      setTimeout(() => setSavingStatus(''), 2000);
    } catch (error) {
      console.error('Failed to add special event:', error);
      setSavingStatus('Error adding event');
      setTimeout(() => setSavingStatus(''), 2000);
    }
  };

  // Get all Saturdays and Sundays for a given month (special events include stored event_name for display)
  const getWeekendDatesForMonth = (year: number, month: number) => {
    const dates: Array<{ date: Date; type: 'saturday' | 'sunday' | 'special'; eventName?: string }> = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0) { // Sunday
        dates.push({ date, type: 'sunday' });
      } else if (dayOfWeek === 6) { // Saturday
        dates.push({ date, type: 'saturday' });
      }
    }
    
    // Add special event dates from attendance records
    const specialDates = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date + 'T00:00:00');
      return record.event_type === 'special' && 
             recordDate.getFullYear() === year && 
             recordDate.getMonth() === month;
    });
    
    // Get unique special dates
    const uniqueSpecialDates = new Set<string>();
    specialDates.forEach(record => {
      const recordDate = new Date(record.date + 'T00:00:00');
      const dateKey = record.date;
      if (!uniqueSpecialDates.has(dateKey)) {
        uniqueSpecialDates.add(dateKey);
        dates.push({ date: recordDate, type: 'special', eventName: record.event_name || 'Special Event' });
      }
    });
    
    // Sort by date
    dates.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return dates;
  };

  type WeekendDateItem = { date: Date; type: 'saturday' | 'sunday' | 'special'; eventName?: string; month?: number };

  // Get all Saturdays and Sundays for the entire year
  const getWeekendDatesForYear = (year: number) => {
    const dates: WeekendDateItem[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthDates = getWeekendDatesForMonth(year, month);
      monthDates.forEach(d => dates.push({ ...d, month }));
    }
    
    return dates;
  };

  const weekendDatesRaw: WeekendDateItem[] = viewMode === 'month' 
    ? getWeekendDatesForMonth(currentYear, currentMonth)
    : getWeekendDatesForYear(currentYear);
  const weekendDates = weekendDatesRaw.filter((d) => {
    if (eventTypeFilter === 'sunday-only') return d.type === 'sunday';
    if (eventTypeFilter === 'saturday-sunday') return d.type === 'saturday' || d.type === 'sunday';
    return true;
  });

  // Get attendance status for a member on a specific date
  const getAttendanceStatus = (memberId: number, date: Date, eventType: 'saturday' | 'sunday' | 'special'): AttendanceStatus | null => {
    const dateStr = formatDateString(date);
    const record = attendanceRecords.find(
      r => r.member_id === memberId && 
           r.date === dateStr && 
           r.event_type === eventType
    );
    return record?.status || null;
  };

  // Set attendance status for a member on a specific date
  const setAttendanceStatus = async (memberId: number, date: Date, eventType: 'saturday' | 'sunday' | 'special', status: AttendanceStatus) => {
    const dateStr = formatDateString(date);
    const existingRecord = attendanceRecords.find(
      r => r.member_id === memberId && 
           r.date === dateStr && 
           r.event_type === eventType
    );

    try {
      setSavingStatus('Saving...');
      setShowStatusMenu(null); // Close menu immediately
      
      if (existingRecord) {
        // Update existing record
        await attendanceAPI.update(existingRecord.id, { status, notes: existingRecord.notes || '' });
        
        // Update local state immediately for better UX
        setAttendanceRecords(prev => 
          prev.map(r => r.id === existingRecord.id ? { ...r, status } : r)
        );
      } else {
        // Create new record
        const eventName = eventType === 'saturday' ? 'Saturday Practice' : eventType === 'sunday' ? 'Sunday Practice' : (attendanceRecords.find(r => r.date === dateStr && r.event_type === 'special')?.event_name || 'Special Event');
        const response = await attendanceAPI.create({
          member_id: memberId,
          event_type: eventType,
          event_name: eventName,
          date: dateStr,
          status: status,
          notes: ''
        });
        
        // Add to local state immediately
        setAttendanceRecords(prev => [...prev, {
          id: response.id,
          member_id: memberId,
          event_type: eventType,
          event_name: eventName,
          date: dateStr,
          status: status,
          notes: '',
          created_at: new Date().toISOString()
        } as AttendanceType]);
      }
      
      setSavingStatus('Saved!');
      setTimeout(() => setSavingStatus(''), 1500);
    } catch (error) {
      console.error('Failed to set attendance:', error);
      setSavingStatus('Error saving');
      setTimeout(() => setSavingStatus(''), 2000);
      // Reload data on error to ensure consistency
      await loadAttendance();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMonthYear = (year: number, month: number) => {
    return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentYear(new Date().getFullYear());
    setCurrentMonth(new Date().getMonth());
  };

  // Allowed event types based on current filter
  const allowedEventTypes = (): Array<'saturday' | 'sunday' | 'special'> => {
    if (eventTypeFilter === 'sunday-only') return ['sunday'];
    if (eventTypeFilter === 'saturday-sunday') return ['saturday', 'sunday'];
    return ['saturday', 'sunday', 'special'];
  };

  // Date range for stats: only the visible month or year (so % matches what you see)
  const statsDateInRange = (dateStr: string): boolean => {
    if (viewMode === 'month') {
      const [y, m] = dateStr.split('-').map(Number);
      return y === currentYear && m === currentMonth + 1;
    }
    const y = parseInt(dateStr.slice(0, 4), 10);
    return y === currentYear;
  };

  // Calculate attendance statistics for each member for the visible period only
  const getMemberStats = (memberId: number) => {
    const allowed = allowedEventTypes();
    const relevantRecords = attendanceRecords.filter(
      r => r.member_id === memberId &&
           allowed.includes(r.event_type) &&
           statsDateInRange(r.date) &&
           r.status !== 'not-joined' && r.status !== 'break' && r.status !== 'left-choir' && r.status !== 'no-practice'
    );
    const present = relevantRecords.filter(r => r.status === 'present').length;
    const total = relevantRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, total, percentage };
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading attendance...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h2>Attendance Tracking</h2>
          <p>Track attendance for practices and special events</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>
              {isMemberView
                ? 'Claim your profile from the Members page to see your attendance here.'
                : 'No members found. Please add members first to track attendance.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Attendance Tracking</h2>
        <p>{isMemberView ? 'Your attendance (view only)' : 'Click on cells to mark attendance status for each member'}</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                onClick={() => setViewMode('month')}
              >
                Month View
              </button>
              <button 
                className={`btn ${viewMode === 'year' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                onClick={() => setViewMode('year')}
              >
                Year View
              </button>
              {!isMemberView && (
              <button 
                className="btn btn-success btn-small"
                onClick={() => setShowAddEventModal(true)}
                style={{ marginLeft: '0.5rem' }}
              >
                + Add Special Event
              </button>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Show & count:</span>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '2px solid var(--border)',
                    background: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                  title="Choose which practices to show in the grid and include in Stats"
                >
                  <option value="sunday-only">Sunday only</option>
                  <option value="saturday-sunday">Saturday & Sunday</option>
                  <option value="all">All (include Special)</option>
                </select>
              </label>
            </div>
            
            {savingStatus && (
              <span style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                background: savingStatus === 'Saved!' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                color: savingStatus === 'Saved!' ? 'var(--secondary-color)' : 'var(--primary-color)',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                {savingStatus}
              </span>
            )}
          </div>

          {viewMode === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary btn-small" onClick={goToPreviousMonth}>
                ← Previous
              </button>
              <h3 style={{ margin: 0, minWidth: '200px', textAlign: 'center' }}>
                {formatMonthYear(currentYear, currentMonth)}
              </h3>
              <button className="btn btn-secondary btn-small" onClick={goToNextMonth}>
                Next →
              </button>
              <button className="btn btn-primary btn-small" onClick={goToCurrentMonth}>
                Today
              </button>
            </div>
          )}

          {viewMode === 'year' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setCurrentYear(currentYear - 1)}>
                ← {currentYear - 1}
              </button>
              <h3 style={{ margin: 0, minWidth: '100px', textAlign: 'center' }}>
                {currentYear}
              </h3>
              <button className="btn btn-secondary btn-small" onClick={() => setCurrentYear(currentYear + 1)}>
                {currentYear + 1} →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ 
          overflowX: 'auto', 
          overflowY: 'auto', 
          maxHeight: viewMode === 'year' ? '70vh' : 'auto'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'separate', 
            borderSpacing: 0,
            fontSize: '0.875rem'
          }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 20 }}>
              <tr>
                <th style={{ 
                  position: 'sticky', 
                  left: 0, 
                  background: 'white', 
                  padding: '1rem',
                  borderBottom: '2px solid var(--border)',
                  borderRight: '2px solid var(--border)',
                  fontWeight: 600,
                  textAlign: 'left',
                  minWidth: '150px',
                  zIndex: 21,
                  boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)'
                }}>
                  Member
                </th>
                {viewMode === 'month' ? (
                  weekendDates.map((d, idx) => (
                    <th key={idx} style={{ 
                      padding: '0.75rem 0.5rem',
                      borderBottom: '2px solid var(--border)',
                      textAlign: 'center',
                      minWidth: '70px',
                      background: d.type === 'sunday' ? 'rgba(16, 185, 129, 0.05)' : 
                                  d.type === 'special' ? 'rgba(245, 158, 11, 0.05)' : 
                                  'rgba(99, 102, 241, 0.05)'
                    }}>
                      <div style={{ fontWeight: 600 }}>{formatDate(d.date)}</div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-secondary)',
                        textTransform: d.type === 'special' ? 'none' : 'uppercase'
                      }}>
                        {d.type === 'saturday' ? 'Sat' : d.type === 'sunday' ? 'Sun' : (d.eventName || 'Special')}
                      </div>
                    </th>
                  ))
                ) : (
                  // Year view - group by month
                  <>
                    {Array.from({ length: 12 }, (_, month) => {
                      const monthDates = weekendDates.filter((d: any) => d.month === month);
                      if (monthDates.length === 0) return null;
                      
                      return (
                        <th key={month} colSpan={monthDates.length} style={{
                          padding: '0.75rem 0.5rem',
                          borderBottom: '2px solid var(--border)',
                          borderLeft: month > 0 ? '2px solid var(--border)' : 'none',
                          textAlign: 'center',
                          background: 'var(--background)',
                          fontWeight: 600
                        }}>
                          {new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' })}
                        </th>
                      );
                    })}
                  </>
                )}
                <th style={{
                  position: 'sticky',
                  right: 0,
                  background: 'white',
                  padding: '1rem',
                  borderBottom: '2px solid var(--border)',
                  borderLeft: '2px solid var(--border)',
                  fontWeight: 600,
                  textAlign: 'center',
                  minWidth: '100px',
                  zIndex: 21,
                  boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)'
                }}>
                  Stats
                </th>
              </tr>
              {viewMode === 'year' && (
                <tr>
                  <th style={{
                    position: 'sticky',
                    left: 0,
                    background: 'white',
                    padding: '0.5rem 1rem',
                    borderBottom: '2px solid var(--border)',
                    borderRight: '2px solid var(--border)',
                    zIndex: 21,
                    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)'
                  }}></th>
                  {weekendDates.map((d: any, idx) => (
                    <th key={idx} style={{
                      padding: '0.5rem 0.25rem',
                      borderBottom: '2px solid var(--border)',
                      borderLeft: idx > 0 && (weekendDates[idx - 1] as any).month !== d.month ? '2px solid var(--border)' : 'none',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      background: d.type === 'sunday' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(99, 102, 241, 0.05)'
                    }}>
                      {d.date.getDate()}
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        {d.type === 'saturday' ? 'S' : 'S'}
                      </div>
                    </th>
                  ))}
                  <th style={{
                    position: 'sticky',
                    right: 0,
                    background: 'white',
                    padding: '0.5rem',
                    borderBottom: '2px solid var(--border)',
                    borderLeft: '2px solid var(--border)',
                    zIndex: 21,
                    boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)'
                  }}></th>
                </tr>
              )}
            </thead>
            <tbody>
              {members.map((member) => {
                const stats = getMemberStats(member.id);
                
                return (
                  <tr key={member.id} style={{ 
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <td style={{ 
                      position: 'sticky', 
                      left: 0, 
                      background: 'white',
                      padding: '1rem',
                      fontWeight: 600,
                      borderRight: '2px solid var(--border)',
                      zIndex: 15,
                      boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)'
                    }}>
                      {member.name}
                    </td>
                    {weekendDates.map((d: any, idx) => {
                      const status = getAttendanceStatus(member.id, d.date, d.type);
                      const isToday = d.date.toDateString() === new Date().toDateString();
                      const config = status ? STATUS_CONFIG[status] : null;
                      const isMenuOpen = showStatusMenu?.memberId === member.id && 
                                        showStatusMenu?.date === formatDateString(d.date) &&
                                        showStatusMenu?.eventType === d.type;
                      
                      return (
                        <td key={idx} style={{ 
                          padding: '0.5rem',
                          textAlign: 'center',
                          borderLeft: viewMode === 'year' && idx > 0 && 'month' in weekendDates[idx - 1] && 'month' in d && (weekendDates[idx - 1] as any).month !== (d as any).month ? '2px solid var(--border)' : 'none',
                          background: isToday ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                          position: 'relative'
                        }}>
                          {isMemberView ? (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                border: `2px solid ${config ? config.color : 'var(--border)'}`,
                                borderRadius: '6px',
                                background: config ? config.bgColor : 'white',
                                color: config ? config.color : 'var(--text-secondary)',
                                cursor: 'default',
                                fontSize: '1.125rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                fontWeight: 600
                              }}
                              title={`${member.name} - ${formatDate(d.date)} (${d.type === 'saturday' ? 'Saturday' : d.type === 'sunday' ? 'Sunday' : (d.eventName || 'Special')})`}
                            >
                              {config?.icon || ''}
                            </div>
                          ) : (
                            <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowStatusMenu({ 
                                memberId: member.id, 
                                date: formatDateString(d.date), 
                                eventType: d.type 
                              });
                            }}
                            style={{
                              width: '40px',
                              height: '40px',
                              border: `2px solid ${config ? config.color : 'var(--border)'}`,
                              borderRadius: '6px',
                              background: config ? config.bgColor : 'white',
                              color: config ? config.color : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '1.125rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              margin: '0 auto',
                              fontWeight: 600
                            }}
                            title={`${member.name} - ${formatDate(d.date)} (${d.type === 'saturday' ? 'Saturday' : d.type === 'sunday' ? 'Sunday' : (d.eventName || 'Special')})`}
                          >
                            {config?.icon || ''}
                          </button>
                          
                          {isMenuOpen && (
                            <div 
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'white',
                                border: '2px solid var(--border)',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 1000,
                                minWidth: '200px',
                                padding: '0.5rem'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((statusKey) => (
                                <button
                                  key={statusKey}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAttendanceStatus(member.id, d.date, d.type, statusKey);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.625rem',
                                    border: 'none',
                                    background: status === statusKey ? STATUS_CONFIG[statusKey].bgColor : 'transparent',
                                    color: STATUS_CONFIG[statusKey].color,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (status !== statusKey) {
                                      e.currentTarget.style.background = STATUS_CONFIG[statusKey].bgColor;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (status !== statusKey) {
                                      e.currentTarget.style.background = 'transparent';
                                    }
                                  }}
                                >
                                  <span style={{ fontSize: '1.125rem' }}>{STATUS_CONFIG[statusKey].icon}</span>
                                  {STATUS_CONFIG[statusKey].label}
                                </button>
                              ))}
                            </div>
                          )}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td style={{
                      position: 'sticky',
                      right: 0,
                      background: 'white',
                      padding: '1rem',
                      textAlign: 'center',
                      borderLeft: '2px solid var(--border)',
                      zIndex: 15,
                      boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--primary-color)' }}>
                        {stats.percentage}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {stats.present}/{stats.total}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: 'var(--background)', 
          borderRadius: '8px',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <strong style={{ fontSize: '0.875rem' }}>Legend:</strong>
          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((statusKey) => (
            <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                background: STATUS_CONFIG[statusKey].bgColor,
                border: `2px solid ${STATUS_CONFIG[statusKey].color}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {STATUS_CONFIG[statusKey].icon}
              </div>
              <span style={{ fontSize: '0.875rem' }}>{STATUS_CONFIG[statusKey].label}</span>
            </div>
          ))}
        </div>
        
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem 1rem', 
          background: 'rgba(99, 102, 241, 0.05)', 
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem'
        }}>
          💡 <strong>Tip:</strong> Use &quot;Show & count&quot; to see only Sunday, Saturday &amp; Sunday, or All (include Special). Stats and columns update to match. Click any cell to set status.
        </div>
      </div>
      
      {/* Click outside to close menu - backdrop */}
      {showStatusMenu && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
          onClick={() => setShowStatusMenu(null)}
        />
      )}

      {/* Add Special Event Modal */}
      {showAddEventModal && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowAddEventModal(false)}
          />
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1001,
              width: '90%',
              maxWidth: '500px',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>
              Add Special Event
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Event Date
              </label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Event Name
              </label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g., Christmas Celebration, Good Friday Service"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ 
              padding: '1rem', 
              background: 'rgba(99, 102, 241, 0.05)', 
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              💡 This will create an attendance column for all members on the selected date. You can then mark attendance for each member.
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddEventModal(false);
                  setNewEventDate('');
                  setNewEventName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={addSpecialEvent}
                disabled={!newEventDate || !newEventName}
              >
                Add Event
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Attendance;
