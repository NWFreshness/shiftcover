interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** Punch-card / time-clock mark: a notched card with a clock face. */
export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 0H21L32 11V26C32 29.3137 29.3137 32 26 32H6C2.68629 32 0 29.3137 0 26V6C0 2.68629 2.68629 0 6 0Z"
        fill="#1f4d3c"
      />
      <path d="M21 0L32 11H24C22.3431 11 21 9.65685 21 8V0Z" fill="#163a2d" />
      <circle cx="15" cy="19" r="7.25" stroke="#f1ece1" strokeWidth="1.6" />
      <path
        d="M15 19V14.6M15 19L18.2 20.6"
        stroke="#b9670f"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="15" cy="19" r="1" fill="#f1ece1" />
    </svg>
  );
}

interface BrandProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export default function Brand({ size = 32, showWordmark = true, className }: BrandProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <BrandMark size={size} />
      {showWordmark && (
        <span
          className="font-display font-extrabold tracking-tight text-ink leading-none"
          style={{ fontSize: size * 0.62 }}
        >
          Shift<span className="text-pine">Cover</span>
        </span>
      )}
    </span>
  );
}
