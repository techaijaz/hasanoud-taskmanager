import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { taskTemplatesApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const emptyItem = () => ({ title: '', dueTime: '09:00' })

const emptyForm = {
  title: '',
  locationId: '',
  priority: 'medium',
  kind: 'recurring',
  recurrence: 'daily',
  weekdays: [1],
  scheduledDate: '',
  assigneeIds: [],
  items: [emptyItem()]
}

const recurrenceLabel = (row) => {
  if (row.kind === 'one_time') return `One-time ${row.scheduledDate}`
  if (row.recurrence === 'daily') return 'Daily'
  const names = (row.weekdays || []).map((day) => WEEKDAYS.find((item) => item.value === day)?.label || day)
  if (row.recurrence === 'weekly') return `Weekly ${names[0] || ''}`
  return `Custom ${names.join(', ')}`
}

const priorityVariant = (priority) => {
  if (priority === 'high') return 'destructive'
  if (priority === 'low') return 'secondary'
  return 'outline'
}

const statusMeta = {
  pending: { label: 'Pending', variant: 'outline' },
  in_progress: { label: 'In progress', variant: 'secondary' },
  not_done: { label: 'Not done', variant: 'destructive' },
  skipped: { label: 'Skipped', variant: 'secondary' },
  done: { label: 'Done', variant: 'success' },
  done_late: { label: 'Done late', variant: 'destructive' }
}

export default function TaskListPage() {
  const { user: currentUser } = useAuth()
  const { can } = usePermissions()
  const [rows, setRows] = useState([])
  const [options, setOptions] = useState({ users: [], locations: [], hasReportees: false, defaultAssigneeIds: [] })
  const [kindFilter, setKindFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = (kind = kindFilter, locationId = locationFilter) => {
    const params = {}
    if (kind && kind !== 'all') params.kind = kind
    if (locationId && locationId !== 'all') params.locationId = locationId
    taskTemplatesApi
      .list(params)
      .then(setRows)
      .catch((error) => toast.error(apiMessage(error)))
  }

  useEffect(() => {
    taskTemplatesApi
      .options()
      .then((data) => {
        setOptions(data)
        setForm((prev) => ({
          ...prev,
          locationId: prev.locationId || data.locations[0]?.id || '',
          assigneeIds: [...new Set([currentUser?.id, ...(data.defaultAssigneeIds || [])].filter(Boolean))]
        }))
      })
      .catch((error) => toast.error(apiMessage(error)))
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      items: [emptyItem()],
      locationId: options.locations[0]?.id || '',
      assigneeIds: [...new Set([currentUser?.id, ...(options.defaultAssigneeIds || [])].filter(Boolean))]
    })
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      title: row.title,
      locationId: row.locationId,
      priority: row.priority,
      kind: row.kind,
      recurrence: row.recurrence || 'daily',
      weekdays: Array.isArray(row.weekdays) && row.weekdays.length ? row.weekdays : [1],
      scheduledDate: row.scheduledDate || '',
      assigneeIds: (row.assignees || []).map((user) => user.id),
      items: (row.items || []).map((item) => ({ id: item.id, title: item.title, dueTime: item.dueTime })).concat((row.items || []).length ? [] : [emptyItem()])
    })
    setOpen(true)
  }

  const toggleAssignee = (id) => {
    if (!editingId && currentUser?.id === id) return
    setForm((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(id) ? prev.assigneeIds.filter((item) => item !== id) : [...prev.assigneeIds, id]
    }))
  }

  const toggleWeekday = (day) => {
    setForm((prev) => {
      const has = prev.weekdays.includes(day)
      return { ...prev, weekdays: has ? prev.weekdays.filter((item) => item !== day) : [...prev.weekdays, day].sort() }
    })
  }

  const save = async (event) => {
    event.preventDefault()
    const items = form.items
      .map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        title: item.title.trim(),
        dueTime: item.dueTime
      }))
      .filter((item) => item.title.length >= 2)
    if (!items.length) {
      toast.error('Add at least one sub task')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        locationId: form.locationId,
        priority: form.priority,
        kind: form.kind,
        recurrence: form.kind === 'recurring' ? form.recurrence : null,
        weekdays: form.kind === 'recurring' && form.recurrence !== 'daily' ? form.weekdays : null,
        scheduledDate: form.kind === 'one_time' ? form.scheduledDate : null,
        assigneeIds: form.assigneeIds,
        items
      }
      if (editingId) await taskTemplatesApi.update(editingId, payload)
      else await taskTemplatesApi.create(payload)
      toast.success(editingId ? 'Updated' : 'Created')
      setOpen(false)
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const visibleLocations = useMemo(() => options.locations, [options.locations])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Task List</h2>
          <p className="mt-1 text-sm text-muted-foreground">Main tasks for today. Status updates as sub tasks are completed.</p>
        </div>
        {can('taskList', 'canCreate') && (
          <Button onClick={openCreate} disabled={!options.locations.length}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={kindFilter}
          onValueChange={(value) => {
            setKindFilter(value)
            load(value, locationFilter)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="one_time">One-time</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={locationFilter}
          onValueChange={(value) => {
            setLocationFilter(value)
            load(kindFilter, value)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {visibleLocations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 && <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">No tasks yet.</p>}
        {rows.map((row) => {
          const status = row.todayStatus
          const meta = status ? statusMeta[status.key] : null
          const statusLabel =
            status?.key === 'in_progress' ? `In progress (${status.doneCount} of ${status.itemCount})` : meta?.label
          return (
            <article key={row.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card px-4 py-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{row.title}</h3>
                  <Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge>
                  {meta && <Badge variant={meta.variant}>{statusLabel}</Badge>}
                  {row.locked && <Badge variant="secondary">Locked</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {row.location?.name} · {recurrenceLabel(row)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Task actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={row.skipOnHoliday}
                    disabled={row.locked || !can('taskList', 'canEdit')}
                    onCheckedChange={async (checked) => {
                      try {
                        await taskTemplatesApi.setSkipOnHoliday(row.id, checked)
                        load()
                      } catch (error) {
                        toast.error(apiMessage(error))
                      }
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    Skip on holiday
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {can('taskList', 'canEdit') && (
                    <DropdownMenuItem disabled={row.locked} onSelect={() => !row.locked && openEdit(row)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {can('taskList', 'canDelete') && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={async () => {
                        if (!window.confirm(`Delete “${row.title}”?`)) return
                        try {
                          await taskTemplatesApi.remove(row.id)
                          toast.success('Deleted')
                          load()
                        } catch (error) {
                          toast.error(apiMessage(error))
                        }
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pb-3 pt-6 pr-12">
            <DialogTitle>{editingId ? 'Edit task' : 'Add task'}</DialogTitle>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
            <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={form.locationId} onValueChange={(value) => setForm({ ...form, locationId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === 'one_time' ? (
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date</Label>
                <DatePicker
                  id="scheduledDate"
                  value={form.scheduledDate}
                  onChange={(scheduledDate) => setForm({ ...form, scheduledDate })}
                  placeholder="Pick a date"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select value={form.recurrence} onValueChange={(value) => setForm({ ...form, recurrence: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.recurrence === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Weekday</Label>
                    <Select
                      value={String(form.weekdays[0] ?? 1)}
                      onValueChange={(value) => setForm({ ...form, weekdays: [Number(value)] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.recurrence === 'custom' && (
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => (
                        <label key={day.value} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                          <Checkbox checked={form.weekdays.includes(day.value)} onCheckedChange={() => toggleWeekday(day.value)} />
                          {day.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sub tasks</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
                >
                  <Plus className="h-4 w-4" />
                  Add task
                </Button>
              </div>
              {editingId && form.kind === 'recurring' && (
                <p className="text-xs text-muted-foreground">
                  Time, add, and remove apply to today and future days. Past days stay as they were.
                </p>
              )}
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item.title}
                      placeholder={`Sub task ${index + 1}`}
                      onChange={(e) =>
                        setForm((prev) => {
                          const items = [...prev.items]
                          items[index] = { ...items[index], title: e.target.value }
                          return { ...prev, items }
                        })
                      }
                    />
                    <TimePicker
                      value={item.dueTime}
                      onChange={(dueTime) =>
                        setForm((prev) => {
                          const items = [...prev.items]
                          items[index] = { ...items[index], dueTime }
                          return { ...prev, items }
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                      aria-label="Remove sub task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {options.hasReportees ? (
              <div className="space-y-2">
                <Label>Assignees</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {options.users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.assigneeIds.includes(user.id)}
                        disabled={!editingId && currentUser?.id === user.id}
                        onCheckedChange={() => toggleAssignee(user.id)}
                      />
                      {user.name}
                      <span className="text-muted-foreground">({user.role})</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Assigned to you. Add reportees to assign a team.</p>
            )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.locationId}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
