/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tournament, Team, Match, TournamentFixture } from '../types';
import { 
  Trophy, 
  MapPin, 
  Calendar, 
  Plus, 
  ArrowLeft, 
  Play, 
  Grid2X2, 
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TournamentsTabProps {
  tournaments: Tournament[];
  teams: Team[];
  matches: Match[];
  onAddTournament: (name: string, format: 'league' | 'knockout', teamIds: string[]) => void;
  onLaunchMatchFromTournament: (matchId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const TournamentsTab: React.FC<TournamentsTabProps> = ({
  tournaments,
  teams,
  matches,
  onAddTournament,
  onLaunchMatchFromTournament,
  setActiveTab,
}) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [tourName, setTourName] = useState('');
  const [tourFormat, setTourFormat] = useState<'league' | 'knockout'>('league');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const selectedTour = tournaments.find(t => t.id === selectedTourId);

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourName.trim()) return;
    if (selectedTeamIds.length < 2) {
      alert('Please select at least 2 teams for the tournament.');
      return;
    }
    onAddTournament(tourName.trim(), tourFormat, selectedTeamIds);
    setTourName('');
    setSelectedTeamIds([]);
    setIsCreating(false);
  };

  const toggleTeamSelect = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const getTeamLogoColor = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logo || 'bg-gray-400 text-white';
  };

  const handleLaunchScoreboard = (matchId: string) => {
    onLaunchMatchFromTournament(matchId);
    setActiveTab('score');
  };

  return (
    <div className="space-y-6" id="tournament-portal">
      <AnimatePresence mode="wait">
        {!selectedTourId ? (
          // TOURNAMENTS DIRECTORY
          <motion.div
            key="tournaments-list"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-5"
          >
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-display font-black text-gray-900 tracking-tight">Tournaments Panel</h2>
                <p className="text-xs text-gray-500 font-medium">Configure championship series, leagues and schedules</p>
              </div>
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 active:scale-95 shadow"
              >
                <Plus className="w-4 h-4" />
                New Tournament
              </button>
            </div>

            {/* Create Tournament Form */}
            <AnimatePresence>
              {isCreating && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateTournament}
                  className="overflow-hidden bg-white border border-slate-200 p-5 rounded-xl gap-4 space-y-4 shadow"
                >
                  <h3 className="font-display font-bold text-sm text-slate-800">Assign Championship Setup</h3>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Tournament Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gully Premier League 2026"
                        value={tourName}
                        onChange={e => setTourName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Game Format</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTourFormat('league')}
                          className={`flex-1 py-1.5 border rounded-lg text-xs font-bold transition ${
                            tourFormat === 'league' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600'
                          }`}
                        >
                          🔄 Round-Robin League
                        </button>
                        <button
                          type="button"
                          onClick={() => setTourFormat('knockout')}
                          className={`flex-1 py-1.5 border rounded-lg text-xs font-bold transition ${
                            tourFormat === 'knockout' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600'
                          }`}
                        >
                          ⚔️ Knockout brackets
                        </button>
                      </div>
                    </div>

                    {/* Enroll Teams Checklist */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Enroll Teams (Check at least 2)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {teams.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTeamSelect(t.id)}
                            className={`p-2.5 border rounded-xl text-left font-bold transition flex items-center justify-between ${
                              selectedTeamIds.includes(t.id) 
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-550/20' 
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full ${t.logo} text-[9px] flex items-center justify-center`}>
                                {t.name.substring(0,2)}
                              </span>
                              {t.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {selectedTeamIds.includes(t.id) ? '✅ Enrolled' : 'Join'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 font-sans">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-xs font-extrabold hover:bg-emerald-700 transition"
                    >
                      Incorporate Tournament
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List tournaments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tournaments.map(tour => (
                <div
                  key={tour.id}
                  onClick={() => setSelectedTourId(tour.id)}
                  className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-sm transition cursor-pointer flex flex-col justify-between h-40 group active:scale-98"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-800">
                        {tour.format === 'league' ? '🔄 Round Robin' : '⚔️ Knockout'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">{tour.status.toUpperCase()}</span>
                    </div>
                    <h3 className="font-display font-black text-slate-900 group-hover:text-emerald-600 text-sm transition leading-tight">
                      {tour.name}
                    </h3>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400 font-medium">
                      {tour.teamIds.length} Teams Enrolled
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      Explore Series <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          // TOURNAMENT DETAILS (STANDINGS & FIXTURES)
          <motion.div
            key="tournament-details"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="space-y-6"
          >
            {/* Header info panel */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs space-y-3 font-sans">
              <button
                onClick={() => setSelectedTourId(null)}
                className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Tournaments directory
              </button>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-800 font-mono">
                    CHAMPIONSHIP ARENA • {selectedTour?.format.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-display font-black text-slate-900 tracking-tight mt-1">{selectedTour?.name}</h2>
                </div>
                <div className="text-xs text-slate-400 font-semibold font-mono">
                  {selectedTour?.teamIds.length} CLUBS ENROLLED
                </div>
              </div>
            </div>

            {/* Standings list (Points Table) if League Format */}
            {selectedTour?.format === 'league' && (
              <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs space-y-3.5 font-sans">
                <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
                  <h3 className="text-xs font-display font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Grid2X2 className="w-4 h-4 text-emerald-600" /> League Standing (Points Table)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">NRR PRECEDENCE</span>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/20">
                  <table className="w-full text-left text-xs text-slate-705">
                    <thead className="bg-slate-50 text-slate-505 font-bold border-b border-slate-100 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Rank & Club Team</th>
                        <th className="p-3 text-center font-mono">Played</th>
                        <th className="p-3 text-center font-mono">Won</th>
                        <th className="p-3 text-center font-mono">Lost</th>
                        <th className="p-3 text-center font-mono">Tied</th>
                        <th className="p-3 text-center font-mono">Nett RR</th>
                        <th className="p-3 text-center font-mono text-emerald-600 font-black">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(() => {
                        // Dynamically calculate and sort tournament standings
                        const standingsList = selectedTour.teamIds.map(teamId => {
                          const team = teams.find(t => t.id === teamId)!;
                          return {
                            ...team,
                          };
                        });

                        // Sort by Points DESC, then by net run rate (nrr) DESC
                        const sortedStandings = standingsList.sort((a, b) => {
                          if (b.points !== a.points) return b.points - a.points;
                          return b.nrr - a.nrr;
                        });

                        return sortedStandings.map((team, index) => (
                          <tr key={team.id} className="hover:bg-slate-50/30">
                            <td className="p-3 font-extrabold text-slate-800 flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {index + 1}
                              </span>
                              <span className={`w-5.5 h-5.5 rounded-full ${team.logo} flex items-center justify-center text-[8px] uppercase`}>
                                {team.name.substring(0,2)}
                              </span>
                              {team.name}
                            </td>
                            <td className="p-3 text-center font-mono">{team.played}</td>
                            <td className="p-3 text-center font-mono text-emerald-600">{team.won}</td>
                            <td className="p-3 text-center font-mono text-rose-500">{team.lost}</td>
                            <td className="p-3 text-center font-mono text-slate-600">{team.tied}</td>
                            <td className="p-3 text-center font-mono">
                              {team.nrr >= 0 ? '+' : ''}{team.nrr.toFixed(3)}
                            </td>
                            <td className="p-3 text-center font-mono text-emerald-600 font-black text-sm">{team.points}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fixtures & Results summary list */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs space-y-4 font-sans">
              <div className="border-b border-slate-150 pb-2.5">
                <h3 className="text-xs font-display font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" /> Match Fixtures Log ({selectedTour?.fixtures.length || 0})
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {selectedTour?.fixtures.map((f, fIdx) => {
                  const m = matches.find(matchItem => matchItem.id === f.matchId);
                  if (!m) return null;
                  
                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleLaunchScoreboard(m.id)}
                      className="border border-slate-250 hover:border-slate-400 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm cursor-pointer transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-50 text-slate-600 border border-slate-150 font-bold font-mono px-2 py-0.5 rounded">
                            {f.round}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{m.date}</span>
                        </div>

                        {/* Match contenders */}
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <span className="font-extrabold text-slate-800">{getTeamName(m.teamAId)}</span>
                          <span className="text-slate-400 text-xs">vs</span>
                          <span className="font-extrabold text-slate-800">{getTeamName(m.teamBId)}</span>
                        </div>
                      </div>

                      {/* Launch/Score results trigger */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {m.venue}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          {m.status === 'completed' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded">🏆 Results Done</span>
                          ) : m.status === 'live' || m.status === 'toss' ? (
                            <span className="text-rose-600 animate-pulse bg-rose-50 px-2.5 py-1 rounded flex items-center gap-1">🔴 Score Live</span>
                          ) : (
                            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded flex items-center gap-1">🚀 Launch Scoreboard <ChevronRight className="w-3.5 h-3.5" /></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
