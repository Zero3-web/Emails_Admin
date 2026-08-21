import { Suspense } from "react";
import { AuthCallbackView } from "@/src/components/auth-callback-view";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-slate-500">Cargando...</div>}>
      <AuthCallbackView />
    </Suspense>
  );
}

