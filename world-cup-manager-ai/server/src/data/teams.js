const ROLE_PLAN = [
  "GK",
  "GK",
  "GK",
  "RB",
  "CB",
  "CB",
  "LB",
  "CB",
  "RB",
  "LB",
  "DM",
  "CM",
  "CM",
  "AM",
  "CM",
  "DM",
  "LW",
  "RW",
  "ST",
  "ST",
  "LW",
  "RW",
  "AM",
  "CB",
  "CM",
];

const POSITION_PROFILES = {
  GK: { pace: -16, shooting: -30, passing: -4, defending: 12, physical: 8 },
  RB: { pace: 8, shooting: -12, passing: 2, defending: 8, physical: 5 },
  LB: { pace: 8, shooting: -12, passing: 2, defending: 8, physical: 5 },
  CB: { pace: -4, shooting: -18, passing: -2, defending: 16, physical: 14 },
  DM: { pace: 0, shooting: -8, passing: 8, defending: 12, physical: 10 },
  CM: { pace: 1, shooting: 1, passing: 12, defending: 3, physical: 4 },
  AM: { pace: 5, shooting: 9, passing: 13, defending: -8, physical: -2 },
  LW: { pace: 14, shooting: 8, passing: 6, defending: -10, physical: -2 },
  RW: { pace: 14, shooting: 8, passing: 6, defending: -10, physical: -2 },
  ST: { pace: 8, shooting: 16, passing: -1, defending: -14, physical: 8 },
};

const NAME_POOLS = {
  default: {
    first: [
      "Adrian",
      "Amir",
      "Anton",
      "Bruno",
      "Cairo",
      "Dario",
      "Elias",
      "Emil",
      "Enzo",
      "Felix",
      "Ilyas",
      "Jonas",
      "Kaito",
      "Leo",
      "Luca",
      "Mateo",
      "Milan",
      "Nico",
      "Omar",
      "Rafael",
      "Ren",
      "Santi",
      "Tomas",
      "Youssef",
    ],
    last: [
      "Alder",
      "Barros",
      "Bennett",
      "Costa",
      "Demir",
      "Farias",
      "Haddad",
      "Ito",
      "Keller",
      "Lima",
      "Mendes",
      "Moreau",
      "Nakamura",
      "Novak",
      "Pereira",
      "Rahimi",
      "Reyes",
      "Rojas",
      "Santos",
      "Silva",
      "Stone",
      "Tanaka",
      "Vega",
      "Ward",
    ],
  },
  Turkey: {
    first: ["Emir", "Kerem", "Arda", "Mert", "Cenk", "Ozan", "Taylan", "Baran"],
    last: ["Demir", "Yilmaz", "Kaya", "Aydin", "Celik", "Arslan", "Koc", "Eren"],
  },
  Brazil: {
    first: ["Rafael", "Lucas", "Mateo", "Caio", "Bruno", "Thiago", "Andre", "Joao"],
    last: ["Silva", "Costa", "Rocha", "Moura", "Lima", "Santos", "Pereira", "Nunes"],
  },
  Argentina: {
    first: ["Tomas", "Nico", "Mateo", "Lautaro", "Bruno", "Emiliano", "Santi", "Diego"],
    last: ["Romero", "Acosta", "Vega", "Molina", "Ibarra", "Sosa", "Farias", "Rojas"],
  },
  France: {
    first: ["Theo", "Hugo", "Lucas", "Noah", "Jules", "Adrien", "Maxime", "Enzo"],
    last: ["Moreau", "Laurent", "Garnier", "Roux", "Blanc", "Mercier", "Faure", "Colin"],
  },
  England: {
    first: ["Oliver", "Harry", "Jude", "Mason", "Declan", "Callum", "Elliot", "Reece"],
    last: ["Stone", "Walker", "Bennett", "Hughes", "Foster", "Palmer", "Bailey", "Ward"],
  },
  Japan: {
    first: ["Ren", "Sota", "Daichi", "Haruto", "Kaito", "Yuto", "Riku", "Takumi"],
    last: ["Tanaka", "Ito", "Sato", "Kobayashi", "Nakamura", "Yamamoto", "Mori", "Hayashi"],
  },
};

