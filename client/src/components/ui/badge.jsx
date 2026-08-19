import { cn } from '@/lib/utils'

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border text-foreground',
    destructive: 'bg-rose-700 text-white dark:bg-rose-500',
    success: 'bg-emerald-700 text-white dark:bg-emerald-500'
  }
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', variants[variant] || variants.default, className)}
      {...props}
    />
  )
}

export { Badge }
