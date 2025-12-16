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
  startingScore?: number; // for X01
  legs: number;
  sets: number;
  doubleOut: boolean;
  bestOf?: number; // future: not used now
}

// Backend representation
export type GameStatus = 'pending' | 'in_progress' | 'finished';

// -----------------------
// GAME PLAYER (backend)
// -----------------------

export interface GamePlayer {
  id: string;
  name: string;
  seat: number;
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
// GAME + GAMESTATE (aligned with backend)
// -----------------------

export interface Game {
  id: string;
  createdAt: string;
  status: GameStatus;
  config: GameConfig;
  players: GamePlayer[];
  winnerId?: string | null;   // <-- NEW
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

  matchScore?: MatchScore;
  winnerId?: string | null;   // <-- NEW (same as backend WinnerID)
}

export interface LegScore {
  legNumber: number;
  startingScore: number;
  scoresByPlayer: Record<string, number>; // playerId -> remaining score
  winnerId?: string | null;
  finishedAt?: string;
}

export interface SetScore {
  setNumber: number;
  legsToWin: number;
  legs: LegScore[];
  winnerId?: string | null;
  finishedAt?: string;
}

export interface MatchScore {
  setsToWin: number;
  currentSetIndex: number; // index in sets[]
  currentLegIndex: number; // index in sets[currentSetIndex].legs
  sets: SetScore[];
}
