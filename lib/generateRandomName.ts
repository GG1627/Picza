const MorningLunchCompetitionNames = [
  'Daylight Delights',
  'Sunrise Scramble',
  'Pancake Palooza',
  'Griddle Games',
];

const DinnerCompetitionNames = [
  'Sunset Supper',
  'Evening Eats',
  'Sunset Sizzle',
  'Dinner Duel',
  'Kitchen Kollision',
];

const LateNightCompetitionNames = [
  'Night Bites',
  'Late Noms',
  'Moon Meals',
  'Dark Eats',
  'After Hours',
];

export const generateRandomMorningLunchCompetitionName = () => {
  // return a random name from the array
  return MorningLunchCompetitionNames[
    Math.floor(Math.random() * MorningLunchCompetitionNames.length)
  ];
};

export const generateRandomDinnerCompetitionName = () => {
  // return a random name from the array
  return DinnerCompetitionNames[Math.floor(Math.random() * DinnerCompetitionNames.length)];
};

export const generateRandomLateNightCompetitionName = () => {
  // return a random name from the array
  return LateNightCompetitionNames[Math.floor(Math.random() * LateNightCompetitionNames.length)];
};
