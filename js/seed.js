// Initial data for the Bakkabnb proof of concept.
// Mirrors the "Concept & Setup" issue. No sensitive information is stored here.

export const DEFAULT_PASSWORD = "Fisk";

export function buildSeed() {
  const people = [
    { id: "p_margot", name: "Margot", emoji: "👵" },
    { id: "p_miriam", name: "Miriam", emoji: "👩" },
    { id: "p_sissi", name: "Sissi", emoji: "👧" },
    { id: "p_janpeder", name: "Jan Peder", emoji: "🧔" },
  ];

  // Each person gets a simple account with the default password.
  const accounts = people.map((p) => ({ name: p.name, password: DEFAULT_PASSWORD }));

  const buildings = [
    {
      id: "b_van",
      name: "Våningshus",
      emoji: "🏡",
      beds: [
        { id: "v_d1", type: "double", status: "available", label: "Double 1" },
        { id: "v_d2", type: "double", status: "available", label: "Double 2" },
        { id: "v_s1", type: "single", status: "available", label: "Single 1" },
        { id: "v_s2", type: "single", status: "out_of_commission", label: "Single 2" },
        { id: "v_s3", type: "single", status: "out_of_commission", label: "Single 3" },
      ],
    },
    {
      id: "b_lave",
      name: "Låve",
      emoji: "🛖",
      beds: [
        { id: "l_s1", type: "single", status: "available", label: "Single 1" },
        { id: "l_s2", type: "single", status: "available", label: "Single 2" },
        { id: "l_s3", type: "single", status: "available", label: "Single 3" },
        { id: "l_s4", type: "single", status: "available", label: "Single 4" },
      ],
    },
    {
      id: "b_nord",
      name: "Nordrenaust",
      emoji: "⚓",
      beds: [
        { id: "n_d1", type: "double", status: "available", label: "Double 1" },
        { id: "n_d2", type: "double", status: "available", label: "Double 2" },
        { id: "n_s1", type: "single", status: "available", label: "Single 1" },
        { id: "n_s2", type: "single", status: "available", label: "Single 2" },
        { id: "n_s3", type: "single", status: "available", label: "Single 3" },
        { id: "n_s4", type: "single", status: "available", label: "Single 4" },
      ],
    },
    {
      id: "b_sond",
      name: "Søndrenaust",
      emoji: "⛵",
      beds: [
        { id: "s_d1", type: "double", status: "available", label: "Double 1" },
        { id: "s_d2", type: "double", status: "available", label: "Double 2" },
        { id: "s_s1", type: "single", status: "available", label: "Single 1" },
        { id: "s_s2", type: "single", status: "available", label: "Single 2" },
        { id: "s_s3", type: "single", status: "available", label: "Single 3" },
        { id: "s_s4", type: "single", status: "available", label: "Single 4" },
      ],
    },
  ];

  // Margot is already staying in a single bed in Våningshus.
  const bookings = [
    {
      id: "bk_margot_seed",
      bedId: "v_s1",
      name: "Margot",
      startDate: "2026-06-01",
      endDate: "2026-12-31",
    },
  ];

  const events = [];
  const meals = [];

  return { people, accounts, buildings, bookings, events, meals };
}
