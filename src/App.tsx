import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Páginas de autenticação (lazy para não aumentar o bundle inicial)
const Landing = lazy(() => import("./pages/Landing"));
const AppShell = lazy(() => import("./pages/AppShell"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const ResetConfirm = lazy(() => import("./pages/auth/ResetConfirm"));
const MFAEnroll = lazy(() => import("./pages/auth/MFAEnroll"));
const MFAChallenge = lazy(() => import("./pages/auth/MFAChallenge"));

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--pjus-canvas)]">
      <div className="flex items-center gap-2 text-brand-ink-2 text-sm font-medium">
        <span
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin"
          aria-hidden
        />
        Carregando…
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={150}>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Pública */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-confirm" element={<ResetConfirm />} />

            {/* Callback de confirmação de e-mail / OAuth */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Auth — requer sessão (aal1) */}
            <Route path="/auth/mfa-enroll" element={<MFAEnroll />} />
            <Route path="/auth/mfa-challenge" element={<MFAChallenge />} />

            {/* App — protegido: requer sessão válida + MFA se necessário */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  );
}
