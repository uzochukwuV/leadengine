// OpenCommerceLens API Client
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string;
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  tenant: Tenant;
}

interface Plan {
  name: string;
  price: number;
  limits: {
    leads: number;
    campaigns: number;
    emails_per_month: number;
  };
}

interface Usage {
  plan: string;
  planName: string;
  limits: {
    leads: number;
    campaigns: number;
    emails_per_month: number;
  };
  usage: {
    leads: number;
    campaigns: number;
    emails_this_month: number;
  };
  remaining: {
    leads: number;
    campaigns: number;
    emails: number;
  };
}

interface Stats {
  leads: number;
  stores: number;
  contacts: number;
  campaigns: number;
  emails: number;
  interested: number;
  unsubscribed: number;
}

interface Lead {
  id: number;
  email: string;
  status: string;
  stage: string;
  store_name?: string;
  store_id?: number;
  created_at: string;
}

interface Store {
  id: number;
  name: string;
  url: string;
  domain: string;
  niche: string;
  source: string;
  created_at: string;
}

interface Contact {
  id: number;
  email: string;
  name: string;
  source: string;
  status: string;
  created_at: string;
}

interface Campaign {
  id: number;
  name: string;
  description?: string;
  template?: string;
  status: string;
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
}

interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  description: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  // Auth
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  async me(): Promise<{ user: User; tenant: Tenant }> {
    return this.request('/api/auth/me');
  }

  // Billing
  async getPlans(): Promise<{ plans: Record<string, Plan> }> {
    return this.request('/api/billing/plans');
  }

  async getUsage(): Promise<Usage> {
    return this.request('/api/billing/usage');
  }

  async checkout(plan: string, tenantId: string): Promise<{ checkout_url: string | null }> {
    return this.request('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, tenant_id: tenantId }),
    });
  }

  // Data
  async getStats(): Promise<{ stats: Stats }> {
    return this.request('/api/stats');
  }

  async getLeads(): Promise<{ leads: Lead[] }> {
    return this.request('/api/leads');
  }

  async getStores(): Promise<{ stores: Store[] }> {
    return this.request('/api/stores');
  }

  async getContacts(): Promise<{ contacts: Contact[] }> {
    return this.request('/api/contacts');
  }

  async getCampaigns(): Promise<{ campaigns: Campaign[] }> {
    return this.request('/api/campaigns');
  }

  // Tools
  async findLeads(query: string, limit?: number): Promise<{ success: boolean; count: number; stores: Store[]; message: string }> {
    return this.request('/api/tools/find-leads', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  async qualifyLeads(store_ids: number[]): Promise<{ success: boolean; qualified: number; skipped: number; lead_ids: number[] }> {
    return this.request('/api/tools/qualify-leads', {
      method: 'POST',
      body: JSON.stringify({ store_ids }),
    });
  }

  async sendEmail(lead_id: number, subject?: string, body?: string): Promise<{ success: boolean; message_id?: string; message: string }> {
    return this.request('/api/tools/send-email', {
      method: 'POST',
      body: JSON.stringify({ lead_id, subject, body }),
    });
  }

  async createCampaign(name: string, description?: string, template?: string): Promise<{ success: boolean; campaign_id: number }> {
    return this.request('/api/tools/create-campaign', {
      method: 'POST',
      body: JSON.stringify({ name, description, template }),
    });
  }

  async getTemplates(): Promise<{ templates: Template[] }> {
    return this.request('/api/tools/templates');
  }

  async getIntegrations(): Promise<{ integrations: Integration[] }> {
    return this.request('/api/tools/integrations');
  }

  async query(question: string): Promise<{ success: boolean; response: string }> {
    return this.request('/api/tools/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async getAnalytics(): Promise<{ success: boolean; analytics: any }> {
    return this.request('/api/tools/analytics');
  }

  async deleteLead(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/tools/leads/${id}`, { method: 'DELETE' });
  }

  async deleteCampaign(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/tools/campaigns/${id}`, { method: 'DELETE' });
  }

  async getSettings(): Promise<{ success: boolean; settings: any }> {
    return this.request('/api/tools/settings');
  }

  async updateSettings(settings: any): Promise<{ success: boolean; settings: any }> {
    return this.request('/api/tools/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const api = new ApiService();
export type { User, Tenant, Plan, Usage, Stats, Lead, Store, Contact, Campaign, Template, Integration };
