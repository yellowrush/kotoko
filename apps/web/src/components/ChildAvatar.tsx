import type { ChildGender } from '@kodoko/domain';

function pickEmoji(gender: ChildGender | undefined, ageMonths: number): string {
  if (ageMonths < 12) return '👶';
  if (gender === 'girl') return '👧';
  if (gender === 'boy') return '👦';
  return '🧒';
}

const BG: Record<ChildGender | 'none', string> = {
  girl: 'bg-pink-100',
  boy: 'bg-sky-100',
  other: 'bg-amber-100',
  none: 'bg-brand-50',
};

const SIZES = {
  sm: 'h-8 w-8 text-lg',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
} as const;

export function ChildAvatar({
  gender,
  ageMonths,
  size = 'md',
}: {
  gender?: ChildGender;
  ageMonths: number;
  size?: keyof typeof SIZES;
}) {
  const bg = BG[gender ?? 'none'];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${bg} ${SIZES[size]}`}
    >
      {pickEmoji(gender, ageMonths)}
    </span>
  );
}