import type { ReactNode } from 'react';
import type { Position } from 'models';
import type { ScoredWord } from '../types';

export interface ResultsBoardConfig {
  boardSize: number;
  minWordLength: number;
  timeLimit: number;
}

/** The viewer's own data — always present, regardless of solo vs multi state. */
export interface ResultsViewer {
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
}

/** A row in the standings panel. Drives the solo vs multi UI: roster.length === 1
 *  is the solo state. Must include the viewer. */
export interface ResultsRosterEntry {
  /** Stable identifier — sessionId for free-play challenges, userId for daily. */
  id: string;
  rank: number;
  displayName: string;
  points: number;
  isYou: boolean;
  /** Multiplayer: the player left the room mid-round; their score is a
   *  frozen snapshot. Standings flags them so it's clear they departed
   *  rather than scored zero. Optional/absent for daily and challenge. */
  leftEarly?: boolean;
}

/** A fully-hydrated opponent for the side-by-side compare view. */
export interface ResultsOpponent {
  id: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: { word: string; score: number }[];
}

export type LoadOpponentError =
  | 'unplayed'
  | 'opponent-missing'
  | 'forbidden'
  | 'unknown';

export type LoadOpponentResult =
  | { ok: true; opponent: ResultsOpponent }
  | { ok: false; error: LoadOpponentError };

export interface ResultsBoardHighlight {
  word: string | null;
  path: Position[] | null;
}

export interface ResultsTopbarSlot {
  /** Optional label rendered in the topbar (date chip, mode label, etc.). */
  label?: string;
  onClose: () => void;
  onShare?: () => void;
  shareCopied?: boolean;
  /** Optional click handler for the label chip — opens a picker, etc. */
  onLabelClick?: () => void;
}

export interface ResultsViewSlots {
  /** Custom topbar — when omitted, a default Close/Label/Share bar is rendered. */
  topbar?: ReactNode;
  /** Bottom CTAs — Home/Leaderboard for daily, Play again for free play. */
  bottomActions: ReactNode;
  /** Optional accessory in the solo hero subtitle (e.g. zen mode badge). */
  heroAccessory?: ReactNode;
  /** Optional crown above the solo hero (e.g. zen rank label). */
  heroCrown?: ReactNode;
}
