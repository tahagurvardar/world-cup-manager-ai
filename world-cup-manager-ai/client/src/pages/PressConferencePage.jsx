import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Mic, Minus, Newspaper, Quote, Send, ShieldHalf, Smile, TrendingUp } from "lucide-react";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Panel from "../components/Panel.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { fetchPressConference, submitPressConference } from "../services/gameService";
import { getErrorMessage } from "../services/api";

const TONES = [
  { id: "defensive", label: "Defensive", icon: ShieldHalf, accent: "sky" },
  { id: "balanced", label: "Balanced", icon: Minus, accent: "slate" },
  { id: "confident", label: "Confident", icon: Smile, accent: "green" },
];

export default function PressConferencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetchPressConference()
      .then((payload) => {
        setData(payload);
        setAnswers({});
        setResult(null);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let isMounted = true;
    fetchPressConference()
      .then((payload) => {
        if (isMounted) setData(payload);
      })
      .catch((requestError) => {
        if (isMounted) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const conference = data?.conference;
  const media = data?.media;
  const allAnswered = useMemo(
    () => conference && conference.questions.every((question) => answers[question.id]),
    [conference, answers],
  );

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await submitPressConference(answers);
      setResult(response);
      setData((current) => ({ ...current, conference: null, media: response.media, history: response.history || current?.history || [] }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Walking into the press room..." />;

  if (!data || (!conference && !media)) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Press room unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{error || "Select a national team to face the media."}</p>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        icon={Mic}
        title="Press Conference"
        description="Face the media before and after every match. Your answers shape morale, fan confidence, media pressure, and the board's belief in you."
      />

      {error ? <p className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      {/* Media meters */}
      {media ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MediaMeter label="Fan Confidence" value={media.fanConfidence} trend={media.trends?.fanConfidence} tone="green" icon={Smile} />
          <MediaMeter label="Media Pressure" value={media.mediaPressure} trend={media.trends?.mediaPressure} tone="amber" icon={Newspaper} invert />
          <MediaMeter label="Board Confidence" value={media.boardConfidence} trend={media.trends?.boardConfidence} tone="blue" icon={TrendingUp} />
        </div>
      ) : null}

      {result ? <ResultSummary result={result} onContinue={load} /> : null}

      {conference && !result ? (
        <div className="space-y-5">
          <Panel className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className={`chip ${conference.type === "post" ? "border-amber-300/30 bg-amber-400/10 text-amber-100" : "border-pitch-300/30 bg-pitch-400/10 text-pitch-100"}`}>
                {conference.type === "post" ? "Post-Match" : "Pre-Match"}
              </span>
              <h2 className="mt-2 text-lg font-bold text-white">{conference.title}</h2>
              <p className="text-sm text-slate-400">{conference.subtitle}</p>
            </div>
            <p className="text-sm text-slate-400">
              {conference.questions.filter((q) => answers[q.id]).length}/{conference.questions.length} answered
            </p>
          </Panel>

          {conference.questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} number={index + 1} selected={answers[question.id]} onSelect={(tone) => setAnswers((current) => ({ ...current, [question.id]: tone }))} />
          ))}

          <div className="flex justify-end">
            <button type="button" onClick={handleSubmit} disabled={!allAnswered || submitting} className="btn-primary px-5 py-3">
              <Send size={16} />
              {submitting ? "Submitting..." : "Finish Press Conference"}
            </button>
          </div>
        </div>
      ) : null}

      {!conference && !result ? (
        <Panel className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pitch-400/15 text-pitch-100">
            <CheckCircle2 size={26} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-white">No press conference right now</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            You've faced the media for the current fixture. The next conference unlocks after your next match, or before the following fixture.
          </p>
        </Panel>
      ) : null}

      {data?.history?.length ? <ConferenceHistory history={data.history} /> : null}
    </>
  );
}

function MediaMeter({ label, value, trend, tone, icon: Icon, invert }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <Icon size={15} className="text-pitch-200" /> {label}
        </p>
        <TrendArrow trend={trend} invert={invert} />
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value ?? "—"}%</p>
      <div className="mt-2">
        <ProgressBar value={value} tone={tone} showValue={false} label="" />
      </div>
    </Panel>
  );
}

