import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

type Role = "SYSTEM_ADMIN" | "CLIENT" | "CUSTOMER";

export const RoleRoute = ({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: Role[];
}) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) return <Navigate to="/login" replace />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/movies" replace />;

  return <>{children}</>;
};