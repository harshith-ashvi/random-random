export type PrngKind = "math-random" | "crypto-random" | "mulberry32";
export type MovementMode = "jitter" | "persistent";
export type Placement = "random" | "grouped";
export type EntityType = "rock" | "paper" | "scissors";
export type Winner = EntityType | "timeout";

export type Counts = { rock: number; paper: number; scissors: number };

export type PopulationSample = {
  t: number;
  rock: number;
  paper: number;
  scissors: number;
};

export type SimulationRow = {
  id: string;
  client_id: string;
  created_at: string;
  winner: Winner;
  duration_ms: number;
  screen_w: number;
  screen_h: number;
  tick_count: number | null;
  prng: PrngKind;
  seed: number | null;
  movement_mode: MovementMode;
  step_px: number;
  placement: Placement;
  counts: Counts;
  chaos_mode: boolean;
  predicted_winner: EntityType | null;
  min_population_of_winner: number | null;
  chi_square_stat: number | null;
  chi_square_p: number | null;
  ks_stat: number | null;
  ks_p: number | null;
  direction_entropy_bits: number | null;
  draws_total: number | null;
};

export type SimulationSamplesRow = {
  simulation_id: string;
  draws_histogram: number[];
  direction_histogram: number[];
  heatmap: number[];
  population_series: PopulationSample[];
};

export type SimulationInsert = Omit<SimulationRow, "id" | "created_at">;

export type SimulationSamplesInsert = SimulationSamplesRow;

export type Database = {
  public: {
    Tables: {
      simulations: {
        Row: SimulationRow;
        Insert: SimulationInsert;
        Update: Partial<SimulationInsert>;
      };
      simulation_samples: {
        Row: SimulationSamplesRow;
        Insert: SimulationSamplesInsert;
        Update: Partial<SimulationSamplesInsert>;
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          prng: PrngKind;
          winner: Winner;
          runs: number;
          median_duration_ms: number;
          min_duration_ms: number;
          max_duration_ms: number;
        };
      };
    };
  };
};
