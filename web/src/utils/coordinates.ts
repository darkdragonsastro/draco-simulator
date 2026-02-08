/** Format RA in hours to "14h 23m 12s" */
export function formatRA(hours: number): string {
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

/** Format Dec in degrees to "+27\u00b0 12' 45\"" */
export function formatDec(degrees: number): string {
  const sign = degrees >= 0 ? '+' : '-';
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${sign}${d}\u00b0 ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}"`;
}

/** Format degrees to "62.3\u00b0" */
export function formatDeg(degrees: number): string {
  return `${degrees.toFixed(1)}\u00b0`;
}

/** Format hour angle to "+2h 15m" */
export function formatHA(hours: number): string {
  const sign = hours >= 0 ? '+' : '-';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
}

/** Parse RA string like "14h 23m 12s" or "14.387" to hours. Returns null on failure. */
export function parseRA(input: string): number | null {
  input = input.trim();

  // Try decimal first
  const decimal = parseFloat(input);
  if (!isNaN(decimal) && input.match(/^-?\d+\.?\d*$/)) {
    if (decimal >= 0 && decimal < 24) return decimal;
    return null;
  }

  // Try HMS format
  const hms = input.match(/(\d+)\s*h\s*(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s?/i);
  if (hms) {
    const h = parseInt(hms[1]);
    const m = parseInt(hms[2]);
    const s = parseFloat(hms[3]);
    const result = h + m / 60 + s / 3600;
    if (result >= 0 && result < 24) return result;
  }

  return null;
}

/** Parse Dec string like "+27 12 45" or "27.2125" to degrees. Returns null on failure. */
export function parseDec(input: string): number | null {
  input = input.trim();

  // Try decimal
  const decimal = parseFloat(input);
  if (!isNaN(decimal) && input.match(/^[+-]?\d+\.?\d*$/)) {
    if (decimal >= -90 && decimal <= 90) return decimal;
    return null;
  }

  // Try DMS format
  const dms = input.match(/([+-]?)(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*/);
  if (dms) {
    const sign = dms[1] === '-' ? -1 : 1;
    const d = parseInt(dms[2]);
    const m = parseInt(dms[3]);
    const s = parseFloat(dms[4]);
    const result = sign * (d + m / 60 + s / 3600);
    if (result >= -90 && result <= 90) return result;
  }

  return null;
}
