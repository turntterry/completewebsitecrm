import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, loading, navigate]);

  // Check if auth is configured
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/auth/configured");
        const data = await res.json();
        setAuthConfigured(data.configured);
      } catch (error) {
        console.error("Failed to check auth configuration:", error);
        setAuthConfigured(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, oklch(0.20 0.06 250), oklch(0.28 0.08 250))" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Exterior Experts</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Professional CRM &amp; Field Service Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign in to your CRM</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Access your jobs, clients, quotes, and invoices from anywhere.
          </p>

          {authConfigured === null ? (
            <div className="flex items-center justify-center h-12">
              <div className="text-sm text-muted-foreground">Loading authentication...</div>
            </div>
          ) : authConfigured ? (
            <a
              href={getLoginUrl()}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-sm transition-colors"
              style={{ background: "oklch(0.32 0.12 250)", color: "white" }}
            >
              Sign in with Google
            </a>
          ) : (
            <div className="w-full rounded-lg px-4 py-3 bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Authentication not configured</p>
                <p className="text-xs text-red-700 mt-1">
                  Please configure Google OAuth in your .env file and restart the server.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {[
              "Manage clients, quotes, and jobs",
              "Schedule and dispatch field visits",
              "Send invoices and collect payments",
              "Track reviews and run campaigns",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
