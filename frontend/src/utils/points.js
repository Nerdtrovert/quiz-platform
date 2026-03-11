// Points calculation — mirrors backend logic
export function calculatePoints(basePoints, timeTaken, totalTime, streak) {
  const speedBonus = Math.max(0, (totalTime - timeTaken)) * 10;
  const multiplier = getMultiplier(streak);
  return Math.round((basePoints + speedBonus) * multiplier);
}

export function getMultiplier(streak) {
  if (streak >= 4) return 2.0;
  if (streak === 3) return 1.5;
  if (streak === 2) return 1.25;
  return 1.0;
}

export function getStreakLabel(streak) {
  if (streak >= 4) return '🔥 ON FIRE!';
  if (streak === 3) return '⚡ Hot Streak!';
  if (streak === 2) return '✨ Nice Streak!';
  return null;
}
