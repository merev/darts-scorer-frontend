export type GameMode = 'X01' | 'Cricket' | 'AroundTheWorld';

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  createdAt?: string;
  stats?: PlayerStatsSummary;
}

export interface PlayerStatsSummary {
  matchesPlayed: number;
  matchesWon: number;
  averageScore: number; // points per dart or per visit, up to you
  bestCheckout?: number;
}

export interface GameConfig {
  mode: GameMode;
  startingScore?: number; // for X01
  legs: number;
  sets: number;
  doubleOut: boolean;
  bestOf?: number; // future use
}

export type GameStatus = 'pending' | 'in_progress' | 'finished';

export interface Game {
  id: string;
  createdAt: string;
  status: GameStatus;
  players: Player[];
  config: GameConfig;
  currentLeg: number;
  currentSet: number;
}

export interface PlayerScore {
  playerId: string;
  remaining?: number; // for X01
  lastVisit?: number;
  lastThreeDarts?: number[]; // optional
}

export interface Throw {
  id: string;
  gameId: string;
  playerId: string;
  visitScore: number;
  dartsThrown: number;
  createdAt: string;
}

export interface GameState extends Game {
  currentPlayerId: string;
  scores: PlayerScore[];
  history: Throw[];
}