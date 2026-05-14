import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const Landing = lazy(() => import("./pages/Landing"));
const AppShell = lazy(() => import("./pages/AppShell"));

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
    <TooltipProvider delayDuration={150}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<AppShell />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
