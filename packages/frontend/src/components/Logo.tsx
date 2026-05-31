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
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M50 5 C25 15, 20 40, 50 95 C80 40, 75 15, 50 5 Z"
        fill="url(#logoGrad)"
      />
      <path
        d="M40 70 L60 50 L45 35"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="70" r="3" fill="white" />
    </svg>
  );
}
