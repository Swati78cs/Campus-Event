import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  updateUserProfile,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from HttpOnly cookie on mount
  const refreshUser = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data?.user || null);
      setError(null);
    } catch {
      // User is not authenticated or session expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials) => {
    setError(null);
    const response = await loginUser(credentials);
    const loggedUser = response.data?.user;
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (userData) => {
    setError(null);
    const response = await registerUser(userData);
    const registeredUser = response.data?.user;
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    const response = await updateUserProfile(profileData);
    const updatedUser = response.data?.user;
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
