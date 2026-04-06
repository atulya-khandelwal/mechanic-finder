import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginIdentifier, password) => {
    const { token } = await authApi.login(loginIdentifier, password);
    localStorage.setItem('token', token);
    const u = await authApi.me();
    setUser(u);
    return u;
  };

  const registerStart = async (body) => authApi.registerStart(body);

  const registerResend = async (email) => authApi.registerResend(email);

  const registerVerify = async ({ email, code, phoneCode }) => {
    const { token } = await authApi.registerVerify({ email, code, phoneCode });
    localStorage.setItem('token', token);
    const u = await authApi.me();
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const u = await authApi.me();
    setUser(u);
    return u;
  };

  /** Store JWT and load profile (e.g. after password reset). */
  const applyAuthToken = async (token) => {
    localStorage.setItem('token', token);
    const u = await authApi.me();
    setUser(u);
    return u;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerStart,
        registerResend,
        registerVerify,
        logout,
        refreshUser,
        applyAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
