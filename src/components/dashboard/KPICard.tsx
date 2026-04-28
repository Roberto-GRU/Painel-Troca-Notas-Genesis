import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: LucideIcon;
  variant?: 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray';
  onClick?: () => void;
  active?: boolean;
  dimmed?: boolean;
}

const variants = {
  green:  { bg: 'bg-green-900/20 border-green-800',   icon: 'text-green-400',  val: 'text-green-400',  ring: 'ring-green-500' },
  red:    { bg: 'bg-red-900/20 border-red-800',       icon: 'text-red-400',    val: 'text-red-400',    ring: 'ring-red-500' },
  orange: { bg: 'bg-orange-900/20 border-orange-800', icon: 'text-orange-400', val: 'text-orange-400', ring: 'ring-orange-500' },
  purple: { bg: 'bg-purple-900/20 border-purple-800', icon: 'text-purple-400', val: 'text-purple-400', ring: 'ring-purple-500' },
  blue:   { bg: 'bg-blue-900/20 border-blue-800',     icon: 'text-blue-400',   val: 'text-blue-400',   ring: 'ring-blue-500' },
  gray:   { bg: 'bg-[#1a1d27] border-[#2a2d3e]',     icon: 'text-gray-400',   val: 'text-white',      ring: 'ring-gray-500' },
};

export default function KPICard({ label, value, subLabel, icon: Icon, variant = 'gray', onClick, active, dimmed }: Props) {
  const v = variants[variant];
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-5 flex items-start gap-4 transition-all duration-200',
        v.bg,
        onClick && 'cursor-pointer hover:brightness-125',
        active && `ring-2 ${v.ring} ring-offset-2 ring-offset-[#0f1117]`,
        dimmed && 'opacity-30',
      )}
    >
      <div className={clsx('p-2 rounded-xl bg-black/20', v.icon)}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={clsx('text-3xl font-bold mt-0.5', v.val)}>{value}</p>
        {subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}
