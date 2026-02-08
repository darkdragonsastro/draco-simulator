// B-V color index to RGB conversion using Ballesteros (2012) Planckian locus approximation

/**
 * Convert B-V color index to RGB color.
 * Uses the Ballesteros (2012) formula to map stellar color index
 * to approximate blackbody color temperature and then to RGB.
 */
export function bvToRgb(bv: number): [number, number, number] {
  // Clamp B-V to valid range
  const t = Math.max(-0.4, Math.min(2.0, bv));

  // Ballesteros (2012) temperature formula
  const temp = 4600 * (1 / (0.92 * t + 1.7) + 1 / (0.92 * t + 0.62));

  // Convert temperature to RGB using Planckian locus approximation
  return temperatureToRgb(temp);
}

/**
 * Convert color temperature (Kelvin) to RGB values (0-1 range).
 * Based on Tanner Helland's algorithm.
 */
function temperatureToRgb(temp: number): [number, number, number] {
  const t = temp / 100;
  let r: number, g: number, b: number;

  // Red
  if (t <= 66) {
    r = 1;
  } else {
    r = 1.292936186 * Math.pow(t - 60, -0.1332047592);
  }

  // Green
  if (t <= 66) {
    g = 0.3900815788 * Math.log(t) - 0.6318414438;
  } else {
    g = 1.129890861 * Math.pow(t - 60, -0.0755148492);
  }

  // Blue
  if (t >= 66) {
    b = 1;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 0.5432067891 * Math.log(t - 10) - 1.19625409;
  }

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

/**
 * Convert B-V to a CSS color string.
 */
export function bvToHex(bv: number): string {
  const [r, g, b] = bvToRgb(bv);
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
