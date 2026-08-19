import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function ymdToDate(ymd) {
  if (!ymd) return undefined
  const [year, month, day] = String(ymd).split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

export function dateToYmd(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DatePicker({ id, value, onChange, placeholder = 'Pick a date', className, disabled, minDate }) {
  const [open, setOpen] = useState(false)
  const selected = ymdToDate(value)
  const fromDate = ymdToDate(minDate)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full min-w-[13rem] items-center justify-start gap-2 px-3 font-normal leading-none',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{selected ? format(selected, 'd MMM yyyy') : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={fromDate ? { before: fromDate } : undefined}
          onSelect={(day) => {
            if (!day) return
            onChange?.(dateToYmd(day))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