const STYLE_PROFILES = {
  possession: {
    style: "positional possession",
    strengths: ["midfield control", "press resistance", "territorial pressure"],
    weaknesses: ["direct balls in behind", "aerial defensive stress"],
  },
  vertical: {
    style: "athletic vertical attacks",
    strengths: ["pace in transition", "box arrivals", "direct chance creation"],
    weaknesses: ["space between lines", "stamina cost under pressure"],
  },
  pressing: {
    style: "dynamic pressing",
    strengths: ["pressing triggers", "counter attacks", "wide pressure"],
    weaknesses: ["fouls in midfield", "space behind fullbacks"],
  },
  compact: {
    style: "compact counter attack",
    strengths: ["defensive block", "direct counters", "central duels"],
    weaknesses: ["sustained possession", "chance volume"],
  },
  balanced: {
    style: "balanced tournament football",
    strengths: ["game management", "set-piece delivery", "shape discipline"],
    weaknesses: ["tempo drops", "creative depth"],
  },
};

const TEAM_CONFIGS = [
  ["A", "MEX", "Mexico", "CONCACAF", 80, "pressing", "mexico"],
  ["A", "RSA", "South Africa", "CAF", 74, "vertical", "south-africa"],
  ["A", "KOR", "South Korea", "AFC", 79, "pressing", "south-korea"],
  ["A", "CZE", "Czechia", "UEFA", 78, "balanced", "czechia"],
  ["B", "CAN", "Canada", "CONCACAF", 78, "vertical", "canada"],
  ["B", "BIH", "Bosnia and Herzegovina", "UEFA", 76, "balanced", "bosnia-and-herzegovina"],
  ["B", "QAT", "Qatar", "AFC", 73, "compact", "qatar"],
  ["B", "SUI", "Switzerland", "UEFA", 81, "balanced", "switzerland"],
  ["C", "BRA", "Brazil", "CONMEBOL", 88, "possession", "brazil"],
  ["C", "MAR", "Morocco", "CAF", 81, "compact", "morocco"],
  ["C", "HAI", "Haiti", "CONCACAF", 70, "vertical", "haiti"],
  ["C", "SCO", "Scotland", "UEFA", 77, "pressing", "scotland"],
  ["D", "USA", "United States", "CONCACAF", 79, "pressing", "united-states"],
  ["D", "PAR", "Paraguay", "CONMEBOL", 77, "compact", "paraguay"],
  ["D", "AUS", "Australia", "AFC", 76, "balanced", "australia"],
  ["D", "TUR", "Turkey", "UEFA", 80, "pressing", "turkey"],
  ["E", "GER", "Germany", "UEFA", 85, "vertical", "germany"],
  ["E", "CUW", "Curaçao", "CONCACAF", 71, "compact", "curacao"],
  ["E", "CIV", "Ivory Coast", "CAF", 79, "vertical", "ivory-coast"],
  ["E", "ECU", "Ecuador", "CONMEBOL", 79, "pressing", "ecuador"],
  ["F", "NED", "Netherlands", "UEFA", 85, "possession", "netherlands"],
  ["F", "JPN", "Japan", "AFC", 79, "pressing", "japan"],
  ["F", "SWE", "Sweden", "UEFA", 80, "balanced", "sweden"],
  ["F", "TUN", "Tunisia", "CAF", 76, "compact", "tunisia"],
  ["G", "BEL", "Belgium", "UEFA", 84, "possession", "belgium"],
  ["G", "EGY", "Egypt", "CAF", 78, "vertical", "egypt"],
  ["G", "IRN", "Iran", "AFC", 77, "compact", "iran"],
  ["G", "NZL", "New Zealand", "OFC", 70, "balanced", "new-zealand"],
  ["H", "ESP", "Spain", "UEFA", 87, "possession", "spain"],
  ["H", "CPV", "Cape Verde", "CAF", 73, "pressing", "cape-verde"],
  ["H", "KSA", "Saudi Arabia", "AFC", 75, "vertical", "saudi-arabia"],
  ["H", "URU", "Uruguay", "CONMEBOL", 82, "compact", "uruguay"],
  ["I", "FRA", "France", "UEFA", 89, "vertical", "france"],
  ["I", "SEN", "Senegal", "CAF", 80, "vertical", "senegal"],
  ["I", "IRQ", "Iraq", "AFC", 73, "compact", "iraq"],
  ["I", "NOR", "Norway", "UEFA", 82, "balanced", "norway"],
  ["J", "ARG", "Argentina", "CONMEBOL", 88, "possession", "argentina"],
  ["J", "ALG", "Algeria", "CAF", 78, "pressing", "algeria"],
  ["J", "AUT", "Austria", "UEFA", 81, "pressing", "austria"],
  ["J", "JOR", "Jordan", "AFC", 72, "compact", "jordan"],
  ["K", "POR", "Portugal", "UEFA", 86, "possession", "portugal"],
  ["K", "COD", "DR Congo", "CAF", 75, "vertical", "dr-congo"],
  ["K", "UZB", "Uzbekistan", "AFC", 74, "balanced", "uzbekistan"],
  ["K", "COL", "Colombia", "CONMEBOL", 82, "vertical", "colombia"],
  ["L", "ENG", "England", "UEFA", 86, "balanced", "england"],
  ["L", "CRO", "Croatia", "UEFA", 82, "possession", "croatia"],
  ["L", "GHA", "Ghana", "CAF", 77, "vertical", "ghana"],
  ["L", "PAN", "Panama", "CONCACAF", 72, "compact", "panama"],
];

