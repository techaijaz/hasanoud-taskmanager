import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, GripVertical, MoreHorizontal } from 'lucide-react'
import { taskInstancesApi } from '@/lib/api'
import { apiMessage, cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { DatePicker, dateToYmd, ymdToDate } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const todayYmd = () => dateToYmd(new Date())
const CARD_WIDTH = 272

function addDaysLocalYmd(ymd, days) {
  const date = ymdToDate(ymd)
  if (!date) return ymd
  date.setDate(date.getDate() + days)
  return dateToYmd(date)
}

const statusMeta = {
  pending: {
    label: 'Pending',
    badge: 'bg-sky-700 text-white dark:bg-sky-400 dark:text-sky-950',
    card: 'border-l-sky-400 bg-sky-500/[0.08]'
  },
  in_progress: {
    label: 'In progress',
    badge: 'bg-amber-700 text-white dark:bg-amber-400 dark:text-amber-950',
    card: 'border-l-amber-400 bg-amber-500/[0.10]'
  },
  not_done: {
    label: 'Not done',
    badge: 'bg-rose-700 text-white dark:bg-rose-400 dark:text-rose-950',
    card: 'border-l-rose-500 bg-rose-500/[0.10]'
  },
  skipped: {
    label: 'Skipped',
    badge: 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900',
    card: 'border-l-zinc-400 bg-muted/60'
  },
  done: {
    label: 'Done',
    badge: 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950',
    card: 'border-l-emerald-500 bg-emerald-500/[0.10]'
  },
  done_late: {
    label: 'Done late',
    badge: 'bg-orange-700 text-white dark:bg-orange-400 dark:text-orange-950',
    card: 'border-l-orange-500 bg-orange-500/[0.10]'
  }
}

const AVATAR_TONES = [
  'bg-rose-500 text-white',
  'bg-orange-500 text-white',
  'bg-amber-500 text-white',
  'bg-lime-600 text-white',
  'bg-emerald-500 text-white',
  'bg-teal-500 text-white',
  'bg-cyan-500 text-white',
  'bg-sky-500 text-white',
  'bg-blue-500 text-white',
  'bg-indigo-500 text-white',
  'bg-violet-500 text-white',
  'bg-fuchsia-500 text-white'
]

const hashTone = (key) => {
  const value = String(key || '')
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'

const isItemDone = (item) => item.status === 'done_on_time' || item.status === 'done_late'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function AvatarStack({ people }) {
  if (!people?.length) return null
  const visible = people.slice(0, 4)
  const extra = people.length - visible.length
  return (
    <div className="flex -space-x-1.5">
      {visible.map((user) => (
        <span
          key={user.id}
          title={user.name}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background text-[10px] font-semibold shadow-sm',
            hashTone(user.id || user.name)
          )}
        >
          {initials(user.name)}
        </span>
      ))}
      {extra > 0 ? (
        <span
          title={`${extra} more`}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background ring-2 ring-background"
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

export default function TaskBoardPage() {
  const { can } = usePermissions()
  const today = useMemo(() => todayYmd(), [])
  const boardRef = useRef(null)
  const dragRef = useRef(null)
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [note, setNote] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [activeItem, setActiveItem] = useState(null)

  const load = (ymd = date) => {
    setLoading(true)
    taskInstancesApi
      .list(ymd)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(date)
    setExpandedId(null)
    setActiveItem(null)
    setNote('')
    setFiles([])
  }, [date])

  const previews = useMemo(() => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [files])
  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews])

  const onFiles = (list) => {
    const next = Array.from(list || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 5)
    setFiles(next)
  }

  const complete = async () => {
    if (!activeItem || isItemDone(activeItem.item)) return
    if (!activeItem.item.canComplete || !can('taskBoard', 'canEdit')) {
      toast.error('You cannot complete this step')
      return
    }
    if (files.length < 1) {
      toast.error('Add 1 to 5 photos')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      if (note.trim()) formData.append('note', note.trim())
      files.forEach((file) => formData.append('photos', file))
      await taskInstancesApi.completeItem(activeItem.row.id, activeItem.item.id, formData)
      toast.success('Marked done')
      setNote('')
      setFiles([])
      setActiveItem(null)
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleSkip = async (row, skipOnHoliday) => {
    try {
      await taskInstancesApi.setSkipOnHoliday(row.id, skipOnHoliday)
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  const startDrag = (event, row) => {
    if (!can('taskBoard', 'canEdit')) return
    event.preventDefault()
    event.stopPropagation()
    const board = boardRef.current
    if (!board) return
    const maxZ = rows.reduce((max, item) => Math.max(max, item.boardZ || 0), 0)
    dragRef.current = {
      id: row.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: row.boardX,
      originY: row.boardY,
      x: row.boardX,
      y: row.boardY,
      z: maxZ + 1,
      width: board.clientWidth,
      height: board.clientHeight
    }
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, boardZ: maxZ + 1 } : item)))
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const x = clamp(drag.originX + ((event.clientX - drag.startX) / drag.width) * 100, 0, 78)
    const y = clamp(drag.originY + ((event.clientY - drag.startY) / drag.height) * 100, 0, 78)
    drag.x = x
    drag.y = y
    setRows((prev) => prev.map((item) => (item.id === drag.id ? { ...item, boardX: x, boardY: y } : item)))
  }

  const endDrag = async () => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    try {
      await taskInstancesApi.placeOnBoard(drag.id, { x: drag.x, y: drag.y, z: drag.z })
    } catch (error) {
      toast.error(apiMessage(error))
      load()
    }
  }

  const openComplete = (row, item) => {
    if (isItemDone(item)) {
      setActiveItem({ row, item, viewOnly: true })
      return
    }
    setNote('')
    setFiles([])
    setActiveItem({ row, item, viewOnly: false })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Task Board</h2>
          <p className="mt-1 text-sm text-muted-foreground">Notice board: drag a main task anywhere. Click to open steps.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => setDate(addDaysLocalYmd(date, -1))} aria-label="Previous day">
            <ChevronLeft className="size-4" />
          </Button>
          <DatePicker value={date} onChange={setDate} className="h-10 w-[12.5rem] min-w-[12.5rem]" />
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => setDate(addDaysLocalYmd(date, 1))} aria-label="Next day">
            <ChevronRight className="size-4" />
          </Button>
          {date !== today && (
            <Button variant="secondary" onClick={() => setDate(today)}>
              Today
            </Button>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">No tasks for this date.</p>
      )}

      <div ref={boardRef} className="relative min-h-[70vh] overflow-hidden rounded-2xl border bg-secondary/40">
        {rows.map((row) => {
          const todayStatus = row.todayStatus
          const meta = todayStatus ? statusMeta[todayStatus.key] : statusMeta.pending
          const statusLabel =
            todayStatus?.key === 'in_progress'
              ? `In progress (${todayStatus.doneCount} of ${todayStatus.itemCount})`
              : meta.label
          const expanded = expandedId === row.id
          return (
            <article
              key={row.id}
              className={cn('absolute w-[17rem] overflow-hidden rounded-xl border border-l-4 shadow-sm', meta.card)}
              style={{
                left: `${row.boardX}%`,
                top: `${row.boardY}%`,
                zIndex: row.boardZ || 1,
                width: CARD_WIDTH
              }}
            >
              <div className="flex items-start gap-2 px-3 py-3">
                <button
                  type="button"
                  className="mt-1 shrink-0 cursor-grab touch-none text-muted-foreground"
                  aria-label="Move task"
                  onPointerDown={(event) => startDrag(event, row)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button type="button" className="min-w-0 flex-1 space-y-2 text-left" onClick={() => setExpandedId(expanded ? null : row.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-5">{row.template?.title}</h3>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', expanded && 'rotate-180')} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('font-semibold', meta.badge)}>{statusLabel}</Badge>
                    <AvatarStack people={row.assignees} />
                  </div>
                  <p className="text-xs text-muted-foreground">{row.location?.name}</p>
                </button>
                {row.offDay && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Task actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuCheckboxItem
                        checked={row.skipOnHoliday}
                        disabled={!row.canToggleSkip || !can('taskBoard', 'canEdit')}
                        onCheckedChange={(checked) => toggleSkip(row, !!checked)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        Skip this day
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {expanded && (
                <div className="space-y-2 border-t px-3 py-3">
                  {(row.items || []).map((item) => {
                    const done = isItemDone(item)
                    const lateLook = item.status === 'overdue' || item.status === 'done_late'
                    return (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg bg-background px-2 py-2">
                        <button
                          type="button"
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40'
                          )}
                          onClick={() => openComplete(row, item)}
                          aria-label={done ? 'Completed' : 'Complete step'}
                        >
                          {done ? <Check className="h-3 w-3" /> : null}
                        </button>
                        <div className="min-w-0 space-y-1">
                          <p className={cn('text-sm', done && 'text-muted-foreground line-through')}>{item.title}</p>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                              lateLook ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300' : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            )}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {item.dueTime} IST
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )
        })}
      </div>

      <Dialog open={!!activeItem} onOpenChange={(open) => !open && setActiveItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeItem?.item?.title}</DialogTitle>
          </DialogHeader>
          {activeItem?.viewOnly ? (
            <div className="space-y-3">
              {activeItem.item.note && <p className="text-sm">{activeItem.item.note}</p>}
              <div className="flex flex-wrap gap-2">
                {(activeItem.item.photos || []).map((photo) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                    <img src={photo.url} alt="" className="h-20 w-20 rounded-md object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="proof-photos">Photos (1-5)</Label>
                <input
                  id="proof-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2"
                  onChange={(event) => onFiles(event.target.files)}
                />
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previews.map((preview) => (
                      <img key={preview.url} src={preview.url} alt="" className="h-16 w-16 rounded-md object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-note">Note (optional)</Label>
                <textarea
                  id="proof-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="button" disabled={saving} onClick={complete}>
                Mark step done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
