import type { User, AdminUser, PrintJob, Printer, FilamentInventory, PricingRule, ServiceFee, Message, ActivityLog, DashboardStats, DailyStat, BackupInfo } from '../types';

const BASE = '/api';
type JobMutation = Omit<Partial<PrintJob>, 'printerId'> & {
  preferredDate?: string;
  preferredSlot?: string;
  printerId?: string | null;
};

function getToken() {
  return localStorage.getItem('lab_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Check content-type before parsing JSON to avoid "Unexpected token '<'" errors
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra server đang chạy.');
    throw new Error(`Phản hồi không hợp lệ từ máy chủ (${res.status})`);
  }

  const data = await res.json();
  if (!res.ok) {
    if (data.details && Array.isArray(data.details) && data.details.length > 0) {
      throw new Error(data.details.map((d: { message: string }) => d.message).join(', '));
    }
    throw new Error(data.error || 'Lỗi máy chủ');
  }
  return data;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string; studentId?: string; phone?: string; supervisor?: string }) =>
    post<{ message: string }>('/auth/register', data),
  me: () => get<User>('/auth/me'),

  // Jobs
  getJobs: () => get<PrintJob[]>('/jobs'),
  getJob: (id: string) => get<PrintJob>(`/jobs/${id}`),
  getQueue: () => get<PrintJob[]>('/jobs/queue'),
  createJob: (data: JobMutation) => post<PrintJob>('/jobs', data),
  updateJob: (id: string, data: JobMutation) => patch<PrintJob>(`/jobs/${id}`, data),
  uploadFile: async (file: File): Promise<{ fileName: string; originalName: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/jobs/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra server đang chạy.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload thất bại');
    return data;
  },

  // Printers
  getPrinters: () => get<Printer[]>('/printers'),
  createPrinter: (data: Partial<Printer>) => post<Printer>('/printers', data),
  updatePrinter: (id: string, data: Partial<Printer>) => patch<Printer>(`/printers/${id}`, data),
  deletePrinter: (id: string) => request<{ ok: boolean }>('DELETE', `/printers/${id}`),
  uploadPrinterImage: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/printers/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Không thể kết nối máy chủ.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload ảnh thất bại');
    return data;
  },

  // Inventory
  getInventory: () => get<FilamentInventory[]>('/inventory'),
  updateInventory: (id: string, data: Partial<FilamentInventory>) => patch<{ success: boolean }>(`/inventory/${id}`, data),
  addInventory: (data: Partial<FilamentInventory>) => post<{ id: string }>('/inventory', data),
  deleteInventory: (id: string) => request<{ ok: boolean }>('DELETE', `/inventory/${id}`),

  // Pricing
  getPricing: () => get<PricingRule[]>('/pricing'),
  updatePricing: (rules: Array<{ material: string; pricePerGram: number }>) => put<{ success: boolean }>('/pricing', { rules }),

  // Service Fees
  getServiceFees: () => get<ServiceFee[]>('/service-fees'),
  updateServiceFees: (fees: Array<{ name: string; amount: number; enabled?: boolean }>) => put<{ success: boolean }>('/service-fees', { fees }),

  // Messages
  getMessages: (jobId?: string) => get<Message[]>(`/messages${jobId ? `?jobId=${jobId}` : ''}`),
  sendMessage: (content: string, jobId?: string) => post<Message>('/messages', { content, jobId }),

  // Users (Admin)
  getUsers: () => get<AdminUser[]>('/users'),
  updateUser: (id: string, data: Partial<AdminUser>) => patch<{ success: boolean }>(`/users/${id}`, data),
  deleteUser: (id: string) => request<{ success: boolean }>('DELETE', `/users/${id}`),

  // Logs
  getLogs: (limit?: number) => get<ActivityLog[]>(`/logs${limit ? `?limit=${limit}` : ''}`),

  resubmitJob: (id: string) => patch<PrintJob>(`/jobs/${id}`, { status: 'Submitted' }),

  // Stats
  getStats: () => get<DashboardStats>('/stats'),
  getDailyStats: () => get<DailyStat[]>('/stats/daily'),

  // Backup
  createBackup: () => post<{ file: string }>('/backup', {}),
  listBackups: () => get<BackupInfo[]>('/backups'),
  downloadBackup: (file: string) => `${BASE}/backups/${encodeURIComponent(file)}`,

  // Lab Settings
  getSettings: () => get<Record<string, string>>('/settings'),
  getSettingsAdmin: () => request<Record<string, string>>('GET', '/settings/admin'),
  updateSettings: (data: Record<string, string>) => put<{ success: boolean }>('/settings', data),
};
