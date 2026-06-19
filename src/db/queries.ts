import { db } from "./index.ts";
import { users, players, teams, matches, tournaments, settings } from "./schema.ts";
import { eq, and } from "drizzle-orm";

// Synchronize / create user on login
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to synchronize user profiles.", { cause: error });
  }
}

// Bulk fetch of all database entities for quick local SQLite hydration
export async function fetchFullSyncPayload() {
  try {
    const allPlayers = await db.select().from(players);
    const allTeams = await db.select().from(teams);
    const allMatches = await db.select().from(matches);
    const allTournaments = await db.select().from(tournaments);
    const allSettings = await db.select().from(settings);
    const allUsers = await db.select().from(users);

    return {
      players: allPlayers,
      teams: allTeams,
      matches: allMatches,
      tournaments: allTournaments,
      settings: allSettings,
      users: allUsers,
    };
  } catch (error) {
    console.error("Error fetching full sync payload:", error);
    throw new Error("Failed to retrieve cloud synchronized tables.", { cause: error });
  }
}

// Add/Save Single Player
export async function insertPlayer(playerData: any) {
  try {
    return await db.insert(players)
      .values({
        id: playerData.id,
        name: playerData.name,
        role: playerData.role,
        battingStyle: playerData.battingStyle,
        bowlingStyle: playerData.bowlingStyle,
        matchesPlayed: playerData.matchesPlayed || 0,
        runsScored: playerData.runsScored || 0,
        ballsFaced: playerData.ballsFaced || 0,
        wicketsTaken: playerData.wicketsTaken || 0,
        runsConceded: playerData.runsConceded || 0,
        ballsBowled: playerData.ballsBowled || 0,
        highScore: playerData.highScore || 0,
        fifties: playerData.fifties || 0,
        hundreds: playerData.hundreds || 0,
      })
      .onConflictDoUpdate({
        target: players.id,
        set: {
          name: playerData.name,
          role: playerData.role,
          battingStyle: playerData.battingStyle,
          bowlingStyle: playerData.bowlingStyle,
          matchesPlayed: playerData.matchesPlayed || 0,
          runsScored: playerData.runsScored || 0,
          ballsFaced: playerData.ballsFaced || 0,
          wicketsTaken: playerData.wicketsTaken || 0,
          runsConceded: playerData.runsConceded || 0,
          ballsBowled: playerData.ballsBowled || 0,
          highScore: playerData.highScore || 0,
          fifties: playerData.fifties || 0,
          hundreds: playerData.hundreds || 0,
        }
      })
      .returning();
  } catch (error) {
    console.error("Error saving player:", error);
    throw new Error("Failed to persist player in cloud.", { cause: error });
  }
}

// Bulk Save Players
export async function saveBulkPlayers(playersList: any[]) {
  try {
    for (const p of playersList) {
      await insertPlayer(p);
    }
    return { status: "success" };
  } catch (error) {
    console.error("Error bulk saving players:", error);
    throw new Error("Failed to persist bulk players to cloud.", { cause: error });
  }
}

// Add/Save Single Team
export async function insertTeam(teamData: any) {
  try {
    return await db.insert(teams)
      .values({
        id: teamData.id,
        name: teamData.name,
        logo: teamData.logo,
        playerIds: Array.isArray(teamData.playerIds) ? JSON.stringify(teamData.playerIds) : teamData.playerIds,
        captainId: teamData.captainId || null,
        viceCaptainId: teamData.viceCaptainId || null,
        played: teamData.played || 0,
        won: teamData.won || 0,
        lost: teamData.lost || 0,
        tied: teamData.tied || 0,
        points: teamData.points || 0,
        nrr: parseFloat(teamData.nrr || 0.0),
      })
      .onConflictDoUpdate({
        target: teams.id,
        set: {
          name: teamData.name,
          logo: teamData.logo,
          playerIds: Array.isArray(teamData.playerIds) ? JSON.stringify(teamData.playerIds) : teamData.playerIds,
          captainId: teamData.captainId || null,
          viceCaptainId: teamData.viceCaptainId || null,
          played: teamData.played || 0,
          won: teamData.won || 0,
          lost: teamData.lost || 0,
          tied: teamData.tied || 0,
          points: teamData.points || 0,
          nrr: parseFloat(teamData.nrr || 0.0),
        }
      })
      .returning();
  } catch (error) {
    console.error("Error saving team:", error);
    throw new Error("Failed to persist team in cloud.", { cause: error });
  }
}

// Bulk Save Teams
export async function saveBulkTeams(teamsList: any[]) {
  try {
    for (const t of teamsList) {
      await insertTeam(t);
    }
    return { status: "success" };
  } catch (error) {
    console.error("Error bulk saving teams:", error);
    throw new Error("Failed to persist bulk teams to cloud.", { cause: error });
  }
}

