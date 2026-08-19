import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parse } from 'date-fns'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS = ['AM', 'PM']

const pad = (n) => String(n).padStart(2, '0')

export function parseHm(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''))
  if (!match) return { hour: 9, minute: 0, period: 'AM' }
  const hour24 = Number(match[1])
  const minute = Number(match[2])
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return { hour, minute, period }
}

export function toHm({ hour, minute, period }) {
  let hour24 = hour % 12
  if (period === 'PM') hour24 += 12
  return `${pad(hour24)}:${pad(minute)}`
}

function Column({ items, selected, onSelect, label, formatItem }) {
  const activeRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const el = activeRef.current
    const parent = listRef.current
    if (!el || !parent) return
    parent.scrollTop = el.offsetTop - parent.clientHeight / 2 + el.clientHeight / 2
  }, [selected])

  return (
    <div className="flex min-w-[3.25rem] flex-col">
      <div className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div ref={listRef} className="h-44 overflow-y-auto overscroll-contain px-1 pb-1">
        {items.map((item) => {
          const active = item === selected
          return (
            <button
              key={String(item)}
              type="button"
              ref={active ? activeRef : undefined}
              onClick={() => onSelect(item)}
              className={cn(
                'flex h-8 w-full items-center justify-center rounded-md text-sm',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
            >
              {formatItem ? formatItem(item) : item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TimePicker({ id, value, onChange, placeholder = 'Pick time', className, disabled }) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => parseHm(value), [value])
  const label = useMemo(() => {
    if (!value) return null
    const date = parse(value, 'HH:mm', new Date())
    if (Number.isNaN(date.getTime())) return value
    return format(date, 'h:mm a')
  }, [value])

  const commit = (next) => {
    onChange?.(toHm(next))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-[7.75rem] shrink-0 items-center justify-start gap-2 px-3 font-normal leading-none',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-1">
        <div className="flex">
          <Column
            label="Hour"
            items={HOURS}
            selected={parsed.hour}
            formatItem={(item) => String(item)}
            onSelect={(hour) => commit({ ...parsed, hour })}
          />
          <Column
            label="Min"
            items={MINUTES}
            selected={parsed.minute}
            formatItem={pad}
            onSelect={(minute) => commit({ ...parsed, minute })}
          />
          <Column
            label="AM/PM"
            items={PERIODS}
            selected={parsed.period}
            onSelect={(period) => commit({ ...parsed, period })}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
