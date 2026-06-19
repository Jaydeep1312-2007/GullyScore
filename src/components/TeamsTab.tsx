/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Team, Player } from '../types';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Award, 
  ChevronRight, 
  Plus, 
  Flame, 
  CheckCircle, 
  ArrowLeft,
  Briefcase,
  GitCommit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeamsTabProps {
  teams: Team[];
  players: Player[];
  onAddTeam: (name: string, logo: string, initialPlayerNames?: string[]) => void;
  onAddPlayer: (teamId: string, name: string, role: Player['role'], battingStyle: Player['battingStyle'], bowlingStyle: Player['bowlingStyle']) => void;
  onAssignLeadership: (teamId: string, captainId: string | null, viceCaptainId: string | null) => void;
}

const LOGO_PRESETS = [
  'bg-orange-500 text-white',
  'bg-purple-600 text-white',
  'bg-emerald-600 text-white',
  'bg-rose-600 text-white',
  'bg-indigo-600 text-white',
  'bg-sky-600 text-white',
  'bg-amber-500 text-slate-900',
  'bg-slate-800 text-white'
];

export const TeamsTab: React.FC<TeamsTabProps> = ({
  teams,
  players,
  onAddTeam,
  onAddPlayer,
  onAssignLeadership,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // Form states - Create Team
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState(LOGO_PRESETS[0]);
  const [initialPlayerNames, setInitialPlayerNames] = useState<string[]>([]);
  const [playerInputName, setPlayerInputName] = useState('');

  const handleAddInitialPlayer = () => {
    const trimmed = playerInputName.trim();
    if (trimmed && !initialPlayerNames.includes(trimmed)) {
      setInitialPlayerNames([...initialPlayerNames, trimmed]);
      setPlayerInputName('');
    }
  };

  const handleRemoveInitialPlayer = (index: number) => {
    setInitialPlayerNames(initialPlayerNames.filter((_, i) => i !== index));
  };

  // Form states - Add Player
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [pName, setPName] = useState('');
  const [pRole, setPRole] = useState<Player['role']>('Batsman');
  const [pBat, setPBat] = useState<Player['battingStyle']>('Right-hand');
  const [pBowl, setPBowl] = useState<Player['bowlingStyle']>('None');

  // Leadership Assignment helper
  const [captainSelect, setCaptainSelect] = useState<string>('');
  const [viceCaptainSelect, setViceCaptainSelect] = useState<string>('');

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const teamPlayers = selectedTeam ? players.filter(p => selectedTeam.playerIds.includes(p.id)) : [];

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    const finalPlayersList = [...initialPlayerNames];
    const residualPlayer = playerInputName.trim();
    if (residualPlayer && !finalPlayersList.includes(residualPlayer)) {
      finalPlayersList.push(residualPlayer);
    }
    
    onAddTeam(newTeamName.trim(), newTeamLogo, finalPlayersList);
    setNewTeamName('');
    setPlayerInputName('');
    setInitialPlayerNames([]);
    setIsCreatingTeam(false);
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !pName.trim()) return;
    onAddPlayer(selectedTeamId, pName.trim(), pRole, pBat, pBowl);
    setPName('');
    setPRole('Batsman');
    setPBat('Right-hand');
    setPBowl('None');
    setIsAddingPlayer(false);
  };

  const handleLeadershipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    onAssignLeadership(selectedTeamId, captainSelect || null, viceCaptainSelect || null);
  };

  return (
    <div className="space-y-6" id="teams-tab">
      <AnimatePresence mode="wait">
        {!selectedTeamId ? (
          // MAIN TEAMS VIEW
          <motion.div
            key="teams-list"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-slate-250">
              <div>
                <h2 className="text-sm font-display font-black text-slate-900 tracking-tight uppercase">Teams Registry</h2>
                <p className="text-xs text-slate-500">Manage cricket squads, players and statistics</p>
              </div>
              <button
                onClick={() => setIsCreatingTeam(!isCreatingTeam)}
                className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer font-sans"
              >
                <Plus className="w-4 h-4" />
                New Team
              </button>
            </div>

            {/* Create Team Form collapsible */}
            <AnimatePresence>
              {isCreatingTeam && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateTeamSubmit}
                  className="overflow-hidden bg-white border border-slate-300 p-5 rounded-xl space-y-4 shadow-sm"
                >
                  <h3 className="font-display font-extrabold text-sm text-slate-950 uppercase tracking-tight">Register New Gully Team</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 font-mono uppercase">Team Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Street Warriors, Maidan Kings"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 transition font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 font-mono uppercase">Team Emblem Theme</label>
                      <div className="flex flex-wrap gap-2.5">
                        {LOGO_PRESETS.map((logo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewTeamLogo(logo)}
                            className={`w-9 h-9 rounded-full ${logo} flex items-center justify-center font-bold text-xs uppercase shadow-xs relative transition transform active:scale-90 cursor-pointer ${
                              newTeamLogo === logo ? 'ring-2 ring-offset-2 ring-emerald-500 scale-105' : 'opacity-80'
                            }`}
                          >
                            🏏
                            {newTeamLogo === logo && (
                              <CheckCircle className="absolute -bottom-1 -right-1 w-4 h-4 text-emerald-600 bg-white rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 mb-1 font-mono uppercase">Squad Registrations</label>
                      <p className="text-[10px] text-slate-400 mb-2">Build your squad list immediately. Enter a player name and click "Add Player" or press Enter.</p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Player name (e.g. Rohit Sharma, Jasprit Bumrah)"
                          value={playerInputName}
                          onChange={e => setPlayerInputName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddInitialPlayer();
                            }
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition font-sans"
                        />
                        <button
                          type="button"
                          onClick={handleAddInitialPlayer}
                          className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-4 py-2 rounded-lg transition active:scale-95 font-sans font-bold cursor-pointer"
                        >
                          Add Player
                        </button>
                      </div>

                      {initialPlayerNames.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-slate-150 bg-slate-50 rounded-lg">
                          {initialPlayerNames.map((name, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium shadow-xs font-sans"
                            >
                              🏏 {name}
                              <button
                                type="button"
                                onClick={() => handleRemoveInitialPlayer(index)}
                                className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                title="Remove player"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTeamName('');
                        setPlayerInputName('');
                        setInitialPlayerNames([]);
                        setIsCreatingTeam(false);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer font-sans"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 text-slate-950 px-5 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition cursor-pointer font-sans"
                    >
                      Save Team
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List of Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => {
                const teamCaptain = players.find(p => p.id === team.captainId);
                const teamSize = team.playerIds.length;
                return (
                  <div
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setCaptainSelect(team.captainId || '');
                      setViceCaptainSelect(team.viceCaptainId || '');
                    }}
                    className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between group active:scale-98"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-12 h-12 rounded-xl ${team.logo} flex items-center justify-center font-display font-extrabold text-lg uppercase shadow-sm`}>
                        {team.name.substring(0, 2)}
                      </span>
                      <div className="space-y-0.5">
                        <h3 className="font-display font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition">
                          {team.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium font-sans">
                          {teamSize} Squad Members • Captain: <strong className="text-slate-700">{teamCaptain ? teamCaptain.name : 'Not Assigned'}</strong>
                        </p>
                        <div className="flex gap-4 pt-1 font-mono text-[10px] text-slate-500">
                          <span>Played: <strong className="text-slate-800">{team.played}</strong></span>
                          <span className="text-emerald-600 font-bold">Won: <strong>{team.won}</strong></span>
                          <span className="text-rose-600 font-bold">Lost: <strong>{team.lost}</strong></span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          // SELECTED TEAM DETAILED SQUAD PANEL
          <motion.div
            key="team-details"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="space-y-6"
          >
            {/* Header Detail Box */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs space-y-4">
              <button
                onClick={() => {
                  setSelectedTeamId(null);
                  setIsAddingPlayer(false);
                }}
                className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 hover:underline cursor-pointer font-sans"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Teams Registry
              </button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`w-14 h-14 rounded-xl ${selectedTeam?.logo} flex items-center justify-center font-display font-black text-2xl uppercase shadow-sm`}>
                    {selectedTeam?.name.substring(0, 2)}
                  </span>
                  <div>
                    <h2 className="text-lg font-display font-black text-slate-900 tracking-tight leading-tight uppercase">{selectedTeam?.name}</h2>
                    <p className="text-xs text-slate-500 font-sans">Manage Squad, leadership configurations, and profiles</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsAddingPlayer(!isAddingPlayer)}
                    className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer font-sans"
                  >
                    <UserPlus className="w-4 h-4" /> Add Player
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Leadership & Management Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Squad List column */}
              <div className="md:col-span-2 bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-display font-black text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" /> Playing Squad ({teamPlayers.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase">STREET REGISTRATION</span>
                </div>

                {/* Add Player Inline Box */}
                <AnimatePresence>
                  {isAddingPlayer && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddPlayerSubmit}
                      className="overflow-hidden bg-slate-50 border border-emerald-500/10 p-4 rounded-lg space-y-4 mb-4"
                    >
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Enter Player Specifications
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Suresh Kumar"
                            value={pName}
                            onChange={e => setPName(e.target.value)}
                            className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Player Role</label>
                          <select
                            value={pRole}
                            onChange={e => setPRole(e.target.value as Player['role'])}
                            className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                          >
                            <option>Batsman</option>
                            <option>Bowler</option>
                            <option>All-rounder</option>
                            <option>Wicketkeeper</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Batting Style</label>
                          <select
                            value={pBat}
                            onChange={e => setPBat(e.target.value as Player['battingStyle'])}
                            className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                          >
                            <option>Right-hand</option>
                            <option>Left-hand</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Bowling Style</label>
                          <select
                            value={pBowl}
                            onChange={e => setPBowl(e.target.value as Player['bowlingStyle'])}
                            className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                          >
                            <option>None</option>
                            <option>Right-arm Fast</option>
                            <option>Left-arm Fast</option>
                            <option>Right-arm Spin</option>
                            <option>Left-arm Spin</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingPlayer(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-emerald-400 cursor-pointer"
                        >
                          Add Player
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-3.5">
                  {teamPlayers.map(player => {
                    const isCap = player.id === selectedTeam?.captainId;
                    const isVice = player.id === selectedTeam?.viceCaptainId;
                    return (
                      <div 
                        key={player.id}
                        className="p-3.5 border border-slate-200/80 rounded-xl hover:border-emerald-500/20 hover:bg-slate-50/50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${isCap ? 'bg-amber-100 text-amber-700' : isVice ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'} flex items-center justify-center font-bold text-xs`}>
                            {isCap ? '👑' : isVice ? '⭐' : '🏏'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="font-semibold text-sm text-slate-800">{player.name}</span>
                              {isCap && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-700 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                  Captain
                                </span>
                              )}
                              {isVice && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                  Vice-Cap
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-450 mt-0.5 flex items-center gap-2 font-medium">
                              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {player.role}</span>
                              <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" /> {player.battingStyle} Bat</span>
                              {player.bowlingStyle !== 'None' && <span>• {player.bowlingStyle}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Performance Highlights */}
                        <div className="text-right font-mono text-[11px] space-y-0.5 text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                          <div>Runs: <strong className="text-slate-800 font-bold">{player.runsScored}</strong></div>
                          <div>Wkts: <strong className="text-emerald-600 font-bold">{player.wicketsTaken}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leadership assignments sidebar */}
              <div className="space-y-4">
                <form 
                  onSubmit={handleLeadershipSubmit}
                  className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4"
                >
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-display font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" /> Assign Leadership
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1.5">Assign Captain 👑</label>
                      <select
                        value={captainSelect}
                        onChange={e => setCaptainSelect(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                      >
                        <option value="">-- No Captain Selected --</option>
                        {teamPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1.5">Assign Vice-Captain ⭐</label>
                      <select
                        value={viceCaptainSelect}
                        onChange={e => setViceCaptainSelect(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                      >
                        <option value="">-- No Vice-Captain Selected --</option>
                        {teamPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-xs hover:bg-slate-800 active:scale-95 transition-all mt-2 cursor-pointer shadow-sm font-sans"
                    >
                      Update Team Chiefs
                    </button>
                  </div>
                </form>

                {/* Team Standing Metrics */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 text-slate-100 p-5 rounded-xl space-y-3.5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" /> Team League Performance
                  </h4>
                  <div className="grid grid-cols-2 gap-3.5 font-mono text-center">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-750">
                      <span className="text-[9px] text-slate-400 block uppercase font-mono">WIN RATIO</span>
                      <span className="text-md font-bold text-white">
                        {selectedTeam && selectedTeam.played > 0 
                          ? `${Math.round((selectedTeam.won / selectedTeam.played) * 100)}%` 
                          : '0%'
                        }
                      </span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-750">
                      <span className="text-[9px] text-slate-400 block uppercase font-mono">NET RUN RATE</span>
                      <span className="text-md font-bold text-emerald-400">
                        {selectedTeam && selectedTeam.nrr >= 0 ? '+' : ''}
                        {selectedTeam?.nrr.toFixed(3) || '0.000'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Net Run Rate (NRR) determines league placement when teams are level on tournament points. Complete standard target chases to boost NRR!
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
