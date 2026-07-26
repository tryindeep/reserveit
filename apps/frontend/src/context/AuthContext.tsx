import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../types/types";

type AuthContextType =  {
    user : User | null;
    token : string | null;
    login :  (user : User, token : string) => void;
    logout : () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children} : {children : ReactNode}) => {
    const [user , setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem("user");
        return stored ?  JSON.parse(stored) : null;
    });

    const [token , setToken] = useState<string |null>(() => localStorage.getItem("token"));

    const login = (newUser : User, newToken : string) => {
        localStorage.setItem("user" , JSON.stringify(newUser));
        localStorage.setItem("token" , newToken);
        setUser(newUser);
        setToken(newToken)
    };
    const logout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
    };
    
    return (
        <AuthContext.Provider value={{user , token, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if(!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

// COMPLETE FLOW 

// App Starts
//     │
//     ▼
// <AuthProvider>
//     │
//     ▼
// Read localStorage
//     │
//     ├── user
//     └── token
//     │
//     ▼
// Store in React State
//     │
//     ▼
// Provide Context
//     │
//     ▼
// Any Component
//     │
//     ▼
// const { user, token } = useAuth()



// Login Flow
// User submits login form
//         │
//         ▼
// Backend returns
// (user + token)
//         │
//         ▼
// login(user, token)
//         │
//         ├── localStorage.setItem()
//         ├── setUser()
//         └── setToken()
//         │
//         ▼
// React re-renders
//         │
//         ▼
// Protected pages become accessible


// LOGOUT
// User clicks Logout
//         │
//         ▼
// logout()
//         │
//         ├── removeItem("user")
//         ├── removeItem("token")
//         ├── setUser(null)
//         └── setToken(null)
//         │
//         ▼
// ProtectedRoute sees token === null
//         │
//         ▼
// Redirect to /login