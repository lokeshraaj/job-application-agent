import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as any;
    if (!config || !config.retry) {
      // Setup defaults on first error if not provided
      if (config) {
        config.retry = 3;
        config.retryDelay = 1000;
        config.retryCount = 0;
      } else {
        return Promise.reject(error);
      }
    }

    if (config.retryCount >= config.retry) {
      return Promise.reject(error);
    }

    config.retryCount += 1;
    console.log(`Retrying request... Attempt ${config.retryCount}`);

    const backoff = new Promise((resolve) => {
      setTimeout(() => resolve(true), config.retryDelay || 1000);
    });

    return backoff.then(() => api(config));
  }
);

export interface ResumeResponse {
  id: number;
  filename: string;
  user_id: number;
  raw_text?: string;
  optimized_text?: string;
  ats_score?: number;
  strengths?: string[];
  improvements?: string[];
}

export interface JobListingResponse {
  id: number;
  title: string;
  company: string;
  description: string;
  required_skills: string;
}

export interface ApplicationResponse {
  id: number;
  resume_id: number;
  job_id: number;
  status: string;
  match_score?: number;
  cover_letter?: string;
}

export const uploadResume = async (file: File, userId: number = 1): Promise<ResumeResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Use raw axios to prevent the 'api' instance from forcing 'application/json' 
  // which destroys the multipart/form-data boundary.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const response = await axios.post(`${baseUrl}/api/resumes/upload?user_id=${userId}`, formData);
  return response.data;
};

export const fetchJobMatches = async (): Promise<JobListingResponse[]> => {
  const response = await api.get('/api/jobs');
  return response.data;
};

export const fetchApplications = async (): Promise<ApplicationResponse[]> => {
  const response = await api.get('/api/apply');
  return response.data;
};

export const quickApply = async (resumeId: number, jobId: number): Promise<ApplicationResponse> => {
  const response = await api.post(`/api/apply?resume_id=${resumeId}&job_id=${jobId}`);
  return response.data;
};

export const updateApplicationStatus = async (appId: number, status: string): Promise<ApplicationResponse> => {
  const response = await api.patch(`/api/apply/${appId}?status=${status}`);
  return response.data;
};

export const generatePitch = async (appId: number): Promise<ApplicationResponse> => {
  const response = await api.post(`/api/apply/${appId}/pitch`);
  return response.data;
};

export const registerUser = async (userData: any) => {
  const response = await api.post('/api/auth/signup', userData);
  return response.data;
};

export const loginUser = async (credentials: any) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

export interface ActivityItem {
  id: number;
  type: string;
  tag: string;
  name: string;
  status: string;
  created_at: string;
}

export const fetchActivity = async (): Promise<ActivityItem[]> => {
  const response = await api.get('/api/activity');
  return response.data;
};

export default api;
