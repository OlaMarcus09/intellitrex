"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserTier = "free" | "premium";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: string;
  createdAt: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: UserTier;
  chatCount: number;
  chatSessions: ChatSession[];
  binanceConnected: boolean;
};

const FREE_CHAT_LIMIT = 50;
const PREMIUM_PRICE = "$99.99/month";

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isPremium: boolean;
  chatCount: number;
  chatLimit: number;
  canChat: boolean;
  premiumPrice: string;
  signInWithGoogle: () => void;
  signOut: () => void;
  incrementChatCount: () => void;
  saveChatSession: (session: ChatSession) => void;
  getChatSessions: () => ChatSession[];
  upgradeToPremium: () => void;
  setBinanceConnected: (connected: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isPremium: false,
  chatCount: 0,
  chatLimit: FREE_CHAT_LIMIT,
  canChat: true,
  premiumPrice: PREMIUM_PRICE,
  signInWithGoogle: () => {},
  signOut: () => {},
  incrementChatCount: () => {},
  saveChatSession: () => {},
  getChatSessions: () => [],
  upgradeToPremium: () => {},
  setBinanceConnected: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = "intellitrex-user";

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = loadUser();
    if (saved) setUser(saved);
  }, []);

  const updateUser = useCallback((updater: (prev: User) => User) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveUser(updated);
      return updated;
    });
  }, []);

  const signInWithGoogle = useCallback(() => {
    // Simulate Google OAuth — in production, integrate with NextAuth.js or Firebase Auth
    const mockUser: User = {
      id: "google-" + Math.random().toString(36).slice(2, 10),
      name: "User",
      email: "",
      avatar: "",
      tier: "free",
      chatCount: 0,
      chatSessions: [],
      binanceConnected: false,
    };

    // Open Google OAuth popup (simulated for now)
    const name = prompt("Enter your name (Google Sign-In simulation):");
    const email = prompt("Enter your email:");
    if (!name || !email) return;

    mockUser.name = name;
    mockUser.email = email;
    mockUser.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4a6cf7&color=fff`;

    // Check if returning user
    const existing = loadUser();
    if (existing && existing.email === email) {
      setUser(existing);
      return;
    }

    saveUser(mockUser);
    setUser(mockUser);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  const incrementChatCount = useCallback(() => {
    updateUser((prev) => ({ ...prev, chatCount: prev.chatCount + 1 }));
  }, [updateUser]);

  const saveChatSession = useCallback(
    (session: ChatSession) => {
      updateUser((prev) => {
        const sessions = [...prev.chatSessions];
        const idx = sessions.findIndex((s) => s.id === session.id);
        if (idx >= 0) {
          sessions[idx] = session;
        } else {
          sessions.unshift(session);
        }
        // Keep last 50 sessions
        return { ...prev, chatSessions: sessions.slice(0, 50) };
      });
    },
    [updateUser]
  );

  const getChatSessions = useCallback(() => {
    return user?.chatSessions || [];
  }, [user]);

  const upgradeToPremium = useCallback(() => {
    // In production, integrate with Stripe Checkout
    updateUser((prev) => ({ ...prev, tier: "premium" }));
  }, [updateUser]);

  const setBinanceConnected = useCallback(
    (connected: boolean) => {
      updateUser((prev) => ({ ...prev, binanceConnected: connected }));
    },
    [updateUser]
  );

  const isPremium = user?.tier === "premium";
  const canChat = isPremium || (user?.chatCount ?? 0) < FREE_CHAT_LIMIT;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isPremium,
        chatCount: user?.chatCount ?? 0,
        chatLimit: FREE_CHAT_LIMIT,
        canChat,
        premiumPrice: PREMIUM_PRICE,
        signInWithGoogle,
        signOut,
        incrementChatCount,
        saveChatSession,
        getChatSessions,
        upgradeToPremium,
        setBinanceConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
