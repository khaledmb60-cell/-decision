import { ReactNode } from 'react'
import { clsx } from './clsx'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-100', padding && 'p-6', className)}>
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: ReactNode
  iconBg?: string
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, iconBg = 'bg-primary-50' }: StatCardProps) {
  const changeColors = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    neutral:  'text-gray-500',
  }
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={clsx('mt-1 text-xs font-medium', changeColors[changeType])}>{change}</p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
