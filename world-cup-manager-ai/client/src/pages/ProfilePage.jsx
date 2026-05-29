import { useEffect, useState } from "react";
import { CircleUserRound, Shield, Trophy } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { useAuth } from "../hooks/useAuth";
import { fallbackDashboard } from "../data/sampleData";
import { fetchDashboard } from "../services/gameService";

export default function ProfilePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchDashboard()
      .then((data) => {
        if (isMounted) setDashboard(data);
      })
      .catch(() => {
        if (isMounted) setDashboard(fallbackDashboard);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Profile" description="Manager account and current national team save context." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/10 text-pitch-200">
              <CircleUserRound size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.username || "Manager"}</h2>
              <p className="text-sm text-slate-400">{user?.email || "No email loaded"}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="Authentication" value="JWT protected routes" />
            <Info label="Save scope" value="Single-player national tournament" />
            <Info label="Created" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Current session"} />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-pitch-400/12 text-pitch-200">
              <Shield size={28} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">{dashboard?.selectedTeam?.name || "No team selected"}</h2>
              <p className="text-sm text-slate-400">Current national team</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="Group" value={dashboard?.selectedTeam?.group || "TBD"} />
            <Info label="Overall" value={dashboard?.selectedTeam?.overall || "TBD"} />
            <Info label="Tournament progress" value={dashboard?.tournamentProgress || "TBD"} />
            <Info label="Target" value="Lift the trophy" icon={Trophy} />
          </div>
        </Panel>
      </div>
    </>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white/[0.04] p-3">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2 font-medium text-white">
        {Icon ? <Icon size={16} className="text-pitch-200" /> : null}
        {value}
      </span>
    </div>
  );
}
