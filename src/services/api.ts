/**
 * API Service
 * Connects React frontend to PHP/MySQL backend
 */

const API_BASE_URL = '/api';

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string, role: string) => {
    const data = await apiRequest<{ user: any; token: string }>('/auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    setToken(data.token);
    return data.user;
  },

  register: async (userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    department?: string;
    mobile?: string;
    studentId?: string;
    employeeId?: string;
    designation?: string;
  }) => {
    const data = await apiRequest<{ user: any; token: string }>('/auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setToken(data.token);
    return data.user;
  },

  getCurrentUser: async () => {
    return apiRequest<any>('/auth.php?action=me');
  },

  logout: () => {
    removeToken();
  },

  isAuthenticated: (): boolean => {
    return !!getToken();
  },
};

// Grievances API
export const grievancesApi = {
  getAll: async (params?: {
    status?: string;
    adminView?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ grievances: any[]; pagination: any }>(
      `/grievances.php${query ? `?${query}` : ''}`
    );
  },

  getById: async (id: string | number) => {
    return apiRequest<any>(`/grievances.php?id=${id}`);
  },

  create: async (grievanceData: {
    category: string;
    subject: string;
    description: string;
    isAnonymous?: boolean;
    attachments?: File[];
  }) => {
    const { attachments = [], ...payload } = grievanceData;

    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append('category', payload.category);
      formData.append('subject', payload.subject);
      formData.append('description', payload.description);
      formData.append('isAnonymous', String(Boolean(payload.isAnonymous)));

      attachments.forEach((file) => {
        formData.append('attachments[]', file);
      });

      return apiRequest<any>('/grievances.php', {
        method: 'POST',
        body: formData,
      });
    }

    return apiRequest<any>('/grievances.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (
    id: string | number,
    updateData: {
      status?: string;
      assignedTo?: number;
      reason?: string;
      name?: string;
      department?: string;
      avatar?: string;
      avatarFile?: File;
    }
  ) => {
    const { avatarFile, ...payload } = updateData;

    if (avatarFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('avatarFile', avatarFile);

      return apiRequest<any>(`/grievances.php?id=${id}`, {
        method: 'PUT',
        body: formData,
      });
    }

    return apiRequest<any>(`/grievances.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string | number) => {
    return apiRequest<{ message: string }>(`/grievances.php?id=${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async () => {
    return apiRequest<any>('/grievances.php?action=stats');
  },
};

// Comments API
export const commentsApi = {
  getAll: async (grievanceId: string | number) => {
    return apiRequest<any[]>(`/comments.php?grievance_id=${grievanceId}`);
  },

  add: async (
    grievanceId: string | number,
    content: string,
    isInternal?: boolean
  ) => {
    return apiRequest<any>(`/comments.php?grievance_id=${grievanceId}`, {
      method: 'POST',
      body: JSON.stringify({ content, isInternal }),
    });
  },

  delete: async (grievanceId: string | number, commentId: string | number) => {
    return apiRequest<{ message: string }>(
      `/comments.php?grievance_id=${grievanceId}&id=${commentId}`,
      { method: 'DELETE' }
    );
  },
};

// Users API
export const usersApi = {
  getAll: async (role?: string) => {
    const query = role ? `?role=${role}` : '';
    return apiRequest<any[]>(`/users.php${query}`);
  },

  getById: async (id: string | number) => {
    return apiRequest<any>(`/users.php?id=${id}`);
  },

  update: async (
    id: string | number,
    updateData: {
      name?: string;
      department?: string;
      avatar?: string;
      role?: string;
      password?: string;
      avatarFile?: File;
    }
  ) => {
    const { avatarFile, ...payload } = updateData;

    if (avatarFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('avatarFile', avatarFile);

      return apiRequest<any>(`/users.php?action=profile-update&id=${id}`, {
        method: 'POST',
        body: formData,
      });
    }

    return apiRequest<any>(`/users.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Staff approval endpoints (admin only)
  getPendingStaff: async () => {
    return apiRequest<{ pending_staff: any[]; count: number }>('/users.php?action=pending-staff');
  },

  getStaffList: async () => {
    return apiRequest<{ staff: any[]; count: number }>('/users.php?action=staff');
  },

  approveStaff: async (id: string | number) => {
    return apiRequest<{ message: string; staff: any }>(`/users.php?id=${id}&action=approve`, {
      method: 'PUT',
    });
  },

  rejectStaff: async (id: string | number) => {
    return apiRequest<{ message: string; staff: any }>(`/users.php?id=${id}&action=reject`, {
      method: 'PUT',
    });
  },

  deleteStaff: async (id: string | number) => {
    return apiRequest<{ message: string }>(`/users.php?id=${id}`, {
      method: 'DELETE',
    });
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    return apiRequest<{ message: string }>('/users.php?action=change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },

  transferPrincipal: async (details: { name: string; email: string; mobile: string }) => {
    return apiRequest<{ message: string; setupUrl: string; emailSent: boolean }>('/users.php?action=transfer-principal', {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },

  assignTemporaryPrincipal: async (staffId: string | number) => {
    return apiRequest<{ message: string; staff: any }>('/users.php?action=assign-temporary-principal', {
      method: 'POST',
      body: JSON.stringify({ staffId }),
    });
  },

  getPrincipalInvite: async (token: string) => {
    return apiRequest<{ token: string; new_principal_name: string; new_principal_email: string; new_principal_mobile: string; transfer_mode: string; status: string; expires_at: string }>(
      `/users.php?action=principal-invite&token=${encodeURIComponent(token)}`
    );
  },

  completePrincipalInvite: async (data: { token: string; password: string; confirmPassword: string; avatarFile?: File }) => {
    const { avatarFile, ...payload } = data;

    if (avatarFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('avatarFile', avatarFile);

      return apiRequest<{ message: string; email: string }>('/users.php?action=principal-invite', {
        method: 'POST',
        body: formData,
      });
    }

    return apiRequest<{ message: string; email: string }>('/users.php?action=principal-invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Announcements API
export const announcementsApi = {
  getAll: async () => {
    return apiRequest<{ announcements: any[] }>('/announcements.php');
  },

  getById: async (id: string | number) => {
    return apiRequest<any>(`/announcements.php?id=${id}`);
  },

  create: async (data: {
    title: string;
    content: string;
    targetAudience: 'all' | 'students' | 'staff' | 'both';
    targetDepartment?: string;
  }) => {
    return apiRequest<{ message: string; id: number }>('/announcements.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string | number, data: {
    title?: string;
    content?: string;
    targetAudience?: 'all' | 'students' | 'staff' | 'both';
    targetDepartment?: string;
    isActive?: boolean;
  }) => {
    return apiRequest<{ message: string }>(`/announcements.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string | number) => {
    return apiRequest<{ message: string }>(`/announcements.php?id=${id}`, {
      method: 'DELETE',
    });
  },

  getNotifications: async () => {
    return apiRequest<{ notifications: any[] }>('/announcements.php?action=notifications');
  },

  getUnreadCount: async () => {
    return apiRequest<{ count: number }>('/announcements.php?action=unread-count');
  },

  markAsRead: async (notificationId: string) => {
    return apiRequest<{ message: string }>('/announcements.php?action=mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
    });
  },

  markAllAsRead: async () => {
    return apiRequest<{ message: string }>('/announcements.php?action=mark-all-read', {
      method: 'POST',
    });
  },
};

export default {
  auth: authApi,
  grievances: grievancesApi,
  comments: commentsApi,
  users: usersApi,
  announcements: announcementsApi,
};
