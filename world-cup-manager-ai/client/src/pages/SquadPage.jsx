import { useEffect, useMemo, useState } from "react";
import { Search, Shirt } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fetchSquad } from "../services/gameService";

const fallbackPlayers = [
  { name: "Kerem Kaya", age: 24, nationality: "Turkey", position: "AM", club: "Istanbul Crescent", overall: 86, pace: 82, shooting: 80, passing: 87, defending: 54, physical: 74, form: 84, morale: 86, stamina: 80 },
  { name: "Arda Celik", age: 22, nationality: "Turkey", position: "CM", club: "Ankara Union", overall: 84, pace: 76, shooting: 74, passing: 88, defending: 72, physical: 77, form: 81, morale: 83, stamina: 84 },
  { name: "Mert Demir", age: 29, nationality: "Turkey", position: "GK", club: "Izmir Athletic", overall: 83, pace: 58, shooting: 34, passing: 75, defending: 86, physical: 82, form: 80, morale: 82, stamina: 76 },
];

export default function SquadPage() {
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState("Selected Team");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    fetchSquad()
      .then((data) => {
        if (isMounted) {
          setTeam(data.team);
          setPlayers(data.players);
        }
      })
      .catch(() => {
        if (isMounted) setPlayers(fallbackPlayers);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const positions = useMemo(() => ["ALL", ...new Set(players.map((player) => player.position))], [players]);
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesPosition = position === "ALL" || player.position === position;
      const text = `${player.name} ${player.club} ${player.position}`.toLowerCase();
      return matchesPosition && text.includes(query.toLowerCase());
    });
  }, [players, position, query]);

  if (loading) return <LoadingState label="Loading squad..." />;

  return (
    <>
      <PageHeader title={`${team} Squad`} description="Full national team pool with core attributes for match simulation and tactical decisions." />

      <Panel className="p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shirt size={18} className="text-pitch-200" />
            {players.length} registered players
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players"
                className="w-full rounded-md border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-pitch-300 sm:w-64"
              />
            </label>
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="rounded-md border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-white outline-none focus:border-pitch-300"
            >
              {positions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 pr-4">Age</th>
                <th className="py-3 pr-4">Pos</th>
                <th className="py-3 pr-4">Club</th>
                <th className="py-3 pr-4">OVR</th>
                <th className="py-3 pr-4">PAC</th>
                <th className="py-3 pr-4">SHO</th>
                <th className="py-3 pr-4">PAS</th>
                <th className="py-3 pr-4">DEF</th>
                <th className="py-3 pr-4">PHY</th>
                <th className="py-3 pr-4">Form</th>
                <th className="py-3 pr-4">Morale</th>
                <th className="py-3">Stamina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {filteredPlayers.map((player) => (
                <tr key={`${player.name}-${player.club}`} className="text-slate-300">
                  <td className="py-3 pr-4 font-medium text-white">{player.name}</td>
                  <td className="py-3 pr-4">{player.age}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-md bg-pitch-400/10 px-2 py-1 text-xs font-semibold text-pitch-100">{player.position}</span>
                  </td>
                  <td className="py-3 pr-4">{player.club}</td>
                  <td className="py-3 pr-4 font-semibold text-pitch-100">{player.overall}</td>
                  <td className="py-3 pr-4">{player.pace}</td>
                  <td className="py-3 pr-4">{player.shooting}</td>
                  <td className="py-3 pr-4">{player.passing}</td>
                  <td className="py-3 pr-4">{player.defending}</td>
                  <td className="py-3 pr-4">{player.physical}</td>
                  <td className="py-3 pr-4">{player.form}</td>
                  <td className="py-3 pr-4">{player.morale}</td>
                  <td className="py-3">{player.stamina}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
