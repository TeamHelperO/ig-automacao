function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

/** Mistura hex1 com hex2, onde weight=0 é 100% hex1 e weight=1 é 100% hex2. */
export function mixHex(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(
    r1 * (1 - weight) + r2 * weight,
    g1 * (1 - weight) + g2 * weight,
    b1 * (1 - weight) + b2 * weight
  );
}

/** Deriva as variações de tom que o design system precisa a partir das 2 cores base. */
export function deriveBrandShades(primary: string, accent: string) {
  return {
    indigo: primary,
    indigoSoft: mixHex(primary, "#ffffff", 0.14),
    signal: accent,
    signalSoft: mixHex(accent, "#ffffff", 0.88),
    signalInk: mixHex(accent, "#000000", 0.55),
  };
}
