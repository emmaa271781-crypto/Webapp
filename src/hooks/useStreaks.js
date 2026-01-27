import { useState, useEffect, useCallback } from 'react';

// Streak system for daily logins and game wins
export function useStreaks(socket, currentUser) {
  const [dailyStreak, setDailyStreak] = useState(0);
  const [gameWinStreak, setGameWinStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [totalWins, setTotalWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    if (!socket || !currentUser) return;

    // Load streaks from localStorage
    const loadStreaks = () => {
      const saved = localStorage.getItem(`streaks_${currentUser}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setDailyStreak(data.dailyStreak || 0);
          setGameWinStreak(data.gameWinStreak || 0);
          setLastLoginDate(data.lastLoginDate);
          setTotalWins(data.totalWins || 0);
          setTotalGames(data.totalGames || 0);
        } catch (e) {
          console.error('Error loading streaks:', e);
        }
      }
    };

    loadStreaks();

    // Check daily login streak
    const checkDailyStreak = () => {
      const today = new Date().toDateString();
      const saved = localStorage.getItem(`streaks_${currentUser}`);
      
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const lastDate = data.lastLoginDate ? new Date(data.lastLoginDate).toDateString() : null;
          
          if (lastDate === today) {
            // Already logged in today
            return;
          } else if (lastDate && new Date(today) - new Date(lastDate) === 86400000) {
            // Consecutive day
            const newStreak = (data.dailyStreak || 0) + 1;
            setDailyStreak(newStreak);
            updateStreaks({ dailyStreak: newStreak, lastLoginDate: today });
          } else {
            // Streak broken
            setDailyStreak(1);
            updateStreaks({ dailyStreak: 1, lastLoginDate: today });
          }
        } catch (e) {
          console.error('Error checking daily streak:', e);
        }
      } else {
        // First login
        setDailyStreak(1);
        updateStreaks({ dailyStreak: 1, lastLoginDate: today });
      }
    };

    checkDailyStreak();

    // Listen for game results
    const handleGameWin = (data) => {
      const newWinStreak = gameWinStreak + 1;
      setGameWinStreak(newWinStreak);
      setTotalWins(prev => prev + 1);
      setTotalGames(prev => prev + 1);
      updateStreaks({ gameWinStreak: newWinStreak, totalWins: totalWins + 1, totalGames: totalGames + 1 });
    };

    const handleGameLoss = () => {
      setGameWinStreak(0);
      setTotalGames(prev => prev + 1);
      updateStreaks({ gameWinStreak: 0, totalGames: totalGames + 1 });
    };

    socket.on('game_win', handleGameWin);
    socket.on('game_loss', handleGameLoss);

    return () => {
      socket.off('game_win', handleGameWin);
      socket.off('game_loss', handleGameLoss);
    };
  }, [socket, currentUser, gameWinStreak, totalWins, totalGames]);

  const updateStreaks = useCallback((updates) => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`streaks_${currentUser}`);
    const data = saved ? JSON.parse(saved) : {};
    const updated = { ...data, ...updates };
    localStorage.setItem(`streaks_${currentUser}`, JSON.stringify(updated));
    
    // Also emit to server for persistence
    if (socket) {
      socket.emit('update_streaks', updated);
    }
  }, [currentUser, socket]);

  return {
    dailyStreak,
    gameWinStreak,
    totalWins,
    totalGames,
    winRate: totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0,
  };
}
