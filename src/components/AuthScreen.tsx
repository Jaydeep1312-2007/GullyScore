/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, UserAccount, setBearerToken, hydrateFromCloudSync } from '../db';
import { Player } from '../types';
import { Lock, User, Sparkles, LogIn, UserPlus, KeyRound, ArrowRight, ShieldAlert, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../firebase';

interface AuthScreenProps {
  onLoginSuccess: (userId: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('All-rounder');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Update global DB token
      setBearerToken(idToken);
      
      // Synchronize backend postgres records
      const syncRes = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ uid: user.uid, email: user.email || "" })
      });
      
      if (!syncRes.ok) {
        throw new Error("Failed to synchronize Google Auth profile with Cloud SQL.");
      }
      
      // Fetch cloud tables and hydrate local IndexedDB SQLite instantly
      const dataRes = await fetch("/api/sync-data", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      
      if (dataRes.ok) {
        const payload = await dataRes.json();
        await hydrateFromCloudSync(payload);
      }
      
      // Persist loggedInUserId locally
      await db.settings.put({ key: 'loggedInUserId', value: user.uid });
      
      // Generate standard profile cache if none exists or update it
      let cachedProfile = { name: user.displayName || 'Google Player', role: 'All-rounder', runs: 0, wickets: 0 };
      await db.settings.put({ key: 'currentUserProfile', value: cachedProfile });
      
      setSuccess(`Authenticated as ${user.displayName || user.email}!`);
      setTimeout(() => {
        onLoginSuccess(user.uid);
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!username.trim() || !password) {
      setError('Please provide username and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Lookup user in IndexedDB
      const usernameLower = username.trim().toLowerCase();
      const users = await db.users.filter(u => u.username.toLowerCase() === usernameLower).toArray();
      const user = users[0];

      if (!user) {
        setError('No account found under this username. Did you mean to register?');
        setIsLoading(false);
        return;
      }

      if (user.passwordHash !== password) {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success! Auto-login
      await db.settings.put({ key: 'loggedInUserId', value: user.id });
      
      // Sync their profile settings
      if (user.playerProfileId) {
        await db.settings.put({ key: 'selectedPlayerProfileId', value: user.playerProfileId });
      }
      await db.settings.put({ key: 'currentUserProfile', value: {
        name: user.fullName,
        role: user.role,
        runs: 0, // Fallbacks on display side will dynamically compute based on statistics
        wickets: 0
      } });

      setSuccess(`Welcome back, ${user.fullName}!`);
      setTimeout(() => {
        onLoginSuccess(user.id);
      }, 800);

    } catch (err: any) {
      console.error(err);
      setError('An unexpected database error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanUsername = username.trim().toLowerCase();

    if (!fullName.trim() || !cleanUsername || !password) {
      setError('All fields are required.');
      setIsLoading(false);
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const existing = await db.users.filter(u => u.username.toLowerCase() === cleanUsername).toArray();
      if (existing.length > 0) {
        setError('Username is already taken. Please choose another username.');
        setIsLoading(false);
        return;
      }

      // 1. Create a corresponding Player profile in the local database
      const newPlayerId = 'p_usr_' + Date.now();
      const newCricketer: Player = {
        id: newPlayerId,
        name: fullName.trim(),
        role: role as Player['role'],
        battingStyle: 'Right-hand',
        bowlingStyle: 'None',
        matchesPlayed: 0,
        runsScored: 0,
        ballsFaced: 0,
        wicketsTaken: 0,
        runsConceded: 0,
        ballsBowled: 0,
        highScore: 0,
        fifties: 0,
        hundreds: 0
      };

      await db.players.add(newCricketer);

      // 2. Insert User account
      const newUserId = 'usr_' + Date.now();
      const newAccount: UserAccount = {
        id: newUserId,
        username: cleanUsername,
        passwordHash: password, // Simple plain text match for convenient offline-use validation
        fullName: fullName.trim(),
        role: role,
        playerProfileId: newPlayerId
      };

      await db.users.add(newAccount);

      // 3. Authenticate immediately and store session
      await db.settings.put({ key: 'loggedInUserId', value: newUserId });
      await db.settings.put({ key: 'selectedPlayerProfileId', value: newPlayerId });
      await db.settings.put({ key: 'currentUserProfile', value: {
        name: fullName.trim(),
        role: role,
        runs: 0,
        wickets: 0
      } });

      setSuccess('Account created successfully! Welcome to Gully Score.');
      setTimeout(() => {
        onLoginSuccess(newUserId);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800" id="auth-root">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-900 font-black text-2xl font-display shadow-md mb-4 transform rotate-3">
            🏏
          </div>
          <h2 className="text-3xl font-display font-extrabold tracking-tight text-slate-900 leading-none">
            GULLY SCORE
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-sm">
            Digital Matchbook & Premium League Tracker. Authenticate below to open your offline scoreboard vault.
          </p>
        </div>

        {/* Tab Selector Card */}
        <div className="mt-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider transition ${
                isLogin 
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </span>
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider transition ${
                !isLogin 
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Register ID
              </span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Feedback Banners */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-rose-50 border border-rose-150 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-700"
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Authentication Error</span>
                  {error}
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-emerald-50 border border-emerald-150 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Verification Success</span>
                  {success}
                </div>
              </motion.div>
            )}

            {isLogin ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Gully Score Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jaydeep"
                      disabled={isLoading}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      disabled={isLoading}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-850 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 shadow-xs mt-6"
                >
                  {isLoading ? 'Decrypting Session...' : 'Unlock Account Panel'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Cricketer Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Sparkles className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jaydeep Darji"
                      disabled={isLoading}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Your Specialty Role
                  </label>
                  <select
                    disabled={isLoading}
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition cursor-pointer"
                  >
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-rounder</option>
                    <option>Wicket-keeper Batsman</option>
                  </select>
                </div>

                <hr className="border-slate-100 my-4" />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Set Gully Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jaydeep13"
                      disabled={isLoading}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      disabled={isLoading}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 outline-none focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 shadow-xs mt-6"
                >
                  {isLoading ? 'Creating Account...' : 'Register & Log in 🚀'}
                </button>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-mono">
                <span className="bg-white px-3 text-slate-400">Or Cloud Sync</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-sm border border-slate-200"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className="w-4 h-4 bg-white rounded-full" />
              {isLoading ? 'Verifying Google Account...' : 'Continue with Google'}
            </button>
          </div>
        </div>

        {/* Informative Footer explaining Persistence */}
        <div className="mt-6 text-center text-[10px] text-slate-400 font-mono space-y-1">
          <p>🔒 Offline Vault Sandbox: Credentials reside securely on your browser. </p>
          <p>Did you migrate? Existing accounts automatically logged into username: <strong className="text-slate-500 font-bold select-all bg-slate-100 p-0.5 px-1 rounded-md">jaydeep</strong> with password: <strong className="text-slate-500 font-bold select-all bg-slate-100 p-0.5 px-1 rounded-md">gully123</strong>.</p>
        </div>

      </div>
    </div>
  );
}
