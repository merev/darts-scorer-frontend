// -----------------------
// BASIC TYPES
// -----------------------

export type GameMode = 'X01' | 'Cricket' | 'AroundTheWorld';

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  stats?: {
    matchesPlayed: number;
    matchesWon: number;
    averageScore: number;
    bestCheckout?: number;
  } | null;
}

export interface PlayerStatsSummary {
  matchesPlayed: number;
  matchesWon: number;
  averageScore: number;
  bestCheckout?: number;
}

// -----------------------
// GAME CONFIG
// -----------------------

export interface GameConfig {
  mode: GameMode;

  // X01-specific
  startingScore?: number;

  /**
   * legs = legs needed to win a set
   * sets = sets needed to win the match
   *
   * Example:
   *   Best of 5 legs => legs = 3
   *   Best of 5 sets => sets = 3
   */
  legs: number;
  sets: number;

  doubleOut: boolean;
  bestOf?: number; // currently unused
}

// Backend representation
export type GameStatus = 'pending' | 'in_progress' | 'finished';

// -----------------------
// GAME PLAYER (backend)
// -----------------------

export interface GamePlayer {
  id: string;
  name: string;
  seat: number;    // throwing order
}

// -----------------------
// SCORING STRUCTURES
// -----------------------

export interface PlayerScore {
  playerId: string;
  remaining?: number;
  lastVisit?: number;
  lastThreeDarts?: number[];
}

export interface Throw {
  id: string;
  gameId: string;
  playerId: string;
  visitScore: number;
  dartsThrown: number;
  createdAt: string;
}

// -----------------------
// LEGS & SETS
// -----------------------

export interface LegScore {
  legNumber: number;
  startingScore: number;
  scoresByPlayer: Record<string, number>; // playerId -> remaining score
  winnerId?: string | null;
  finishedAt?: string;
}

export interface SetScore {
  setNumber: number;
  legsToWin: number; // equals config.legs
  legs: LegScore[];
  winnerId?: string | null;
  finishedAt?: string;
}

export interface MatchScore {
  setsToWin: number;       // equals config.sets
  currentSetIndex: number; // index in sets[]
  currentLegIndex: number; // index in sets[currentSetIndex].legs
  sets: SetScore[];
}

// -----------------------
// GAME + GAMESTATE (aligned with backend)
// -----------------------

export interface Game {
  id: string;
  createdAt: string;
  status: GameStatus;

  config: GameConfig;
  players: GamePlayer[];

  winnerId?: string | null;  // match winner if finished
}

export interface GameState {
  id: string;
  createdAt: string;
  status: GameStatus;

  config: GameConfig;
  players: GamePlayer[];

  currentPlayerId: string;
  scores: PlayerScore[];
  history: Throw[];

  matchScore?: MatchScore;  // entire legs/sets system
  winnerId?: string | null; // match winner
}
