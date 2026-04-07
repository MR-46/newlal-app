import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nl_user')); } catch { return null; }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('nl_theme') || 'light');
  const timerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nl_theme', theme);
  }, [theme]);

  const logout = useCallback(() => {
    localStorage.removeItem('nl_token');
    localStorage.removeItem('nl_user');
    setUser(null);
    clearTimeout(timerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  const login = async (mobile, password) => {
    const { data } = await api.post('/auth/login', { mobile, password });
    localStorage.setItem('nl_token', data.token);
    localStorage.setItem('nl_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('nl_token', data.token);
    localStorage.setItem('nl_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const isInternal = user && ['admin','salesperson','store_staff','b2c_staff'].includes(user.role);
  const isExternal = user && ['existing_retailer','new_retailer','end_user'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, theme, toggleTheme, isInternal, isExternal }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
