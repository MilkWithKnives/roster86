import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/api/entities';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const currentUser = await User.me();
          setUser(currentUser);
        } catch (error) {
          console.error("Failed to fetch user", error);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (credentials) => {
    const loggedInUser = await User.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (userData) => {
    const newUser = await User.register(userData);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await User.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
