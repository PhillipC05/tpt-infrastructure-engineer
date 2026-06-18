import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'tpt_token';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organisation_id: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
  name: string;
}

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: API_URL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const client = createClient();

function getTotal(response: AxiosResponse): number {
  return parseInt(response.headers['x-total-count'] ?? '0', 10);
}

export const api = {
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    organisation_name?: string;
  }): Promise<User> {
    const { data: user } = await client.post<User>('/auth/register', data);
    return user;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const params = new URLSearchParams();
    params.append('username', credentials.username);
    params.append('password', credentials.password);
    const { data } = await client.post<AuthResponse>('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await client.get<User>('/api/users/me');
    return data;
  },

  async updateCurrentUser(payload: Partial<User> & { current_password?: string; new_password?: string }): Promise<User> {
    const { data } = await client.patch<User>('/api/users/me', payload);
    return data;
  },

  async getProjects(skip = 0, limit = 50): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/projects', { params: { skip, limit } });
    return { data: response.data, total: getTotal(response) };
  },

  async getProject(id: string): Promise<any> {
    const { data } = await client.get(`/api/projects/${id}`);
    return data;
  },

  async createProject(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/projects', payload);
    return data;
  },

  async updateProject(id: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/projects/${id}`, payload);
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    await client.delete(`/api/projects/${id}`);
  },

  async getStats(): Promise<any> {
    const { data } = await client.get('/api/stats');
    return data;
  },

  async getActivityFeed(limit = 50): Promise<any[]> {
    const response = await client.get('/api/activity', { params: { limit } });
    return response.data;
  },

  async getNotifications(skip = 0, limit = 50, unreadOnly = false): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/notifications', {
      params: { skip, limit, unread_only: unreadOnly },
    });
    return { data: response.data, total: getTotal(response) };
  },

  async markNotificationRead(id: string): Promise<void> {
    await client.post(`/api/notifications/${id}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await client.post('/api/notifications/mark-all-read');
  },

  async getMaterials(skip = 0, limit = 200): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/materials', { params: { skip, limit } });
    return { data: response.data, total: getTotal(response) };
  },

  async createMaterial(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/materials', payload);
    return data;
  },

  async getMaterial(id: string): Promise<any> {
    const { data } = await client.get(`/api/materials/${id}`);
    return data;
  },

  async updateMaterial(id: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/materials/${id}`, payload);
    return data;
  },

  async deleteMaterial(id: string): Promise<void> {
    await client.delete(`/api/materials/${id}`);
  },

  async getProjectTasks(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/tasks`);
    return data;
  },

  async createProjectTask(projectId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post(`/api/projects/${projectId}/tasks`, payload);
    return data;
  },

  async updateProjectTask(projectId: string, taskId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/projects/${projectId}/tasks/${taskId}`, payload);
    return data;
  },

  async deleteProjectTask(projectId: string, taskId: string): Promise<void> {
    await client.delete(`/api/projects/${projectId}/tasks/${taskId}`);
  },

  async getProjectEstimates(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/estimates`);
    return data;
  },

  async createEstimateItem(projectId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post(`/api/projects/${projectId}/estimates`, payload);
    return data;
  },

  async updateEstimateItem(projectId: string, itemId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/projects/${projectId}/estimates/${itemId}`, payload);
    return data;
  },

  async deleteEstimateItem(projectId: string, itemId: string): Promise<void> {
    await client.delete(`/api/projects/${projectId}/estimates/${itemId}`);
  },

  async getProjectComments(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/comments`);
    return data;
  },

  async createProjectComment(projectId: string, content: string, parentId?: string): Promise<any> {
    const { data } = await client.post(`/api/projects/${projectId}/comments`, {
      content,
      parent_id: parentId,
    });
    return data;
  },

  async getProjectAttachments(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/attachments`);
    return data;
  },

  async uploadProjectAttachment(projectId: string, file: File, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    const { data } = await client.post(`/api/projects/${projectId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getProjectVersions(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/versions`);
    return data;
  },

  async getPurchaseOrders(skip = 0, limit = 50): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/procurement/purchase-orders', { params: { skip, limit } });
    return { data: response.data, total: getTotal(response) };
  },

  async createPurchaseOrder(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/procurement/purchase-orders', payload);
    return data;
  },

  async getPurchaseOrder(id: string): Promise<any> {
    const { data } = await client.get(`/api/procurement/purchase-orders/${id}`);
    return data;
  },

  async updatePurchaseOrder(id: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/procurement/purchase-orders/${id}`, payload);
    return data;
  },

  async deletePurchaseOrder(id: string): Promise<void> {
    await client.delete(`/api/procurement/purchase-orders/${id}`);
  },

  async getProjectDesigns(projectId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/designs`);
    return data;
  },

  async createProjectDesign(projectId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post(`/api/projects/${projectId}/designs`, payload);
    return data;
  },

  async updateProjectDesign(projectId: string, designId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.put(`/api/projects/${projectId}/designs/${designId}`, payload);
    return data;
  },

  async deleteProjectDesign(projectId: string, designId: string): Promise<void> {
    await client.delete(`/api/projects/${projectId}/designs/${designId}`);
  },

  async getDesignAlternatives(projectId: string, designId: string): Promise<any[]> {
    const { data } = await client.get(`/api/projects/${projectId}/designs/${designId}/alternatives`);
    return data;
  },

  async createDesignAlternative(projectId: string, designId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post(`/api/projects/${projectId}/designs/${designId}/alternatives`, payload);
    return data;
  },

  async getBoms(skip = 0, limit = 50): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/procurement/boms', { params: { skip, limit } });
    return { data: response.data, total: getTotal(response) };
  },

  async createBom(payload: { project_id: string; title: string }): Promise<any> {
    const { data } = await client.post('/api/procurement/boms', payload);
    return data;
  },

  async createPoFromBom(bomId: string, payload: { supplier_name: string; po_number?: string }): Promise<any> {
    const { data } = await client.post(`/api/procurement/boms/${bomId}/create-po`, payload);
    return data;
  },

  async getSensors(): Promise<any[]> {
    const { data } = await client.get('/api/digital-twin/sensors');
    return data;
  },

  async createSensor(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/digital-twin/sensors', payload);
    return data;
  },

  async deleteSensor(id: string): Promise<void> {
    await client.delete(`/api/digital-twin/sensors/${id}`);
  },

  async getSensorReadings(sensorId: string, limit = 60): Promise<any[]> {
    const { data } = await client.get(`/api/digital-twin/sensors/${sensorId}/readings`, { params: { limit } });
    return data;
  },

  async addSensorReading(sensorId: string, payload: { value: number; recorded_at?: string }): Promise<any> {
    const { data } = await client.post(`/api/digital-twin/sensors/${sensorId}/readings`, payload);
    return data;
  },

  async importSensorData(formData: FormData): Promise<any> {
    const { data } = await client.post('/api/digital-twin/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getReports(skip = 0, limit = 100): Promise<{ data: any[]; total: number }> {
    const response = await client.get('/api/reports', { params: { skip, limit } });
    return { data: response.data, total: getTotal(response) };
  },

  async getReport(id: string): Promise<any> {
    const { data } = await client.get(`/api/reports/${id}`);
    return data;
  },

  async createReport(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/reports', payload);
    return data;
  },

  async deleteReport(id: string): Promise<void> {
    await client.delete(`/api/reports/${id}`);
  },

  async approveReport(id: string): Promise<any> {
    const { data } = await client.post(`/api/reports/${id}/approve`);
    return data;
  },

  async rejectReport(id: string, reason: string): Promise<any> {
    const { data } = await client.post(`/api/reports/${id}/reject`, { reason });
    return data;
  },

  async getReportTemplates(): Promise<any[]> {
    const { data } = await client.get('/api/reports/templates');
    return data;
  },

  async updateReportStatus(id: string, status: string): Promise<any> {
    const { data } = await client.patch(`/api/reports/${id}/status`, { status });
    return data;
  },

  async checkCompliance(designType: string, params: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/compliance/check', { design_type: designType, params });
    return data;
  },

  async analyseAnomalies(rates: Record<string, number>): Promise<any> {
    const { data } = await client.post('/api/anomaly/analyse', { rates });
    return data;
  },

  async askAssistant(question: string, projectId?: string): Promise<any> {
    const { data } = await client.post('/api/assistant/ask', {
      question,
      project_id: projectId,
    });
    return data;
  },

  async aiAssist(prompt: string, contextType?: string): Promise<string> {
    const { data } = await client.post('/api/ai/assist', { prompt, context_type: contextType });
    return data?.result ?? data?.response ?? data?.message ?? String(data);
  },

  async getAiStatus(): Promise<any> {
    const { data } = await client.get('/api/ai/status');
    return data;
  },

  async calculateCarbon(payload: Record<string, unknown>): Promise<any> {
    const { data } = await client.post('/api/carbon/calculate', payload);
    return data;
  },
};

export default api;