const GROUP_ORDER = "ABCDEFGHIJKL".split("");

function clamp(value, min = 1, max = 99) {
  return Math.max(min, Math.min(max, value));
}

function hashValue(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function signedNoise(seed, spread = 7) {
  return (hashValue(seed) % (spread * 2 + 1)) - spread;
}

function getNamePool(country) {
  return NAME_POOLS[country] || NAME_POOLS.default;
}

function makeClubs(country) {
  const compactName = country.replace(/\s+/g, " ");
  return [
    `${compactName} Capital`,
    `${compactName} United`,
    `${compactName} Athletic`,
    `${compactName} City`,
  ];
}

function makeProfile([group, code, name, region, overall, styleKey, flagSlug]) {
  const style = STYLE_PROFILES[styleKey] || STYLE_PROFILES.balanced;
  const seed = `${code}-${name}`;

  return {
    code,
    name,
    group,
    region,
    confederation: region,
    flag: `/flags/${flagSlug}.svg`,
    overall,
    morale: clamp(overall + signedNoise(`${seed}-morale`, 6), 68, 91),
    form: clamp(overall + signedNoise(`${seed}-form`, 6), 66, 91),
    style: style.style,
    strengths: style.strengths,
    weaknesses: style.weaknesses,
    clubs: makeClubs(name),
  };
}

function makePlayer(profile, position, index) {
  const names = getNamePool(profile.name);
  const first = names.first[(index + hashValue(profile.code)) % names.first.length];
  const last = names.last[(index * 3 + profile.code.length + hashValue(profile.name)) % names.last.length];
  const positionProfile = POSITION_PROFILES[position];
  const playerSeed = `${profile.code}-${position}-${index}`;
  const base = profile.overall + signedNoise(playerSeed, 6);
  const age = 19 + (hashValue(`${playerSeed}-age`) % 15);
  const form = clamp(profile.form + signedNoise(`${playerSeed}-form`, 8), 55, 95);
  const morale = clamp(profile.morale + signedNoise(`${playerSeed}-morale`, 7), 55, 96);
  const stamina = clamp(78 + signedNoise(`${playerSeed}-stamina`, 12), 55, 96);

  return {
    name: `${first} ${last}`,
    age,
    nationality: profile.name,
    position,
    club: profile.clubs[index % profile.clubs.length],
    overall: clamp(base, 58, 95),
    pace: clamp(base + positionProfile.pace + signedNoise(`${playerSeed}-pace`, 5), 35, 96),
    shooting: clamp(base + positionProfile.shooting + signedNoise(`${playerSeed}-shooting`, 5), 25, 96),
    passing: clamp(base + positionProfile.passing + signedNoise(`${playerSeed}-passing`, 5), 35, 96),
    defending: clamp(base + positionProfile.defending + signedNoise(`${playerSeed}-defending`, 5), 25, 96),
    physical: clamp(base + positionProfile.physical + signedNoise(`${playerSeed}-physical`, 5), 35, 96),
    form,
    morale,
    stamina,
  };
}

function buildTeam(profile) {
  const players = ROLE_PLAN.map((position, index) => makePlayer(profile, position, index));

  return {
    code: profile.code,
    name: profile.name,
    group: profile.group,
    region: profile.region,
    confederation: profile.confederation,
    flag: profile.flag,
    overall: profile.overall,
    morale: profile.morale,
    form: profile.form,
    style: profile.style,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    players,
  };
}

export const groupOrder = GROUP_ORDER;
export const teamProfiles = TEAM_CONFIGS.map(makeProfile);
export const teams = teamProfiles.map(buildTeam);

export function findTeamByCode(code) {
  return teams.find((team) => team.code === code);
}
