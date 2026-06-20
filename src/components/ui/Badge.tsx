import { clsx } from './clsx'

type BadgeVariant = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const variants: Record<BadgeVariant, string> = {
  gray:   'bg-gray-100 text-gray-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'gray', size = 'md' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      variants[variant]
    )}>
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    draft: 'gray', pending: 'yellow', confirmed: 'blue', completed: 'green', cancelled: 'red',
    approved: 'green', rejected: 'red',
    active: 'green', inactive: 'red',
  }
  return map[status] ?? 'gray'
}
