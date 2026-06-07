// Deterministic, rule-based press conference engine. Generates pre/post-match questions
// from match context, applies tone-based answer effects to the media/morale meters, and
// derives a subtle simulation modifier. No external AI is used.

export const DEFAULT_MEDIA = {
  fanConfidence: 60,
  mediaPressure: 45,
  boardConfidence: 65,
  moraleBoost: 0,
  confidenceBoost: 0,
  previous: { fanConfidence: 60, mediaPressure: 45, boardConfidence: 65 },
};

const REPORTERS = [
  "Carla Mendez", "Tom Fielding", "Yuki Tanaka", "Hassan Reni", "Sofia Alb",
  "Diego Moralez", "Lena Vos", "Marco Bianchi", "Aisha Karim", "Pavel Novak",
  "Grace Okoye", "Liam Carter",
];

const OUTLETS = [
  "Global Sports Daily", "World Football Weekly", "The Touchline", "Pitchside Report",
  "Continental Sport", "Matchday Voice", "Stadium Wire", "Football Frontier",
];

const TONE_PREVIEW = {
  confident: [
    { meter: "Morale", dir: "up" },
    { meter: "Fan Confidence", dir: "up" },
    { meter: "Media Pressure", dir: "up" },
  ],
  balanced: [
    { meter: "Morale", dir: "up" },
    { meter: "Board Confidence", dir: "up" },
  ],
  defensive: [
    { meter: "Media Pressure", dir: "down" },
    { meter: "Fan Confidence", dir: "down" },
  ],
};

// Per-answer effect deltas. fan/pressure/board are 0-100 meters; morale/confidence are boosts.
const TONE_EFFECTS = {
  confident: { fan: 4, pressure: 3, board: 2, morale: 2, confidence: 1.2 },
  balanced: { fan: 1, pressure: -0.5, board: 1, morale: 1, confidence: 0.4 },
  defensive: { fan: -2, pressure: -3, board: 1, morale: -1, confidence: -0.8 },
};

