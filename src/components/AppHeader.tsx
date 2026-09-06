import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <header className="row-divider sticky top-0 z-20 bg-background/95 backdrop-blur">
      <div className="page-shell flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "#0B3B2E" }}
          >
            S
          </span>
          <span className="text-[16px] font-semibold tracking-tight">Signal</span>
        </Link>
        <button
          onClick={signOut}
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
