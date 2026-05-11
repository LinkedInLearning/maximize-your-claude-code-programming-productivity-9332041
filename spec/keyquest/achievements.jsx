// achievements.jsx — evaluate which badges newly unlock
const evaluateAchievements = (player, justAddedRun) => {
  const totalRuns = player.runs.length;
  const stats = { totalRuns };
  const newly = [];
  for (const a of window.KQ_DATA.ACHIEVEMENTS) {
    if (player.unlocked[a.id]) continue;
    try {
      if (a.test(justAddedRun, stats)) newly.push(a);
    } catch (e) {}
  }
  return newly;
};

window.KQ_Achievements = { evaluateAchievements };
