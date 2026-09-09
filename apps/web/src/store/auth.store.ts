import { create } from "zustand";
import type { LoginResponseDTO } from "@oficina/types";

const ACCESS_TOKEN_KEY = "oficina.accessToken";
const REFRESH_TOKEN_KEY = "oficina.refreshToken";
const USER_KEY = "oficina.user";

type AuthUser = LoginResponseDTO["user"];

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (session: LoginResponseDTO) => void;
  logout: () => void;
  tryRefresh: () => Promise<boolean>;
  hasRole: (...roles: string[]) => boolean;
}

function loadFromStorage() {
  try {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
      user: JSON.parse(localStorage.getItem(USER_KEY) ?? "null"),
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadFromStorage(),
  hydrated: true,

  setSession: (session) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },

  tryRefresh: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return false;
    try {
      const base = import.meta.env.VITE_API_URL ?? "/api/v1";
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      set({ accessToken: data.accessToken });
      return true;
    } catch {
      return false;
    }
  },

  hasRole: (...roles: string[]) => {
    const user = get().user;
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
  },
}));
