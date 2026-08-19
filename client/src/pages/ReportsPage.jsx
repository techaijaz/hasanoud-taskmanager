import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { reportsApi } from '@/lib/api'
import { apiMessage, cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker, dateToYmd } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const emptySummary = { onTime: 0, late: 0, missed: 0, covered: 0, open: 0, scored: 0, assigned: 0, onTimePct: 0, latePct: 0, missedPct: 0, missedLatePct: 0 }

const outcomeMeta = {
  on_time: { label: 'On time', variant: 'success' },
  late: { label: 'Late', variant: 'destructive' },
  missed: { label: 'Missed', variant: 'destructive' },
  covered: { label: 'Covered', variant: 'secondary' }
}

function StackedBar({ onTime, late, missed, covered = 0, open = 0, className }) {
  const total = onTime + late + missed + covered + open
  if (!total) return <div className={cn('h-2 rounded-full bg-muted', className)} />
  return (
    <div className={cn('flex h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div className="bg-emerald-500" style={{ width: `${(onTime / total) * 100}%` }} />
      <div className="bg-amber-500" style={{ width: `${(late / total) * 100}%` }} />
      <div className="bg-red-500" style={{ width: `${(missed / total) * 100}%` }} />
      <div className="bg-sky-500/70" style={{ width: `${(covered / total) * 100}%` }} />
      <div className="bg-zinc-500" style={{ width: `${(open / total) * 100}%` }} />
    </div>
  )
}

function StatCard({ label, value, hint, accent }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-1">
        <CardDescription className="text-xs sm:text-sm">{label}</CardDescription>
        <CardTitle className={cn('text-xl tabular-nums sm:text-2xl', accent)}>{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground sm:px-4 sm:pb-4">{hint}</CardContent>
      ) : null}
    </Card>
  )
}

function Metric({ label, value, className }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn('tabular-nums', className)}>{value}</div>
    </div>
  )
}

