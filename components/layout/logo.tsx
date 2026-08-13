import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };
  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2 font-extrabold tracking-tight', sizes[size], className)}>
      <span className={cn('flex items-center justify-center rounded-lg bg-primary p-1', iconSizes[size])}>
        <TrendingUp className="h-3/4 w-3/4 text-primary-foreground" />
      </span>
      <span>
        Smart<span className="gold-text">Punter</span>
      </span>
    </Link>
  );
}
