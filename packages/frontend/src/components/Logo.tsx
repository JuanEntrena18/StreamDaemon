interface Props {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="logoGradB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="logoShine" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Background hexagon */}
      <polygon
        points="50,6 88,28 88,72 50,94 12,72 12,28"
        fill="url(#logoGradB)"
        filter="url(#logoGlow)"
      />
      {/* Inner shine */}
      <polygon
        points="50,6 88,28 88,72 50,94 12,72 12,28"
        fill="url(#logoShine)"
      />
      {/* Lightning bolt / forge mark */}
      <path
        d="M56 14 L36 52 L50 52 L44 86 L68 44 L54 44 Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
