import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Signal" },
      { name: "description", content: "Sign in to Signal to see which of your stocks actually need a look today." },
      { property: "og:title", content: "Sign in — Signal" },
      { property: "og:description", content: "Sign in to your smart Indian stock watchlist." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Taking you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/" });
      else toast.message("Check your inbox to confirm your email, then sign in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Could not sign in with Google. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[16px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "#0B3B2E" }}
          >
            S
          </span>
          <span className="text-[22px] font-semibold tracking-tight">Signal</span>
        </div>

        <div className="rounded-lg border border-border bg-background p-6">
          <h1 className="text-[18px] font-semibold">
            {mode === "signin" ? "Sign in to your watchlist" : "Create your watchlist"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Only the stocks that need your attention. Nothing else.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="email" className="text-[12px] font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none transition-colors focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-[12px] font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none transition-colors focus:border-primary"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-md text-[14px] font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", color: "#0B3B2E" }}
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="h-11 w-full rounded-md border border-border bg-background text-[14px] font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            Continue with Google
          </button>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium"
              style={{ color: "var(--color-primary-dark)" }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