// Add/Save Single Match
export async function insertMatch(matchData: any) {
  try {
    return await db.insert(matches)
      .values({
        id: matchData.id,
        teamAId: matchData.teamAId,
        teamBId: matchData.teamBId,
        venue: matchData.venue,
        date: matchData.date,
        time: matchData.time,
        overs: matchData.overs,
        status: matchData.status,
        tossWinnerId: matchData.tossWinnerId || null,
        tossDecision: matchData.tossDecision || null,
        inningsA: matchData.inningsA ? (typeof matchData.inningsA === "string" ? matchData.inningsA : JSON.stringify(matchData.inningsA)) : null,
        inningsB: matchData.inningsB ? (typeof matchData.inningsB === "string" ? matchData.inningsB : JSON.stringify(matchData.inningsB)) : null,
        battingFirstId: matchData.battingFirstId || null,
        battingSecondId: matchData.battingSecondId || null,
        currentInnings: matchData.currentInnings || 1,
        strikerId: matchData.strikerId || null,
        nonStrikerId: matchData.nonStrikerId || null,
        currentBowlerId: matchData.currentBowlerId || null,
        result: matchData.result || null,
        tournamentId: matchData.tournamentId || null,
      })
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          teamAId: matchData.teamAId,
          teamBId: matchData.teamBId,
          venue: matchData.venue,
          date: matchData.date,
          time: matchData.time,
          overs: matchData.overs,
          status: matchData.status,
          tossWinnerId: matchData.tossWinnerId || null,
          tossDecision: matchData.tossDecision || null,
          inningsA: matchData.inningsA ? (typeof matchData.inningsA === "string" ? matchData.inningsA : JSON.stringify(matchData.inningsA)) : null,
          inningsB: matchData.inningsB ? (typeof matchData.inningsB === "string" ? matchData.inningsB : JSON.stringify(matchData.inningsB)) : null,
          battingFirstId: matchData.battingFirstId || null,
          battingSecondId: matchData.battingSecondId || null,
          currentInnings: matchData.currentInnings || 1,
          strikerId: matchData.strikerId || null,
          nonStrikerId: matchData.nonStrikerId || null,
          currentBowlerId: matchData.currentBowlerId || null,
          result: matchData.result || null,
          tournamentId: matchData.tournamentId || null,
        }
      })
      .returning();
  } catch (error) {
    console.error("Error saving match:", error);
    throw new Error("Failed to persist match updates in cloud.", { cause: error });
  }
}

// Bulk Save Matches
export async function saveBulkMatches(matchesList: any[]) {
  try {
    for (const m of matchesList) {
      await insertMatch(m);
    }
    return { status: "success" };
  } catch (error) {
    console.error("Error bulk saving matches:", error);
    throw new Error("Failed to persist bulk matches to cloud.", { cause: error });
  }
}

// Save Tournament (Inserts tournament entry)
export async function insertTournament(tournamentData: any) {
  try {
    return await db.insert(tournaments)
      .values({
        id: tournamentData.id,
        name: tournamentData.name,
        format: tournamentData.format,
        teamIds: Array.isArray(tournamentData.teamIds) ? JSON.stringify(tournamentData.teamIds) : tournamentData.teamIds,
        fixtures: Array.isArray(tournamentData.fixtures) ? JSON.stringify(tournamentData.fixtures) : tournamentData.fixtures,
        status: tournamentData.status,
      })
      .onConflictDoUpdate({
        target: tournaments.id,
        set: {
          name: tournamentData.name,
          format: tournamentData.format,
          teamIds: Array.isArray(tournamentData.teamIds) ? JSON.stringify(tournamentData.teamIds) : tournamentData.teamIds,
          fixtures: Array.isArray(tournamentData.fixtures) ? JSON.stringify(tournamentData.fixtures) : tournamentData.fixtures,
          status: tournamentData.status,
        }
      })
      .returning();
  } catch (error) {
    console.error("Error saving tournament:", error);
    throw new Error("Failed to persist tournament in cloud.", { cause: error });
  }
}

// Save Setting (Key-value updates)
export async function saveSetting(key: string, value: any) {
  try {
    const valString = typeof value === "string" ? value : JSON.stringify(value);
    return await db.insert(settings)
      .values({
        key,
        value: valString,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: valString,
        }
      })
      .returning();
  } catch (error) {
    console.error("Error saving setting:", error);
    throw new Error("Failed to persist custom setting.", { cause: error });
  }
}

// Delete Setting
export async function deleteSettingEntry(key: string) {
  try {
    await db.delete(settings)
      .where(eq(settings.key, key));
    return { status: "deleted" };
  } catch (error) {
    console.error("Error deleting setting:", error);
    throw new Error("Failed to delete setting entry.", { cause: error });
  }
}
