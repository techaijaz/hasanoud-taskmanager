import { Fragment, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { systemLogsApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EVENT_LABELS = {
  server_error: 'Server error',
  login_failed: 'Login failed',
  rate_limited: 'Too many requests',
  forbidden: 'Access denied',
  job_failed: 'Job failed'
}

const LEVEL_VARIANT = { error: 'destructive', warn: 'secondary', info: 'outline' }

const formatTime = (value) =>
  new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })

export default function SystemLogsPage() {
  const [filters, setFilters] = useState({ event: 'all', level: 'all', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    const params = { page }
    if (filters.event !== 'all') params.event = filters.event
    if (filters.level !== 'all') params.level = filters.level
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    systemLogsApi
      .list(params)
      .then(setData)
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filters, page])

  const setFilter = (key) => (value) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const rows = data?.rows || []
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">System logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Errors, failed logins, blocked requests and failed jobs. Kept for 90 days.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-44 space-y-2">
          <Label>Event</Label>
          <Select value={filters.event} onValueChange={setFilter('event')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {(data?.events || Object.keys(EVENT_LABELS)).map((event) => (
                <SelectItem key={event} value={event}>
                  {EVENT_LABELS[event] || event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-32 space-y-2">
          <Label>Level</Label>
          <Select value={filters.level} onValueChange={setFilter('level')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {(data?.levels || ['info', 'warn', 'error']).map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="log-from">From</Label>
          <DatePicker id="log-from" value={filters.from} onChange={setFilter('from')} placeholder="Any date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="log-to">To</Label>
          <DatePicker id="log-to" value={filters.to} onChange={setFilter('to')} placeholder="Any date" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Path</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                  {loading ? 'Loading…' : 'No logs for these filters.'}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className="cursor-pointer border-t hover:bg-accent"
                  onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{formatTime(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={LEVEL_VARIANT[row.level]}>{row.level}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{EVENT_LABELS[row.event] || row.event}</td>
                  <td className="max-w-md truncate px-3 py-2 text-muted-foreground">{row.message}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{row.userName || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.method ? `${row.method} ${row.path}` : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.ip || '—'}</td>
                </tr>
                {openId === row.id && (
                  <tr className="border-t bg-secondary/40">
                    <td colSpan={7} className="px-3 py-3">
                      <p className="mb-2 text-sm break-words">{row.message}</p>
                      <p className="mb-2 font-mono text-xs text-muted-foreground">Request id: {row.requestId || '—'}</p>
                      {row.meta && (
                        <pre className="max-h-80 overflow-auto rounded-md bg-background p-3 text-xs whitespace-pre-wrap">
                          {JSON.stringify(row.meta, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data ? `${data.total} logs` : ''}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pageCount || loading}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