function TrendArrow({ trend, invert }) {
  if (!trend || trend === "flat") return <ArrowRight size={16} className="text-slate-500" />;
  const up = trend === "up";
  // For pressure (invert), up is bad (red), down is good (green).
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <Icon size={16} className={good ? "text-pitch-300" : "text-red-300"} />;
}

function QuestionCard({ question, number, selected, onSelect }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-slate-300">
          <Quote size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pitch-200">
            {question.reporter} · <span className="text-slate-500">{question.outlet}</span>
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            <span className="text-slate-500">Q{number}. </span>{question.text}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {TONES.map((tone) => {
          const option = question.options[tone.id];
          if (!option) return null;
          const active = selected === tone.id;
          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => onSelect(tone.id)}
              className={`rounded-xl border p-3 text-left transition ${
                active ? `${accentRing(tone.accent)} bg-white/[0.06]` : "border-white/10 bg-white/[0.03] hover:border-pitch-300/30"
              }`}
            >
              <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${accentText(tone.accent)}`}>
                <tone.icon size={14} /> {tone.label}
                {active ? <CheckCircle2 size={14} className="ml-auto text-pitch-300" /> : null}
              </span>
              <p className="mt-2 text-sm leading-5 text-slate-200">&ldquo;{option.text}&rdquo;</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(option.preview || []).map((effect) => (
                  <EffectChip key={effect.meter} effect={effect} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function EffectChip({ effect }) {
  const up = effect.dir === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
      <Icon size={11} className={up ? "text-pitch-300" : "text-amber-300"} />
      {effect.meter}
    </span>
  );
}

function ResultSummary({ result, onContinue }) {
  const reactionTone = result.reaction === "positive" ? "text-pitch-200" : result.reaction === "negative" ? "text-red-300" : "text-slate-300";
  return (
    <Panel className="mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Press conference complete</h2>
          <p className={`mt-1 text-sm font-semibold capitalize ${reactionTone}`}>Media reaction: {result.reaction}</p>
        </div>
        <button type="button" onClick={onContinue} className="btn-ghost px-4 py-2">Continue</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EffectDelta label="Fan Confidence" value={result.effects?.fanConfidence} />
        <EffectDelta label="Media Pressure" value={result.effects?.mediaPressure} invert />
        <EffectDelta label="Board Confidence" value={result.effects?.boardConfidence} />
        <EffectDelta label="Morale" value={result.effects?.moraleBoost} />
      </div>
      {result.news?.length ? (
        <div className="mt-4 space-y-2">
          {result.news.map((item) => (
            <p key={item.id} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
              <Newspaper size={14} className="text-pitch-200" /> {item.headline}
            </p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function EffectDelta({ label, value = 0, invert }) {
  const rounded = Math.round(value);
  const positive = rounded > 0;
  const neutral = rounded === 0;
  const good = invert ? rounded < 0 : rounded > 0;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${neutral ? "text-slate-300" : good ? "text-pitch-200" : "text-red-300"}`}>
        {positive ? "+" : ""}{rounded}
      </p>
    </div>
  );
}

function ConferenceHistory({ history }) {
  return (
    <Panel className="mt-6 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Recent Conferences</h2>
      <div className="mt-3 space-y-2">
        {history.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
            <span className="text-slate-200">
              <span className="font-semibold capitalize text-white">{item.type}</span> · {item.subtitle || item.stageLabel}
            </span>
            <span className="flex items-center gap-2">
              <span className="chip capitalize">{item.dominantTone}</span>
              <span className={`text-xs font-semibold capitalize ${item.reaction === "positive" ? "text-pitch-200" : item.reaction === "negative" ? "text-red-300" : "text-slate-400"}`}>
                {item.reaction}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function accentRing(accent) {
  if (accent === "green") return "border-pitch-300 ring-1 ring-pitch-300/40";
  if (accent === "sky") return "border-sky-300 ring-1 ring-sky-300/40";
  return "border-slate-300/60 ring-1 ring-slate-300/30";
}

function accentText(accent) {
  if (accent === "green") return "text-pitch-200";
  if (accent === "sky") return "text-sky-200";
  return "text-slate-300";
}
