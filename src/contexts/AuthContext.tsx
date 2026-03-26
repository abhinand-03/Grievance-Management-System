import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/grievance';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser({
            id: String(userData.id),
            email: userData.email,
            name: userData.name,
            role: userData.role,
            department: userData.department,
            avatar: userData.avatar,
            createdAt: new Date(userData.created_at),
            mobile: userData.mobile,
            student_id: userData.student_id,
            employee_id: userData.employee_id,
            designation: userData.designation,
          } as any);
        } catch (error) {
          console.error('Failed to get current user:', error);
          authApi.logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const userData = await authApi.login(email.trim(), password, role);
      setUser({
        id: String(userData.id),
        email: userData.email,
        name: userData.name,
        role: userData.role,
        department: userData.department,
        avatar: userData.avatar,
        createdAt: new Date(userData.created_at),
        mobile: userData.mobile,
        student_id: userData.student_id,
        employee_id: userData.employee_id,
        designation: userData.designation,
      } as any);
      return true;
    } catch (error: any) {
      console.error('Login failed:', error?.message || error);
      return false;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
