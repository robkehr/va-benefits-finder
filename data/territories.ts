export type Territory = {
  name: string;
  abbreviation: string;
};

// US territories present in the us-atlas TopoJSON. Not ranked (WalletHub covers only the 50 states).
export const territories: Territory[] = [
  { name: "Puerto Rico", abbreviation: "PR" },
  { name: "Guam", abbreviation: "GU" },
  { name: "United States Virgin Islands", abbreviation: "VI" },
  { name: "American Samoa", abbreviation: "AS" },
  { name: "Commonwealth of the Northern Mariana Islands", abbreviation: "MP" }
];

export const territoriesByName = new Map(territories.map((t) => [t.name, t]));
