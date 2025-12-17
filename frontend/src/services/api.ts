import axios from 'axios';
import type { Season, Shift, Order, Work, Boat, Problem, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('selectedSeason');
      localStorage.removeItem('selectedShift');
      
      // Reindirizza al login solo se non siamo già lì
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// AUTH
export const authService = {
  register: (username: string, password: string) =>
    api.post('/api/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  getUsers: () => api.get<Array<{ id: number; username: string }>>('/api/auth/users'),
  getProfile: () => api.get<User>('/api/auth/profile'),
};

// SEASONS
export const seasonService = {
  getAll: () => api.get<Season[]>('/api/seasons/'),
  getById: (id: number) => api.get<Season>(`/api/seasons/${id}`),
  create: (data: Omit<Season, 'id'>) => api.post<Season>('/api/seasons/', data),
};

// SHIFTS
export const shiftService = {
  getBySeasonId: (seasonId: number) => api.get<Shift[]>(`/api/shifts/season/${seasonId}`),
  getById: (id: number) => api.get<Shift>(`/api/shifts/${id}`),
  create: (data: Omit<Shift, 'id'>) => api.post<Shift>('/api/shifts/', data),
};

// ORDERS
export const orderService = {
  getAll: (params?: {
    status_filter?: 'completed' | 'pending';
    shift_id?: number;
    q?: string;
    date_from?: string;
    date_to?: string;
    category?: string;
    amount_min?: number;
    amount_max?: number;
    page?: number;
    page_size?: number;
    skip?: number;
    limit?: number;
    sort_by?: 'order_date' | 'amount' | 'created_at' | 'updated_at' | 'category' | 'status' | 'title';
    order?: 'asc' | 'desc';
  }) => api.get<Order[]>('/api/orders/', { params }),

  getById: (id: number) => api.get<Order>(`/api/orders/${id}`),

  create: (data: Omit<Order, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
    api.post<Order>('/api/orders/', data),

  update: async (id: number, data: Partial<Order>) => {
    return await api.put<Order>(`/api/orders/${id}`, data);
  },

  delete: (id: number) => api.delete(`/api/orders/${id}`),

  export: (params?: {
    status_filter?: 'completed' | 'pending';
    shift_id?: number;
    shift_ids?: number[];
    q?: string;
    date_from?: string;
    date_to?: string;
    category?: string;
    amount_min?: number;
    amount_max?: number;
    sort_by?: 'order_date' | 'amount' | 'created_at' | 'updated_at' | 'category' | 'status' | 'title' | 'id';
    order?: 'asc' | 'desc';
  }) => {
    // Converti shift_ids array in stringa separata da virgole
    const exportParams = { ...params };
    if (params?.shift_ids && Array.isArray(params.shift_ids)) {
      exportParams.shift_ids = params.shift_ids.join(',') as any;
    }
    return api.get<Blob>('/api/orders/export', {
      params: exportParams,
      responseType: 'blob',
    });
  },
};

// WORKS
export const workService = {
  getAll: (params?: {
    status_filter?: 'completed' | 'pending';
    shift_id?: number;
    q?: string;
    date_from?: string;
    date_to?: string;
    category?: 'Campo' | 'Officina' | 'Servizi' | 'Gommoni' | 'Barche' | 'Vele' | 'Altro';
    page?: number;
    page_size?: number;
    skip?: number;
    limit?: number;
    sort_by?: 'work_date' | 'created_at' | 'updated_at' | 'category' | 'status' | 'title';
    order?: 'asc' | 'desc';
  }) => api.get<Work[]>('/api/works/', { params }),

  getById: (id: number) => api.get<Work>(`/api/works/${id}`),

  create: (data: Omit<Work, 'id'>) => api.post<Work>('/api/works/', data),

  update: (id: number, data: Partial<Work>) => api.put<Work>(`/api/works/${id}`, data),

  delete: (id: number) => api.delete(`/api/works/${id}`),

  export: (params?: {
    status_filter?: 'completed' | 'pending';
    shift_id?: number;
    q?: string;
    date_from?: string;
    date_to?: string;
    category?: 'Campo' | 'Officina' | 'Servizi' | 'Gommoni' | 'Barche' | 'Vele' | 'Altro';
    sort_by?: 'work_date' | 'created_at' | 'updated_at' | 'category' | 'status' | 'title';
    order?: 'asc' | 'desc';
  }) =>
    api.get<Blob>('/api/works/export', {
      params,
      responseType: 'blob',
    }),
};

// BOATS
export const boatService = {
  getAll: (boat_type?: Boat['type']) => api.get<Boat[]>('/api/boats/', { params: { boat_type } }),
  getByType: (type: Boat['type']) => api.get<Boat[]>('/api/boats/', { params: { boat_type: type } }),
  getById: (id: number) => api.get<Boat>(`/api/boats/${id}`),
  getPartsByType: (type: Boat['type']) => api.get<string[]>(`/api/boats/type/${type}/parts`),
};

// PROBLEMS
export const problemService = {
  list: (params?: { boat_id?: number; status_filter?: 'open' | 'closed'; shift_id?: number }) =>
    api.get<Problem[]>('/api/problems/', { params }),
  getById: (id: number) => api.get<Problem>(`/api/problems/${id}`),
  create: (data: Omit<Problem, 'id' | 'reported_date' | 'resolved_date'>) => api.post<Problem>('/api/problems/', data),
  // reported_date is required by backend ProblemCreate
  createWithDate: (data: Omit<Problem, 'id' | 'resolved_date'>) => api.post<Problem>('/api/problems/', data),
  update: (id: number, data: Partial<Problem>) => api.put<Problem>(`/api/problems/${id}`, data),
  delete: (id: number) => api.delete(`/api/problems/${id}`),
  toggleStatus: (id: number) => api.patch(`/api/problems/${id}/toggle-status`),
};

// DASHBOARD
export const dashboardService = {
  getStats: () => api.get('/api/dashboard/home'),
};

// REPORTS
export const reportsService = {
  getSeasonReport: (seasonId: number) => api.get(`/api/reports/season/${seasonId}`),
  getShiftReport: (shiftId: number) => api.get(`/api/reports/shift/${shiftId}`),
  exportSeasonExcel: (seasonId: number) =>
    api.get<Blob>(`/api/reports/season/${seasonId}/export-excel`, { responseType: 'blob' }),
};

export default api;