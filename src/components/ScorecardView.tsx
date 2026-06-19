/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Team, Player, Innings, BatsmanScore, BowlerScore } from '../types';
import { Award, Layers, Users, Footprints, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface ScorecardViewProps {
  match: Match;
  teams: Team[];
  players: Player[];
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  match,
  teams,
  players,
}) => {
  const [activeInningsToggle, setActiveInningsToggle] = useState<1 | 2>(1);

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  const inningsToDisplay = activeInningsToggle === 1 ? match.inningsA : match.inningsB;
  const battingTeamId = activeInningsToggle === 1 
    ? match.battingFirstId 
    : match.battingSecondId;
  const bowlingTeamId = activeInningsToggle === 1
    ? (match.battingFirstId === match.teamAId ? match.teamBId : match.teamAId)
    : (match.battingFirstId === match.teamAId ? match.teamAId : match.teamBId);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden" id="match-scorecard-tabular">
      {/* Tab toggle at top */}
      <div className="flex bg-slate-50 border-b border-slate-200/60 p-1.5 font-bold text-xs font-sans">
        <button
          onClick={() => setActiveInningsToggle(1)}
          className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
            activeInningsToggle === 1 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-550 hover:text-slate-800'
          }`}
        >
          1st Innings - {battingTeamId ? getTeamName(battingTeamId) : 'TBD'} Scorecard
        </button>
        <button
          onClick={() => setActiveInningsToggle(2)}
          disabled={!match.inningsB}
          className={`flex-1 py-1.5 rounded-lg text-center transition disabled:opacity-50 cursor-pointer ${
            activeInningsToggle === 2 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-550 hover:text-slate-800'
          }`}
        >
          2nd Innings - {match.inningsB ? (battingTeamId === match.teamAId ? getTeamName(match.teamBId) : getTeamName(match.teamAId)) : 'DNB'}
        </button>
      </div>

      {!inningsToDisplay ? (
        <div className="p-10 text-center text-gray-400 text-sm">
          No scorecard details logged for this innings yet.
        </div>
      ) : (
        <div className="p-5 space-y-6">
          
          {/* Innings High-level Panel */}
          <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-550/10 rounded-xl font-sans">
            <div>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block font-mono">Total score</span>
              <p className="text-3xl font-mono font-black text-slate-900">
                {inningsToDisplay.runs}/{inningsToDisplay.wickets}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">Overs Completed</span>
              <p className="text-xl font-mono font-black text-emerald-600">
                {Math.floor(inningsToDisplay.ballsBowled / 6)}.{inningsToDisplay.ballsBowled % 6} <span className="text-xs text-slate-500 font-normal font-sans">Ovs</span>
              </p>
            </div>
          </div>

          {/* BATTING SCORECARD */}
          <div className="space-y-2">
            <h3 className="text-xs font-display font-black text-slate-900 uppercase tracking-wider flex items-center gap-1 font-sans">
              <Award className="w-3.5 h-3.5 text-emerald-500" /> Batting Scorecard
            </h3>
            
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-500 font-bold border-b border-gray-100 uppercase">
                  <tr>
                    <th className="p-3">Batsman</th>
                    <th className="p-3">Dismissal</th>
                    <th className="p-3 text-right font-mono">Runs</th>
                    <th className="p-3 text-right font-mono">Balls</th>
                    <th className="p-3 text-right font-mono">4s</th>
                    <th className="p-3 text-right font-mono">6s</th>
                    <th className="p-3 text-right font-mono">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(Object.values(inningsToDisplay.batsmen) as BatsmanScore[]).map((batsman, idx) => {
                    const sr = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="p-3 text-slate-900 font-extrabold">{getPlayerName(batsman.playerId)}</td>
                        <td className="p-3 text-slate-400 italic text-[11px]">{batsman.isOut ? (batsman.dismissal || 'out') : 'not out*'}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-800">{batsman.runs}</td>
                        <td className="p-3 text-right font-mono text-gray-500">{batsman.balls}</td>
                        <td className="p-3 text-right font-mono text-gray-500">{batsman.fours}</td>
                        <td className="p-3 text-right font-mono text-gray-500">{batsman.sixes}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-bold">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Extras Summary Line */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex justify-between items-center text-xs font-semibold text-slate-600 font-sans">
              <span>Extras Total</span>
              <span className="font-mono text-slate-800 font-bold">
                {inningsToDisplay.extras.wides + inningsToDisplay.extras.noBalls + inningsToDisplay.extras.byes + inningsToDisplay.extras.legByes}
                <span className="text-gray-400 font-normal ml-1.5">
                  (WD: {inningsToDisplay.extras.wides}, NB: {inningsToDisplay.extras.noBalls}, BY: {inningsToDisplay.extras.byes}, LB: {inningsToDisplay.extras.legByes})
                </span>
              </span>
            </div>
          </div>

          {/* BOWLING ANALYSIS */}
          <div className="space-y-2">
            <h3 className="text-xs font-display font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-4 h-4 text-indigo-600" /> Bowling Analysis
            </h3>

            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-500 font-bold border-b border-gray-100 uppercase">
                  <tr>
                    <th className="p-3">Bowler</th>
                    <th className="p-3 font-mono text-right">Overs</th>
                    <th className="p-3 font-mono text-right">Maidens</th>
                    <th className="p-3 font-mono text-right">Runs Conceded</th>
                    <th className="p-3 font-mono text-right">Wickets</th>
                    <th className="p-3 font-mono text-right">Wides</th>
                    <th className="p-3 font-mono text-right">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(Object.values(inningsToDisplay.bowlers) as BowlerScore[]).map((bowler, idx) => {
                    const econ = bowler.ballsBowled > 0 ? ((bowler.runs / bowler.ballsBowled) * 6).toFixed(2) : '0.00';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="p-3 text-slate-900 font-extrabold">{getPlayerName(bowler.playerId)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">{bowler.overs}</td>
                        <td className="p-3 text-right font-mono text-slate-400">{bowler.maidens}</td>
                        <td className="p-3 text-right font-mono text-rose-600 font-bold">{bowler.runs}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-extrabold">{bowler.wickets}</td>
                        <td className="p-3 text-right font-mono text-slate-400">{bowler.wides}</td>
                        <td className="p-3 text-right font-mono text-indigo-600 font-semibold">{econ}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOWER ANALYSIS: PARTNERSHIPS & FALL OF WICKETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Fall Of Wickets */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-gray-500" /> Fall Of Wickets
              </h4>
              <div className="space-y-2">
                {(!inningsToDisplay.fallOfWickets || inningsToDisplay.fallOfWickets.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">No wickets fell during this innings.</p>
                ) : (
                  inningsToDisplay.fallOfWickets.map((fow, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-mono text-gray-600 border-b border-gray-100 pb-1.5">
                      <span>{fow.wickets} - {getPlayerName(fow.batsmanId)}</span>
                      <span className="font-bold text-slate-800">
                        {fow.runs} (at over {fow.over})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Partnerships */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-500" /> Key Partnerships
              </h4>
              <div className="space-y-2">
                {(!inningsToDisplay.partnerships || inningsToDisplay.partnerships.length === 0) ? (
                  inningsToDisplay.currentPartnership && inningsToDisplay.currentPartnership.runs > 0 ? (
                    <div className="flex justify-between items-center text-xs font-mono text-gray-600">
                      <span>{getPlayerName(inningsToDisplay.currentPartnership.batsman1Id).substring(0, 10)} & {getPlayerName(inningsToDisplay.currentPartnership.batsman2Id).substring(0, 10)}</span>
                      <span className="font-bold text-slate-800">
                        {inningsToDisplay.currentPartnership.runs} runs*
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No partnerships registered yet.</p>
                  )
                ) : (
                  inningsToDisplay.partnerships.map((part, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-mono text-gray-600 border-b border-gray-100 pb-1.5">
                      <span>{getPlayerName(part.batsman1Id).substring(0, 10)} & {getPlayerName(part.batsman2Id).substring(0, 10)}</span>
                      <span className="font-bold text-slate-800">
                        {part.runs} runs ({part.balls} balls)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
