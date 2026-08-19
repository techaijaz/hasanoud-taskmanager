import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const shownKey = 'tm.shownMissedNotifications'

const loadShown = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(shownKey) || '[]'))
  } catch {
    return new Set()
  }
}

const saveShown = (ids) => {
  sessionStorage.setItem(shownKey, JSON.stringify([...ids]))
}

const pushBrowserAlerts = (rows) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const shown = loadShown()
  for (const row of rows) {
    if (row.resolved || shown.has(row.instanceItemId)) continue
    shown.add(row.instanceItemId)
    new Notification('Missed task', { body: row.message, tag: row.instanceItemId })
  }
  saveShown(shown)
}

export default function NotificationsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )

  const load = () => {
    notificationsApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRows(list)
        pushBrowserAlerts(list)
      })
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [])

  const enablePush = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Browser notifications are not supported here')
      return
    }
    const next = await Notification.requestPermission()
    setPermission(next)
    if (next === 'granted') {
      toast.success('Browser alerts on')
      pushBrowserAlerts(rows)
    }
  }

  const open = useMemo(() => rows.filter((row) => !row.resolved), [rows])
  const history = useMemo(() => rows.filter((row) => row.resolved), [rows])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Notification</h2>
          <p className="mt-1 text-sm text-muted-foreground">Missed-task alerts for your scope. History stays after the task is completed.</p>
        </div>
        {permission !== 'unsupported' && permission !== 'granted' ? (
          <Button variant="outline" size="sm" onClick={enablePush}>
            <Bell className="h-4 w-4" />
            Enable browser alerts
          </Button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading alerts…</p> : null}

      {!loading && !rows.length ? (
        <div className="rounded-lg border bg-card p-8">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Sab kaam samay par ho raha hai — koi alert nahi.</p>
        </div>
      ) : null}

      {open.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Open</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Alert</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {open.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link to="/board" className="hover:underline">
                        {row.message}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.location?.name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.scheduledDate}</td>
                    <td className="px-3 py-2">
                      <Badge variant="destructive">Missed</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {history.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">History</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Alert</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{row.message}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.location?.name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.scheduledDate}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">Resolved</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
