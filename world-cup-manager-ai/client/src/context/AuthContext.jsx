import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import api from "../services/api";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("wcm_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (isMounted) setUser(data.user);
      } catch {
        localStorage.removeItem("wcm_token");
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("wcm_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(username, email, password) {
    const { data } = await api.post("/auth/register", { username, email, password });
    localStorage.setItem("wcm_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("wcm_token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
