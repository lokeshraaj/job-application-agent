import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as any;
    if (!config || !config.retry) {
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

// ---- Interfaces ----

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
  salary_range?: string;
  seniority_level?: string;
  location?: string;
}

export interface ApplicationResponse {
  id: number;
  resume_id: number;
  job_id: number;
  kanban_column?: string;
  status: string;
  match_score?: number;
  cold_email?: string;
  edited_email?: string;
  cover_letter?: string;
  pitch_version?: number;
  tailored_resume?: string;
  edited_resume?: string;
  created_at?: string;
}

export interface ActivityItem {
  id: number;
  type: string;
  tag: string;
  name: string;
  status: string;
  created_at: string;
}

export interface MemoryLogItem {
  id: string;
  type: string;         // "world" | "experience" | "observation" | "opinion"
  text: string;
  created_at: string;
  trend?: string;        // "stable" | "strengthening" | "weakening" | "stale"
  proof_count?: number;
}

export interface MemoryLogResponse {
  memories: MemoryLogItem[];
  total: number;
}

export interface HindsightPreferences {
  user_id: number;
  preferences: string;
  memory_count: number;
}

// ---- Auth ----

export const registerUser = async (userData: any) => {
  const response = await api.post('/api/auth/signup', userData);
  return response.data;
};

export const loginUser = async (credentials: any) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

// ---- Resumes ----

export const uploadResume = async (file: File, userId: number = 1): Promise<ResumeResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const response = await axios.post(`${baseUrl}/api/resumes/upload?user_id=${userId}`, formData);
  return response.data;
};

// ---- Jobs ----

export const fetchJobMatches = async (): Promise<JobListingResponse[]> => {
  const response = await api.get('/api/jobs');
  return response.data;
};

// ---- Applications ----

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

export const updateKanbanStatus = async (appId: number, kanbanColumn: string): Promise<ApplicationResponse> => {
  const response = await api.patch(`/api/apply/${appId}?status=${kanbanColumn}`);
  return response.data;
};

export const generatePitch = async (appId: number): Promise<ApplicationResponse> => {
  const response = await api.post(`/api/apply/${appId}/pitch`);
  return response.data;
};

export const submitPitchEdit = async (appId: number, editedEmail: string): Promise<ApplicationResponse> => {
  const response = await api.put(`/api/apply/${appId}/edit-pitch`, { edited_email: editedEmail });
  return response.data;
};

export const submitResumeEdit = async (appId: number, editedResume: string): Promise<ApplicationResponse> => {
  const response = await api.put(`/api/apply/${appId}/edit-resume`, { edited_resume: editedResume });
  return response.data;
};

// ---- Activity ----

export const fetchActivity = async (): Promise<ActivityItem[]> => {
  const response = await api.get('/api/activity');
  return response.data;
};

// ---- Hindsight Memory ----

export const fetchMemoryLog = async (userId: number = 1): Promise<MemoryLogResponse> => {
  const response = await api.get(`/api/hindsight/memory-log/${userId}`);
  return response.data;
};

export const fetchPreferences = async (userId: number = 1): Promise<HindsightPreferences> => {
  const response = await api.get(`/api/hindsight/preferences/${userId}`);
  return response.data;
};

export const seedMemories = async (userId: number = 1) => {
  const response = await api.post(`/api/hindsight/seed/${userId}`);
  return response.data;
};

export default api;
