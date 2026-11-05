export type StateRanking = {
  name: string;
  abbreviation: string;
  rank: number;
  score: number;
};

export const rankingSource = {
  name: "WalletHub: Best & Worst States for Military Retirees",
  url: "https://wallethub.com/edu/best-states-for-military-retirees/3915",
  accessed: "2026-11-05"
} as const;

export const stateRankings: StateRanking[] = [
  { name: "South Carolina", abbreviation: "SC", rank: 1, score: 64.46 },
  { name: "North Dakota", abbreviation: "ND", rank: 2, score: 60.87 },
  { name: "Wyoming", abbreviation: "WY", rank: 3, score: 59.67 },
  { name: "New Hampshire", abbreviation: "NH", rank: 4, score: 59.50 },
  { name: "Maryland", abbreviation: "MD", rank: 5, score: 58.85 },
  { name: "Alaska", abbreviation: "AK", rank: 6, score: 58.59 },
  { name: "Florida", abbreviation: "FL", rank: 7, score: 58.02 },
  { name: "Massachusetts", abbreviation: "MA", rank: 8, score: 57.28 },
  { name: "Minnesota", abbreviation: "MN", rank: 9, score: 56.88 },
  { name: "South Dakota", abbreviation: "SD", rank: 10, score: 56.51 },
  { name: "Virginia", abbreviation: "VA", rank: 11, score: 55.49 },
  { name: "Missouri", abbreviation: "MO", rank: 12, score: 55.12 },
  { name: "Alabama", abbreviation: "AL", rank: 13, score: 55.11 },
  { name: "Maine", abbreviation: "ME", rank: 14, score: 54.38 },
  { name: "North Carolina", abbreviation: "NC", rank: 15, score: 53.61 },
  { name: "Arizona", abbreviation: "AZ", rank: 16, score: 53.01 },
  { name: "West Virginia", abbreviation: "WV", rank: 17, score: 52.81 },
  { name: "Ohio", abbreviation: "OH", rank: 18, score: 52.79 },
  { name: "Louisiana", abbreviation: "LA", rank: 19, score: 52.13 },
  { name: "Texas", abbreviation: "TX", rank: 20, score: 52.00 },
  { name: "Nebraska", abbreviation: "NE", rank: 21, score: 51.41 },
  { name: "Arkansas", abbreviation: "AR", rank: 22, score: 51.41 },
  { name: "Wisconsin", abbreviation: "WI", rank: 23, score: 51.12 },
  { name: "Pennsylvania", abbreviation: "PA", rank: 24, score: 50.81 },
  { name: "Connecticut", abbreviation: "CT", rank: 25, score: 50.22 },
  { name: "Michigan", abbreviation: "MI", rank: 26, score: 49.78 },
  { name: "Iowa", abbreviation: "IA", rank: 27, score: 49.54 },
  { name: "Utah", abbreviation: "UT", rank: 28, score: 49.48 },
  { name: "Hawaii", abbreviation: "HI", rank: 29, score: 49.29 },
  { name: "Illinois", abbreviation: "IL", rank: 30, score: 49.00 },
  { name: "Indiana", abbreviation: "IN", rank: 31, score: 48.33 },
  { name: "Kentucky", abbreviation: "KY", rank: 32, score: 48.27 },
  { name: "Tennessee", abbreviation: "TN", rank: 33, score: 48.10 },
  { name: "Kansas", abbreviation: "KS", rank: 34, score: 47.83 },
  { name: "California", abbreviation: "CA", rank: 35, score: 47.64 },
  { name: "Idaho", abbreviation: "ID", rank: 36, score: 47.30 },
  { name: "Oklahoma", abbreviation: "OK", rank: 37, score: 46.97 },
  { name: "New York", abbreviation: "NY", rank: 38, score: 45.72 },
  { name: "Delaware", abbreviation: "DE", rank: 39, score: 44.95 },
  { name: "Georgia", abbreviation: "GA", rank: 40, score: 44.83 },
  { name: "Rhode Island", abbreviation: "RI", rank: 41, score: 44.80 },
  { name: "New Mexico", abbreviation: "NM", rank: 42, score: 44.44 },
  { name: "Colorado", abbreviation: "CO", rank: 43, score: 44.42 },
  { name: "Nevada", abbreviation: "NV", rank: 44, score: 43.86 },
  { name: "Montana", abbreviation: "MT", rank: 45, score: 43.65 },
  { name: "Mississippi", abbreviation: "MS", rank: 46, score: 42.64 },
  { name: "New Jersey", abbreviation: "NJ", rank: 47, score: 41.23 },
  { name: "Washington", abbreviation: "WA", rank: 48, score: 37.61 },
  { name: "Vermont", abbreviation: "VT", rank: 49, score: 36.64 },
  { name: "Oregon", abbreviation: "OR", rank: 50, score: 35.09 }
];
