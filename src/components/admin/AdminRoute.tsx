import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthContext();

  if (loading) return null;
  if (!profile || profile.role !== "admin") return <Navigate to="/app" replace />;

  return <>{children}</>;
}
