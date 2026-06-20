import { SelectHTMLAttributes, forwardRef } from 'react'
import { clsx } from './clsx'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...rest }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'block w-full rounded-lg border shadow-sm text-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-2 transition-colors',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-400 focus:ring-primary-100',
            className
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
