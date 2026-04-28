import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray';
  pulse?: boolean;
  className?: string;
}

const variants = {
  green: 'bg-green-900/60 text-green-300 border-green-700',
  red: 'bg-red-900/60 text-red-300 border-red-700',
  orange: 'bg-orange-900/60 text-orange-300 border-orange-700',
  purple: 'bg-purple-900/60 text-purple-300 border-purple-700',
  blue: 'bg-blue-900/60 text-blue-300 border-blue-700',
  gray: 'bg-gray-800 text-gray-400 border-gray-600',
};

export default function Badge({ children, variant = 'gray', pulse, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        variants[variant],
        pulse && 'badge-error',
        className
      )}
    >
      {children}
    </span>
  );
}
