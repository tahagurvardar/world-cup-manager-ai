import { useEffect, useState } from "react";
import {
  Bell,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchDashboard } from "../services/gameService";
import Flag from "./Flag.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  const { pathname } = useLocation();
  const [header, setHeader] = useState(null);

  // Refresh the header context (team + tournament stage) on navigation so it stays in
  // sync after selecting a team or simulating a match.
  useEffect(() => {
    let isMounted = true;
    fetchDashboard()
      .then((data) => {
        if (isMounted) setHeader(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const team = header?.selectedTeam;
  const tournamentBadge = header?.tournamentStage || (header?.needsTeamSelection ? "No team selected" : "World Cup cycle");

  return (
    <div className="min-h-screen text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <Sidebar user={user} onLogout={handleLogout} />

        <main className="pitch-grid min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/70 px-4 py-3 backdrop-blur-xl md:px-8">
            <div className="flex items-center justify-between gap-3">
              <NavLink
                to="/select-team"
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-pitch-300/40 hover:bg-white/[0.07]"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Team</span>
                {team ? (
                  <>
                    <Flag src={team.flag} alt={`${team.name} flag`} size="md" />
                    <span className="text-sm font-semibold text-white">{team.name}</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-pitch-100">Select a team</span>
                )}
              </NavLink>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border border-pitch-300/25 bg-pitch-400/10 px-3 py-1.5 text-xs font-semibold text-pitch-100 sm:inline-flex">
                  <Trophy size={13} />
                  {tournamentBadge}
                </span>
                <HeaderIcon icon={Bell} label="Notifications" onClick={() => navigate("/news")} />
                <HeaderIcon icon={Mail} label="News" onClick={() => navigate("/news")} />
                <HeaderIcon icon={Settings} label="Settings" onClick={() => navigate("/profile")} />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1400px] animate-fade-in px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout }) {
  return (
    <aside className="z-30 border-b border-white/10 bg-ink-950/80 px-3 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:py-6">
      <div className="flex items-center justify-between gap-4 px-1 lg:block">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pitch-400 to-pitch-600 text-ink-950 shadow-glow">
            <Trophy size={22} />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pitch-200">World Cup</p>
            <p className="text-lg font-bold text-white">Manager AI</p>
          </div>
        </NavLink>
        <button type="button" onClick={onLogout} className="btn-ghost px-3 py-2 lg:hidden">
          <LogOut size={16} />
        </button>
      </div>

      <nav className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-pitch-500/25 to-pitch-400/5 text-white shadow-[inset_0_0_0_1px_rgba(74,222,128,0.25)]"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-pitch-400 shadow-glow" /> : null}
                  <Icon size={18} className={isActive ? "text-pitch-200" : ""} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-6 hidden lg:block">
        <div className="glass-card overflow-hidden p-3">
          <div className="flex items-center gap-2 text-pitch-100">
            <Sparkles size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">AI Assistant</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Rule-based tactical engine ready. Review advice before each match.</p>
        </div>

        <div className="glass-card mt-3 flex items-center gap-3 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-pitch-100">
            <CircleUserRound size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.username || "Manager"}</p>
            <p className="truncate text-xs text-slate-400">{user?.email || "National team office"}</p>
          </div>
          <button type="button" onClick={onLogout} aria-label="Logout" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-red-400/40 hover:text-red-200">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function HeaderIcon({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-pitch-300/40 hover:bg-white/[0.07] hover:text-white"
    >
      <Icon size={17} />
    </button>
  );
}
