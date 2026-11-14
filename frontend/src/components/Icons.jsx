export function GoogleDriveIcon({ size = 18 }) {
  return (
    <svg width={size} height={Math.round(size * 0.92)} viewBox="0 0 24 22" aria-hidden="true">
      <path fill="#2ca465" d="M8 0h7L7 14H0z" />
      <path fill="#f5c149" d="M15 0l9 15h-8L8 0z" />
      <path fill="#4784db" d="M0 14h24l-4 7H4z" />
    </svg>
  );
}

export function BotanicalSprig() {
  return (
    <svg className="sprig" viewBox="0 0 100 110" aria-hidden="true">
      <path
        d="M45 105Q60 55 51 8M53 68Q15 63 15 29Q52 32 54 61M56 48Q89 48 92 16Q58 17 55 39"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
