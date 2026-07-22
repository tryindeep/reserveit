import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
    id: string;
    email : string;
    name: string;
    role : "SYSTEM_ADMIN"  | "CLIENT" | "CUSTOMER";
};

type AuthState = {
    user : User | null;
    token : string | null;
    login : (user : User , token : string) => void;
    logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "reserveit-auth" } // persists to localStorage, survives page refresh
  )
);