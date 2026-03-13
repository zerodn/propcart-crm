'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
  userId: string;
  workspaceId: string;
  role: string;
  workspaceType: string;
  deviceId: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        // Invalid user data, clear storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  return { user, loading, login, logout };
}
