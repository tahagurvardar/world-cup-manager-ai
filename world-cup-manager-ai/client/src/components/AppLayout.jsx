import {
  BarChart3,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  Home,
  Newspaper,
  Shield,
  Shirt,
  Swords,
  Trophy,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/select-team", label: "Select Team", icon: Shield },
  { to: "/squad", label: "Squad", icon: Shirt },
  { to: "/tactics", label: "Tactics", icon: ClipboardList },
  { to: "/match-center", label: "Match Center", icon: Swords },
  { to: "/tournament", label: "Tournament", icon: Trophy },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/profile", label: "Profile", icon: CircleUserRound },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-ink-900/95 px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 lg:block">
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-pitch-400 text-ink-950">
                <Trophy size={23} />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pitch-200">World Cup</p>
                <p className="text-lg font-semibold text-white">Manager AI</p>
              </div>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-pitch-300/50 hover:text-white lg:hidden"
            >
              Logout
            </button>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex min-w-fit items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-pitch-400 text-ink-950"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 hidden rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-white/10">
                <CircleUserRound size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{user?.username || "Manager"}</p>
                <p className="text-xs text-slate-400">{user?.email || "National team office"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-pitch-300/50 hover:text-white"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="pitch-grid min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-ink-950/86 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Home size={17} />
                <span>Manager Console</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                  JWT session active
                </span>
                <span className="rounded-md border border-pitch-300/20 bg-pitch-400/10 px-3 py-2 text-pitch-100">
                  <CalendarDays size={14} className="mr-1 inline" />
                  World Cup cycle
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
