/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, initializeDatabase, useSqlSelector, queryRows, setBearerToken, hydrateFromCloudSync } from './db';
import { Player, Team, Match, Tournament, TournamentFixture } from './types';
import { 
  INITIAL_PLAYERS, 
  INITIAL_TEAMS, 
  INITIAL_MATCHES, 
  INITIAL_TOURNAMENTS 
} from './utils/dummyData';
import { Dashboard } from './components/Dashboard';
import { TeamsTab } from './components/TeamsTab';
import { MatchesTab } from './components/MatchesTab';
import { LiveScoring } from './components/LiveScoring';
import { TournamentsTab } from './components/TournamentsTab';
import { StatsTab } from './components/StatsTab';
import { ProfileTab } from './components/ProfileTab';
import { AuthScreen } from './components/AuthScreen';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  User, 
  Play, 
  Grid2X2, 
  LogOut,
  Flame,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Initialize database once on mount and establish Firebase sync listeners
  useEffect(() => {
    initializeDatabase().then(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            setBearerToken(token);
            
            // Sync with postgres Cloud SQL schema tables
            const res = await fetch("/api/sync-data", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
              const payload = await res.json();
              await hydrateFromCloudSync(payload);
            }
          } catch (e) {
            console.error("Failed to restore synchronized cloud databases:", e);
          }
        }
      });
      return unsubscribe;
    }).catch(err => {
      console.error('Failed to initialize database:', err);
    });
  }, []);

  // Core App states from SQLite with real-time automatic synchronization
  const players = useSqlSelector(() => queryRows("SELECT * FROM players") as Player[], INITIAL_PLAYERS);
  
  const teams = useSqlSelector(() => {
    const rows = queryRows("SELECT * FROM teams");
    return rows.map(r => ({
      ...r,
      playerIds: r.playerIds ? JSON.parse(r.playerIds) : []
    })) as Team[];
  }, INITIAL_TEAMS);

  const matches = useSqlSelector(() => {
    const rows = queryRows("SELECT * FROM matches");
    return rows.map(r => ({
      ...r,
      overs: r.overs !== null ? Number(r.overs) : 0,
      currentInnings: r.currentInnings !== null ? Number(r.currentInnings) : 1,
      inningsA: r.inningsA ? JSON.parse(r.inningsA) : undefined,
      inningsB: r.inningsB ? JSON.parse(r.inningsB) : undefined
    })) as Match[];
  }, INITIAL_MATCHES);

  const tournaments = useSqlSelector(() => {
    const rows = queryRows("SELECT * FROM tournaments");
    return rows.map(r => ({
      ...r,
      teamIds: r.teamIds ? JSON.parse(r.teamIds) : [],
      fixtures: r.fixtures ? JSON.parse(r.fixtures) : []
    })) as Tournament[];
  }, INITIAL_TOURNAMENTS);

  const currentUserProfile = useSqlSelector(() => {
    const rows = queryRows("SELECT value FROM settings WHERE key = 'currentUserProfile'");
    return rows[0]?.value ? JSON.parse(rows[0].value) : { name: 'Player', role: 'All-rounder', runs: 0, wickets: 0 };
  }, { name: 'Player', role: 'All-rounder', runs: 0, wickets: 0 });

  const selectedPlayerProfileId = useSqlSelector(() => {
    const rows = queryRows("SELECT value FROM settings WHERE key = 'selectedPlayerProfileId'");
    return rows[0]?.value ? JSON.parse(rows[0].value) : '';
  }, '');

  const loggedInUserId = useSqlSelector(() => {
    const rows = queryRows("SELECT value FROM settings WHERE key = 'loggedInUserId'");
    return rows[0]?.value ? (JSON.parse(rows[0].value) as string) : null;
  }, null);

  const handleLogout = async () => {
    await db.settings.delete('loggedInUserId');
    setSelectedMatchId(null);
    setActiveTab('dashboard');
  };

  // ACTIONS HANDLERS
  
  // Registering/Updating User specification profile
  const handleUpdateUserProfile = async (name: string, role: string, runs: number, wickets: number) => {
    // Create new player entry in free agent pool so they can link it
    const newPlayerId = 'p_user_' + Date.now();
    const newCricketer: Player = {
      id: newPlayerId,
      name,
      role: role as Player['role'],
      battingStyle: 'Right-hand',
      bowlingStyle: 'None',
      matchesPlayed: 0,
      runsScored: 0,
      ballsFaced: 0,
      wicketsTaken: 0,
      ballsBowled: 0,
      runsConceded: 0,
      highScore: 0,
      fifties: 0,
      hundreds: 0
    };

    await db.players.add(newCricketer);
    await db.settings.put({ key: 'selectedPlayerProfileId', value: newPlayerId });
    await db.settings.put({ key: 'currentUserProfile', value: { name, role, runs, wickets } });
  };

  // Link profile to player
  const handleLinkProfileToPlayer = async (playerId: string) => {
    const found = await db.players.get(playerId);
    if (found) {
      await db.settings.put({ key: 'selectedPlayerProfileId', value: playerId });
      await db.settings.put({ key: 'currentUserProfile', value: {
        name: found.name,
        role: found.role,
        runs: found.runsScored,
        wickets: found.wicketsTaken
      } });
    }
  };

  // Add guest player to existing team
  const handleAddPlayer = async (
    teamId: string, 
    name: string, 
    role: Player['role'], 
    battingStyle: Player['battingStyle'], 
    bowlingStyle: Player['bowlingStyle']
  ) => {
    const newId = 'player_' + Date.now();
    const newPlayer: Player = {
      id: newId,
      name,
      role,
      battingStyle,
      bowlingStyle,
      matchesPlayed: 0,
      runsScored: 0,
      ballsFaced: 0,
      wicketsTaken: 0,
      ballsBowled: 0,
      runsConceded: 0,
      highScore: 0,
      fifties: 0,
      hundreds: 0
    };

    await db.transaction('rw', [db.players, db.teams], async () => {
      await db.players.add(newPlayer);
      const team = await db.teams.get(teamId);
      if (team) {
        await db.teams.update(teamId, {
          playerIds: [...team.playerIds, newId]
        });
      }
    });
  };

  // Affiliate an existing free player to a team
  const handleAffiliatePlayerToTeam = async (playerId: string, teamId: string) => {
    const team = await db.teams.get(teamId);
    if (team && !team.playerIds.includes(playerId)) {
      await db.teams.update(teamId, {
        playerIds: [...team.playerIds, playerId]
      });
    }
  };

  // Add custom team
  const handleAddTeam = async (name: string, logo: string, initialPlayerNames: string[] = []) => {
    const teamId = 'team_' + Date.now();
    const playerIds: string[] = [];

    if (initialPlayerNames && initialPlayerNames.length > 0) {
      for (let i = 0; i < initialPlayerNames.length; i++) {
        const pName = initialPlayerNames[i].trim();
        if (!pName) continue;
        
        const newPlayerId = 'player_' + Date.now() + '_' + i;
        const newPlayer: Player = {
          id: newPlayerId,
          name: pName,
          role: 'All-rounder',
          battingStyle: 'Right-hand',
          bowlingStyle: 'None',
          matchesPlayed: 0,
          runsScored: 0,
          ballsFaced: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
          runsConceded: 0,
          highScore: 0,
          fifties: 0,
          hundreds: 0
        };
        await db.players.add(newPlayer);
        playerIds.push(newPlayerId);
      }
    }

    const newTeam: Team = {
      id: teamId,
      name,
      logo,
      playerIds: playerIds,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0.000
    };
    await db.teams.add(newTeam);
  };

  // Assign Team roles
  const handleAssignLeadership = async (teamId: string, captainId: string | null, viceCaptainId: string | null) => {
    await db.teams.update(teamId, {
      captainId: captainId || undefined,
      viceCaptainId: viceCaptainId || undefined
    });
  };

  // Schedule Match
  const handleAddMatch = async (
    teamAId: string, 
    teamBId: string, 
    venue: string, 
    date: string, 
    time: string, 
    overs: number
  ) => {
    const newId = 'match_' + Date.now();
    const newMatch: Match = {
      id: newId,
      teamAId,
      teamBId,
      venue,
      date,
      time,
      overs,
      status: 'toss', // Launch directly into Coin toss state for quick fluid scoring!
      currentInnings: 1
    };
    await db.matches.add(newMatch);
    setSelectedMatchId(newId);
    setActiveTab('score');
  };

  // Active Live Scoring updates sync
  const handleUpdateMatchInnings = async (matchId: string, updatedMatch: Match) => {
    await db.matches.put(updatedMatch);
  };

  // Match Completed statistics sync
  const handleFinishMatch = async (matchId: string, resultText: string) => {
    const completedMatch = await db.matches.get(matchId);
    if (!completedMatch) return;

    // Retrieve scoring states
    const batFirstId = completedMatch.battingFirstId!;
    const batSecondId = completedMatch.battingSecondId!;
    const innA = completedMatch.inningsA!;
    const innB = completedMatch.inningsB!;

    await db.transaction('rw', [db.players, db.teams, db.matches, db.settings], async () => {
      // 1. Sync Player Career Records
      const allPlayers = await db.players.toArray();
      const updatedPlayers = allPlayers.map(p => {
        let updatedPlayerObj = { ...p };
        let participated = false;

        // Check if player participated in Batting Innings 1
        const b1 = innA.batsmen[p.id];
        if (b1) {
          participated = true;
          updatedPlayerObj.runsScored += b1.runs;
          updatedPlayerObj.ballsFaced += b1.balls;
          if (b1.runs > updatedPlayerObj.highScore) {
            updatedPlayerObj.highScore = b1.runs;
          }
          if (b1.runs >= 50 && b1.runs < 100) updatedPlayerObj.fifties += 1;
          if (b1.runs >= 100) updatedPlayerObj.hundreds += 1;
        }

        // Check if player participated in Batting Innings 2
        const b2 = innB.batsmen[p.id];
        if (b2) {
          participated = true;
          updatedPlayerObj.runsScored += b2.runs;
          updatedPlayerObj.ballsFaced += b2.balls;
          if (b2.runs > updatedPlayerObj.highScore) {
            updatedPlayerObj.highScore = b2.runs;
          }
          if (b2.runs >= 50 && b2.runs < 100) updatedPlayerObj.fifties += 1;
          if (b2.runs >= 100) updatedPlayerObj.hundreds += 1;
        }

        // Check Bowlers stats
        const bow1 = innA.bowlers[p.id];
        if (bow1) {
          participated = true;
          updatedPlayerObj.ballsBowled += bow1.ballsBowled;
          updatedPlayerObj.runsConceded += bow1.runs;
          updatedPlayerObj.wicketsTaken += bow1.wickets;
        }

        const bow2 = innB.bowlers[p.id];
        if (bow2) {
          participated = true;
          updatedPlayerObj.ballsBowled += bow2.ballsBowled;
          updatedPlayerObj.runsConceded += bow2.runs;
          updatedPlayerObj.wicketsTaken += bow2.wickets;
        }

        if (participated) {
          updatedPlayerObj.matchesPlayed += 1;
        }

        return updatedPlayerObj;
      });

      // Saving updated players
      await db.players.bulkPut(updatedPlayers);

      // 2. Sync Team League Standings
      const isTargetChased = innB.runs >= (innA.runs + 1);
      const winningTeamId = isTargetChased ? batSecondId : (innB.runs < innA.runs ? batFirstId : 'tied');

      const allTeams = await db.teams.toArray();
      const updatedTeams = allTeams.map(team => {
        if (team.id === batFirstId || team.id === batSecondId) {
          const played = team.played + 1;
          const isWinner = team.id === winningTeamId;
          const isGameTied = winningTeamId === 'tied';
          
          const won = team.won + (isWinner ? 1 : 0);
          const lost = team.lost + ((!isWinner && !isGameTied) ? 1 : 0);
          const tied = team.tied + (isGameTied ? 1 : 0);
          const points = team.points + (isWinner ? 2 : isGameTied ? 1 : 0);

          // Calculate approximate Net Run Rate (margin multiplier)
          let nrrAdd = 0;
          if (!isGameTied) {
            const teamARunRate = innA.runs / (innA.ballsBowled > 0 ? (innA.ballsBowled / 6) : 1);
            const teamBRunRate = innB.runs / (innB.ballsBowled > 0 ? (innB.ballsBowled / 6) : 1);
            const margin = Math.abs(teamARunRate - teamBRunRate) * 0.1;
            nrrAdd = isWinner ? margin : -margin;
          }
          const nrr = parseFloat((team.nrr + nrrAdd).toFixed(3));

          return {
            ...team,
            played,
            won,
            lost,
            tied,
            points,
            nrr
          };
        }
        return team;
      });

      // Saving updated teams
      await db.teams.bulkPut(updatedTeams);

      // 3. Sync match results
      await db.matches.update(matchId, {
        status: 'completed',
        result: resultText
      });

      // 4. Re-sync current logged user career numbers from updated list
      if (selectedPlayerProfileId) {
        const found = updatedPlayers.find(p => p.id === selectedPlayerProfileId);
        if (found) {
          await db.settings.put({ key: 'currentUserProfile', value: {
            name: found.name,
            role: found.role,
            runs: found.runsScored,
            wickets: found.wicketsTaken
          } });
        }
      }
    });
  };

  // Add tournament (Generates automatic Round-Robin Matches!)
  const handleAddTournament = async (name: string, format: 'league' | 'knockout', teamIds: string[]) => {
    const newTourId = 'tour_' + Date.now();
    const createdFixtures: TournamentFixture[] = [];
    const generatedMatches: Match[] = [];

    // Round robin pairings
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const mId = 'match_tour_' + Date.now() + '_' + i + '_' + j;
        const newMatchObj: Match = {
          id: mId,
          teamAId: teamIds[i],
          teamBId: teamIds[j],
          venue: 'Academy Turf Arena',
          date: new Date(Date.now() + 86400000 * (createdFixtures.length + 1)).toISOString().split('T')[0],
          time: '18:00',
          overs: 5,
          status: 'scheduled',
          currentInnings: 1,
          tournamentId: newTourId
        };
        
        generatedMatches.push(newMatchObj);

        // Save fixture connection
        createdFixtures.push({
          matchId: mId,
          round: `Round ${createdFixtures.length + 1}`
        });
      }
    }

    const newTournament: Tournament = {
      id: newTourId,
      name,
      format,
      teamIds,
      fixtures: createdFixtures,
      status: 'ongoing'
    };

    await db.transaction('rw', [db.matches, db.tournaments], async () => {
      if (generatedMatches.length > 0) {
        await db.matches.bulkAdd(generatedMatches);
      }
      await db.tournaments.add(newTournament);
    });
  };

  const handleLaunchMatchFromTournament = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab('score');
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  // Render loading state while Dexie connects on initial startup
  if (loggedInUserId === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans text-white select-none">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl animate-bounce">🏏</div>
          <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 font-mono">Initializing Gully Database...</span>
        </div>
      </div>
    );
  }

  // Render credentials login / register gate if not authenticated
  if (loggedInUserId === null) {
    return (
      <AuthScreen 
        onLoginSuccess={() => {
          // Success is automatically handled by Dexie's live react hook context update
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased text-slate-800 pb-20 md:pb-0" id="gully-score-root">
      
      {/* Top Banner / Navigation Appbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            onClick={() => {
              setSelectedMatchId(null);
              setActiveTab('dashboard');
            }}
            className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-900 font-bold text-md font-display shadow-xs">
              G
            </div>
            <div>
              <h1 className="text-sm font-display font-extrabold tracking-tight leading-none text-slate-900">GULLY SCORE</h1>
              <span className="text-[9px] text-emerald-600 font-black uppercase font-mono">Digital Matchbook</span>
            </div>
          </div>

          {/* Connected User Badge profile */}
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-150"
          >
            <span className="text-lg">🧔</span>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{currentUserProfile?.name || 'Guest User'}</p>
              <span className="text-[9px] text-slate-450 font-medium font-mono">{currentUserProfile?.role || 'Cricketer'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-500 px-3 py-1">
              <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-900 font-bold">G</div>
              <h1 className="text-md font-bold tracking-tight text-white leading-none">GULLY CONSOLE</h1>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase block px-3">Main Navigation</span>
              <nav className="space-y-1">
                {[
                  { tab: 'dashboard', label: 'Dashboard Hub', icon: Grid2X2 },
                  { tab: 'teams', label: 'Manage Teams', icon: Users },
                  { tab: 'matches', label: 'Matches Portal', icon: Calendar },
                  { tab: 'tournaments', label: 'Tournaments', icon: Trophy },
                  { tab: 'stats', label: 'Stats Registry', icon: TrendingUp },
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.tab && !selectedMatchId;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => {
                        setSelectedMatchId(null);
                        setActiveTab(item.tab);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all text-left cursor-pointer ${
                        isActive 
                          ? 'bg-slate-800 text-white font-medium italic' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Profile Badge in Sidebar Footer */}
          <div className="pt-4 border-t border-slate-800 mt-auto space-y-2 flex flex-col">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-slate-800 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase shadow-sm shrink-0">
                {(currentUserProfile?.name || 'G').substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-white leading-snug truncate">{currentUserProfile?.name || 'Rahul Sharma'}</p>
                <p className="text-[10px] text-slate-550 block leading-tight font-mono">Connected ID</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Account
            </button>
          </div>
        </aside>

        {/* CHIEF VIEWS CONTENT AREA */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {selectedMatchId && selectedMatch ? (
              // ACTIVE INDIVIDUAL SCOREBOARD
              <motion.div
                key="scoring-active-match"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <LiveScoring 
                  match={selectedMatch}
                  teams={teams}
                  players={players}
                  onUpdateMatchInnings={handleUpdateMatchInnings}
                  onFinishMatch={handleFinishMatch}
                  onClose={() => setSelectedMatchId(null)}
                />
              </motion.div>
            ) : (
              // TABS ROUTING
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    matches={matches} 
                    teams={teams} 
                    players={players} 
                    setActiveTab={setActiveTab} 
                    setSelectedMatchId={setSelectedMatchId}
                    currentUserProfile={currentUserProfile}
                  />
                )}
                {activeTab === 'teams' && (
                  <TeamsTab 
                    teams={teams} 
                    players={players} 
                    onAddTeam={handleAddTeam} 
                    onAddPlayer={handleAddPlayer} 
                    onAssignLeadership={handleAssignLeadership}
                  />
                )}
                {activeTab === 'matches' && (
                  <MatchesTab 
                    matches={matches} 
                    teams={teams} 
                    onAddMatch={handleAddMatch} 
                    onSelectMatch={setSelectedMatchId}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab === 'tournaments' && (
                  <TournamentsTab 
                    tournaments={tournaments} 
                    teams={teams} 
                    matches={matches} 
                    onAddTournament={handleAddTournament} 
                    onLaunchMatchFromTournament={handleLaunchMatchFromTournament}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab === 'stats' && (
                  <StatsTab players={players} teams={teams} />
                )}
                {activeTab === 'profile' && (
                  <ProfileTab 
                    players={players}
                    teams={teams}
                    currentUserProfile={currentUserProfile}
                    onUpdateUserProfile={handleUpdateUserProfile}
                    onLinkProfileToPlayer={handleLinkProfileToPlayer}
                    onAffiliatePlayerToTeam={handleAffiliatePlayerToTeam}
                    selectedPlayerProfileId={selectedPlayerProfileId}
                    onLogout={handleLogout}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DRAWERS (Only visible on small devices) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 md:hidden flex justify-around shadow-lg">
        {[
          { tab: 'dashboard', label: 'Home', icon: Grid2X2 },
          { tab: 'teams', label: 'Teams', icon: Users },
          { tab: 'matches', label: 'Matches', icon: Calendar },
          { tab: 'tournaments', label: 'Leagues', icon: Trophy },
          { tab: 'stats', label: 'Leaderboard', icon: TrendingUp },
          { tab: 'profile', label: 'ID Card', icon: User },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab && !selectedMatchId;
          return (
            <button
              key={item.tab}
              onClick={() => {
                setSelectedMatchId(null);
                setActiveTab(item.tab);
              }}
              className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${
                isActive ? 'text-emerald-600 scale-105 font-bold' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
