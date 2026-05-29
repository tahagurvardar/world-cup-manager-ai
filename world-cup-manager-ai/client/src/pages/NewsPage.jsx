import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fetchNews } from "../services/gameService";

const fallbackNews = [
  {
    id: "demo-1",
    headline: "Turkey prepare for high-tempo World Cup opener",
    summary: "The national camp is focused on midfield balance, transition defense, and set-piece routines.",
    createdAt: new Date().toISOString(),
  },
];

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchNews()
      .then((data) => {
        if (isMounted) setNews(data.length ? data : fallbackNews);
      })
      .catch(() => {
        if (isMounted) setNews(fallbackNews);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingState label="Loading press room..." />;

  return (
    <>
      <PageHeader title="News" description="Dynamic headlines generated from match results and rule-based post-match reports." />

      <div className="grid gap-4">
        {news.map((item) => (
          <Panel key={item.id} className="p-5">
            <div className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-pitch-400/12 text-pitch-200">
                <Newspaper size={21} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-white">{item.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
