import { pgTable, text, integer, real, timestamp, serial } from "drizzle-orm/pg-core";

// Define the 'users' table linking to Firebase Auth UID
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define 'players' table
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name"),
  role: text("role"),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  matchesPlayed: integer("matches_played").default(0),
  runsScored: integer("runs_scored").default(0),
  ballsFaced: integer("balls_faced").default(0),
  wicketsTaken: integer("wickets_taken").default(0),
  runsConceded: integer("runs_conceded").default(0),
  ballsBowled: integer("balls_bowled").default(0),
  highScore: integer("high_score").default(0),
  fifties: integer("fifties").default(0),
  hundreds: integer("hundreds").default(0),
});

// Define 'teams' table
export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name"),
  logo: text("logo"),
  playerIds: text("player_ids"), // JSON representation of player IDs
  captainId: text("captain_id"),
  viceCaptainId: text("vice_captain_id"),
  played: integer("played").default(0),
  won: integer("won").default(0),
  lost: integer("lost").default(0),
  tied: integer("tied").default(0),
  points: integer("points").default(0),
  nrr: real("nrr").default(0.0),
});

// Define 'matches' table
export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  teamAId: text("team_a_id"),
  teamBId: text("team_b_id"),
  venue: text("venue"),
  date: text("date"),
  time: text("time"),
  overs: integer("overs"),
  status: text("status"),
  tossWinnerId: text("toss_winner_id"),
  tossDecision: text("toss_decision"),
  inningsA: text("innings_a"), // JSON representation of batting stats
  inningsB: text("innings_b"), // JSON representation of bowling stats
  battingFirstId: text("batting_first_id"),
  battingSecondId: text("batting_second_id"),
  currentInnings: integer("current_innings"),
  strikerId: text("striker_id"),
  nonStrikerId: text("non_striker_id"),
  currentBowlerId: text("current_bowler_id"),
  result: text("result"),
  tournamentId: text("tournament_id"),
});

// Define 'tournaments' table
export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name"),
  format: text("format"),
  teamIds: text("team_ids"), // JSON representation of tournament teams
  fixtures: text("fixtures"), // JSON representation of matches and fixtures
  status: text("status"),
});

// Define 'settings' table (highly useful for user profile caching/auth etc)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
