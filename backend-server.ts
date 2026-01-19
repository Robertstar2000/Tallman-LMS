import { User, Course, Enrollment, UserRole, MentorshipLog, Badge, ForumPost } from './types.ts';

// Calibrating API Nexus Gateway
const getApiBase = () => {
  const override = localStorage.getItem('tallman_api_override');
  if (override) return `${override}/api`;

  // Production vs Development Registry
  const metaEnv = (import.meta as any).env || {};
  return (metaEnv.VITE_API_URL || 'http://localhost:3185') + '/api';
};

const API_BASE = getApiBase();

class TallmanAPIClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('tallman_auth_token');
  }

  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || 'API Error');
    }

    return response.json();
  }

  async bootstrap() {
    // Backend handles bootstrapping via seed script. 
    // This can be a no-op or a health check.
    console.log("Client connected to backend gateway.");
  }

  async login(email: string, passwordHash: string): Promise<User | null> {
    try {
      const data = await this.fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: passwordHash }) // In a real app, don't call it passwordHash if it's plaintext
      });
      localStorage.setItem('tallman_auth_token', data.token);
      localStorage.setItem('tallman_user_session', JSON.stringify(data.user));
      return data.user;
    } catch (e) {
      console.error("Login failed", e);
      return null;
    }
  }

  async signup(displayName: string, email: string, passwordHash: string): Promise<User> {
    const data = await this.fetchAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ displayName, email, password: passwordHash })
    });
    localStorage.setItem('tallman_auth_token', data.token);
    localStorage.setItem('tallman_user_session', JSON.stringify(data.user));
    return data.user;
  }

  async getCurrentSession(): Promise<User | null> {
    const userStr = localStorage.getItem('tallman_user_session');
    return userStr ? JSON.parse(userStr) : null;
  }

  async logout() {
    localStorage.removeItem('tallman_auth_token');
    localStorage.removeItem('tallman_user_session');
  }

  async getCourses(): Promise<Course[]> {
    return this.fetchAPI('/courses');
  }

  async getUsers(): Promise<User[]> {
    return this.fetchAPI('/admin/users');
  }

  async getCourse(courseId: string): Promise<Course | null> {
    return this.fetchAPI(`/courses/${courseId}`);
  }

  async updateCourse(course: Course): Promise<void> {
    return this.fetchAPI('/courses/upsert', {
      method: 'POST',
      body: JSON.stringify(course)
    });
  }

  async getEnrollments(userId?: string): Promise<Enrollment[]> {
    if (userId) return this.fetchAPI(`/enrollments?userId=${userId}`); // Hypothetical filter if added later
    // If we are in admin mode (refreshData has no userId), try to get all
    try {
      return await this.fetchAPI('/admin/enrollments');
    } catch (e) {
      // Fallback to personal if admin fails
      return this.fetchAPI('/enrollments');
    }
  }

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    return this.fetchAPI('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    });
  }

  async updateProgress(enrollmentId: string, lessonId: string): Promise<Enrollment> {
    return this.fetchAPI(`/enrollments/${enrollmentId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ lessonId })
    });
  }

  async recordQuizAttempt(enrollmentId: string, lessonId: string, passed: boolean): Promise<Enrollment> {
    return this.fetchAPI(`/enrollments/${enrollmentId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ lessonId, passed })
    });
  }

  async resetEnrollmentsForCourse(courseId: string): Promise<void> {
    return this.fetchAPI(`/enrollments/reset/${courseId}`, {
      method: 'POST'
    });
  }

  async getProfile(): Promise<User> {
    return this.fetchAPI('/profile');
  }

  // Admin Methods
  async adminGetUsers(): Promise<User[]> {
    return this.fetchAPI('/admin/users');
  }

  async adminUpdateUser(userId: string, updates: { roles?: UserRole[], status?: string }): Promise<void> {
    return this.fetchAPI(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async adminDeleteUser(userId: string): Promise<void> {
    return this.fetchAPI(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async adminGetSettings(): Promise<Record<string, string>> {
    return this.fetchAPI('/admin/settings');
  }

  async adminUpdateSettings(settings: Record<string, string>): Promise<void> {
    return this.fetchAPI('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async getMentorshipLogs(userId?: string): Promise<MentorshipLog[]> {
    return this.fetchAPI(userId ? `/admin/mentorship?userId=${userId}` : '/admin/mentorship');
  }

  async addMentorshipLog(log: Omit<MentorshipLog, 'id'>): Promise<void> {
    return this.fetchAPI('/admin/mentorship', {
      method: 'POST',
      body: JSON.stringify(log)
    });
  }

  async deleteMentorshipLog(id: string): Promise<void> {
    return this.fetchAPI(`/admin/mentorship/${id}`, {
      method: 'DELETE'
    });
  }

  async getCategories() {
    return this.fetchAPI('/categories');
  }

  async getForumPosts(): Promise<ForumPost[]> {
    return this.fetchAPI('/forum');
  }

  async getBadges(): Promise<Badge[]> {
    return this.fetchAPI('/badges');
  }

  async getUserBadges(userId: string): Promise<(Badge & { earned_at: string })[]> {
    return this.fetchAPI(`/users/${userId}/badges`);
  }
}

export const TallmanAPI = new TallmanAPIClient();