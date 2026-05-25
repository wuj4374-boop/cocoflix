import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    // NestJS TransformInterceptor wraps in { code, message, data, timestamp }
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('服务器错误，请稍后重试');
    } else if (error.response?.status === 404) {
      toast.error('请求的资源不存在');
    } else if (error.response?.status === 403) {
      toast.error('没有权限执行此操作');
    } else if (!error.response) {
      toast.error('网络连接失败，请检查网络');
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default apiClient;
