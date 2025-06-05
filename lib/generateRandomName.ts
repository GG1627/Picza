const breakfastCompetitionNames = [
  `Breakfast Bash`,
  `Breakfast Bonanza`,
  `Pancake Palooza`,
  `Eggstravaganza`,
  `The Sunrise Scramble`,
  `AM Fuel Fest`,
  `First Bite Fiesta`,
  `Waffle Wake-Up`,
  `Morning Munchies Mashup`,
  `Griddle Games`,
];

// const lunchCompetitionNames = []

export const generateRandomBreakfastName = () => {
  // return a random name from the array
  return breakfastCompetitionNames[Math.floor(Math.random() * breakfastCompetitionNames.length)];
};
