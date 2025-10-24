export const getSportIcon = (sport: string): string => {
  const icons: Record<string, string> = {
    futbol: '⚽',
    basquetbol: '🏀',
    voleibol: '🏐',
    rugby: '🏉',
  };
  return icons[sport] || '🎯';
};
