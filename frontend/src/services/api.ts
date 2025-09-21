import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface WalletGroup {
  _id: string;
  name: string;
  numberOfWallets: number;
  solBalance: number;
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  address: string;
  solBalance: number;
  tokenBalance: number;
}

export interface Task {
  _id: string;
  type: 'MIXER' | 'MAKER' | 'HOLDER' | 'VOLUME';
  name?: string;
  context: any;
  status: 'FAILED' | 'PENDING' | 'RUNNING' | 'DELETED' | 'COMPLETED';
  startedAt?: string;
  endedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description: string;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
  example?: any;
}

export interface TaskSchema {
  [key: string]: SchemaField;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export const walletApi = {
  getWalletGroups: (): Promise<{ walletGroups: WalletGroup[] }> =>
    api.get('/wallet/groups').then(res => res.data),
  
  getWalletsForGroup: (groupId: string): Promise<{ wallets: Wallet[] }> =>
    api.get(`/wallet/group/${groupId}`).then(res => res.data),
  
  exportWalletGroup: (groupId: string): Promise<string> =>
    api.get(`/wallet/group/${groupId}/export`, {
      responseType: 'text'
    }).then(res => res.data),
  
  addWalletGroup: (name: string, numberOfWallets: number): Promise<{ walletGroupId: string }> =>
    api.post('/wallet/group/add', { name, numberOfWallets }).then(res => res.data),
};

export const taskApi = {
  getTasks: (status?: string): Promise<{ tasks: Task[] }> =>
    api.get('/task', { params: status ? { status } : {} }).then(res => res.data),
  
  createTask: (type: string, context: any): Promise<{ taskId: string }> =>
    api.post('/task', { type, context }).then(res => res.data),
  
  deleteTask: (taskId: string): Promise<{ message: string }> =>
    api.post(`/task/${taskId}/delete`).then(res => res.data),
  
  stopTask: (taskId: string): Promise<{ message: string }> =>
    api.post(`/task/${taskId}/stop`).then(res => res.data),
  
  resumeTask: (taskId: string): Promise<{ message: string }> =>
    api.post(`/task/${taskId}/resume`).then(res => res.data),
  
  updateTaskContext: (taskId: string, context: any): Promise<{ message: string }> =>
    api.put('/task/context/update', { taskId, context }).then(res => res.data),
  
  getTaskSchema: (taskType: string): Promise<{ taskType: string, schema: TaskSchema }> =>
    api.get(`/task/${taskType}/context/schema`).then(res => res.data),
  
  validateTaskContext: (taskType: string, context: any): Promise<{ valid: boolean, errors: ValidationError[] }> =>
    api.post('/task/context/schema/validate', { taskType, context }).then(res => res.data),
};

export default api;