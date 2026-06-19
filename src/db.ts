/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import initSqlJs from 'sql.js';
import { Player, Team, Match, Tournament } from './types';
import { 
  INITIAL_PLAYERS, 
  INITIAL_TEAMS, 
  INITIAL_MATCHES, 
  INITIAL_TOURNAMENTS 
} from './utils/dummyData';

export interface Setting {
  key: string;
  value: any;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: string;
  playerProfileId?: string;
}

// Global reference of SQLite DB instance
let databaseInstance: any = null;
let isInitInProgress = false;

// Custom robust pub-sub system for SQLite changes
type DatabaseListener = () => void;
const listeners = new Set<DatabaseListener>();

export function subscribeToDatabase(listener: DatabaseListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDatabaseChanged() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error('Error in database subscriber:', e);
    }
  });
}

// Low-level raw SQL queries executors
export function queryRows(sql: string, params: any[] = []): any[] {
  if (!databaseInstance) return [];
  const stmt = databaseInstance.prepare(sql);
  try {
    stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function runQuery(sql: string, params: any[] = []) {
  if (!databaseInstance) return;
  databaseInstance.run(sql, params);
  
  // Back up instantly
  backupDatabase();
  notifyDatabaseChanged();
}

export function runQueries(queries: { sql: string; params?: any[] }[]) {
  if (!databaseInstance) return;
  databaseInstance.run("BEGIN TRANSACTION;");
  try {
    for (const q of queries) {
      databaseInstance.run(q.sql, q.params || []);
    }
    databaseInstance.run("COMMIT;");
  } catch (err) {
    databaseInstance.run("ROLLBACK;");
    throw err;
  }

  // Back up instantly
  backupDatabase();
  notifyDatabaseChanged();
}

// Back up full SQLite database state directly as binary stream to IndexedDB
function backupDatabase() {
  if (!databaseInstance) return;
  try {
    const binary = databaseInstance.export();
    saveSqliteToIndexedDB(binary).catch(err => {
      console.error('IndexedDB Backup failed:', err);
    });
  } catch (e) {
    console.error('Failed to export SQLite state:', e);
  }
}

async function saveSqliteToIndexedDB(binary: Uint8Array): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('GullySqliteDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('backup');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('backup', 'readwrite');
      const store = transaction.objectStore('backup');
      const putReq = store.put(binary, 'sqliteFile');
      putReq.onsuccess = () => {
        db.close();
        resolve();
      };
      putReq.onerror = () => {
        db.close();
        reject(putReq.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

async function loadSqliteFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise<Uint8Array | null>((resolve, reject) => {
    const request = indexedDB.open('GullySqliteDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('backup');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('backup', 'readonly');
      const store = transaction.objectStore('backup');
      const getReq = store.get('sqliteFile');
      getReq.onsuccess = () => {
        const res = getReq.result || null;
        db.close();
        resolve(res);
      };
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

/**
 * ============================================================================
 * SQL.JS & WEBASSEMBLY ENGINE ARCHITECTURE
 * ============================================================================
 * 
 * 1. The JavaScript Module (sql.js):
 *    - Installed into the project's node_modules/sql.js directory.
 *    - Automatically bundled by Vite into the main application bundle.
 *    - No manual management or copying of .js files is required.
 * 
 * 2. The WebAssembly Core File (sql-wasm.wasm):
 *    - The core database engine that executes SQLite queries inside the browser.
 *    - Utilizing a fail-safe, self-healing network and local persistence pipeline:
 *      * Warm-Cache (IndexedDB): On launch, we query the browser's persistent
 *        IndexedDB database ('GullySqliteDB' -> 'backup' store) to search for
 *        the pre-cached static 'sqliteWasmFile' binary.
 *      * CDN Fallback Protocol: If the cache is empty, we rotate through top-tier
 *        CDNs (cdnjs, jsdelivr, and unpkg) to download the correct WASM binary secure file.
 *      * Instant Re-entry: As soon as it downloads successfully once, we commit
 *        the binary into IndexedDB. Subsequent page reloads boot instantly without
 *        network requests.
 * ============================================================================
 */

async function saveWasmToIndexedDB(binary: ArrayBuffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('GullySqliteDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('backup');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('backup', 'readwrite');
      const store = transaction.objectStore('backup');
      const putReq = store.put(binary, 'sqliteWasmFile');
      putReq.onsuccess = () => {
        db.close();
        resolve();
      };
      putReq.onerror = () => {
        db.close();
        reject(putReq.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

async function loadWasmFromIndexedDB(): Promise<ArrayBuffer | null> {
  return new Promise<ArrayBuffer | null>((resolve, reject) => {
    const request = indexedDB.open('GullySqliteDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('backup');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('backup', 'readonly');
      const store = transaction.objectStore('backup');
      const getReq = store.get('sqliteWasmFile');
      getReq.onsuccess = () => {
        const res = getReq.result || null;
        db.close();
        resolve(res);
      };
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

async function fetchWasmWithFallback(): Promise<ArrayBuffer> {
  const urls = [
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.1/sql-wasm.wasm',
    'https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/sql-wasm.wasm',
    'https://unpkg.com/sql.js@1.14.1/dist/sql-wasm.wasm',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm',
    'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm',
    'https://unpkg.com/sql.js@1.12.0/dist/sql-wasm.wasm',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm',
    'https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.wasm',
  ];

  for (const url of urls) {
    try {
      console.log(`Attempting to fetch SQLite WASM from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/wasm, */*'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 10000) {
        throw new Error(`Invalid WASM file size received: ${buffer.byteLength} bytes`);
      }
      console.log(`Successfully downloaded SQLite WASM from: ${url} (${buffer.byteLength} bytes)`);
      return buffer;
    } catch (err: any) {
      console.warn(`Failed to fetch from ${url}: ${err?.message || err}`);
    }
  }

  throw new Error('All SQLite WASM CDN fallback URLs failed to load.');
}

// Initialize SQLite database instance and load WASM
export async function initializeDatabase() {
  if (databaseInstance) return;
  if (isInitInProgress) return;
  isInitInProgress = true;

  try {
    console.log('Loading SQLite WASM module...');
    
    // 1. Try loading cached WASM binary from IndexedDB
    let wasmBinary = await loadWasmFromIndexedDB();
    
    if (wasmBinary) {
      console.log('Found cached SQLite WASM file in IndexedDB binary storage!');
    } else {
      console.log('No cached WASM file found. Proceeding to fetch from CDN fallbacks...');
      // 2. Fetch from CDNs with robustness and retry-failover mechanism
      wasmBinary = await fetchWasmWithFallback();
      
      // Cache it for subsequent runs
      try {
        await saveWasmToIndexedDB(wasmBinary);
        console.log('Successfully cached downloaded SQLite WASM in IndexedDB.');
      } catch (cacheErr) {
        console.warn('Failed to cache WASM in IndexedDB, app will still work:', cacheErr);
      }
    }

    // 3. Initialize SQL.js with precompiled / fetched binary
    const SQL = await initSqlJs({
      wasmBinary: wasmBinary
    });

    // Try loading persistent binary file backup from IndexedDB
    const savedBinary = await loadSqliteFromIndexedDB();
    if (savedBinary) {
      console.log('Restricted backup found! Booting SQLite from binary storage...');
      databaseInstance = new SQL.Database(savedBinary);
    } else {
      console.log('Starting clear pristine SQLite database...');
      databaseInstance = new SQL.Database();
    }

    // Generate table schemas
    databaseInstance.run(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        battingStyle TEXT,
        bowlingStyle TEXT,
        matchesPlayed INTEGER,
        runsScored INTEGER,
        ballsFaced INTEGER,
        wicketsTaken INTEGER,
        runsConceded INTEGER,
        ballsBowled INTEGER,
        highScore INTEGER,
        fifties INTEGER,
        hundreds INTEGER
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT,
        logo TEXT,
        playerIds TEXT,
        captainId TEXT,
        viceCaptainId TEXT,
        played INTEGER,
        won INTEGER,
        lost INTEGER,
        tied INTEGER,
        points INTEGER,
        nrr REAL
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        teamAId TEXT,
        teamBId TEXT,
        venue TEXT,
        date TEXT,
        time TEXT,
        overs INTEGER,
        status TEXT,
        tossWinnerId TEXT,
        tossDecision TEXT,
        inningsA TEXT,
        inningsB TEXT,
        battingFirstId TEXT,
        battingSecondId TEXT,
        currentInnings INTEGER,
        strikerId TEXT,
        nonStrikerId TEXT,
        currentBowlerId TEXT,
        result TEXT,
        tournamentId TEXT
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT,
        format TEXT,
        teamIds TEXT,
        fixtures TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        passwordHash TEXT,
        fullName TEXT,
        role TEXT,
        playerProfileId TEXT
      );
    `);

    // Purge legacy dummy database records if detected in current active IndexedDB session
    const hasDummyData = queryRows("SELECT COUNT(*) as count FROM players WHERE id = 'p1_1'")[0]?.count > 0;
    if (hasDummyData) {
      console.log('Legacy gully dummy data detected. Purging from local SQLite tables...');
      databaseInstance.run("DELETE FROM players;");
      databaseInstance.run("DELETE FROM teams;");
      databaseInstance.run("DELETE FROM matches;");
      databaseInstance.run("DELETE FROM tournaments;");
      databaseInstance.run("DELETE FROM settings;");
      databaseInstance.run("DELETE FROM users;");
    }

    // Check if seeding is required
    const playersCount = queryRows("SELECT COUNT(*) as count FROM players")[0]?.count || 0;
    const usersCount = queryRows("SELECT COUNT(*) as count FROM users")[0]?.count || 0;

    if (playersCount === 0) {
      console.log('Seeding SQLite with empty structures...');
      
      // Seed Settings & default options
      let profileToSeed = { name: 'New Player', role: 'All-rounder', runs: 0, wickets: 0 };
      let selectedProfileIdToSeed = '';

      // Load legacy LocalStorage caching if available to ensure seamless migration of older data
      const cachedProfile = localStorage.getItem('gully_user_profile');
      const cachedSelectedProfileId = localStorage.getItem('gully_selected_profile_id');
      if (cachedProfile) {
        try { profileToSeed = JSON.parse(cachedProfile); } catch (e) {}
      }
      if (cachedSelectedProfileId) {
        try {
          selectedProfileIdToSeed = JSON.parse(cachedSelectedProfileId);
        } catch {
          selectedProfileIdToSeed = cachedSelectedProfileId;
        }
      }

      databaseInstance.run("BEGIN TRANSACTION;");
      try {
        // Bulk insert players
        for (const p of INITIAL_PLAYERS) {
          databaseInstance.run(`
            INSERT INTO players (id, name, role, battingStyle, bowlingStyle, matchesPlayed, runsScored, ballsFaced, wicketsTaken, runsConceded, ballsBowled, highScore, fifties, hundreds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            p.id, p.name, p.role, p.battingStyle, p.bowlingStyle, 
            p.matchesPlayed, p.runsScored, p.ballsFaced, p.wicketsTaken, 
            p.runsConceded, p.ballsBowled, p.highScore, p.fifties, p.hundreds
          ]);
        }

        // Bulk insert teams
        for (const t of INITIAL_TEAMS) {
          databaseInstance.run(`
            INSERT INTO teams (id, name, logo, playerIds, captainId, viceCaptainId, played, won, lost, tied, points, nrr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            t.id, t.name, t.logo, JSON.stringify(t.playerIds), 
            t.captainId || null, t.viceCaptainId || null, 
            t.played, t.won, t.lost, t.tied, t.points, t.nrr
          ]);
        }

        // Bulk insert matches
        for (const m of INITIAL_MATCHES) {
          databaseInstance.run(`
            INSERT INTO matches (id, teamAId, teamBId, venue, date, time, overs, status, tossWinnerId, tossDecision, inningsA, inningsB, battingFirstId, battingSecondId, currentInnings, strikerId, nonStrikerId, currentBowlerId, result, tournamentId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            m.id, m.teamAId, m.teamBId, m.venue, m.date, m.time, m.overs, m.status,
            m.tossWinnerId || null, m.tossDecision || null,
            m.inningsA ? JSON.stringify(m.inningsA) : null,
            m.inningsB ? JSON.stringify(m.inningsB) : null,
            m.battingFirstId || null, m.battingSecondId || null, m.currentInnings,
            m.strikerId || null, m.nonStrikerId || null, m.currentBowlerId || null,
            m.result || null, m.tournamentId || null
          ]);
        }

        // Bulk insert tournaments
        for (const tr of INITIAL_TOURNAMENTS) {
          databaseInstance.run(`
            INSERT INTO tournaments (id, name, format, teamIds, fixtures, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            tr.id, tr.name, tr.format, JSON.stringify(tr.teamIds), JSON.stringify(tr.fixtures), tr.status
          ]);
        }

        // Add settings
        databaseInstance.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, ['currentUserProfile', JSON.stringify(profileToSeed)]);
        databaseInstance.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, ['selectedPlayerProfileId', JSON.stringify(selectedProfileIdToSeed)]);

        databaseInstance.run("COMMIT;");
      } catch (err) {
        databaseInstance.run("ROLLBACK;");
        console.error('Failed to seed database:', err);
      }
    }

    if (usersCount === 0) {
      // Seed default user account
      const defaultUserAccount: UserAccount = {
        id: 'usr_default',
        username: 'jaydeep',
        passwordHash: 'gully123',
        fullName: 'Jaydeep Darji',
        role: 'All-rounder'
      };
      databaseInstance.run(`
        INSERT INTO users (id, username, passwordHash, fullName, role, playerProfileId)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        defaultUserAccount.id, defaultUserAccount.username, defaultUserAccount.passwordHash,
        defaultUserAccount.fullName, defaultUserAccount.role, defaultUserAccount.playerProfileId || null
      ]);

      databaseInstance.run(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `, ['loggedInUserId', JSON.stringify(defaultUserAccount.id)]);
    }

    // Save back seeded data
    backupDatabase();
    notifyDatabaseChanged();
    console.log('SQLite database compiled, mounted, loaded, and synchronized successfully.');
  } catch (e) {
    console.error('Fatal SQLite initialization error:', e);
  } finally {
    isInitInProgress = false;
  }
}

// React Hook to make selective SQL outputs dynamic and reactive on mutations
import { useState, useEffect, useRef } from 'react';

export function useSqlSelector<T>(selector: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(() => {
    try {
      if (databaseInstance) return selector();
    } catch {}
    return fallback;
  });

  const selectorRef = useRef(selector);
  useEffect(() => {
    selectorRef.current = selector;
  });

  useEffect(() => {
    // Re-fetch immediately when databaseInstance is updated / ready
    try {
      if (databaseInstance) setValue(selectorRef.current());
    } catch (e) {
      console.error(e);
    }

    // Register listener for reactive updates
    return subscribeToDatabase(() => {
      try {
        if (databaseInstance) setValue(selectorRef.current());
      } catch (e) {
        console.error(e);
      }
    });
  }, []);

  return value;
}

// DROPIN REPLACEMENT WRAPPER emulating the exact Dexie API matching the other codebases
export let bearerToken: string | null = null;
export function setBearerToken(token: string | null) {
  bearerToken = token;
}

async function syncToServer(url: string, body: any) {
  if (!bearerToken) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.warn(`Sync request failed for ${url}: status ${res.status}`);
    }
  } catch (error) {
    console.error(`Sync error to ${url}:`, error);
  }
}

export async function hydrateFromCloudSync(payload: any) {
  if (!databaseInstance) return;
  
  databaseInstance.run("BEGIN TRANSACTION;");
  try {
    // Players
    if (payload.players) {
      databaseInstance.run("DELETE FROM players;");
      for (const p of payload.players) {
        databaseInstance.run(`
          INSERT INTO players (id, name, role, battingStyle, bowlingStyle, matchesPlayed, runsScored, ballsFaced, wicketsTaken, runsConceded, ballsBowled, highScore, fifties, hundreds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id, p.name, p.role, p.battingStyle || p.batting_style, p.bowlingStyle || p.bowling_style, 
          p.matchesPlayed || p.matches_played, p.runsScored || p.runs_scored, p.ballsFaced || p.balls_faced, p.wicketsTaken || p.wickets_taken, 
          p.runsConceded || p.runs_conceded, p.ballsBowled || p.balls_bowled, p.highScore || p.high_score, p.fifties, p.hundreds
        ]);
      }
    }

    // Teams
    if (payload.teams) {
      databaseInstance.run("DELETE FROM teams;");
      for (const t of payload.teams) {
        databaseInstance.run(`
          INSERT INTO teams (id, name, logo, playerIds, captainId, viceCaptainId, played, won, lost, tied, points, nrr)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          t.id, t.name, t.logo, t.playerIds || t.player_ids, 
          t.captainId || t.captain_id || null, t.viceCaptainId || t.vice_captain_id || null, 
          t.played, t.won, t.lost, t.tied, t.points, t.nrr
        ]);
      }
    }

    // Matches
    if (payload.matches) {
      databaseInstance.run("DELETE FROM matches;");
      for (const m of payload.matches) {
        databaseInstance.run(`
          INSERT INTO matches (id, teamAId, teamBId, venue, date, time, overs, status, tossWinnerId, tossDecision, inningsA, inningsB, battingFirstId, battingSecondId, currentInnings, strikerId, nonStrikerId, currentBowlerId, result, tournamentId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          m.id, m.teamAId || m.team_a_id, m.teamBId || m.team_b_id, m.venue, m.date, m.time, m.overs, m.status,
          m.tossWinnerId || m.toss_winner_id || null, m.tossDecision || m.toss_decision || null,
          m.inningsA || m.innings_a || null,
          m.inningsB || m.innings_b || null,
          m.battingFirstId || m.batting_first_id || null, m.battingSecondId || m.batting_second_id || null, m.currentInnings || m.current_innings,
          m.strikerId || m.striker_id || null, m.nonStrikerId || m.non_striker_id || null, m.currentBowlerId || m.current_bowler_id || null,
          m.result || null, m.tournamentId || m.tournament_id || null
        ]);
      }
    }

    // Tournaments
    if (payload.tournaments) {
      databaseInstance.run("DELETE FROM tournaments;");
      for (const tr of payload.tournaments) {
        databaseInstance.run(`
          INSERT INTO tournaments (id, name, format, teamIds, fixtures, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          tr.id, tr.name, tr.format, tr.teamIds || tr.team_ids, tr.fixtures, tr.status
        ]);
      }
    }

    // Settings
    if (payload.settings) {
      databaseInstance.run("DELETE FROM settings;");
      for (const s of payload.settings) {
        if (s.key === "loggedInUserId") continue;
        databaseInstance.run(`
          INSERT INTO settings (key, value)
          VALUES (?, ?)
        `, [s.key, s.value]);
      }
    }

    databaseInstance.run("COMMIT;");
  } catch (err) {
    databaseInstance.run("ROLLBACK;");
    console.error("Hydration transaction failed:", err);
  }

  backupDatabase();
  notifyDatabaseChanged();
}

// DROPIN REPLACEMENT WRAPPER emulating the exact Dexie API matching the other codebases
export const db = {
  getRawDb: () => databaseInstance,
  
  players: {
    toArray: async (): Promise<Player[]> => {
      return queryRows("SELECT * FROM players") as Player[];
    },
    get: async (id: string): Promise<Player | null> => {
      const rows = queryRows("SELECT * FROM players WHERE id = ?", [id]);
      return (rows[0] as Player) || null;
    },
    add: async (player: Player): Promise<void> => {
      runQuery(`
        INSERT INTO players (id, name, role, battingStyle, bowlingStyle, matchesPlayed, runsScored, ballsFaced, wicketsTaken, runsConceded, ballsBowled, highScore, fifties, hundreds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        player.id, player.name, player.role, player.battingStyle, player.bowlingStyle,
        player.matchesPlayed, player.runsScored, player.ballsFaced, player.wicketsTaken,
        player.runsConceded, player.ballsBowled, player.highScore, player.fifties, player.hundreds
      ]);
      await syncToServer("/api/players", { item: player });
    },
    bulkPut: async (players: Player[]): Promise<void> => {
      const queries = players.map(player => ({
        sql: `
          INSERT OR REPLACE INTO players (id, name, role, battingStyle, bowlingStyle, matchesPlayed, runsScored, ballsFaced, wicketsTaken, runsConceded, ballsBowled, highScore, fifties, hundreds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          player.id, player.name, player.role, player.battingStyle, player.bowlingStyle,
          player.matchesPlayed, player.runsScored, player.ballsFaced, player.wicketsTaken,
          player.runsConceded, player.ballsBowled, player.highScore, player.fifties, player.hundreds
        ]
      }));
      runQueries(queries);
      await syncToServer("/api/players", { list: players });
    }
  },

  teams: {
    toArray: async (): Promise<Team[]> => {
      const rows = queryRows("SELECT * FROM teams");
      return rows.map(r => ({
        ...r,
        playerIds: r.playerIds ? JSON.parse(r.playerIds) : []
      })) as Team[];
    },
    get: async (id: string): Promise<Team | null> => {
      const rows = queryRows("SELECT * FROM teams WHERE id = ?", [id]);
      if (!rows[0]) return null;
      return {
        ...rows[0],
        playerIds: rows[0].playerIds ? JSON.parse(rows[0].playerIds) : []
      } as Team;
    },
    add: async (team: Team): Promise<void> => {
      runQuery(`
        INSERT INTO teams (id, name, logo, playerIds, captainId, viceCaptainId, played, won, lost, tied, points, nrr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        team.id, team.name, team.logo, JSON.stringify(team.playerIds),
        team.captainId || null, team.viceCaptainId || null,
        team.played, team.won, team.lost, team.tied, team.points, team.nrr
      ]);
      await syncToServer("/api/teams", { item: team });
    },
    update: async (id: string, updates: Partial<Team>): Promise<void> => {
      const current = await db.teams.get(id);
      if (!current) return;
      const merged = { ...current, ...updates };
      runQuery(`
        UPDATE teams
        SET playerIds = ?, captainId = ?, viceCaptainId = ?, played = ?, won = ?, lost = ?, tied = ?, points = ?, nrr = ?
        WHERE id = ?
      `, [
        JSON.stringify(merged.playerIds), merged.captainId || null, merged.viceCaptainId || null,
        merged.played, merged.won, merged.lost, merged.tied, merged.points, merged.nrr,
        id
      ]);
      await syncToServer("/api/teams", { item: merged });
    },
    bulkPut: async (teams: Team[]): Promise<void> => {
      const queries = teams.map(team => ({
        sql: `
          INSERT OR REPLACE INTO teams (id, name, logo, playerIds, captainId, viceCaptainId, played, won, lost, tied, points, nrr)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          team.id, team.name, team.logo, JSON.stringify(team.playerIds),
          team.captainId || null, team.viceCaptainId || null,
          team.played, team.won, team.lost, team.tied, team.points, team.nrr
        ]
      }));
      runQueries(queries);
      await syncToServer("/api/teams", { list: teams });
    }
  },

  matches: {
    toArray: async (): Promise<Match[]> => {
      const rows = queryRows("SELECT * FROM matches");
      return rows.map(r => ({
        ...r,
        overs: r.overs !== null ? Number(r.overs) : 0,
        currentInnings: r.currentInnings !== null ? Number(r.currentInnings) : 1,
        inningsA: r.inningsA ? JSON.parse(r.inningsA) : undefined,
        inningsB: r.inningsB ? JSON.parse(r.inningsB) : undefined
      })) as Match[];
    },
    get: async (id: string): Promise<Match | null> => {
      const rows = queryRows("SELECT * FROM matches WHERE id = ?", [id]);
      if (!rows[0]) return null;
      const r = rows[0];
      return {
        ...r,
        overs: r.overs !== null ? Number(r.overs) : 0,
        currentInnings: r.currentInnings !== null ? Number(r.currentInnings) : 1,
        inningsA: r.inningsA ? JSON.parse(r.inningsA) : undefined,
        inningsB: r.inningsB ? JSON.parse(r.inningsB) : undefined
      } as Match;
    },
    add: async (match: Match): Promise<void> => {
      runQuery(`
        INSERT INTO matches (id, teamAId, teamBId, venue, date, time, overs, status, tossWinnerId, tossDecision, inningsA, inningsB, battingFirstId, battingSecondId, currentInnings, strikerId, nonStrikerId, currentBowlerId, result, tournamentId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        match.id, match.teamAId, match.teamBId, match.venue, match.date, match.time, match.overs, match.status,
        match.tossWinnerId || null, match.tossDecision || null,
        match.inningsA ? JSON.stringify(match.inningsA) : null,
        match.inningsB ? JSON.stringify(match.inningsB) : null,
        match.battingFirstId || null, match.battingSecondId || null, match.currentInnings,
        match.strikerId || null, match.nonStrikerId || null, match.currentBowlerId || null,
        match.result || null, match.tournamentId || null
      ]);
      await syncToServer("/api/matches", { item: match });
    },
    put: async (match: Match): Promise<void> => {
      runQuery(`
        INSERT OR REPLACE INTO matches (id, teamAId, teamBId, venue, date, time, overs, status, tossWinnerId, tossDecision, inningsA, inningsB, battingFirstId, battingSecondId, currentInnings, strikerId, nonStrikerId, currentBowlerId, result, tournamentId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        match.id, match.teamAId, match.teamBId, match.venue, match.date, match.time, match.overs, match.status,
        match.tossWinnerId || null, match.tossDecision || null,
        match.inningsA ? JSON.stringify(match.inningsA) : null,
        match.inningsB ? JSON.stringify(match.inningsB) : null,
        match.battingFirstId || null, match.battingSecondId || null, match.currentInnings,
        match.strikerId || null, match.nonStrikerId || null, match.currentBowlerId || null,
        match.result || null, match.tournamentId || null
      ]);
      await syncToServer("/api/matches", { item: match });
    },
    update: async (id: string, updates: Partial<Match>): Promise<void> => {
      const current = await db.matches.get(id);
      if (!current) return;
      const merged = { ...current, ...updates };
      await db.matches.put(merged);
    },
    bulkAdd: async (matches: Match[]): Promise<void> => {
      const queries = matches.map(match => ({
        sql: `
          INSERT INTO matches (id, teamAId, teamBId, venue, date, time, overs, status, tossWinnerId, tossDecision, inningsA, inningsB, battingFirstId, battingSecondId, currentInnings, strikerId, nonStrikerId, currentBowlerId, result, tournamentId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          match.id, match.teamAId, match.teamBId, match.venue, match.date, match.time, match.overs, match.status,
          match.tossWinnerId || null, match.tossDecision || null,
          match.inningsA ? JSON.stringify(match.inningsA) : null,
          match.inningsB ? JSON.stringify(match.inningsB) : null,
          match.battingFirstId || null, match.battingSecondId || null, match.currentInnings,
          match.strikerId || null, match.nonStrikerId || null, match.currentBowlerId || null,
          match.result || null, match.tournamentId || null
        ]
      }));
      runQueries(queries);
      await syncToServer("/api/matches", { list: matches });
    }
  },

  tournaments: {
    toArray: async (): Promise<Tournament[]> => {
      const rows = queryRows("SELECT * FROM tournaments");
      return rows.map(r => ({
        ...r,
        teamIds: r.teamIds ? JSON.parse(r.teamIds) : [],
        fixtures: r.fixtures ? JSON.parse(r.fixtures) : []
      })) as Tournament[];
    },
    add: async (tournament: Tournament): Promise<void> => {
      runQuery(`
        INSERT INTO tournaments (id, name, format, teamIds, fixtures, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        tournament.id, tournament.name, tournament.format,
        JSON.stringify(tournament.teamIds), JSON.stringify(tournament.fixtures),
        tournament.status
      ]);
      await syncToServer("/api/tournaments", { item: tournament });
    }
  },

  settings: {
    get: async (key: string): Promise<{ key: string; value: any } | null> => {
      const rows = queryRows("SELECT value FROM settings WHERE key = ?", [key]);
      if (!rows[0]) return null;
      return {
        key,
        value: rows[0].value ? JSON.parse(rows[0].value) : null
      };
    },
    put: async (setting: Setting): Promise<void> => {
      runQuery(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `, [setting.key, JSON.stringify(setting.value)]);
      await syncToServer("/api/settings", { key: setting.key, value: setting.value });
    },
    add: async (setting: Setting): Promise<void> => {
      runQuery(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
      `, [setting.key, JSON.stringify(setting.value)]);
      await syncToServer("/api/settings", { key: setting.key, value: setting.value });
    },
    delete: async (key: string): Promise<void> => {
      runQuery("DELETE FROM settings WHERE key = ?", [key]);
      if (bearerToken) {
        fetch(`/api/settings/${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${bearerToken}` }
        }).catch(err => console.error("Error deleting setting synchronously:", err));
      }
    }
  },

  users: {
    count: async (): Promise<number> => {
      const rows = queryRows("SELECT COUNT(*) as count FROM users");
      return rows[0] ? Number(rows[0].count) : 0;
    },
    filter: (predicate: (user: UserAccount) => boolean) => {
      return {
        toArray: async (): Promise<UserAccount[]> => {
          const rows = queryRows("SELECT * FROM users");
          const users = rows as UserAccount[];
          return users.filter(predicate);
        }
      };
    },
    add: async (user: UserAccount): Promise<void> => {
      runQuery(`
        INSERT INTO users (id, username, passwordHash, fullName, role, playerProfileId)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        user.id, user.username, user.passwordHash, user.fullName, user.role, user.playerProfileId || null
      ]);
    }
  },

  transaction: async (mode: string, tables: any[], transactionFn: () => Promise<void>): Promise<void> => {
    // SQLite operates completely synchronously and locally. Running raw BEGIN/COMMIT blocks
    // over async functions creates interleaving, out-of-order SQLite queries when there
    // are multiple concurrent UI actions. Disabling SQL transaction state machine prevents these.
    await transactionFn();

    // Backup immediately and notify
    backupDatabase();
    notifyDatabaseChanged();
  }
};
