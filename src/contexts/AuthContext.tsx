import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';
import { Role } from '../types';

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  role: Role;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  currentUser: null,
  role: Role.STUDENT,
  login: () => { },
  logout: () => { },
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lab_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me().then((user) => {
      setCurrentUser(user);
      setRole(user.role as Role);
      setIsLoggedIn(true);
    }).catch(() => {
      localStorage.removeItem('lab_token');
    }).finally(() => setLoading(false));
  }, []);

  const login = useCallback((user: User) => {
    setCurrentUser(user);
    setRole(user.role as Role);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lab_token');
    setIsLoggedIn(false);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, currentUser, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
