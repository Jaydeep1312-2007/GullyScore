/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Team } from '../types';
import { 
  TrendingUp, 
  Search, 
  Award, 
  Zap, 
  Flame, 
  Focus, 
  Briefcase, 
  BookOpen, 
  GitCommit,
  User,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatsTabProps {
  players: Player[];
  teams: Team[];
}

export const StatsTab: React.FC<StatsTabProps> = ({
  players,
  teams,
}) => {
  const [leadCategory, setLeadCategory] = useState<'runs' | 'wickets' | 'strike_rate' | 'economy'>('runs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const getTeamName = (playerId: string) => {
    const parentTeam = teams.find(t => t.playerIds.includes(playerId));
    return parentTeam ? parentTeam.name : 'Free Agent';
  };

  const getTeamLogoColor = (playerId: string) => {
    const parentTeam = teams.find(t => t.playerIds.includes(playerId));
    return parentTeam ? parentTeam.logo : 'bg-gray-400 text-white';
  };

  // Filter and sort leader tables
  const leadTableData = (() => {
    switch (leadCategory) {
      case 'runs':
        return [...players].sort((a, b) => b.runsScored - a.runsScored);
      case 'wickets':
        return [...players].sort((a, b) => b.wicketsTaken - a.wicketsTaken);
      case 'strike_rate':
        // filter players with at least 15 career runs to avoid extreme division anomalies
        return [...players]
          .filter(p => p.runsScored >= 15)
          .sort((a, b) => {
            const srA = a.ballsFaced > 0 ? (a.runsScored / a.ballsFaced) * 100 : 0;
            const srB = b.ballsFaced > 0 ? (b.runsScored / b.ballsFaced) * 100 : 0;
            return srB - srA;
          });
      case 'economy':
        // filter bowlers with at least 2 overs bowled (12 balls)
        return [...players]
          .filter(p => p.ballsBowled >= 12)
          .sort((a, b) => {
            const ecA = a.ballsBowled > 0 ? (a.runsConceded / a.ballsBowled) * 6 : 99;
            const ecB = b.ballsBowled > 0 ? (b.runsConceded / b.ballsBowled) * 6 : 99;
            return ecA - ecB; // Lowest is best!
          });
      default:
        return players;
    }
  })();

  const searchedPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lookupPlayerObj = players.find(p => p.id === selectedPlayerId);

  return (
    <div className="space-y-6" id="gully-stats-portal">
      
      {/* Search and lookup board */}
      <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-205 space-y-4 font-sans">
        <div>
          <h2 className="text-md font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-500" /> Player Profile Search & Lookup
          </h2>
          <p className="text-xs text-slate-500 font-medium">Lookup batsman strike rates, bowling averages, and individual history logs</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by player name e.g. Jaydeep..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-emerald-500 transition"
          />
        </div>

        {/* Dropdown list for matching search */}
        {searchQuery.trim().length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white max-h-48 overflow-y-auto text-xs font-semibold">
            {searchedPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPlayerId(p.id);
                  setSearchQuery('');
                }}
                className="w-full text-left p-3.5 hover:bg-slate-50 transition flex items-center justify-between"
              >
                <span>{p.name} ({p.role})</span>
                <span className="text-emerald-600 font-bold">{p.runsScored} Runs • {p.wicketsTaken} Wkts</span>
              </button>
            ))}
          </div>
        )}

        {/* Individual Player details presentation */}
        <AnimatePresence>
          {lookupPlayerObj && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border border-emerald-500/15 p-5 rounded-lg space-y-4 relative"
            >
              <button 
                onClick={() => setSelectedPlayerId(null)} 
                className="absolute top-4 right-4 text-[10px] bg-white border border-gray-200 hover:bg-slate-50 text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded"
              >
                Close Profile
              </button>

              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-full ${getTeamLogoColor(lookupPlayerObj.id)} font-bold flex items-center justify-center`}>
                  {lookupPlayerObj.name.substring(0,2)}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 leading-none">
                    {lookupPlayerObj.name}
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 uppercase bg-indigo-100 text-indigo-700 rounded-full">
                      {lookupPlayerObj.role}
                    </span>
                  </h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Playing Club: <strong className="text-gray-600">{getTeamName(lookupPlayerObj.id)}</strong></span>
                </div>
              </div>

              {/* Grid block for stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">Batting Runs</span>
                  <span className="text-md font-mono font-black text-slate-800">{lookupPlayerObj.runsScored}</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Wickets</span>
                  <span className="text-md font-mono font-black text-emerald-600">{lookupPlayerObj.wicketsTaken}</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">Bat Strike Rate</span>
                  <span className="text-md font-mono font-black text-indigo-600">
                    {lookupPlayerObj.ballsFaced > 0 
                      ? ((lookupPlayerObj.runsScored / lookupPlayerObj.ballsFaced) * 100).toFixed(1) 
                      : '0.0'
                    }
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">Overs Bowled</span>
                  <span className="text-md font-mono font-black text-slate-800">
                    {Math.floor(lookupPlayerObj.ballsBowled / 6)}.{lookupPlayerObj.ballsBowled % 6}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 leading-relaxed font-mono grid grid-cols-2 gap-2 text-left pt-1 border-t border-slate-250">
                <div>Fifties scored: <b className="text-slate-850 font-bold">{lookupPlayerObj.fifties || 0}</b></div>
                <div>Hundreds scored: <b className="text-slate-850 font-bold">{lookupPlayerObj.hundreds || 0}</b></div>
                <div>Career High-Score: <b className="text-slate-850 font-bold">{lookupPlayerObj.highScore || 0} runs</b></div>
                <div>Runs Conceded: <b className="text-slate-850 font-bold">{lookupPlayerObj.runsConceded || 0} runs</b></div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Leaderboard Panel */}
      <div className="bg-white border border-slate-200/85 p-5 rounded-xl shadow-xs space-y-4 font-sans">
        
        {/* Toggle Categories */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-display font-black text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
            <Award className="w-5 h-5 text-amber-500" /> Gully Championship Leaderboards
          </h3>
          
          <div className="flex bg-slate-50 p-1 rounded-xl text-[10px] font-bold border border-slate-150">
            {[
              { key: 'runs', label: 'Runs 👑' },
              { key: 'wickets', label: 'Wickets ⚾' },
              { key: 'strike_rate', label: 'Str. Rate ⚡' },
              { key: 'economy', label: 'Econ ⭐' },
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setLeadCategory(cat.key as any)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                  leadCategory === cat.key ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabular Leaders View */}
        <div className="overflow-hidden border border-slate-150 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 uppercase text-[10px]">
              <tr>
                <th className="p-3">Rank & Player</th>
                <th className="p-3">Club</th>
                <th className="p-3 text-right">Played</th>
                <th className="p-3 text-right font-mono">
                  {leadCategory === 'runs' && 'Runs Scored'}
                  {leadCategory === 'wickets' && 'Wickets'}
                  {leadCategory === 'strike_rate' && 'St. Rate'}
                  {leadCategory === 'economy' && 'Economy'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium font-sans">
              {leadTableData.slice(0, 10).map((player, idx) => {
                const isTop1 = idx === 0;
                let valueToDisplay = '';
                if (leadCategory === 'runs') valueToDisplay = `${player.runsScored} runs`;
                else if (leadCategory === 'wickets') valueToDisplay = `${player.wicketsTaken} wkts`;
                else if (leadCategory === 'strike_rate') {
                  valueToDisplay = player.ballsFaced > 0 
                    ? ((player.runsScored / player.ballsFaced) * 100).toFixed(1) 
                    : '0.0';
                } else if (leadCategory === 'economy') {
                  valueToDisplay = player.ballsBowled > 0 
                    ? ((player.runsConceded / player.ballsBowled) * 6).toFixed(2) 
                    : '0.00';
                }

                return (
                  <tr 
                    key={player.id} 
                    onClick={() => setSelectedPlayerId(player.id)}
                    className="hover:bg-slate-50/45 cursor-pointer"
                  >
                    <td className="p-3 font-extrabold text-slate-800 flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isTop1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-150 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      {player.name}
                    </td>
                    <td className="p-3 text-slate-400">{getTeamName(player.id)}</td>
                    <td className="p-3 text-right text-slate-400">{player.matchesPlayed}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600 text-sm">{valueToDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
