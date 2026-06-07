import { teams } from "./teams.js";

export const stadiums = [
  { stadiumName: "MetLife Stadium", city: "New York", country: "USA", capacity: 82500 },
  { stadiumName: "AT&T Stadium", city: "Dallas", country: "USA", capacity: 90000 },
  { stadiumName: "SoFi Stadium", city: "Los Angeles", country: "USA", capacity: 70000 },
  { stadiumName: "Estadio Azteca", city: "Mexico City", country: "Mexico", capacity: 87523 },
  { stadiumName: "BMO Field", city: "Toronto", country: "Canada", capacity: 45000 },
  { stadiumName: "BC Place", city: "Vancouver", country: "Canada", capacity: 54500 },
  { stadiumName: "Lumen Field", city: "Seattle", country: "USA", capacity: 69000 },
  { stadiumName: "Levi's Stadium", city: "Santa Clara", country: "USA", capacity: 68500 },
  { stadiumName: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", capacity: 71000 },
  { stadiumName: "NRG Stadium", city: "Houston", country: "USA", capacity: 72220 },
  { stadiumName: "Hard Rock Stadium", city: "Miami", country: "USA", capacity: 65326 },
  { stadiumName: "Gillette Stadium", city: "Boston", country: "USA", capacity: 65878 },
  { stadiumName: "Lincoln Financial Field", city: "Philadelphia", country: "USA", capacity: 67594 },
  { stadiumName: "Arrowhead Stadium", city: "Kansas City", country: "USA", capacity: 76416 },
];

export const referees = [
  { name: "Michael Oliver", country: "England" },
  { name: "Anthony Taylor", country: "England" },
  { name: "Daniele Orsato", country: "Italy" },
  { name: "Clement Turpin", country: "France" },
  { name: "Szymon Marciniak", country: "Poland" },
  { name: "Istvan Kovacs", country: "Romania" },
  { name: "Danny Makkelie", country: "Netherlands" },
  { name: "Antonio Mateu Lahoz", country: "Spain" },
  { name: "Wilton Sampaio", country: "Brazil" },
  { name: "Facundo Tello", country: "Argentina" },
  { name: "Cesar Ramos", country: "Mexico" },
  { name: "Ismail Elfath", country: "USA" },
];

const WEATHER_BY_CITY = {
  "Los Angeles": ["Sunny", "Cloudy", "Hot", "Windy"],
  "Mexico City": ["Sunny", "Cloudy", "Rain", "Hot"],
  Toronto: ["Cloudy", "Rain", "Cold", "Sunny"],
  Vancouver: ["Cloudy", "Rain", "Cold", "Windy"],
  Seattle: ["Cloudy", "Rain", "Windy", "Cold"],
  Dallas: ["Sunny", "Hot", "Windy", "Cloudy"],
  Houston: ["Hot", "Rain", "Cloudy", "Sunny"],
  Miami: ["Hot", "Rain", "Sunny", "Windy"],
  Boston: ["Cloudy", "Rain", "Cold", "Sunny"],
};

const TEMPERATURE_RANGES = {
  Sunny: [21, 30],
  Cloudy: [15, 24],
  Rain: [13, 22],
  Windy: [12, 24],
  Hot: [30, 37],
  Cold: [2, 11],
};

const POPULARITY_BOOST = {
  ARG: 16,
  BRA: 16,
  ENG: 14,
  FRA: 14,
  GER: 14,
  MEX: 14,
  POR: 13,
  ESP: 13,
  USA: 12,
  CAN: 9,
  NED: 9,
  URU: 8,
  TUR: 8,
  JPN: 7,
  KOR: 7,
  MAR: 7,
};

const STAGE_IMPORTANCE = {
  group: 0.58,
  roundOf32: 0.68,
  roundOf16: 0.74,
  quarterFinal: 0.84,
  semiFinal: 0.91,
  thirdPlace: 0.78,
  final: 0.985,
};

function hashString(input) {
  let hash = 1779033703 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function randomUnit(seed) {
  return (hashString(seed) % 10000) / 10000;
}

function pick(list, seed) {
  return list[hashString(seed) % list.length];
}

function teamPopularity(teamCode) {
  const team = teams.find((item) => item.code === teamCode);
  if (!team) return 3;
  return Math.max(3, (team.overall - 70) * 0.7 + (POPULARITY_BOOST[team.code] || 0));
}

function stageImportance(stage) {
  return STAGE_IMPORTANCE[stage] ?? 0.64;
}

function chooseStadium(fixture) {
  if (fixture.stage === "final") return stadiums[0];
  if (fixture.stage === "semiFinal") return pick([stadiums[1], stadiums[2]], fixture.id);
  if (fixture.stage === "quarterFinal") return pick([stadiums[1], stadiums[2], stadiums[3], stadiums[10]], fixture.id);
  if (fixture.stage === "thirdPlace") return stadiums[10];
  return stadiums[hashString(`${fixture.id}-${fixture.stage || "group"}`) % stadiums.length];
}

function generateWeather(fixture, stadium) {
  const options = WEATHER_BY_CITY[stadium.city] || ["Sunny", "Cloudy", "Rain", "Windy", "Hot", "Cold"];
  const condition = pick(options, `${fixture.id}-weather`);
  const [min, max] = TEMPERATURE_RANGES[condition];
  const temperatureC = Math.round(min + randomUnit(`${fixture.id}-temperature`) * (max - min));
  return {
    condition,
    temperatureC,
    label: `${condition} ${temperatureC}\u00b0C`,
  };
}

function generateAttendance(fixture, stadium) {
  const importance = stageImportance(fixture.stage);
  const popularity = (teamPopularity(fixture.homeTeamCode) + teamPopularity(fixture.awayTeamCode)) / 2;
  const hostLift = ["USA", "CAN", "MEX"].includes(fixture.homeTeamCode) || ["USA", "CAN", "MEX"].includes(fixture.awayTeamCode) ? 0.045 : 0;
  const variance = (randomUnit(`${fixture.id}-attendance`) - 0.5) * 0.07;
  const fillRate = Math.max(0.52, Math.min(0.995, importance + popularity / 120 + hostLift + variance));
  return Math.round(stadium.capacity * fillRate);
}

export function enrichFixtureAtmosphere(fixture) {
  const stadium = chooseStadium(fixture);
  const weather = generateWeather(fixture, stadium);
  const referee = pick(referees, `${fixture.id}-referee`);
  const attendance = generateAttendance(fixture, stadium);

  return {
    ...fixture,
    stadiumName: stadium.stadiumName,
    venue: stadium.stadiumName,
    city: stadium.city,
    country: stadium.country,
    capacity: stadium.capacity,
    attendance,
    weather,
    referee,
  };
}

export function weatherSimulationModifier(weather) {
  const condition = typeof weather === "string" ? weather : weather?.condition;
  if (condition === "Rain") return { powerDelta: -0.06, ratingDelta: -0.08, staminaDelta: 0 };
  if (condition === "Hot") return { powerDelta: -0.04, ratingDelta: -0.03, staminaDelta: -3 };
  if (condition === "Windy") return { powerDelta: -0.08, ratingDelta: -0.03, staminaDelta: 0 };
  if (condition === "Cold") return { powerDelta: -0.03, ratingDelta: -0.02, staminaDelta: -1 };
  return { powerDelta: 0, ratingDelta: 0, staminaDelta: 0 };
}
