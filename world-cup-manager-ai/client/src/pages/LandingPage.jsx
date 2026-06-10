import { useState } from "react";
import { ArrowRight, BrainCircuit, Play, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import dashboardConcept from "../assets/dashboard-concept.png";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../services/api";

const highlights = [
  { label: "Squad control", value: "25-player national pools", icon: ShieldCheck },
  { label: "Match engine", value: "Tactics, form, morale, stamina", icon: Swords },
  { label: "AI layer", value: "Rule-based advisor ready for LLMs", icon: BrainCircuit },
];

export default function LandingPage() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function handleDemo() {
    setDemoLoading(true);
    setDemoError("");
    try {
      await loginDemo();
      navigate("/select-team");
    } catch (requestError) {
      setDemoError(getErrorMessage(requestError));
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <section className="relative min-h-screen px-5 py-6 md:px-10">
        <img
          src={dashboardConcept}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.26]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/88 to-ink-950/60" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-950 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-pitch-400 text-ink-950">
                <Trophy size={23} />
              </span>
              <span className="text-lg font-semibold">World Cup Manager AI</span>
            </div>
            <div className="flex items-center gap-3">
              <Link className="hidden rounded-md px-4 py-2 text-sm text-slate-300 transition hover:text-white sm:inline-flex" to="/login">
                Login
              </Link>
              <Link className="rounded-md bg-pitch-400 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300" to="/register">
                Register
              </Link>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] tracking-normal md:text-7xl">
                World Cup Manager AI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Pick a country, shape the squad, tune tactics, simulate tournament matches, and get AI-style
                analysis after every result.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDemo}
                  disabled={demoLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-pitch-400 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300 disabled:opacity-60"
                >
                  <Play size={18} />
                  {demoLoading ? "Preparing demo..." : "Try Demo"}
                </button>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-pitch-300/60 hover:bg-white/[0.05]"
                >
                  Start tournament <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-pitch-300/60 hover:bg-white/[0.05]"
                >
                  Continue save
                </Link>
              </div>
              {demoError ? (
                <p className="mt-3 max-w-md rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{demoError}</p>
              ) : null}
              <p className="mt-3 text-xs text-slate-500">Try Demo opens a sandbox manager account instantly — no registration needed.</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-ink-900/75 p-3 shadow-panel backdrop-blur">
              <img
                src={dashboardConcept}
                alt="World Cup Manager AI dashboard concept"
                className="aspect-[16/10] w-full rounded-md object-cover"
              />
            </div>
          </div>

          <div className="grid gap-3 pb-3 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
                  <Icon className="text-pitch-300" size={22} />
                  <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
