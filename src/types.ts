/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicketkeeper';
  battingStyle: 'Right-hand' | 'Left-hand';
  bowlingStyle: 'Right-arm Fast' | 'Right-arm Spin' | 'Left-arm Fast' | 'Left-arm Spin' | 'None';
  matchesPlayed: number;
  runsScored: number;
  ballsFaced: number;
  wicketsTaken: number;
  ballsBowled: number;
  runsConceded: number;
  highScore: number;
  fifties: number;
  hundreds: number;
}

export interface Team {
  id: string;
  name: string;
  logo: string; // Tailwind color theme or emoji
  captainId?: string;
  viceCaptainId?: string;
  playerIds: string[];
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number; // For tournaments
  nrr: number; // Net Run Rate
}

export interface BatsmanScore {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string; // e.g. "b Bowler", "c Fielder b Bowler", "run out"
  bowlerId?: string;
  fielderName?: string;
}

export interface BowlerScore {
  playerId: string;
  overs: number; // standard over count (e.g. 2.3 overs is stored or calculated)
  ballsBowled: number; // exact count
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wickets: number;
  runs: number;
  over: number;
  batsmanId: string;
}

export interface Partnership {
  batsman1Id: string;
  batsman2Id: string;
  runs: number;
  balls: number;
}

export interface BallDetail {
  overNum: number; // 0-indexed over count
  ballNum: number; // 1-6 within over (unless wide/no-ball)
  bowlerId: string;
  batsmanId: string;
  runs: number; // runs off the bat
  extraRuns: number; // runs from extras
  extraType: 'wide' | 'noBall' | 'bye' | 'legBye' | 'none';
  wicketType: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'none';
  wicketPlayerId?: string;
  fielderName?: string;
  description: string;
}

export interface Innings {
  runs: number;
  wickets: number;
  ballsBowled: number; // Total legal & dynamic balls bowled
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  batsmen: Record<string, BatsmanScore>;
  bowlers: Record<string, BowlerScore>;
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  oversHistory: BallDetail[][]; // Balls grouped by overs
  currentPartnership: {
    batsman1Id: string;
    batsman2Id: string;
    runs: number;
    balls: number;
  };
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  venue: string;
  date: string;
  time: string;
  overs: number; // 5, 10, 20, 50, etc.
  status: 'scheduled' | 'toss' | 'live' | 'completed';
  tossWinnerId?: string;
  tossDecision?: 'bat' | 'bowl';
  inningsA?: Innings; // innings of Team A (could play 1st or 2nd)
  inningsB?: Innings; // innings of Team B
  battingFirstId?: string;
  battingSecondId?: string;
  currentInnings: 1 | 2; // Innings sequence
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  result?: string; // text explaining who won (e.g., "Team A won by 15 runs")
  tournamentId?: string; // if part of a list
}

export interface TournamentFixture {
  matchId: string;
  round: string; // e.g., "Round 1", "Semi-Final", "Final"
}

export interface Tournament {
  id: string;
  name: string;
  format: 'league' | 'knockout';
  teamIds: string[];
  fixtures: TournamentFixture[];
  status: 'upcoming' | 'ongoing' | 'completed';
  winnerTeamId?: string;
}
