/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Team } from '../types';
import { 
  User, 
  Sparkles, 
  Award, 
  Settings, 
  Plus, 
  CheckCircle, 
  Activity, 
  RotateCcw, 
  Star,
  Users,
  Briefcase,
  GitCommit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileTabProps {
  players: Player[];
  teams: Team[];
  currentUserProfile: { name: string; role: string; runs: number; wickets: number } | null;
  onUpdateUserProfile: (name: string, role: string, runs: number, wickets: number) => void;
  onLinkProfileToPlayer: (playerId: string) => void;
  onAffiliatePlayerToTeam: (playerId: string, teamId: string) => void;
  selectedPlayerProfileId: string | null;
  onLogout: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  players,
  teams,
  currentUserProfile,
  onUpdateUserProfile,
  onLinkProfileToPlayer,
  onAffiliatePlayerToTeam,
  selectedPlayerProfileId,
  onLogout,
}) => {
  const [isRegistering, setIsRegistering] = useState(!currentUserProfile);
  const [regName, setRegName] = useState(currentUserProfile?.name || '');
  const [regRole, setRegRole] = useState(currentUserProfile?.role || 'All-rounder');
  const [linkSelectionId, setLinkSelectionId] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const activeConnectedPlayerObj = players.find(p => p.id === selectedPlayerProfileId);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    onUpdateUserProfile(regName.trim(), regRole, 0, 0);
    setIsRegistering(false);
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSelectionId) return;
    onLinkProfileToPlayer(linkSelectionId);
    setSuccessNotice('Connection established successfully! Career stats synced.');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'None Assigned';
  };

  const handleSelectAffiliation = (teamId: string) => {
    if (!selectedPlayerProfileId) return;
    onAffiliatePlayerToTeam(selectedPlayerProfileId, teamId);
    setSuccessNotice(`Enrolled into ${getTeamName(teamId)} playing squad successfully!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6" id="profiles-tab-portal">
      <AnimatePresence mode="wait">
        {isRegistering ? (
          // PROFILE CREATION / LOG-IN FORM
          <motion.form
            key="profile-registration"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            onSubmit={handleRegisterSubmit}
            className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-xs max-w-md mx-auto space-y-4 font-sans"
          >
            <div className="text-center space-y-2">
              <span className="text-6xl">🏏</span>
              <h2 className="text-xl font-display font-black text-slate-900 tracking-tight">Create Gully Score ID</h2>
              <p className="text-xs text-slate-500">Register your cricketer profile to tracking performance stats and matches</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Cricketer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jaydeep Darji"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Your Speciality Role</label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 text-sm bg-white"
                >
                  <option>Batsman</option>
                  <option>Bowler</option>
                  <option>All-rounder</option>
                  <option>Wicketkeeper</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-lg hover:bg-emerald-700 transition active:scale-95 shadow cursor-pointer text-xs uppercase tracking-wider"
              >
                Register & Enter App 🚀
              </button>
            </div>

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold font-mono">
                Gully Score ID provides an offline local account on this browser.
              </p>
            </div>
          </motion.form>
        ) : (
          // LOGGED IN VIEW WITH PROFILE PANEL
          <motion.div
            key="profile-details-active"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-6"
          >
            {/* Main personal card banner */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  <span className="w-16 h-16 rounded-full bg-teal-600 border-4 border-slate-700 flex items-center justify-center text-3xl select-none">
                    🧔
                  </span>
                  <div>
                    <h2 className="text-xl font-display font-black tracking-tight flex items-center gap-2">
                      {currentUserProfile?.name}
                      <span className="text-[9px] font-extrabold bg-teal-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                        {currentUserProfile?.role}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Cricketer ID: <code className="text-teal-300 font-mono">GULLY_PLAYER_{selectedPlayerProfileId || 'VIRTUAL'}</code>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsRegistering(true)}
                    className="bg-white/10 hover:bg-white/15 text-white font-bold p-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                  >
                    <Settings className="w-4 h-4" /> Edit Specs
                  </button>
                  <button
                    onClick={onLogout}
                    className="bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-rose-200 hover:text-white font-bold p-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Quick stats connection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile connection checker */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Career highlights statistics */}
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                    <h3 className="text-xs font-display font-black text-gray-800 tracking-wider uppercase flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-amber-500" /> Career Profile Analysis
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase font-mono">ACTIVE SQUAD DATA</span>
                  </div>

                  {activeConnectedPlayerObj ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-center">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Played</span>
                          <span className="text-lg font-mono font-black text-slate-800">{activeConnectedPlayerObj.matchesPlayed}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Runs Logged</span>
                          <span className="text-lg font-mono font-black text-slate-800">{activeConnectedPlayerObj.runsScored}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Wickets</span>
                          <span className="text-lg font-mono font-black text-teal-600">{activeConnectedPlayerObj.wicketsTaken}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Strike Rate</span>
                          <span className="text-lg font-mono font-black text-indigo-600">
                            {activeConnectedPlayerObj.ballsFaced > 0 
                              ? ((activeConnectedPlayerObj.runsScored / activeConnectedPlayerObj.ballsFaced) * 100).toFixed(1) 
                              : '0.0'
                            }
                          </span>
                        </div>
                      </div>

                      {/* sub stats logs */}
                      <div className="text-xs text-gray-500 border-t border-slate-100 pt-3.5 space-y-2">
                        <p className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                          <span>Batting orientation:</span>
                          <b className="text-slate-800">{activeConnectedPlayerObj.battingStyle}</b>
                        </p>
                        <p className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                          <span>Bowling Style:</span>
                          <b className="text-slate-800">{activeConnectedPlayerObj.bowlingStyle}</b>
                        </p>
                        <p className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                          <span>Career High-Score:</span>
                          <b className="text-slate-800 font-mono font-bold">{activeConnectedPlayerObj.highScore} runs</b>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-xs">
                      No linked league squad cricketer selected. Connect your profile to a listed guild squad player below to load league stats!
                    </div>
                  )}
                </div>

                {/* Team affiliation panel */}
                {selectedPlayerProfileId && (
                  <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-2.5">
                      <h3 className="text-xs font-display font-black text-gray-800 tracking-wider uppercase flex items-center gap-1.5">
                        <Users className="w-5 h-5 text-teal-600" /> Join Local Street Club
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Enroll your player specifications into any neighborhood cricket team's roster</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {teams.map(team => {
                        const isMember = team.playerIds.includes(selectedPlayerProfileId);
                        return (
                          <div 
                            key={team.id}
                            className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-center justify-between shadow-sm text-xs font-semibold"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full ${team.logo} text-[9px] flex items-center justify-center font-bold`}>
                                {team.name.substring(0, 2)}
                              </span>
                              {team.name}
                            </span>

                            {isMember ? (
                              <span className="text-teal-600 font-bold bg-white px-2.5 py-1 rounded border border-teal-200">Enrolled ✅</span>
                            ) : (
                              <button
                                onClick={() => handleSelectAffiliation(team.id)}
                                className="bg-teal-600 text-white font-bold px-3 py-1 rounded cursor-pointer hover:bg-teal-700 text-[11px]"
                              >
                                Join Club
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                         {/* Sidebar connection tools */}
              <div className="space-y-4 font-sans">
                <form 
                  onSubmit={handleLinkSubmit}
                  className="bg-white border border-slate-205 p-5 rounded-xl shadow-xs space-y-3"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-display font-black text-slate-900 uppercase tracking-wide flex items-center gap-1">
                      <Plus className="w-4 h-4 text-emerald-500" /> Link Roster Player
                    </h3>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      To track live match score calculations under your career stats, connect your profile ID with any cricketer registered in a squad roster!
                    </p>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Select Cricketer Name</label>
                      <select
                        value={linkSelectionId}
                        onChange={e => setLinkSelectionId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:border-emerald-500 text-xs transition"
                      >
                        <option value="">-- Choose Player --</option>
                        {players.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!linkSelectionId}
                      className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg border border-slate-900 hover:bg-slate-800 transition-all text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Establish Connection 🔗
                    </button>
                  </div>
                </form>

                {/* Account info details */}
                <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Gully Status Monitor
                  </h4>
                  <div className="space-y-1 text-[11px] text-slate-400 leading-normal font-medium">
                    <div>User Local: <span className="font-mono text-slate-750 font-bold">Authenticated</span></div>
                    <div>Session Key: <span className="font-mono text-slate-750 font-bold">GULLY_OFFLINE_v1</span></div>
                    <div>Cloud Sync: <span className="font-mono text-emerald-600 font-bold">Cached local cache</span></div>
                  </div>
                </div>
              </div>        </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
