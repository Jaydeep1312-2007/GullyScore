/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Team } from '../types';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Play, 
  Plus, 
  FileText, 
  CheckCircle, 
  Trophy, 
  Hourglass,
  SlidersHorizontal,
  ChevronRight,
  ShieldEllipsis
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatchesTabProps {
  matches: Match[];
  teams: Team[];
  onAddMatch: (teamAId: string, teamBId: string, venue: string, date: string, time: string, overs: number) => void;
  onSelectMatch: (matchId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const MatchesTab: React.FC<MatchesTabProps> = ({
  matches,
  teams,
  onAddMatch,
  onSelectMatch,
  setActiveTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all');
  const [isScheduling, setIsScheduling] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [teamASelected, setTeamASelected] = useState('');
  const [teamBSelected, setTeamBSelected] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [oversCount, setOversCount] = useState(5);

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'scheduled') return m.status === 'scheduled';
    if (filter === 'live') return m.status === 'live' || m.status === 'toss';
    if (filter === 'completed') return m.status === 'completed';
    return true;
  });

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getTeamLogoColor = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.logo : 'bg-gray-400 text-white';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamASelected || !teamBSelected) {
      setValidationError('Please select both teams.');
      return;
    }
    if (teamASelected === teamBSelected) {
      setValidationError('Home team and Away team cannot be the same.');
      return;
    }
    setValidationError(null);
    onAddMatch(teamASelected, teamBSelected, venue.trim(), date, time, oversCount);
    
    // reset
    setTeamASelected('');
    setTeamBSelected('');
    setVenue('');
    setDate('');
    setTime('');
    setIsScheduling(false);
  };

  const handleLaunchMatch = (matchId: string) => {
    onSelectMatch(matchId);
    setActiveTab('score');
  };

  return (
    <div className="space-y-6" id="matches-tab">
      
      {/* Top action header */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-black text-slate-900 tracking-tight uppercase">Cricket Matches Portal</h2>
          <p className="text-xs text-slate-500 font-sans">Record live scores or schedule upcoming league fixtures</p>
        </div>
        <button
          onClick={() => {
            setIsScheduling(!isScheduling);
            setValidationError(null);
          }}
          className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 active:scale-95 shadow-xs self-start sm:self-auto cursor-pointer font-sans"
        >
          <Plus className="w-4 h-4" />
          Schedule Match
        </button>
      </div>

      {/* Schedule Match collapsible form */}
      <AnimatePresence>
        {isScheduling && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden bg-white border border-slate-300 p-5 rounded-xl gap-4 space-y-4 shadow-sm"
          >
            <h3 className="font-display font-extrabold text-sm text-slate-950 uppercase tracking-tight">Assign Match Specifications</h3>
            
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg">
                ⚠️ {validationError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team A selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Select Team A (Home)</label>
                <select
                  required
                  value={teamASelected}
                  onChange={e => setTeamASelected(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-emerald-500 transition"
                >
                  <option value="">-- Choose Team A --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === teamBSelected}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Team B selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Select Team B (Away)</label>
                <select
                  required
                  value={teamBSelected}
                  onChange={e => setTeamBSelected(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-emerald-500 transition"
                >
                  <option value="">-- Choose Team B --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === teamASelected}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Venue Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corner Street Plot, Academy pitch 3"
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Match Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Match Time */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Overs Format */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono uppercase">Match Overs (Format)</label>
                <div className="flex gap-2">
                  {[3, 5, 10, 20, 50].map(ov => (
                    <button
                      key={ov}
                      type="button"
                      onClick={() => setOversCount(ov)}
                      className={`flex-1 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                        oversCount === ov 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {ov} Overs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsScheduling(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-55 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-500 text-slate-950 px-5 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition cursor-pointer"
              >
                Schedule & Add Match
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-1 rounded-xl shadow-xs border border-slate-200/80 overflow-x-auto text-[11px] font-bold">
        {[
          { key: 'all', label: 'All Match Reports' },
          { key: 'scheduled', label: 'Scheduled 📅' },
          { key: 'live', label: 'Live Scoring 🔴' },
          { key: 'completed', label: 'Completed 🏆' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`whitespace-nowrap flex-1 py-2 rounded-lg text-center transition cursor-pointer font-sans ${
              filter === item.key 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* List matches */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-450 font-sans">
            <ShieldEllipsis className="w-10 h-10 opacity-30 mx-auto mb-2 text-slate-400" />
            No matching matches found for this category.
          </div>
        ) : (
          filteredMatches.map(m => {
            const isLive = m.status === 'live' || m.status === 'toss';
            const isCompleted = m.status === 'completed';
            const innA = m.inningsA;
            const innB = m.inningsB;
            
            return (
              <div
                key={m.id}
                onClick={() => handleLaunchMatch(m.id)}
                className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-xs transition-all relative flex flex-col justify-between gap-4 cursor-pointer hover:border-slate-350 ${
                  isLive ? 'border-l-4 border-l-rose-500 bg-rose-50/10 border-slate-200' : 'border-slate-200/80'
                }`}
              >
                {/* Meta details */}
                <div className="flex justify-between items-center text-[10px] text-slate-505 border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1 font-semibold font-sans">
                    <MapPin className="w-3 h-3 text-slate-400" /> {m.venue}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[9px]">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> {m.date} {m.time}</span>
                    <span className="bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm">{m.overs} Overs</span>
                  </div>
                </div>

                {/* Score Summary Box with Team badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                  
                  <div className="space-y-3 flex-1">
                    {/* Team 1 summary */}
                    <div className="flex justify-between items-center max-w-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg ${getTeamLogoColor(m.teamAId)} flex items-center justify-center font-display font-bold text-xs uppercase shadow-sm`}>
                          {getTeamName(m.teamAId).substring(0, 2)}
                        </span>
                        <span className="text-sm font-extrabold text-slate-805">{getTeamName(m.teamAId)}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {innA ? (
                          <>
                            <strong className="text-sm text-slate-900 font-black">{innA.runs}/{innA.wickets}</strong>
                            <span className="text-slate-400 font-normal ml-1">({Math.floor(innA.ballsBowled / 6)}.{innA.ballsBowled % 6} ov)</span>
                          </>
                        ) : 'DNB'}
                      </span>
                    </div>

                    {/* Team 2 summary */}
                    <div className="flex justify-between items-center max-w-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg ${getTeamLogoColor(m.teamBId)} flex items-center justify-center font-display font-bold text-xs uppercase shadow-sm`}>
                          {getTeamName(m.teamBId).substring(0, 2)}
                        </span>
                        <span className="text-sm font-extrabold text-slate-805">{getTeamName(m.teamBId)}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {innB ? (
                          <>
                            <strong className="text-sm text-slate-900 font-black">{innB.runs}/{innB.wickets}</strong>
                            <span className="text-slate-400 font-normal ml-1">({Math.floor(innB.ballsBowled / 6)}.{innB.ballsBowled % 6} ov)</span>
                          </>
                        ) : 'DNB'}
                      </span>
                    </div>
                  </div>

                  {/* Actions / Status badges */}
                  <div className="sm:text-right shrink-0 flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 font-sans">
                    {isLive && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-sm shadow-sm animate-pulse tracking-wider">
                        <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                        SCORING LIVE
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-extrabold px-2 py-0.5 rounded-sm tracking-wider">
                        <CheckCircle className="w-3 h-3" />
                        COMPLETED
                      </span>
                    )}
                    {m.status === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-slate-50 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded-sm tracking-wider">
                        <Hourglass className="w-3 h-3" />
                        UPCOMING
                      </span>
                    )}

                    <div className="flex items-center font-black text-xs text-emerald-600 hover:text-emerald-700 gap-0.5 hover:underline cursor-pointer transition p-1">
                      {isLive ? 'Resume Board' : isCompleted ? 'View Full scorecard' : 'Launch Scoring'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </div>

                {/* Final status descriptor */}
                {m.result && (
                  <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 text-[11px] font-semibold px-3 py-2 rounded-lg mt-1 flex items-center gap-1 font-mono uppercase tracking-wide">
                    🏆 <span>{m.result}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