export default function ReportsPage() {
  const { role } = usePermissions()
  const isSelf = role === 'user'
  const [from, setFrom] = useState(() => dateToYmd(addDays(new Date(), -29)))
  const [to, setTo] = useState(() => dateToYmd(new Date()))
  const [locationId, setLocationId] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (from && to && from > to) setTo(from)
  }, [from, to])

  useEffect(() => {
    if (!from || !to || from > to) return
    setLoading(true)
    reportsApi
      .get({
        from,
        to,
        ...(locationId !== 'all' ? { locationId } : {})
      })
      .then(setData)
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false))
  }, [from, to, locationId])

  const summary = data?.summary || emptySummary
  const trend = data?.trend || []
  const maxTrend = useMemo(() => Math.max(1, ...trend.map((row) => row.onTime + row.late + row.missed)), [trend])
  const locations = data?.filters?.locations || []
  const scopeLabel = data?.scope === 'company' ? 'Company-wide' : data?.scope === 'team' ? 'Your team' : 'Your performance'
  const employees = data?.employees || []
  const locationRows = data?.locations || []
  const history = data?.history || []

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            On-time vs late vs missed. Holiday skips are excluded. {scopeLabel}.
          </p>
        </div>
        <div className={cn('grid w-full min-w-0 gap-3', isSelf ? 'sm:grid-cols-2 lg:w-auto' : 'sm:grid-cols-3 lg:w-auto')}>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="report-from">From</Label>
            <DatePicker id="report-from" value={from} onChange={setFrom} className="w-full min-w-0" />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="report-to">To</Label>
            <DatePicker id="report-to" value={to} onChange={setTo} className="w-full min-w-0" minDate={from} />
          </div>
          {!isSelf ? (
            <div className="min-w-0 space-y-1">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scored tasks" value={summary.scored} hint={`${summary.open} still open (not counted yet)`} />
        <StatCard
          label="On time"
          value={`${summary.onTimePct}%`}
          hint={summary.scored ? `${summary.onTime} completed on time` : 'Nothing closed or missed in this range'}
          accent="text-emerald-400"
        />
        <StatCard label="Late" value={`${summary.latePct}%`} hint={`${summary.late} completed late`} accent="text-amber-400" />
        <StatCard label="Missed" value={`${summary.missedPct}%`} hint={`${summary.missed} not completed after due time`} accent="text-red-400" />
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Daily mix</CardTitle>
          <CardDescription>Holiday-skipped days stay empty. Heights are relative to the busiest day.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 p-4 pt-2">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> On time</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Missed</span>
          </div>
          <div className="flex h-36 items-end gap-px overflow-x-auto sm:h-40">
            {trend.map((row) => {
              const total = row.onTime + row.late + row.missed
              const height = total ? Math.max(8, (total / maxTrend) * 100) : 4
              return (
                <div key={row.date} className="flex min-w-1.5 flex-1 flex-col items-center justify-end sm:min-w-2" title={`${row.date}: ${row.onTime} on time, ${row.late} late, ${row.missed} missed`}>
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm bg-muted" style={{ height: `${height}%` }}>
                    {total ? (
                      <>
                        <div className="bg-red-500" style={{ height: `${(row.missed / total) * 100}%` }} />
                        <div className="bg-amber-500" style={{ height: `${(row.late / total) * 100}%` }} />
                        <div className="bg-emerald-500" style={{ height: `${(row.onTime / total) * 100}%` }} />
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{from}</span>
            <span>{to}</span>
          </div>
        </CardContent>
      </Card>

      <div className={cn('grid min-w-0 gap-4', isSelf ? 'grid-cols-1' : 'lg:grid-cols-2')}>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{isSelf ? 'Your completion mix' : 'By employee'}</CardTitle>
            <CardDescription>
              Any one assignee can close a shared task. The closer gets on-time/late; other assignees are Covered, not missed and not zero.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No assigned tasks in this range.</p>
            ) : (
              <>
                <div className="divide-y md:hidden">
                  {employees.map((row) => (
                    <div key={row.id} className="space-y-2 p-4">
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.scored ? `${row.onTimePct}% on time of ${row.scored} closed` : row.open ? `${row.open} still open` : 'No personal closes'}
                          {row.covered ? ` · ${row.covered} covered` : ''}
                        </div>
                      </div>
                      <StackedBar onTime={row.onTime} late={row.late} missed={row.missed} covered={row.covered} open={row.open} />
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <Metric label="On time" value={row.onTime} className="text-emerald-400" />
                        <Metric label="Late" value={row.late} className="text-amber-400" />
                        <Metric label="Missed" value={row.missed} className="text-red-400" />
                        <Metric label="Covered" value={row.covered} className="text-sky-300" />
                        <Metric label="Open" value={row.open} className="text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Employee</th>
                        <th className="px-3 py-2 font-medium">Mix</th>
                        <th className="px-3 py-2 text-right font-medium">On time</th>
                        <th className="px-3 py-2 text-right font-medium">Late</th>
                        <th className="px-3 py-2 text-right font-medium">Missed</th>
                        <th className="px-3 py-2 text-right font-medium">Covered</th>
                        <th className="px-4 py-2 text-right font-medium">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-4 py-2">
                            <div>{row.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.scored ? `${row.onTimePct}% on time of ${row.scored} closed` : row.open ? `${row.open} still open` : 'No personal closes'}
                              {row.covered ? ` · ${row.covered} covered` : ''}
                            </div>
                          </td>
                          <td className="min-w-[8rem] px-3 py-2">
                            <StackedBar onTime={row.onTime} late={row.late} missed={row.missed} covered={row.covered} open={row.open} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-400">{row.onTime}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-400">{row.late}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-400">{row.missed}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-sky-300">{row.covered}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{row.open}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!isSelf ? (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">By location</CardTitle>
              <CardDescription>Highest missed/late rate first.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {locationRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No scored tasks in this range.</p>
              ) : (
                <>
                  <div className="divide-y md:hidden">
                    {locationRows.map((row) => (
                      <div key={row.id} className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">{row.scored} tasks · {row.onTimePct}% on time</div>
                          </div>
                          <div className="shrink-0 text-right text-sm tabular-nums">
                            {row.missedLatePct}%
                            <div className="text-xs text-muted-foreground">{row.late + row.missed} of {row.scored}</div>
                          </div>
                        </div>
                        <StackedBar onTime={row.onTime} late={row.late} missed={row.missed} />
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Location</th>
                          <th className="px-3 py-2 font-medium">Mix</th>
                          <th className="px-4 py-2 text-right font-medium">Missed + late</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationRows.map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="px-4 py-2">
                              <div>{row.name}</div>
                              <div className="text-xs text-muted-foreground">{row.scored} tasks · {row.onTimePct}% on time</div>
                            </td>
                            <td className="min-w-[8rem] px-3 py-2"><StackedBar onTime={row.onTime} late={row.late} missed={row.missed} /></td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {row.missedLatePct}%
                              <div className="text-xs text-muted-foreground">{row.late + row.missed} of {row.scored}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Completion history</CardTitle>
          <CardDescription>Most recent scored tasks in this range.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No history in this range.</p>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {history.map((row) => {
                  const meta = outcomeMeta[row.outcome] || outcomeMeta.missed
                  return (
                    <div key={row.id} className="space-y-1.5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{row.title}</div>
                          <div className="text-xs tabular-nums text-muted-foreground">{row.date}</div>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{row.location}</p>
                      <p className="text-xs text-muted-foreground">
                        Assignees: {(row.assignees || []).join(', ') || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Done by: {(row.completedBy || []).join(', ') || (row.outcome === 'missed' ? '—' : 'Unknown')}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Task</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Assignees</th>
                      <th className="px-3 py-2 font-medium">Done by</th>
                      <th className="px-4 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => {
                      const meta = outcomeMeta[row.outcome] || outcomeMeta.missed
                      return (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted-foreground">{row.date}</td>
                          <td className="px-3 py-2">{row.title}</td>
                          <td className="px-3 py-2">{row.location}</td>
                          <td className="px-3 py-2 text-muted-foreground">{(row.assignees || []).join(', ') || '—'}</td>
                          <td className="px-3 py-2">{(row.completedBy || []).join(', ') || (row.outcome === 'missed' ? '—' : 'Unknown')}</td>
                          <td className="px-4 py-2"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
