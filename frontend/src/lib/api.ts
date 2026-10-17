import {
  HealthStatus,
  Profile,
  Business,
  InvestorPreferences,
  FundingApplication,
  MatchResult,
  DealMessage,
  OcrResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    const saved = localStorage.getItem('sharkbridge_token');
    if (saved) {
      this.token = saved;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('sharkbridge_token', token);
    } else {
      localStorage.removeItem('sharkbridge_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/v1/health');
  }

  // Profile & Auth Endpoints
  async register(data: { email: string; password: string; role: string; full_name: string }): Promise<Profile> {
    return this.request<Profile>('/api/v1/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<Profile> {
    return this.request<Profile>('/api/v1/me');
  }

  async createProfile(data: { role: string; full_name: string }): Promise<Profile> {
    return this.request<Profile>('/api/v1/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvestors(): Promise<Array<{ id: string; full_name: string; email: string; cv_file_url?: string; cv_file_name?: string; preferences?: InvestorPreferences }>> {
    return this.request('/api/v1/investors');
  }

  // Business Endpoints
  async getMyBusinesses(): Promise<Business[]> {
    return this.request<Business[]>('/api/v1/businesses/mine');
  }

  async getBusiness(id: string): Promise<Business> {
    return this.request<Business>(`/api/v1/businesses/${id}`);
  }

  async createBusiness(data: Partial<Business>): Promise<Business> {
    return this.request<Business>('/api/v1/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    return this.request<Business>(`/api/v1/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Investor Preferences Endpoints
  async getInvestorPreferences(): Promise<InvestorPreferences> {
    return this.request<InvestorPreferences>('/api/v1/investor/preferences');
  }

  async setInvestorPreferences(data: Partial<InvestorPreferences>): Promise<InvestorPreferences> {
    return this.request<InvestorPreferences>('/api/v1/investor/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadInvestorCv(file: File): Promise<{ status: string; cv_file_url: string; cv_file_name: string; ocr_result?: OcrResult }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/investor/cv`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Fallback
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getInvestorCv(investorId: string): Promise<{ investor_id: string; cv_file_url: string; cv_file_name: string }> {
    return this.request<{ investor_id: string; cv_file_url: string; cv_file_name: string }>(`/api/v1/investor/${investorId}/cv`);
  }

  // Matches Endpoints
  async getMatches(): Promise<MatchResult[]> {
    return this.request<MatchResult[]>('/api/v1/matches');
  }

  // Funding Application Endpoints
  async getMyApplications(): Promise<FundingApplication[]> {
    return this.request<FundingApplication[]>('/api/v1/applications/mine');
  }

  async getApplication(id: string): Promise<FundingApplication> {
    return this.request<FundingApplication>(`/api/v1/applications/${id}`);
  }

  async submitApplication(data: {
    business_id: string;
    investor_id: string;
    amount_requested_inr: number;
    equity_stake_pct?: number;
    use_of_funds: string;
    growth_plan: string;
    additional_notes?: string;
    confirmation?: boolean;
  }): Promise<FundingApplication> {
    return this.request<FundingApplication>('/api/v1/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApplicationStatus(id: string, status: string): Promise<FundingApplication> {
    return this.request<FundingApplication>(`/api/v1/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async refreshAiSummary(id: string): Promise<FundingApplication> {
    return this.request<FundingApplication>(`/api/v1/applications/${id}/ai-summary`, {
      method: 'POST',
    });
  }

  // Deal Planning Chat Endpoints (Issue 5: Unlocked when accepted/interested)
  async getDealMessages(applicationId: string): Promise<DealMessage[]> {
    return this.request<DealMessage[]>(`/api/v1/applications/${applicationId}/messages`);
  }

  async sendDealMessage(applicationId: string, content: string): Promise<DealMessage> {
    return this.request<DealMessage>(`/api/v1/applications/${applicationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Platform Guide Chatbot (Issue 4)
  async askAssistant(message: string, role?: string, history?: any[]): Promise<{ reply: string; suggested_actions?: string[] }> {
    return this.request<{ reply: string; suggested_actions?: string[] }>('/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, role, history }),
    });
  }
}

export const api = new ApiClient();

