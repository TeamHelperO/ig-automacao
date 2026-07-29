import { SignalMark } from "./signal-mark";

export function BrandMark({
  logoUrl,
  size = 22,
  className = "",
}: {
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={`object-contain rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <SignalMark size={size} className={className} />;
}
