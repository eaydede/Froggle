const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function ordinal(day: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const mod100 = day % 100;
  return (
    day + (suffixes[(mod100 - 20) % 10] || suffixes[mod100] || suffixes[0])
  );
}

/** "April 12th, 2026" */
export function formatFullDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

/** "Apr 12" */
export function formatShortDate(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Formats a DailyInfo config into display strings.
 * e.g. { boardSize: 5, timeLimit: 120, minWordLength: 4 }
 *   -> { boardLabel: "5x5", timerLabel: "2:00", lettersLabel: "4+ letters" }
 */
export function formatConfig(config: {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}): { boardLabel: string; timerLabel: string; lettersLabel: string } {
  const minutes = Math.floor(config.timeLimit / 60);
  const seconds = config.timeLimit % 60;
  const timerLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return {
    boardLabel: `${config.boardSize}x${config.boardSize}`,
    timerLabel,
    lettersLabel: `${config.minWordLength}+ letters`,
  };
}
