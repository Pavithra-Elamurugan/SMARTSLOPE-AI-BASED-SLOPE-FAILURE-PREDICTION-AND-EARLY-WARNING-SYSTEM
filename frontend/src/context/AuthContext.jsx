import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("smartslope_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("smartslope_token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync profile directly from backend on mount and whenever token changes
  useEffect(() => {
    if (token) {
      setLoading(true);
      authApi
        .me()
        .then((userData) => {
          if (userData && userData.active === false) {
            logout();
          } else {
            setUser(userData);
            localStorage.setItem("smartslope_user", JSON.stringify(userData));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        requestedRole: data.requestedRole,
      };
      localStorage.setItem("smartslope_token", data.token);
      localStorage.setItem("smartslope_user", JSON.stringify(userObj));
      setToken(data.token);
      setUser(userObj);
      return userObj;
    } catch (err) {
      const serverErr = err.response?.data;
      const msg = err.customMessage 
        ? err.customMessage
        : typeof serverErr === "string" 
        ? serverErr 
        : serverErr?.message || err.message || "Invalid email or password";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.register(userData);
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        requestedRole: data.requestedRole,
      };
      setToken(data.token);
      setUser(userObj);
      localStorage.setItem("smartslope_token", data.token);
      localStorage.setItem("smartslope_user", JSON.stringify(userObj));
      return userObj;
    } catch (err) {
      const serverErr = err.response?.data;
      const msg = typeof serverErr === "string" 
        ? serverErr 
        : serverErr?.message || "Registration failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("smartslope_token");
    localStorage.removeItem("smartslope_user");
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
