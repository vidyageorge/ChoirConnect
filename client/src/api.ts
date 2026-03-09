const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
const FETCH_OPTIONS: RequestInit = { credentials: 'include' };

// Members API
export const membersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/members`, FETCH_OPTIONS);
    return response.json();
  },
  getById: async (id: number) => {
    const response = await fetch(`${API_URL}/members/${id}`, FETCH_OPTIONS);
    return response.json();
  },
  create: async (member: any) => {
    const response = await fetch(`${API_URL}/members`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    return response.json();
  },
  update: async (id: number, member: any) => {
    const response = await fetch(`${API_URL}/members/${id}`, {
      ...FETCH_OPTIONS,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    return response.json();
  },
  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/members/${id}`, { ...FETCH_OPTIONS, method: 'DELETE' });
    return response.json();
  },
  getUpcomingBirthdays: async () => {
    const response = await fetch(`${API_URL}/members/birthdays/upcoming`, FETCH_OPTIONS);
    return response.json();
  },
  claimProfile: async (memberId: number) => {
    const response = await fetch(`${API_URL}/members/claim`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    return response.json();
  },
};

// Attendance API
export const attendanceAPI = {
  getAll: async (params?: { date?: string; event_type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.event_type) queryParams.append('event_type', params.event_type);
    
    const response = await fetch(`${API_URL}/attendance?${queryParams.toString()}`, FETCH_OPTIONS);
    return response.json();
  },
  getByMember: async (memberId: number) => {
    const response = await fetch(`${API_URL}/attendance/member/${memberId}`, FETCH_OPTIONS);
    return response.json();
  },
  getStats: async () => {
    const response = await fetch(`${API_URL}/attendance/stats`, FETCH_OPTIONS);
    return response.json();
  },
  create: async (attendance: any) => {
    const response = await fetch(`${API_URL}/attendance`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    return response.json();
  },
  bulkCreate: async (records: any[]) => {
    const response = await fetch(`${API_URL}/attendance/bulk`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    return response.json();
  },
  update: async (id: number, attendance: any) => {
    const response = await fetch(`${API_URL}/attendance/${id}`, {
      ...FETCH_OPTIONS,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    return response.json();
  },
  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/attendance/${id}`, { ...FETCH_OPTIONS, method: 'DELETE' });
    return response.json();
  },
};

// Attendance correction requests API
export const attendanceCorrectionsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/attendance-corrections`, FETCH_OPTIONS);
    return response.json();
  },
  getById: async (id: number) => {
    const response = await fetch(`${API_URL}/attendance-corrections/${id}`, FETCH_OPTIONS);
    return response.json();
  },
  create: async (body: {
    member_id: number;
    date: string;
    event_type: string;
    event_name?: string;
    current_status: string;
    requested_status: string;
    reason: string;
  }) => {
    const response = await fetch(`${API_URL}/attendance-corrections`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  },
  approveOrReject: async (id: number, request_status: 'approved' | 'rejected') => {
    const response = await fetch(`${API_URL}/attendance-corrections/${id}`, {
      ...FETCH_OPTIONS,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_status }),
    });
    return response.json();
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async (params?: { startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const response = await fetch(`${API_URL}/expenses?${queryParams.toString()}`, FETCH_OPTIONS);
    return response.json();
  },
  getById: async (id: number) => {
    const response = await fetch(`${API_URL}/expenses/${id}`, FETCH_OPTIONS);
    return response.json();
  },
  getTotal: async () => {
    const response = await fetch(`${API_URL}/expenses/stats/total`, FETCH_OPTIONS);
    return response.json();
  },
  getBreakdown: async () => {
    const response = await fetch(`${API_URL}/expenses/stats/breakdown`, FETCH_OPTIONS);
    return response.json();
  },
  getByCategory: async () => {
    const response = await fetch(`${API_URL}/expenses/stats/by-category`, FETCH_OPTIONS);
    return response.json();
  },
  create: async (expense: any) => {
    const response = await fetch(`${API_URL}/expenses`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return response.json();
  },
  update: async (id: number, expense: any) => {
    const response = await fetch(`${API_URL}/expenses/${id}`, {
      ...FETCH_OPTIONS,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return response.json();
  },
  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/expenses/${id}`, { ...FETCH_OPTIONS, method: 'DELETE' });
    return response.json();
  },
};

// Auth API
export const authAPI = {
  register: async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    return response.json();
  },
  resetPassword: async (username: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), newPassword }),
    });
    return response.json();
  },
};

// Dashboard API
export const dashboardAPI = {
  getData: async () => {
    const response = await fetch(`${API_URL}/dashboard`, FETCH_OPTIONS);
    return response.json();
  },
};

