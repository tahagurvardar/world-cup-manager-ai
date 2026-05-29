import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../services/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-4 py-10 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-white/10 bg-ink-900/90 p-6 shadow-panel">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-pitch-400 text-ink-950">
            <Trophy size={21} />
          </span>
          <span className="text-lg font-semibold">World Cup Manager AI</span>
        </Link>
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-slate-400">Access your tournament save and national team office.</p>

        <label className="mt-6 block text-sm font-medium text-slate-300">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-white outline-none transition focus:border-pitch-300"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-300">
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-white outline-none transition focus:border-pitch-300"
          />
        </label>

        {error ? <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pitch-400 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-pitch-300 disabled:opacity-60"
        >
          <LogIn size={18} />
          {submitting ? "Signing in..." : "Login"}
        </button>

        <p className="mt-5 text-center text-sm text-slate-400">
          New manager?{" "}
          <Link to="/register" className="font-semibold text-pitch-200 hover:text-pitch-100">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
