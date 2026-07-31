import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Landing from "@/pages/Landing";

/**
 * RootGate — the public "front page" before the app.
 * Logged-out visitors see the marketing Landing page (indexable, shareable).
 * Logged-in users are routed straight into the app dashboard.
 */
export default function RootGate() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}