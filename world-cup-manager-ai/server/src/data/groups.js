import { groupOrder, teams } from "./teams.js";
import { enrichFixtureAtmosphere } from "./atmosphere.js";

const MATCHDAYS = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

export const groups = groupOrder.reduce((collection, groupName) => {
  const teamCodes = teams.filter((team) => team.group === groupName).map((team) => team.code);
  return {
    ...collection,
    [groupName]: teamCodes,
  };
}, {});

export function createGroupFixtures() {
  return groupOrder.flatMap((groupName) => {
    const teamCodes = groups[groupName];

    return MATCHDAYS.flatMap((matchday, matchdayIndex) =>
      matchday.map(([homeIndex, awayIndex], fixtureIndex) =>
        enrichFixtureAtmosphere({
          id: `${groupName}-MD${matchdayIndex + 1}-${fixtureIndex + 1}`,
          stage: "group",
          group: groupName,
          matchday: matchdayIndex + 1,
          globalMatchday: matchdayIndex + 1,
          homeTeamCode: teamCodes[homeIndex],
          awayTeamCode: teamCodes[awayIndex],
        }),
      ),
    );
  });
}

function createPlaceholderMatches(prefix, count, previousPrefix) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    homeSeed: `Winner ${previousPrefix}-${index * 2 + 1}`,
    awaySeed: `Winner ${previousPrefix}-${index * 2 + 2}`,
    status: "locked",
  }));
}

export const fixtures = createGroupFixtures();

export const knockoutTemplate = {
  roundOf32: Array.from({ length: 16 }, (_, index) => ({
    id: `R32-${index + 1}`,
    homeSeed: `Qualifier ${index + 1}`,
    awaySeed: `Qualifier ${32 - index}`,
    status: "locked",
  })),
  roundOf16: createPlaceholderMatches("R16", 8, "R32"),
  quarterFinal: createPlaceholderMatches("QF", 4, "R16"),
  semiFinal: createPlaceholderMatches("SF", 2, "QF"),
  final: [{ id: "F-1", homeSeed: "Winner SF-1", awaySeed: "Winner SF-2", status: "locked" }],
};
