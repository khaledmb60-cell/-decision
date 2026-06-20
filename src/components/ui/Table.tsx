import { ReactNode } from 'react'
import { clsx } from './clsx'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T = any>({
  columns, data, keyField, loading, emptyMessage = 'No data found', onRowClick
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={col.key} className={clsx('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex justify-center">
                  <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any[]).map((row, rowIdx) => (
              <tr
                key={String(row[keyField as string] ?? rowIdx)}
                onClick={() => onRowClick?.(row)}
                className={clsx('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
              >
                {columns.map(col => (
                  <td key={col.key} className={clsx('px-4 py-3 text-sm text-gray-700', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
