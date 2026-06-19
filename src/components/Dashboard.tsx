/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Match, Team, Player } from '../types';
import { 
  Trophy, 
  Users, 
  Coins, 
  MapPin, 
  Clock, 
  Flame, 
  TrendingUp, 
  Play, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  matches: Match[];
  teams: Team[];
  players: Player[];
  setActiveTab: (tab: string) => void;
  setSelectedMatchId: (id: string | null) => void;
  currentUserProfile: { name: string; role: string; runs: number; wickets: number } | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  matches,
  teams,
  players,
  setActiveTab,
  setSelectedMatchId,
  currentUserProfile,
}) => {
  const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'toss');
  const completedMatches = matches.filter(m => m.status === 'completed').slice(0, 3);
  const scheduledMatches = matches.filter(m => m.status === 'scheduled').slice(0, 3);

  // Stats calculation
  const totalRuns = matches.reduce((acc, m) => {
    let r = 0;
    if (m.inningsA) r += m.inningsA.runs;
    if (m.inningsB) r += m.inningsB.runs;
    return acc + r;
  }, 0);

  const totalWickets = matches.reduce((acc, m) => {
    let w = 0;
    if (m.inningsA) w += m.inningsA.wickets;
    if (m.inningsB) w += m.inningsB.wickets;
    return acc + w;
  }, 0);

  // Top performers
  const topRunScorer = [...players].sort((a, b) => b.runsScored - a.runsScored)[0];
  const topWicketTaker = [...players].sort((a, b) => b.wicketsTaken - a.wicketsTaken)[0];

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getTeamLogoColor = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.logo : 'bg-gray-400 text-white';
  };

  const handleResumeMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab('score');
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Hero Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 text-white rounded-2xl p-6 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-750 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              Street & Academy Scoring Redefined
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white leading-tight">
              Ayo Captain! <span className="text-emerald-400">{currentUserProfile?.name || 'Welcome to Gully Score'}</span>
            </h1>
            <p className="text-slate-350 text-sm mt-1 max-w-md font-sans">
              Score live ball-by-ball matches, manage local teams, and run tournaments without pen and paper!
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('matches')}
            className="self-start md:self-auto bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-lg shadow-sm hover:bg-emerald-400 active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer font-sans"
          >
            <Play className="w-4 h-4 fill-current text-slate-950" />
            Launch Match
          </button>
        </div>
      </motion.div>

      {/* Quick Action Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Score a Match', desc: 'Ball-by-ball ledger', color: 'border-l-4 border-emerald-500 bg-white text-slate-900 hover:border-r hover:border-r-emerald-500/10', icon: Play, tab: 'matches' },
          { title: 'Cricket Teams', desc: 'Squad & logo setup', color: 'border-l-4 border-slate-700 bg-white text-slate-900 hover:border-r hover:border-r-slate-700/10', icon: Users, tab: 'teams' },
          { title: 'Tournaments', desc: 'League & fixtures', color: 'border-l-4 border-emerald-600 bg-white text-slate-900 hover:border-r hover:border-r-emerald-600/10', icon: Trophy, tab: 'tournaments' },
          { title: 'Stats Hub', desc: 'Leaderboards & logs', color: 'border-l-4 border-slate-600 bg-white text-slate-900 hover:border-r hover:border-r-slate-600/10', icon: TrendingUp, tab: 'stats' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(item.tab)}
              className={`p-4 rounded-xl text-left shadow-xs border border-slate-200/80 hover:shadow-md transition-all ${item.color} flex flex-col justify-between h-28 active:scale-98 cursor-pointer`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-display font-extrabold text-sm tracking-tight leading-snug">{item.title}</span>
                <Icon className="w-5 h-5 text-emerald-600 opacity-80 shrink-0" />
              </div>
              <span className="text-xs text-slate-500 leading-none">{item.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Live & Ongoing Matches Banner */}
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-md font-display font-extrabold text-slate-950 tracking-tight">Active Scoring Session</h2>
          </div>
          {liveMatches.map((m) => {
            const isBatFirstA = m.battingFirstId === m.teamAId;
            const inn1 = isBatFirstA ? m.inningsA : m.inningsB;
            const inn2 = isBatFirstA ? m.inningsB : m.inningsA;
            const batTeamName = getTeamName(m.battingFirstId || m.teamAId);
            return (
              <div 
                key={m.id}
                className="bg-white border border-slate-200/80 border-l-4 border-l-emerald-500 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      {m.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {m.venue} ({m.overs} Overs)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full ${getTeamLogoColor(m.teamAId)} flex items-center justify-center font-black text-xs uppercase shadow-sm`}>
                      {getTeamName(m.teamAId).substring(0, 2)}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight">{getTeamName(m.teamAId)}</span>
                    <span className="text-slate-400 text-xs italic">vs</span>
                    <span className={`w-8 h-8 rounded-full ${getTeamLogoColor(m.teamBId)} flex items-center justify-center font-black text-xs uppercase shadow-sm`}>
                      {getTeamName(m.teamBId).substring(0, 2)}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight">{getTeamName(m.teamBId)}</span>
                  </div>

                  {m.status === 'live' && inn1 && (
                    <div className="text-xs text-slate-600 font-mono">
                      {m.currentInnings === 1 ? (
                        <span>Currently Batting: <strong className="text-slate-900">{batTeamName}</strong> — <span className="text-emerald-700 font-bold">{inn1.runs}/{inn1.wickets}</span> in {Math.floor(inn1.ballsBowled / 6)}.{inn1.ballsBowled % 6} overs</span>
                      ) : inn2 ? (
                        <span>Target: <strong className="text-slate-900">{inn1.runs + 1}</strong>. {getTeamName(m.battingSecondId || m.teamBId)} is <span className="text-emerald-700 font-bold">{inn2.runs}/{inn2.wickets}</span> in {Math.floor(inn2.ballsBowled / 6)}.{inn2.ballsBowled % 6} ovs</span>
                      ) : null}
                    </div>
                  )}

                  {m.status === 'toss' && (
                    <p className="text-xs text-amber-700 font-semibold flex items-center gap-1 font-mono">
                      <Coins className="w-4 h-4 text-amber-500" /> Waiting for Coin Flip / Team Selections
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleResumeMatch(m.id)}
                  className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-800 transition flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
                >
                  Resume Board
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Middle Grid: Stats Capsule & Honors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gully honors */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-display font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Street Honor Board
            </h3>
            <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded tracking-wide uppercase font-mono">Seasonal</span>
          </div>

          <div className="space-y-3">
            {/* Orange Cap */}
            <div className="flex items-center justify-between p-3 bg-amber-50/40 rounded-xl border border-amber-100/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-white font-bold">
                  🏏
                </div>
                <div>
                  <span className="text-[9px] text-amber-700 font-bold uppercase tracking-wider block leading-none mb-0.5">Orange Cap (Top Batter)</span>
                  <p className="text-sm font-extrabold text-slate-900 leading-none">{topRunScorer?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block leading-none">Runs</span>
                <p className="text-sm font-mono font-black text-amber-600">{topRunScorer?.runsScored || 0}</p>
              </div>
            </div>

            {/* Purple Cap */}
            <div className="flex items-center justify-between p-3 bg-purple-50/40 rounded-xl border border-purple-100/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold">
                  ⚾
                </div>
                <div>
                  <span className="text-[9px] text-purple-700 font-bold uppercase tracking-wider block leading-none mb-0.5">Purple Cap (Top Bowler)</span>
                  <p className="text-sm font-extrabold text-slate-900 leading-none">{topWicketTaker?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block leading-none">Wickets</span>
                <p className="text-sm font-mono font-black text-purple-600">{topWicketTaker?.wicketsTaken || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Analytics Capsule */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-display font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Gully Network Stats
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 my-auto">
            <div className="text-center p-3 bg-slate-50/60 rounded-lg border border-slate-100">
              <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wide leading-none mb-1">Matches</span>
              <span className="text-md font-mono font-black text-slate-900">{matches.length}</span>
            </div>
            <div className="text-center p-3 bg-slate-50/60 rounded-lg border border-slate-100">
              <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wide leading-none mb-1">Runs</span>
              <span className="text-md font-mono font-black text-slate-900">{totalRuns}</span>
            </div>
            <div className="text-center p-3 bg-slate-50/60 rounded-lg border border-slate-100">
              <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wide leading-none mb-1">Wickets</span>
              <span className="text-md font-mono font-black text-emerald-600">{totalWickets}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-450 leading-relaxed text-center">
            Replace legacy paper scorecards! Recording matches builds historic bowler and batting strike rates.
          </p>
        </div>
      </div>

      {/* Recent & Completed Scorecards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Recent Match Reports
          </h3>
          <button 
            onClick={() => setActiveTab('matches')} 
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            All matches <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {completedMatches.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 opacity-30 mx-auto mb-2 text-slate-500" />
            No matches scored yet. Schedule or create a quick match to score!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedMatches.map((m) => {
              const innA = m.inningsA;
              const innB = m.inningsB;
              return (
                <div 
                  key={m.id}
                  onClick={() => {
                    setSelectedMatchId(m.id);
                    setActiveTab('score');
                  }}
                  className="bg-white border border-slate-200/85 hover:border-slate-300 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-10 pb-2 font-mono">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-450" /> {m.venue}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-450" /> {m.date}</span>
                  </div>

                  <div className="space-y-2">
                    {/* Team A score */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${getTeamLogoColor(m.teamAId)} flex items-center justify-center text-[9px] uppercase font-bold text-white shadow-xs`}>
                          {getTeamName(m.teamAId).substring(0, 2)}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700">{getTeamName(m.teamAId)}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {innA ? `${innA.runs}/${innA.wickets}` : 'DNB'}
                        {innA && <span className="text-[10px] text-slate-400 font-normal ml-1">({Math.floor(innA.ballsBowled/6)}.{innA.ballsBowled%6})</span>}
                      </span>
                    </div>

                    {/* Team B score */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${getTeamLogoColor(m.teamBId)} flex items-center justify-center text-[9px] uppercase font-bold text-white shadow-xs`}>
                          {getTeamName(m.teamBId).substring(0, 2)}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700">{getTeamName(m.teamBId)}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {innB ? `${innB.runs}/${innB.wickets}` : 'DNB'}
                        {innB && <span className="text-[10px] text-slate-400 font-normal ml-1">({Math.floor(innB.ballsBowled/6)}.{innB.ballsBowled%6})</span>}
                      </span>
                    </div>
                  </div>

                  {m.result && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded text-center mt-2 font-sans tracking-wide">
                      🏆 {m.result}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Upcoming Matches */}
      {scheduledMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-extrabold text-slate-900 text-sm">Scheduled Matches</h3>
          <div className="flex flex-col gap-3">
            {scheduledMatches.map((m) => (
              <div 
                key={m.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between text-sm shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full ${getTeamLogoColor(m.teamAId)} flex items-center justify-center text-xs uppercase font-extrabold text-white shadow-xs`}>
                    {getTeamName(m.teamAId).substring(0,2)}
                  </span>
                  <span className="font-extrabold text-slate-800 text-xs tracking-tight">{getTeamName(m.teamAId)}</span>
                  <span className="text-slate-400 text-xs italic">vs</span>
                  <span className={`w-8 h-8 rounded-full ${getTeamLogoColor(m.teamBId)} flex items-center justify-center text-xs uppercase font-extrabold text-white shadow-xs`}>
                    {getTeamName(m.teamBId).substring(0,2)}
                  </span>
                  <span className="font-extrabold text-slate-800 text-xs tracking-tight">{getTeamName(m.teamBId)}</span>
                </div>

                <div className="text-right flex flex-col justify-center">
                  <span className="text-[9px] text-slate-400 font-bold block font-mono">{m.date} @ {m.time}</span>
                  <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-full self-end mt-1 font-mono">{m.overs} Overs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
