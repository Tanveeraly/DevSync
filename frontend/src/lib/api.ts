const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiClient {
  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async handleResponse(response: Response): Promise<any> {
    if (response.status === 204) {
      return null;
    }
    
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMsg = data?.detail || `Request failed with status ${response.status}`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Refresh token mechanism
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data.access_token;
    } catch (e) {
      // Clear tokens if refresh fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
  }

  private async request(path: string, options: RequestInit = {}, isFormData = false): Promise<any> {
    const url = `${API_BASE_URL}${path}`;
    const headers = this.getHeaders(isFormData);
    const config = { ...options, headers: { ...headers, ...options.headers } };

    try {
      const response = await fetch(url, config);
      
      // Auto-refresh token if 401 Unauthorized
      if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          // Retry with new token
          const retryHeaders = this.getHeaders(isFormData);
          const retryConfig = { ...options, headers: { ...retryHeaders, ...options.headers } };
          const retryResponse = await fetch(url, retryConfig);
          return this.handleResponse(retryResponse);
        } else {
          // Token refresh failed, redirect to login
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      
      return this.handleResponse(response);
    } catch (error: any) {
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        const netErr: any = new Error('Backend server is offline or unreachable at http://127.0.0.1:8000. Please start the backend server.');
        netErr.status = 0;
        throw netErr;
      }
      throw error;
    }
  }

  // ── Authentication ──
  async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    return this.request('/auth/login', {
      method: 'POST',
      body: formData,
    }, true);
  }

  async register(data: any): Promise<any> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<any> {
    return this.request('/auth/me');
  }

  // ── Users ──
  async listUsers(): Promise<any[]> {
    return this.request('/users');
  }

  // ── Projects ──
  async listProjects(): Promise<any[]> {
    return this.request('/projects');
  }

  async getProject(slug: string): Promise<any> {
    return this.request(`/projects/${slug}`);
  }

  async getGithubStats(slug: string): Promise<any> {
    return this.request(`/projects/${slug}/github-stats`);
  }

  async createProject(data: { name: string; slug: string; description?: string; github_repo_url?: string }): Promise<any> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(slug: string, data: { name?: string; description?: string; github_repo_url?: string }): Promise<any> {
    return this.request(`/projects/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addMember(slug: string, userId: string, role: string): Promise<any> {
    return this.request(`/projects/${slug}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  // ── Boards & Columns ──
  async listBoards(projectSlug: string): Promise<any[]> {
    return this.request(`/projects/${projectSlug}/boards`);
  }

  async getBoard(boardId: string): Promise<any> {
    return this.request(`/boards/${boardId}`);
  }

  async createBoard(projectSlug: string, name: string): Promise<any> {
    return this.request(`/projects/${projectSlug}/boards`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // ── Issues ──
  async listIssues(projectSlug: string): Promise<any[]> {
    return this.request(`/projects/${projectSlug}/issues`);
  }

  async createIssue(projectSlug: string, data: { title: string; description?: string; status?: string; priority?: string; assignee_id?: string; labels?: string[] }): Promise<any> {
    return this.request(`/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIssue(issueId: string, data: { title?: string; description?: string; status?: string; priority?: string; assignee_id?: string; column_id?: string; labels?: string[]; version: number }): Promise<any> {
    return this.request(`/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async moveIssue(issueId: string, data: { column_id: string | null; position: number; version: number }): Promise<any> {
    return this.request(`/issues/${issueId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteIssue(issueId: string): Promise<void> {
    return this.request(`/issues/${issueId}`, {
      method: 'DELETE',
    });
  }

  // ── Comments ──
  async listComments(issueId: string): Promise<any[]> {
    return this.request(`/issues/${issueId}/comments`);
  }

  async createComment(issueId: string, content: string): Promise<any> {
    return this.request(`/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // ── Activities ──
  async listActivities(projectSlug: string): Promise<any[]> {
    return this.request(`/projects/${projectSlug}/activities`);
  }

  // ── Combined Dashboard Data ──
  async getDashboardData(): Promise<{ projects: any[]; users: any[]; issues: any[]; activities: any[] }> {
    const projects = await this.listProjects();
    const users = await this.listUsers().catch(() => []);
    
    let issues: any[] = [];
    let activities: any[] = [];

    if (projects.length > 0) {
      // Fetch issues and activities for all projects in parallel
      const issuePromises = projects.map((p: any) => this.listIssues(p.slug).catch(() => []));
      const activityPromises = projects.map((p: any) => this.listActivities(p.slug).catch(() => []));
      
      const issueResults = await Promise.all(issuePromises);
      const activityResults = await Promise.all(activityPromises);

      issues = issueResults.flat();
      activities = activityResults.flat();
    }

    return { projects, users, issues, activities };
  }
}

export const api = new ApiClient();
