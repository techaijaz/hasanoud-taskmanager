import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  const navButton = cn(
    buttonVariants({ variant: 'outline' }),
    'absolute top-0 z-10 inline-flex size-8 items-center justify-center bg-transparent p-0 opacity-70 hover:opacity-100'
  )

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col',
        month: 'relative space-y-3',
        month_caption: 'flex h-8 items-center justify-center px-10',
        caption_label: 'text-sm font-medium leading-none',
        nav: 'contents',
        button_previous: cn(navButton, 'left-0'),
        button_next: cn(navButton, 'right-0'),
        month_grid: 'w-full',
        weeks: 'flex flex-col',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100'
        ),
        selected: '[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground',
        today: '[&_button]:bg-accent [&_button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className={cn('size-4', chevronClass)} strokeWidth={2} />
        }
      }}
      {...props}
    />
  )
}

export { Calendar }