const TONES = ["defensive", "balanced", "confident"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(list, seed, salt) {
  return list[hashString(`${seed}-${salt}`) % list.length];
}

export function normalizeMedia(media) {
  const base = media && typeof media === "object" ? media : {};
  const fanConfidence = clamp(Number(base.fanConfidence ?? DEFAULT_MEDIA.fanConfidence), 0, 100);
  const mediaPressure = clamp(Number(base.mediaPressure ?? DEFAULT_MEDIA.mediaPressure), 0, 100);
  const boardConfidence = clamp(Number(base.boardConfidence ?? DEFAULT_MEDIA.boardConfidence), 0, 100);
  const previous = base.previous && typeof base.previous === "object" ? base.previous : { fanConfidence, mediaPressure, boardConfidence };

  return {
    fanConfidence: Math.round(fanConfidence),
    mediaPressure: Math.round(mediaPressure),
    boardConfidence: Math.round(boardConfidence),
    moraleBoost: clamp(Number(base.moraleBoost ?? 0), -15, 15),
    confidenceBoost: clamp(Number(base.confidenceBoost ?? 0), -8, 8),
    previous: {
      fanConfidence: Math.round(clamp(Number(previous.fanConfidence ?? fanConfidence), 0, 100)),
      mediaPressure: Math.round(clamp(Number(previous.mediaPressure ?? mediaPressure), 0, 100)),
      boardConfidence: Math.round(clamp(Number(previous.boardConfidence ?? boardConfidence), 0, 100)),
    },
  };
}

// Trend direction (up/down/flat) for each visible meter, from the stored previous snapshot.
export function mediaTrends(media) {
  const m = normalizeMedia(media);
  const dir = (now, before) => (now > before ? "up" : now < before ? "down" : "flat");
  return {
    fanConfidence: dir(m.fanConfidence, m.previous.fanConfidence),
    mediaPressure: dir(m.mediaPressure, m.previous.mediaPressure),
    boardConfidence: dir(m.boardConfidence, m.previous.boardConfidence),
  };
}

// Subtle per-match modifier for the manager team derived from media confidence/pressure.
export function mediaMatchModifier(media) {
  const m = normalizeMedia(media);
  const powerDelta = clamp((m.fanConfidence - 50) / 50 + (m.boardConfidence - 50) / 50 * 0.6 + m.moraleBoost * 0.07, -2, 2);
  const ratingDelta = clamp(m.confidenceBoost * 0.02 + ((m.fanConfidence - 50) - (m.mediaPressure - 50)) / 100 * 0.25, -0.25, 0.25);
  return { powerDelta: Number(powerDelta.toFixed(3)), ratingDelta: Number(ratingDelta.toFixed(3)) };
}

/* ---------- question option builders ---------- */

function options(defensive, balanced, confident) {
  return {
    defensive: { text: defensive, preview: TONE_PREVIEW.defensive },
    balanced: { text: balanced, preview: TONE_PREVIEW.balanced },
    confident: { text: confident, preview: TONE_PREVIEW.confident },
  };
}

function opponentQuestion(team, opponent) {
  const diff = (opponent?.overall || 75) - (team.overall || 75);
  if (diff >= 4) {
    return {
      topic: "opponent",
      text: `${opponent.name} are the clear favourites. How will ${team.name} respond?`,
      options: options(
        `We respect ${opponent.name}. It will be a very difficult game.`,
        `${opponent.name} are strong, but we are prepared and focused.`,
        `Favourites or not, we believe we can beat ${opponent.name}.`,
      ),
    };
  }
  if (diff <= -4) {
    return {
      topic: "opponent",
      text: `${team.name} are favourites against ${opponent.name}. Can you handle that pressure?`,
      options: options(
        `There are no easy games at this level. We stay humble.`,
        `We know our quality, but we respect ${opponent.name} fully.`,
        `We expect to win. Our players are ready to deliver.`,
      ),
    };
  }
  return {
    topic: "opponent",
    text: `This looks evenly matched against ${opponent.name}. What is your plan?`,
    options: options(
      `It is finely balanced. We must be disciplined and patient.`,
      `Both teams have a chance. We trust our preparation.`,
      `On our day we are the better side, and we will show it.`,
    ),
  };
}

function stageQuestion(team, stageLabel) {
  return {
    topic: "stage",
    text: `${stageLabel} is a big occasion. How is the squad handling it?`,
    options: options(
      `Occasions like this can be daunting. We take it one step at a time.`,
      `The players are calm and ready for ${stageLabel}.`,
      `This is exactly where ${team.name} want to be. We embrace it.`,
    ),
  };
}

function suspensionQuestion(team, suspendedName, isCaptain) {
  const who = isCaptain ? `Your captain ${suspendedName}` : suspendedName;
  return {
    topic: "suspension",
    text: `${who} is suspended for this match. Is that a major concern?`,
    options: options(
      `Losing ${suspendedName} hurts us. We will have to dig in.`,
      `It is a blow, but the squad is ready to cover the absence.`,
      `Whoever comes in will do the job. We have full depth.`,
    ),
  };
}

function injuryQuestion(team, injuredName) {
  return {
    topic: "injury",
    text: `${injuredName} is injured and unavailable. How big a loss is that?`,
    options: options(
      `${injuredName} is important to us. It is a setback.`,
      `We will miss ${injuredName}, but others are ready to step up.`,
      `We have more than enough quality to cope without ${injuredName}.`,
    ),
  };
}

function formQuestion(team, outcome) {
  if (outcome === "loss") {
    return {
      topic: "form",
      text: `${team.name} struggled in the last match. Are you worried?`,
      options: options(
        `We were not good enough last time. We must improve quickly.`,
        `One result does not define us. We have addressed the issues.`,
        `That is behind us. We will respond strongly in this game.`,
      ),
    };
  }
  if (outcome === "win") {
    return {
      topic: "form",
      text: `${team.name} won the last match well. Can you keep the momentum?`,
      options: options(
        `Momentum is fragile. We must stay grounded.`,
        `It was a good win, and we want to build on it sensibly.`,
        `We are flying and we intend to keep winning.`,
      ),
    };
  }
  return {
    topic: "form",
    text: `Results have been mixed lately. What is your message?`,
    options: options(
      `We know we must be more consistent. It is a work in progress.`,
      `We are competitive in every game and trust the process.`,
      `The performances are coming together. Big results are near.`,
    ),
  };
}

function pressureQuestion(team) {
  return {
    topic: "pressure",
    text: `Media pressure on ${team.name} is mounting. How do you cope?`,
    options: options(
      `Pressure is part of the job. We keep our heads down.`,
      `We block out the noise and focus on the football.`,
      `Pressure is a privilege. We thrive on these expectations.`,
    ),
  };
}

function fanQuestion(team, fanConfidence) {
  if (fanConfidence < 45) {
    return {
      topic: "fans",
      text: `The fans are nervous right now. What is your message to them?`,
      options: options(
        `We understand the concern. We must earn their trust back.`,
        `Stay with us. The players are giving everything.`,
        `Get behind us and we will give the fans something to celebrate.`,
      ),
    };
  }
  return {
    topic: "fans",
    text: `The fans are excited. Does that energy help the team?`,
    options: options(
      `We appreciate it, but we must not get carried away.`,
      `The support is fantastic and the players feed off it.`,
      `With our fans behind us, nobody wants to face ${team.name}.`,
    ),
  };
}

/* ---------- conference generation ---------- */

function attachMeta(question, seed, index) {
  return {
    id: `q${index + 1}`,
    topic: question.topic,
    reporter: pick(REPORTERS, seed, `rep-${index}-${question.topic}`),
    outlet: pick(OUTLETS, seed, `out-${index}-${question.topic}`),
    text: question.text,
    options: question.options,
  };
}

export function generatePreConference({ team, opponent, stageLabel, lastOutcome, injuredName, suspendedName, suspendedIsCaptain, media, fixtureId }) {
  const m = normalizeMedia(media);
  const candidates = [opponentQuestion(team, opponent || { name: "the opponent", overall: 75 }), stageQuestion(team, stageLabel)];

  if (suspendedName) candidates.push(suspensionQuestion(team, suspendedName, suspendedIsCaptain));
  if (injuredName) candidates.push(injuryQuestion(team, injuredName));
  if (lastOutcome) candidates.push(formQuestion(team, lastOutcome));
  if (m.mediaPressure >= 62) candidates.push(pressureQuestion(team));
  candidates.push(fanQuestion(team, m.fanConfidence));

  const seed = `pre-${fixtureId || team.code}-${stageLabel}`;
  const selected = candidates.slice(0, 5);
  const questions = selected.map((question, index) => attachMeta(question, seed, index));

  return {
    id: `pre-${fixtureId || `${team.code}-${Date.now()}`}`,
    type: "pre",
    stageLabel,
    fixtureId: fixtureId || null,
    title: `Pre-Match Press Conference`,
    subtitle: opponent ? `${team.name} vs ${opponent.name} · ${stageLabel}` : stageLabel,
    questions,
  };
}

export function generatePostConference({ team, match, stageLabel, fixtureId }) {
  const isHome = match.teams.home.code === team.code;
  const teamGoals = isHome ? match.score.home : match.score.away;
  const oppGoals = isHome ? match.score.away : match.score.home;
  const opponentName = isHome ? match.teams.away.name : match.teams.home.name;
  let outcome = "draw";
  if (match.knockout?.winnerTeam?.code) outcome = match.knockout.winnerTeam.code === team.code ? "win" : "loss";
  else if (teamGoals > oppGoals) outcome = "win";
  else if (teamGoals < oppGoals) outcome = "loss";

  const candidates = [];
  if (outcome === "win") {
    candidates.push({
      topic: "result",
      text: `A ${teamGoals}-${oppGoals} win over ${opponentName}. Your reaction?`,
      options: options(
        `A good result, but there is plenty still to improve.`,
        `I am pleased with the win and the response from the players.`,
        `A statement win. This is what ${team.name} are capable of.`,
      ),
    });
  } else if (outcome === "loss") {
    candidates.push({
      topic: "result",
      text: `How do you explain the ${teamGoals}-${oppGoals} defeat to ${opponentName}?`,
      options: options(
        `We fell short today and I take responsibility for that.`,
        `${opponentName} took their chances. We will learn from this.`,
        `A bad day, but this group will bounce back stronger.`,
      ),
    });
  } else {
    candidates.push({
      topic: "result",
      text: `A ${teamGoals}-${oppGoals} draw with ${opponentName}. Are you satisfied?`,
      options: options(
        `A point is a point. We must be more clinical.`,
        `It was a fair result against a tough opponent.`,
        `We should have won it. The performance gives me belief.`,
      ),
    });
  }

  const star = match.manOfTheMatch && match.manOfTheMatch.teamCode === team.code ? match.manOfTheMatch.name : null;
  if (star) {
    candidates.push({
      topic: "standout",
      text: `${star} was outstanding today. Your thoughts?`,
      options: options(
        `${star} did well, but football is a team game.`,
        `${star} was excellent and deserves the credit.`,
        `${star} is world class and proved it again today.`,
      ),
    });
  }

  candidates.push({
    topic: "next",
    text: `Looking ahead, what does ${team.name} need next?`,
    options: options(
      `We take nothing for granted and keep our feet on the ground.`,
      `We focus on the next game and keep building.`,
      `We are aiming for the very top and nothing less.`,
    ),
  });

  const seed = `post-${fixtureId || team.code}-${stageLabel}`;
  const questions = candidates.slice(0, 3).map((question, index) => attachMeta(question, seed, index));

  return {
    id: `post-${fixtureId || `${team.code}-${Date.now()}`}`,
    type: "post",
    stageLabel,
    fixtureId: fixtureId || null,
    outcome,
    title: `Post-Match Press Conference`,
    subtitle: `${team.name} ${teamGoals}-${oppGoals} ${opponentName} · ${stageLabel}`,
    questions,
  };
}

/* ---------- applying answers ---------- */

function dominantTone(answers) {
  const counts = { defensive: 0, balanced: 0, confident: 0 };
  answers.forEach((tone) => {
    if (counts[tone] != null) counts[tone] += 1;
  });
  return TONES.reduce((best, tone) => (counts[tone] > counts[best] ? tone : best), "balanced");
}

// Applies the chosen answer tones to the media + career, returning the new state, the net
// effect, the media reaction classification, and a short summary.
export function applyConferenceAnswers(media, career, conference, answersByQuestionId) {
  const before = normalizeMedia(media);
  const next = normalizeMedia(media);
  next.previous = { fanConfidence: before.fanConfidence, mediaPressure: before.mediaPressure, boardConfidence: before.boardConfidence };

  const tones = [];
  (conference.questions || []).forEach((question) => {
    const tone = TONES.includes(answersByQuestionId[question.id]) ? answersByQuestionId[question.id] : "balanced";
    tones.push(tone);
    const effect = TONE_EFFECTS[tone];
    next.fanConfidence = clamp(next.fanConfidence + effect.fan, 0, 100);
    next.mediaPressure = clamp(next.mediaPressure + effect.pressure, 0, 100);
    next.boardConfidence = clamp(next.boardConfidence + effect.board, 0, 100);
    next.moraleBoost = clamp(next.moraleBoost + effect.morale, -15, 15);
    next.confidenceBoost = clamp(next.confidenceBoost + effect.confidence, -8, 8);
  });

  next.fanConfidence = Math.round(next.fanConfidence);
  next.mediaPressure = Math.round(next.mediaPressure);
  next.boardConfidence = Math.round(next.boardConfidence);
  next.moraleBoost = Math.round(next.moraleBoost);
  next.confidenceBoost = Number(next.confidenceBoost.toFixed(1));

  const fanDelta = next.fanConfidence - before.fanConfidence;
  const reaction = fanDelta >= 3 ? "positive" : fanDelta <= -3 ? "negative" : "neutral";

  const nextCareer = { ...career };
  nextCareer.pressConferencesHeld = (Number(nextCareer.pressConferencesHeld) || 0) + 1;
  if (reaction === "positive") nextCareer.positiveMediaReactions = (Number(nextCareer.positiveMediaReactions) || 0) + 1;
  if (reaction === "negative") nextCareer.negativeMediaReactions = (Number(nextCareer.negativeMediaReactions) || 0) + 1;

  return {
    media: next,
    career: nextCareer,
    reaction,
    dominantTone: dominantTone(tones),
    effects: {
      fanConfidence: fanDelta,
      mediaPressure: next.mediaPressure - before.mediaPressure,
      boardConfidence: next.boardConfidence - before.boardConfidence,
      moraleBoost: next.moraleBoost - before.moraleBoost,
    },
  };
}

// Builds news headlines from an answered conference.
export function buildConferenceNews(team, conference, result, opponentName) {
  const createdAt = new Date().toISOString();
  const teamRef = { code: team.code, name: team.name, flag: team.flag || null };
  const tone = result.dominantTone;
  const stage = conference.stageLabel || "the next match";
  const news = [];

  if (conference.type === "pre") {
    const headlineByTone = {
      confident: opponentName ? `Manager promises a strong showing against ${opponentName}` : `Manager talks up ${team.name}'s chances`,
      balanced: `Manager stays measured ahead of ${stage}`,
      defensive: `Manager remains cautious ahead of ${stage}`,
    };
    news.push({
      id: `presser-pre-${Date.now()}`,
      type: "press-conference",
      headline: headlineByTone[tone],
      summary: `${team.name}'s manager faced the media before ${stage}, striking a ${tone} tone on the team's prospects.`,
      teams: [teamRef],
      createdAt,
    });
  } else {
    const headlineByTone = {
      confident: `Manager bullish after ${stage}`,
      balanced: `Manager reflects on ${stage}`,
      defensive: `Manager plays down expectations after ${stage}`,
    };
    news.push({
      id: `presser-post-${Date.now()}`,
      type: "press-conference",
      headline: headlineByTone[tone],
      summary: `Speaking after ${stage}, ${team.name}'s manager gave a ${tone} assessment of the performance.`,
      teams: [teamRef],
      createdAt,
    });
  }

  if (result.reaction === "positive") {
    news.push({
      id: `presser-react-pos-${Date.now()}`,
      type: "press-conference",
      headline: `Fans react positively to manager's words`,
      summary: `Supporters of ${team.name} responded warmly to the manager's confident message, lifting fan confidence.`,
      teams: [teamRef],
      createdAt,
    });
  } else if (result.reaction === "negative") {
    news.push({
      id: `presser-react-neg-${Date.now()}`,
      type: "press-conference",
      headline: `Cautious tone leaves ${team.name} fans uneasy`,
      summary: `The manager's guarded comments did little to settle nerves among the ${team.name} support.`,
      teams: [teamRef],
      createdAt,
    });
  }

  return news;
}
