const MorningLunchCompetitionNames = [
  'AM Fuel Fest',
  'Morning Munchies Mashup',
  'Brunch Battle Royale',
  'Midday Meal Mania',
  'Daylight Delights',
  'The Sunrise Scramble',
  'Pancake Palooza',
  'Griddle Games',
];

const DinnerCompetitionNames = [
  'The Sunset Supper',
  'Evening Eats Throwdown',
  'After Class Cook-Off',
  'The Sunset Sizzle',
  'Twilight Takedown',
  'Dinner Duel',
  'The Kitchen Kollision',
  'Post-Lecture Plates',
];

const LateNightCompetitionNames = [
  'Late Night Cravez',
  'Late Night Loot',
  'After Hour Eats',
  'The "2 AM" Challenge',
  "The Insomniac's Snack-Off",
  'Midnight Munchies Madness',
  'The Study Grub Games',
  'Nocturnal Nom-Off',
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
