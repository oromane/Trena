/** 105 -> "1h45", 60 -> "1h", 45 -> "45 min" */
export function fmtDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
  return `${minutes} min`;
}

/** Version courte pour les espaces réduits : 105 -> "1h45", 45 -> "45′" */
export function fmtDurationShort(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
  return `${minutes}′`;
}
