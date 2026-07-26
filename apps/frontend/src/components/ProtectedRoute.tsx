import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({children} : {children : ReactNode}) => {
    const {token} = useAuth();

    if(!token) return <Navigate to="/login" replace></Navigate>
    return (
        <>
            {children}
        </>
    )
}