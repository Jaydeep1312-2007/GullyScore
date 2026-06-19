/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Team, Player, BallDetail, Innings, BatsmanScore, BowlerScore, FallOfWicket } from '../types';
import { 
  Coins, 
  RotateCcw, 
  Sparkles, 
  Award, 
  HelpCircle, 
  Undo2, 
  CheckCircle, 
  Play, 
  User, 
  BookmarkCheck,
  ShieldEllipsis,
  Activity,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScorecardView } from './ScorecardView';

interface LiveScoringProps {
  match: Match;
  teams: Team[];
  players: Player[];
  onUpdateMatchInnings: (matchId: string, updatedMatch: Match) => void;
  onFinishMatch: (matchId: string, resultText: string) => void;
  onClose: () => void;
}

export const LiveScoring: React.FC<LiveScoringProps> = ({
  match,
  teams,
  players,
  onUpdateMatchInnings,
  onFinishMatch,
  onClose,
}) => {
  // Local state for Coin flipping animation
  const [isFlipping, setIsFlipping] = useState(false);
  const [tossResult, setTossResult] = useState<'Heads' | 'Tails' | null>(null);
  const [tossWinnerTeamId, setTossWinnerTeamId] = useState<string>('');
  const [tossSelectChoice, setTossSelectChoice] = useState<'bat' | 'bowl' | ''>('');

  // Selector state for starters
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [startingBowlerId, setStartingBowlerId] = useState('');

  // Wicket dismissal Form
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState<'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket'>('bowled');
  const [wicketFielderName, setWicketFielderName] = useState('');
  const [outPlayerId, setOutPlayerId] = useState('');
  const [incomingBatsmanId, setIncomingBatsmanId] = useState('');

  // New Bowler Selection Form (when over ends)
  const [isNewBowlerModalOpen, setIsNewBowlerModalOpen] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState('');

  // History stack for Undo
  const [historyStack, setHistoryStack] = useState<Innings[]>([]);

  // Current tab local to scoring (Live Scoring Dashboard / Full Scorecard / Commentary)
  const [scoreSubTab, setScoreSubTab] = useState<'score' | 'scorecard'>('score');

  // Inline non-blocking event notices (e.g. End of Innings, Match Over)
  const [inningsNotice, setInningsNotice] = useState<{ title: string; body: string; buttonText: string; onConfirm: () => void } | null>(null);

  const teamA = teams.find(t => t.id === match.teamAId)!;
  const teamB = teams.find(t => t.id === match.teamBId)!;

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const getTeamLogoColor = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logo || 'bg-gray-400 text-white';
  };

  // Extract batting and bowling rosters
  const getTeamPlayers = (teamId: string) => {
    return players.filter(p => p.teamId === teamId || (teams.find(t=>t.id===teamId)?.playerIds.includes(p.id)));
  };

  const getActiveBattingTeamId = () => {
    if (match.currentInnings === 1) {
      return match.battingFirstId!;
    } else {
      return match.battingSecondId!;
    }
  };

  const getActiveBowlingTeamId = () => {
    if (match.currentInnings === 1) {
      return match.battingFirstId === match.teamAId ? match.teamBId : match.teamAId;
    } else {
      return match.battingFirstId === match.teamAId ? match.teamAId : match.teamBId;
    }
  };

  const battingPlayers = getTeamPlayers(getActiveBattingTeamId());
  const bowlingPlayers = getTeamPlayers(getActiveBowlingTeamId());

  // Helper selectors
  const activeInnings = match.currentInnings === 1 ? match.inningsA : match.inningsB;
  
  // Initialize Default Empty Innings Object
  const initEmptyInnings = (): Innings => {
    const bats: Record<string, BatsmanScore> = {};
    const bowls: Record<string, BowlerScore> = {};
    return {
      runs: 0,
      wickets: 0,
      ballsBowled: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      batsmen: bats,
      bowlers: bowls,
      fallOfWickets: [],
      partnerships: [],
      oversHistory: [[]],
      currentPartnership: { batsman1Id: '', batsman2Id: '', runs: 0, balls: 0 }
    };
  };

  // Flip Coin Simulation
  const handleFlipCoin = () => {
    setIsFlipping(true);
    setTossResult(null);
    setTimeout(() => {
      const outcome = Math.random() > 0.5 ? 'Heads' : 'Tails';
      setTossResult(outcome);
      setIsFlipping(false);
      // Pick a random team to win toss for high fidelity simulation, but let user choose custom too
      const teamWinner = Math.random() > 0.5 ? match.teamAId : match.teamBId;
      setTossWinnerTeamId(teamWinner);
    }, 1200);
  };

  // Confirm Toss decision
  const handleConfirmToss = () => {
    if (!tossWinnerTeamId || !tossSelectChoice) return;
    
    let batFirst: string;
    let batSecond: string;
    
    if (tossSelectChoice === 'bat') {
      batFirst = tossWinnerTeamId;
      batSecond = tossWinnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
    } else {
      batFirst = tossWinnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
      batSecond = tossWinnerTeamId;
    }

    const updatedMatch: Match = {
      ...match,
      status: 'live',
      tossWinnerId: tossWinnerTeamId,
      tossDecision: tossSelectChoice,
      battingFirstId: batFirst,
      battingSecondId: batSecond,
      currentInnings: 1,
      inningsA: initEmptyInnings()
    };
    onUpdateMatchInnings(match.id, updatedMatch);
    
    // reset selection tools
    setStrikerId('');
    setNonStrikerId('');
    setStartingBowlerId('');
  };

  // Confirm Starters (Batters & bowler)
  const handleConfirmStarters = () => {
    if (!strikerId || !nonStrikerId || !startingBowlerId || strikerId === nonStrikerId) return;

    const innings = initEmptyInnings();
    
    // Initialize standard Batsman state
    innings.batsmen[strikerId] = { playerId: strikerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    innings.batsmen[nonStrikerId] = { playerId: nonStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    
    // Initialize standard Bowler state
    innings.bowlers[startingBowlerId] = { playerId: startingBowlerId, overs: 0, ballsBowled: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };
    
    // update partnership
    innings.currentPartnership = {
      batsman1Id: strikerId,
      batsman2Id: nonStrikerId,
      runs: 0,
      balls: 0
    };

    const updatedMatch: Match = {
      ...match,
      strikerId,
      nonStrikerId,
      currentBowlerId: startingBowlerId,
      [match.currentInnings === 1 ? 'inningsA' : 'inningsB']: innings
    };

    onUpdateMatchInnings(match.id, updatedMatch);
  };

  // Ball Recording Engine
  const recordBall = (
    runsFromBat: number,
    extras: number,
    extraType: BallDetail['extraType'],
    isWicket: boolean,
    detailsWicket?: {
      type: BallDetail['wicketType'];
      outPlayerId: string;
      fielderName?: string;
      incomingBatsmanId?: string;
    }
  ) => {
    if (!activeInnings || !match.strikerId || !match.nonStrikerId || !match.currentBowlerId) return;

    // Create a clone of the innings for history before making changes (Allows UNDO!)
    const priorInningsState = JSON.parse(JSON.stringify(activeInnings));
    setHistoryStack([...historyStack, priorInningsState]);

    const inn = JSON.parse(JSON.stringify(activeInnings)) as Innings;
    const strikeId = match.strikerId;
    const nonStrId = match.nonStrikerId;
    const bowlId = match.currentBowlerId;

    // Fetch or construct batter scorecard
    if (!inn.batsmen[strikeId]) {
      inn.batsmen[strikeId] = { playerId: strikeId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    }
    if (!inn.batsmen[nonStrId]) {
      inn.batsmen[nonStrId] = { playerId: nonStrId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    }
    // Fetch or construct bowler analysis
    if (!inn.bowlers[bowlId]) {
      inn.bowlers[bowlId] = { playerId: bowlId, overs: 0, ballsBowled: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
    }

    const striker = inn.batsmen[strikeId];
    const bowler = inn.bowlers[bowlId];

    // Runs logic
    const totalBallRunsInput = runsFromBat + extras;
    inn.runs += totalBallRunsInput;

    const isLegalBall = extraType !== 'wide' && extraType !== 'noBall';

    // Update Batsman Scoring
    if (extraType !== 'wide' && extraType !== 'bye' && extraType !== 'legBye') {
      striker.runs += runsFromBat;
      if (runsFromBat === 4) striker.fours += 1;
      if (runsFromBat === 6) striker.sixes += 1;
    }

    if (extraType !== 'wide') {
      // Wide doesn't count as ball faced for batter
      striker.balls += 1;
      inn.currentPartnership.balls += 1;
    }

    // Update Partnership runs
    inn.currentPartnership.runs += totalBallRunsInput;

    // Update Bowler analysis
    let bowlerRunsConceded = totalBallRunsInput;
    if (extraType === 'bye' || extraType === 'legBye') {
      bowlerRunsConceded = runsFromBat; // Leg byes / Byes don't count against bowler runs
    }
    bowler.runs += bowlerRunsConceded;

    if (isLegalBall) {
      bowler.ballsBowled += 1;
      inn.ballsBowled += 1;
    }

    // Extras record
    if (extraType === 'wide') {
      inn.extras.wides += extras;
      bowler.wides += extras;
    } else if (extraType === 'noBall') {
      inn.extras.noBalls += extras;
      bowler.noBalls += extras;
    } else if (extraType === 'bye') {
      inn.extras.byes += extras;
    } else if (extraType === 'legBye') {
      inn.extras.legByes += extras;
    }

    // Group overs history array
    const overIdx = Math.floor(inn.ballsBowled / 6);
    if (!inn.oversHistory) {
      inn.oversHistory = [[]];
    }
    if (inn.oversHistory.length <= overIdx) {
      inn.oversHistory.push([]);
    }
    
    // Construct ball info log
    const overDisplayNum = Math.floor((inn.ballsBowled - (isLegalBall ? 1 : 0)) / 6);
    const ballInOverNum = (inn.ballsBowled % 6) || 6;
    
    const ballLog: BallDetail = {
      overNum: overDisplayNum,
      ballNum: ballInOverNum,
      bowlerId: bowlId,
      batsmanId: strikeId,
      runs: runsFromBat,
      extraRuns: extras,
      extraType: extraType || 'none',
      wicketType: detailsWicket?.type || 'none',
      wicketPlayerId: detailsWicket?.outPlayerId,
      fielderName: detailsWicket?.fielderName,
      description: `${runsFromBat} runs ${extraType !== 'none' ? `(${extraType})` : ''} ${detailsWicket ? `WICKET: ${detailsWicket.type}` : ''}`
    };

    inn.oversHistory[Math.min(overIdx, inn.oversHistory.length - 1)].push(ballLog);

    // Wicket logic
    let nextStrikerId = strikeId;
    let nextNonStrikerId = nonStrId;

    if (isWicket && detailsWicket) {
      inn.wickets += 1;
      const targetOutId = detailsWicket.outPlayerId;
      inn.batsmen[targetOutId].isOut = true;
      inn.batsmen[targetOutId].dismissal = getDismissalText(detailsWicket.type, getTeamPlayers(getActiveBowlingTeamId()).find(p => p.id === bowlId)?.name || 'Bowler', detailsWicket.fielderName);

      if (detailsWicket.type !== 'runout') {
        bowler.wickets += 1;
      }

      // Record Fall of Wickets
      const overDecimal = Math.floor(inn.ballsBowled / 6) + (inn.ballsBowled % 6) / 10;
      inn.fallOfWickets.push({
        wickets: inn.wickets,
        runs: inn.runs,
        over: overDecimal,
        batsmanId: targetOutId
      });

      // partnership breakdown
      inn.partnerships.push({
        batsman1Id: inn.currentPartnership.batsman1Id,
        batsman2Id: inn.currentPartnership.batsman2Id,
        runs: inn.currentPartnership.runs,
        balls: inn.currentPartnership.balls
      });

      // Update incoming batter if match is still running
      const incomingId = detailsWicket.incomingBatsmanId;
      if (incomingId) {
        inn.batsmen[incomingId] = { playerId: incomingId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        if (targetOutId === strikeId) {
          nextStrikerId = incomingId;
        } else {
          nextNonStrikerId = incomingId;
        }

        // Initialize next partnership
        inn.currentPartnership = {
          batsman1Id: nextStrikerId,
          batsman2Id: nextNonStrikerId,
          runs: 0,
          balls: 0
        };
      }
    }

    // Rotate strike on Odd Runs off the bat (1, 3 etc. not extras like wide)
    const strikerRunsScored = runsFromBat;
    const isStrikeRotated = (strikerRunsScored % 2 === 1) && (extraType !== 'wide');
    if (isStrikeRotated) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // Calculate bowers overs nicely (6 balls = 1 over)
    bowler.overs = Math.floor(bowler.ballsBowled / 6) + (bowler.ballsBowled % 6) / 10;

    // Check if over ends
    let overEndedStatus = false;
    if (isLegalBall && (inn.ballsBowled % 6 === 0) && (inn.ballsBowled > 0)) {
      overEndedStatus = true;
      // Strike rotates on over end
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // Update match state
    const currentInningsField = match.currentInnings === 1 ? 'inningsA' : 'inningsB';
    const updatedMatch: Match = {
      ...match,
      strikerId: nextStrikerId,
      nonStrikerId: nextNonStrikerId,
      [currentInningsField]: inn
    };

    // Check if Innings / Match ends
    const maxOversCount = match.overs;
    const maxBallsCount = maxOversCount * 6;
    const isOutOfWickets = inn.wickets >= Math.min(battingPlayers.length - 1, 10);
    const isOverExceeded = inn.ballsBowled >= maxBallsCount;

    // TARGET CHASE CRITICAL check (Second Innings)
    let isTargetChased = false;
    if (match.currentInnings === 2 && match.inningsA) {
      const targetToWin = match.inningsA.runs + 1;
      if (inn.runs >= targetToWin) {
        isTargetChased = true;
      }
    }

    if (isOutOfWickets || isOverExceeded || isTargetChased) {
      if (match.currentInnings === 1) {
        // Transition to 2nd Innings
        const secondInningsBatId = match.battingSecondId!;
        const emptySecondInnings = initEmptyInnings();

        const revisedMatch: Match = {
          ...updatedMatch,
          currentInnings: 2,
          strikerId: '',
          nonStrikerId: '',
          currentBowlerId: '',
          inningsB: emptySecondInnings
        };

        setInningsNotice({
          title: "Innings 1 Completed! 🏏",
          body: `${getTeamName(getActiveBattingTeamId())} scored ${inn.runs}/${inn.wickets}. Target for 2nd innings is ${inn.runs + 1} runs.`,
          buttonText: "Start 2nd Innings",
          onConfirm: () => {
            onUpdateMatchInnings(match.id, revisedMatch);
            setStrikerId('');
            setNonStrikerId('');
            setStartingBowlerId('');
            setHistoryStack([]);
            setInningsNotice(null);
          }
        });
      } else {
        // Match fully completed! Determine result text
        const bat1Name = getTeamName(match.battingFirstId!);
        const bat2Name = getTeamName(match.battingSecondId!);
        const inn1Runs = match.inningsA!.runs;
        const inn2Runs = inn.runs;

        let result = '';
        if (isTargetChased) {
          const wicketsLeft = battingPlayers.length - inn.wickets;
          result = `${bat2Name} won by ${wicketsLeft} wickets`;
        } else if (inn2Runs < inn1Runs) {
          const runDeficit = inn1Runs - inn2Runs;
          result = `${bat1Name} won by ${runDeficit} runs`;
        } else {
          result = 'Match tied';
        }

        const completedMatchState: Match = {
          ...updatedMatch,
          status: 'completed',
          result
        };

        setInningsNotice({
          title: "Match Finished! 🏆",
          body: `${result}`,
          buttonText: "View Full Scorecard",
          onConfirm: () => {
            onUpdateMatchInnings(match.id, completedMatchState);
            onFinishMatch(match.id, result);
            setInningsNotice(null);
          }
        });
      }
    } else {
      // Normal ball recorded safely
      onUpdateMatchInnings(match.id, updatedMatch);
      
      // Prompt bowler selection if over has ended
      if (overEndedStatus) {
        setNextBowlerId('');
        setIsNewBowlerModalOpen(true);
      }
    }
  };

  // Undo Last action
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const historyClone = [...historyStack];
    const previousInningsState = historyClone.pop()!;
    setHistoryStack(historyClone);

    const isBatFirstA = match.battingFirstId === match.teamAId;
    const inningsField = match.currentInnings === 1 ? 'inningsA' : 'inningsB';
    
    // We also need to restore previous striker, nonstriker & bowler positions!
    // Since we clone previous inningsState completely, we can search oversHistory or standard balls list
    let prevStrikerId = match.strikerId;
    let prevNonStrikerId = match.nonStrikerId;
    let prevBowlerId = match.currentBowlerId;

    // Search the last ball details to restore positions
    const lastOver = previousInningsState.oversHistory?.[previousInningsState.oversHistory.length - 1];
    if (lastOver && lastOver.length > 0) {
      const lastBall = lastOver[lastOver.length - 1];
      prevStrikerId = lastBall.batsmanId;
      prevBowlerId = lastBall.bowlerId;
      
      // find non striker from active list
      const activeIds = Object.keys(previousInningsState.batsmen).filter(id => !previousInningsState.batsmen[id].isOut);
      prevNonStrikerId = activeIds.find(id => id !== prevStrikerId) || prevNonStrikerId;
    }

    const undoneMatch: Match = {
      ...match,
      strikerId: prevStrikerId,
      nonStrikerId: prevNonStrikerId,
      currentBowlerId: prevBowlerId,
      [inningsField]: previousInningsState
    };
    onUpdateMatchInnings(match.id, undoneMatch);
  };

  const getDismissalText = (type: string, bowlerName: string, fielderName?: string) => {
    switch (type) {
      case 'bowled': return `b ${bowlerName}`;
      case 'caught': return `c ${fielderName || 'Fielder'} b ${bowlerName}`;
      case 'lbw': return `lbw b ${bowlerName}`;
      case 'stumped': return `stumped b ${bowlerName}`;
      case 'runout': return `run out (${fielderName || 'Fielder'})`;
      case 'hitwicket': return `hit wicket b ${bowlerName}`;
      default: return `out b ${bowlerName}`;
    }
  };

  // Record normal run off keyboard
  const handleRecordRuns = (runs: number) => {
    recordBall(runs, 0, 'none', false);
  };

  // Extras keyboard
  const handleRecordExtra = (type: 'wide' | 'noBall' | 'bye' | 'legBye') => {
    if (type === 'wide') {
      // Wides count as 1 run to score, 0 to batsman
      recordBall(0, 1, 'wide', false);
    } else if (type === 'noBall') {
      // In gully matches, No-Ball gets 1 premium extra run, batsman still plays the free hit or scores
      recordBall(0, 1, 'noBall', false);
    } else if (type === 'bye') {
      recordBall(0, 1, 'bye', false);
    } else if (type === 'legBye') {
      recordBall(0, 1, 'legBye', false);
    }
  };

  // Open wicket entry
  const handleOpenWicket = () => {
    // Determine out player default
    setOutPlayerId(match.strikerId || '');
    setIncomingBatsmanId('');
    setWicketFielderName('');
    setIsWicketModalOpen(true);
  };

  // Submit Wicket Details
  const handleRecordWicket = (e: React.FormEvent) => {
    e.preventDefault();
    setIsWicketModalOpen(false);

    const isMatchEnding = (activeInnings?.wickets || 0) + 1 >= Math.min(battingPlayers.length - 1, 10);
    const finalIncomingId = isMatchEnding ? undefined : incomingBatsmanId;

    recordBall(0, 0, 'none', true, {
      type: wicketType,
      outPlayerId,
      fielderName: wicketFielderName.trim() || undefined,
      incomingBatsmanId: finalIncomingId
    });
  };

  // Submit Bowler Over Change
  const handleConfirmNewBowler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextBowlerId) return;

    setIsNewBowlerModalOpen(false);
    const updatedMatch: Match = {
      ...match,
      currentBowlerId: nextBowlerId
    };
    onUpdateMatchInnings(match.id, updatedMatch);
  };

  // Sharing utilities
  const handleShareWhatsApp = () => {
    const text = `🏏 *Gully Cricket Update!* \nMatch: *${getTeamName(match.teamAId)}* vs *${getTeamName(match.teamBId)}* \nScore: *${activeInnings?.runs}/${activeInnings?.wickets}* in ${Math.floor((activeInnings?.ballsBowled || 0)/6)}.${(activeInnings?.ballsBowled || 0)%6} overs. \nVenue: ${match.venue}. \nScore live with Gully Score!`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Mock download report
  const handleDownloadReport = () => {
    const reportText = `
========================================
         GULLY SCORE MATCH REPORT
========================================
Teams: ${getTeamName(match.teamAId)} vs ${getTeamName(match.teamBId)}
Venue: ${match.venue}
Overs: ${match.overs}
Date: ${match.date}
Result: ${match.result || 'Match in progress'}

First Innings (${getTeamName(match.battingFirstId || match.teamAId)}):
Total: ${match.inningsA?.runs || 0}/${match.inningsA?.wickets || 0}
Extras: W-${match.inningsA?.extras.wides} N-${match.inningsA?.extras.noBalls} B-${match.inningsA?.extras.byes} L-${match.inningsA?.extras.legByes}

Second Innings (${getTeamName(match.battingSecondId || match.teamBId)}):
Total: ${match.inningsB?.runs || 0}/${match.inningsB?.wickets || 0}
----------------------------------------
Generated via Gully Score digital App.
========================================
`;
    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `GullyScore_Match_${match.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // RENDER SECTORS
  // 1. TOSS WINDOW
  if (match.status === 'toss') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200/85 space-y-6" id="toss-arena">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-xs font-display font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-500 animate-spin" /> Gully Coin Toss Arena
          </h2>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 hover:underline font-bold cursor-pointer font-sans">Exit Match</button>
        </div>

        <div className="text-center py-6 space-y-4">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <AnimatePresence>
              {isFlipping ? (
                <motion.div
                  key="flipping-coin"
                  animate={{ rotateY: 720, y: [-15, -45, -15] }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  className="w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full border-4 border-yellow-500 shadow-md flex items-center justify-center text-yellow-800 font-extrabold text-xl"
                >
                  🪙
                </motion.div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full border-4 border-amber-600 shadow-md flex items-center justify-center text-amber-950 font-black text-xs uppercase font-mono">
                  {tossResult || 'FLIP'}
                </div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleFlipCoin}
            disabled={isFlipping}
            className="bg-emerald-500 text-slate-950 font-black px-6 py-2.5 rounded-lg shadow-xs hover:bg-emerald-400 active:scale-95 transition text-xs uppercase tracking-wider cursor-pointer font-sans"
          >
            {isFlipping ? 'Flipping...' : 'Flip Gully Rupee 🪙'}
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl space-y-4 text-xs max-w-md mx-auto">
          <h3 className="font-display font-extrabold text-slate-900 uppercase tracking-tight">Toss Winner & Decision</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono">Who won the toss?</label>
              <select
                value={tossWinnerTeamId}
                onChange={e => setTossWinnerTeamId(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none font-sans"
              >
                <option value="">-- Choose Winner --</option>
                <option value={match.teamAId}>{teamA.name}</option>
                <option value={match.teamBId}>{teamB.name}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase font-mono">What is their choice?</label>
              <div className="flex gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setTossSelectChoice('bat')}
                  className={`flex-1 py-2 border rounded-lg text-xs font-black transition cursor-pointer ${
                    tossSelectChoice === 'bat' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  🏏 Bat First
                </button>
                <button
                  type="button"
                  onClick={() => setTossSelectChoice('bowl')}
                  className={`flex-1 py-2 border rounded-lg text-xs font-black transition cursor-pointer ${
                    tossSelectChoice === 'bowl' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  ⚾ Bowl First
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirmToss}
            disabled={!tossWinnerTeamId || !tossSelectChoice}
            className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-lg text-xs hover:bg-emerald-400 transition disabled:opacity-50 cursor-pointer font-sans"
          >
            Lock Toss State & Set Squads
          </button>
        </div>
      </div>
    );
  }

  // 2. STARTER PICKER (Batters & Bowler)
  if (match.status === 'live' && (!match.strikerId || !match.nonStrikerId || !match.currentBowlerId)) {
    // Find un-out batsmen
    const availableBatsmen = battingPlayers.filter(p => !activeInnings?.batsmen[p.id]?.isOut);
    
    return (
      <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200/85 space-y-6" id="starters-picker">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-xs font-display font-black text-slate-900 uppercase flex items-center gap-1.5 font-sans">
            <User className="w-4 h-4 text-emerald-500" /> Select Match Openers ({match.currentInnings === 1 ? 'Innings 1' : 'Innings 2'})
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">Assign starting batsmen and bowler to launch the digital scoreboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-sans">
          {/* Striker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Striker batsman 🎯</label>
            <select
              value={strikerId}
              onChange={e => setStrikerId(e.target.value)}
              className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
            >
              <option value="">-- Choose Striker --</option>
              {availableBatsmen.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>

          {/* Non Striker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Non-Striker batsman 🥈</label>
            <select
              value={nonStrikerId}
              onChange={e => setNonStrikerId(e.target.value)}
              className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
            >
              <option value="">-- Choose Non-striker --</option>
              {availableBatsmen.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === strikerId}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>

          {/* Starting Bowler */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Opening Bowler ⚾</label>
            <select
              value={startingBowlerId}
              onChange={e => setStartingBowlerId(e.target.value)}
              className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
            >
              <option value="">-- Choose Bowler --</option>
              {bowlingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleConfirmStarters}
          disabled={!strikerId || !nonStrikerId || !startingBowlerId || strikerId === nonStrikerId}
          className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-lg text-xs uppercase tracking-wider hover:bg-emerald-400 transition disabled:opacity-50 cursor-pointer font-sans"
        >
          Confirm Openers & Start Ball-by-ball Scoreboard
        </button>
      </div>
    );
  }

  // 3. COMPLETED MATCH VIEW / ARCHIVED SCORECARD
  if (match.status === 'completed') {
    return (
      <div className="space-y-6" id="completed-scoreboard">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-emerald-800 bg-emerald-100 font-extrabold px-3 py-0.5 rounded uppercase">Match Completed</span>
            <h2 className="text-xl font-display font-black text-slate-800 tracking-tight mt-1">{match.result}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Scored electronically. Download reports or share live summaries</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDownloadReport}
              className="bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              Download PDF Report
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              Share via WhatsApp
            </button>
            <button
              onClick={onClose}
              className="bg-gray-800 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-900 cursor-pointer"
            >
              Exit Portal
            </button>
          </div>
        </div>

        {/* Full Interactive Scorecard Tab */}
        <ScorecardView match={match} teams={teams} players={players} />
      </div>
    );
  }

  // DEFINITION FOR RUN RECORDINGS DURING ACTIVE MATCH:
  const strikerName = players.find(p => p.id === match.strikerId)?.name || 'Striker';
  const nonStrikerName = players.find(p => p.id === match.nonStrikerId)?.name || 'Non-striker';
  const bowlerName = players.find(p => p.id === match.currentBowlerId)?.name || 'Bowler';

  const currentStrikerScore = activeInnings?.batsmen[match.strikerId!];
  const currentNonStrikerScore = activeInnings?.batsmen[match.nonStrikerId!];
  const currentBowlerScore = activeInnings?.bowlers[match.currentBowlerId!];

  return (
    <div className="space-y-6" id="live-scoring-screen">
      
      {/* Top Score Sub tabs bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 font-sans">
        <div className="flex gap-2">
          <button
            onClick={() => setScoreSubTab('score')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              scoreSubTab === 'score' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-550 hover:bg-slate-50'
            }`}
          >
            Scoring Board 📊
          </button>
          <button
            onClick={() => setScoreSubTab('scorecard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              scoreSubTab === 'scorecard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-550 hover:bg-slate-50'
            }`}
          >
            Detailed Scorecard 📋
          </button>
        </div>

        <div className="flex gap-2">
          {historyStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="bg-amber-50 text-amber-800 border border-amber-200/60 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
              title="Undo last ball entry"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
          )}

          <button
            onClick={onClose}
            className="text-xs bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-800 px-3.5 py-1.5 rounded-lg cursor-pointer"
          >
            Exit scoring
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {scoreSubTab === 'scorecard' ? (
          <motion.div
            key="scorecard-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <ScorecardView match={match} teams={teams} players={players} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-scoring"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* LARGE LIVE SCOREBOARD CONTROLLER CARD */}
            <div className="bg-slate-900 text-white p-5 rounded-xl relative overflow-hidden font-sans border border-slate-905">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-extrabold tracking-wider uppercase">
                    <Activity className="w-3.5 h-3.5" /> Innings {match.currentInnings} (Live)
                  </div>
                  <h2 className="text-md font-display font-black tracking-tight text-emerald-400 mt-1">
                    Batting: {getTeamName(getActiveBattingTeamId())}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase font-mono">Projected Target</span>
                  <span className="text-md font-mono font-black text-rose-400">
                    {match.currentInnings === 2 && match.inningsA 
                      ? `${match.inningsA.runs + 1}` 
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>

              {/* Main numerical dials */}
              <div className="py-6 flex justify-between items-center">
                <div className="space-y-1 font-sans">
                  <p className="text-5xl font-mono font-black tracking-tighter text-white">
                    {activeInnings?.runs || 0}<span className="text-2xl text-slate-400 font-light">/{activeInnings?.wickets || 0}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Run Rate: <strong className="text-emerald-400 font-mono">
                      {activeInnings && activeInnings.ballsBowled > 0 
                        ? ((activeInnings.runs / activeInnings.ballsBowled) * 6).toFixed(2)
                        : '0.00'
                      }
                    </strong>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-2xl font-mono font-bold tracking-tight text-emerald-400">
                    {activeInnings ? Math.floor(activeInnings.ballsBowled / 6) : 0}.{activeInnings ? activeInnings.ballsBowled % 6 : 0} <span className="text-xs font-normal text-slate-400 uppercase font-sans">Overs</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">Max Limits: {match.overs} ovs</p>
                </div>
              </div>

              {/* Second Innings Target Chase text */}
              {match.currentInnings === 2 && match.inningsA && activeInnings && (
                <div className="bg-white/5 border border-white/5 p-3 rounded-lg text-center text-xs text-amber-200 font-semibold font-sans">
                  Required: <strong>{match.inningsA.runs + 1 - activeInnings.runs}</strong> runs off <strong>{(match.overs * 6) - activeInnings.ballsBowled}</strong> balls left
                </div>
              )}
            </div>

            {/* BATTER STATS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Batsmen statistics card */}
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-100 pb-2 text-slate-400 uppercase font-mono">
                  <span>Batsman (Facing Team)</span>
                  <span>R (B) • 4s • 6s • SR</span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Striker Bat */}
                  <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50/50 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-black">🎯</span>
                      <div>
                        <p className="text-sm font-extrabold text-slate-850">{strikerName}</p>
                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider font-mono">Striker</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-slate-800 text-sm">
                        {currentStrikerScore?.runs || 0}*<span className="text-slate-400 font-normal ml-0.5">({currentStrikerScore?.balls || 0})</span>
                      </span>
                      <p className="text-[10px] text-slate-405">
                        {currentStrikerScore?.fours || 0}x4 • {currentStrikerScore?.sixes || 0}x6 • SR:{' '}
                        {currentStrikerScore && currentStrikerScore.balls > 0 
                          ? ((currentStrikerScore.runs / currentStrikerScore.balls) * 100).toFixed(1) 
                          : '0.0'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Non Striker Bat */}
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-black">🥈</span>
                      <div>
                        <p className="text-sm font-bold text-slate-905">{nonStrikerName}</p>
                        <span className="text-[9px] text-slate-450 font-medium uppercase tracking-wider font-mono">Non-Striker</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-slate-700">
                        {currentNonStrikerScore?.runs || 0}<span className="text-slate-405 font-normal ml-0.5">({currentNonStrikerScore?.balls || 0})</span>
                      </span>
                      <p className="text-[10px] text-slate-405">
                        {currentNonStrikerScore?.fours || 0}x4 • {currentNonStrikerScore?.sixes || 0}x6 • SR:{' '}
                        {currentNonStrikerScore && currentNonStrikerScore.balls > 0 
                          ? ((currentNonStrikerScore.runs / currentNonStrikerScore.balls) * 100).toFixed(1) 
                          : '0.0'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bowler analysis card */}
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-100 pb-2 text-slate-400 uppercase font-mono">
                  <span>Bowler (Fielding Team)</span>
                  <span>O • M • R • W • Econ</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">⚾</span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-850">{bowlerName}</p>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono uppercase">
                        Legal Balls: {currentBowlerScore?.ballsBowled || 0}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-800 font-bold space-y-0.5">
                    <div>
                      O: <span className="text-slate-900">{currentBowlerScore?.overs || 0}</span> • R: <span className="text-rose-605">{currentBowlerScore?.runs || 0}</span> • W: <span className="text-emerald-600 font-black">{currentBowlerScore?.wickets || 0}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-normal">
                      Maidens: {currentBowlerScore?.maidens || 0} • Econ:{' '}
                      {currentBowlerScore && currentBowlerScore.ballsBowled > 0
                        ? ((currentBowlerScore.runs / currentBowlerScore.ballsBowled) * 6).toFixed(2)
                        : '0.00'
                      }
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* BALL-BY-BALL INTERACTIVE PANEL */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-xs font-display font-black text-gray-800 tracking-wider uppercase flex items-center gap-1.5">
                  <BookmarkCheck className="w-5 h-5 text-teal-600" /> Scoring Keyboard
                </h3>
              </div>

              {/* Main Runs row */}
              <div className="space-y-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Runs recorded off bat:</span>
                <div className="grid grid-cols-6 gap-2.5">
                  {[0, 1, 2, 3, 4, 6].map(runs => (
                    <button
                      key={runs}
                      onClick={() => handleRecordRuns(runs)}
                      className={`py-3.5 rounded-xl font-mono text-sm font-black shadow-sm flex flex-col items-center justify-center transition active:scale-90 cursor-pointer ${
                        runs === 4 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : runs === 6 
                            ? 'bg-teal-600 text-white hover:bg-teal-700' 
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-lg">{runs}</span>
                      <span className="text-[8px] opacity-75">{runs === 4 ? 'BOUND' : runs === 6 ? 'SIX' : 'RUN'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extras & Wicket tools */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                
                {/* Extras selectors */}
                <div className="sm:col-span-4 space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Extras ledger:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'wide', label: 'WD' },
                      { key: 'noBall', label: 'NB' },
                      { key: 'bye', label: 'BY' },
                      { key: 'legBye', label: 'LB' },
                    ].map(extra => (
                      <button
                        key={extra.key}
                        onClick={() => handleRecordExtra(extra.key as any)}
                        className="bg-amber-100 text-amber-950 hover:bg-amber-200 py-3 rounded-xl font-mono font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        {extra.label} (+1)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dismissal key */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">Out fielder:</span>
                  <button
                    onClick={handleOpenWicket}
                    className="w-full bg-rose-600 text-white hover:bg-rose-700 font-bold py-3.5 rounded-xl text-center shadow-sm text-xs uppercase cursor-pointer transition active:scale-95"
                  >
                    ☝️ WICKET
                  </button>
                </div>

              </div>
            </div>

            {/* Over Ball History Tape */}
            {activeInnings?.oversHistory && activeInnings.oversHistory.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wide block">Current Over Ball history:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const currentOverIndex = activeInnings.oversHistory.length - 1;
                    const ballsInCurrentOver = activeInnings.oversHistory[currentOverIndex] || [];
                    if (ballsInCurrentOver.length === 0) {
                      return <span className="text-xs text-gray-400 italic">No balls bowled in this over yet.</span>;
                    }
                    return ballsInCurrentOver.map((ball, bIdx) => {
                      const isWkt = ball.wicketType !== 'none';
                      const isWd = ball.extraType === 'wide';
                      const isNb = ball.extraType === 'noBall';
                      return (
                        <span 
                          key={bIdx}
                          className={`w-7.5 h-7.5 rounded-full font-mono text-xs font-bold flex items-center justify-center border ${
                            isWkt 
                              ? 'bg-rose-600 text-white border-rose-600 animate-bounce' 
                              : isWd 
                                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                : isNb 
                                  ? 'bg-violet-100 text-violet-800 border-violet-300' 
                                  : 'bg-white text-slate-800 border-slate-300'
                          }`}
                        >
                          {isWkt ? 'W' : isWd ? 'WD' : isNb ? 'NB' : ball.runs}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: NEW WICKET FORM DETAILS */}
      {/* MODAL 1: NEW WICKET FORM DETAILS */}
      <AnimatePresence>
        {isWicketModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 font-sans">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleRecordWicket}
              className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-slate-200 space-y-4"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-display font-black text-rose-600 uppercase flex items-center gap-1.5">
                  ☝️ Record Wicket Details
                </h3>
                <p className="text-xs text-slate-400 mt-1">Specify how the dismissal occurred to log player profile stats</p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Out Player */}
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Which batsman is OUT?</label>
                  <select
                    value={outPlayerId}
                    onChange={e => setOutPlayerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-rose-500 transition"
                  >
                    <option value={match.strikerId}>{strikerName} (Striker)</option>
                    <option value={match.nonStrikerId}>{nonStrikerName} (Non-striker)</option>
                  </select>
                </div>

                {/* Dismissal Type */}
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Dismissal Type</label>
                  <select
                    value={wicketType}
                    onChange={e => setWicketType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-rose-500 transition"
                  >
                    <option value="bowled">Bowled 🎯</option>
                    <option value="caught">Caught Out ⚾</option>
                    <option value="lbw">LBW 🏏</option>
                    <option value="runout">Run Out 🏃‍♂️</option>
                    <option value="stumped">Stumped 🧤</option>
                    <option value="hitwicket">Hit wicket 🚫</option>
                  </select>
                </div>

                {/* Fielder Name */}
                {(wicketType === 'caught' || wicketType === 'runout' || wicketType === 'stumped') && (
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Fielder Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sameer"
                      value={wicketFielderName}
                      onChange={e => setWicketFielderName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-rose-500 transition"
                    />
                  </div>
                )}

                {/* Incoming batsman selector */}
                {(() => {
                  const itemsOutCount = activeInnings?.wickets || 0;
                  const availableTeamSquad = battingPlayers.filter(
                    p => p.id !== match.strikerId && p.id !== match.nonStrikerId && !activeInnings?.batsmen[p.id]?.isOut
                  );
                  const isLastWicket = itemsOutCount + 1 >= Math.min(battingPlayers.length - 1, 10);
                  
                  if (isLastWicket) {
                    return (
                      <div className="p-3 bg-rose-50 text-rose-800 rounded-lg font-bold text-center">
                        All out! This is the terminal wicket of the innings!
                      </div>
                    );
                  }

                  return (
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Select Incoming batsman ⭐</label>
                      <select
                        required
                        value={incomingBatsmanId}
                        onChange={e => setIncomingBatsmanId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-rose-500 transition"
                      >
                        <option value="">-- Choose Next Batter --</option>
                        {availableTeamSquad.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsWicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-500 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-rose-600 transition cursor-pointer"
                >
                  Record Dismissal
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: OVER END NEW BOWLER PANEL */}
      <AnimatePresence>
        {isNewBowlerModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 font-sans">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleConfirmNewBowler}
              className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-200 space-y-4"
              id="new-bowler-popup"
            >
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-display font-black text-emerald-600 uppercase flex items-center gap-1.5">
                  🔄 Over Completed! Select New Bowler
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Select bowler for the next over. Note: Cricket rules state a bowler cannot bowl consecutive overs.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 font-mono">Choose Bowler ⚾</label>
                <select
                  required
                  value={nextBowlerId}
                  onChange={e => setNextBowlerId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition"
                >
                  <option value="">-- Choose Bowler --</option>
                  {bowlingPlayers
                    .filter(p => p.id !== match.currentBowlerId) // Bowler cannot bowl consecutive overs
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="submit"
                  disabled={!nextBowlerId}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                >
                  Set Active Bowler
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: INNINGS NOTICE CONFIRMATON OVERLAY */}
      <AnimatePresence>
        {inningsNotice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-200 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                📢
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {inningsNotice.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {inningsNotice.body}
                </p>
              </div>
              <button
                type="button"
                onClick={inningsNotice.onConfirm}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {inningsNotice.buttonText}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
