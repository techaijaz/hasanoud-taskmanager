import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { holidaysApi, locationsApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const isSunday = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).getDay() === 0
}

export default function HolidaysPage() {
  const { can } = usePermissions()
  const [locations, setLocations] = useState([])
  const [rows, setRows] = useState([])
  const [locationId, setLocationId] = useState('')
  const [filterLocationId, setFilterLocationId] = useState('all')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [creatingLocation, setCreatingLocation] = useState(false)

  const loadHolidays = (loc = filterLocationId) => {
    const query = loc && loc !== 'all' ? loc : undefined
    holidaysApi
      .list(query)
      .then(setRows)
      .catch((error) => toast.error(apiMessage(error)))
  }

  const loadLocations = () => {
    locationsApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setLocations(list)
        setLocationId((current) => current || 'all')
      })
      .catch((error) => toast.error(apiMessage(error)))
  }

  useEffect(() => {
    loadLocations()
    loadHolidays()
  }, [])

  const createLocation = async (event) => {
    event.preventDefault()
    if (!newLocationName.trim()) return
    setCreatingLocation(true)
    try {
      const created = await locationsApi.create({ name: newLocationName.trim() })
      toast.success('Location added')
      setNewLocationName('')
      setLocations((prev) => {
        const next = [...prev, created]
        if (!locationId) setLocationId(created.id)
        return next
      })
      setLocationId(created.id)
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setCreatingLocation(false)
    }
  }

  const visible = useMemo(() => {
    if (filterLocationId === 'all') return rows
    return rows.filter((row) => !row.locationId || row.locationId === filterLocationId)
  }, [rows, filterLocationId])

  const add = async (event) => {
    event.preventDefault()
    if (!locationId || !date) {
      toast.error('Pick a location and a date')
      return
    }
    if (isSunday(date)) {
      toast.message('Sundays are already a weekly off. Add only extra closures.')
    }
    setSaving(true)
    try {
      const payload =
        locationId === 'all'
          ? { allLocations: true, date, description: description.trim() || undefined }
          : { locationId, date, description: description.trim() || undefined }
      await holidaysApi.create(payload)
      toast.success(locationId === 'all' ? 'Holiday added for all locations' : 'Holiday added')
      setDate('')
      setDescription('')
      loadHolidays()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Holiday manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use All locations for common offs (Eid, Diwali, 15 Aug). Pick one location for local festivals (Pongal in
          Mumbai). Sundays are already skipped.
        </p>
      </div>

      {can('holidays', 'canCreate') && locations.length > 0 && (
        <form className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end" onSubmit={add}>
          <div className="min-w-40 flex-1 space-y-2">
            <Label>Location</Label>
            <Select value={locationId || undefined} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
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
          <div className="w-full min-w-[13rem] space-y-2 sm:w-auto">
            <Label htmlFor="holiday-date">Date</Label>
            <DatePicker id="holiday-date" value={date} onChange={setDate} placeholder="Pick a date" />
          </div>
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="holiday-description">Reason</Label>
            <Input
              id="holiday-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Diwali, store shutdown…"
              maxLength={160}
            />
          </div>
          <Button type="submit" disabled={saving || !locationId}>
            <Plus className="h-4 w-4" />
            Add date
          </Button>
        </form>
      )}

      {!locations.length && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Holiday dates belong to a location. Add Lucknow Warehouse, Lucknow Shop, or Mumbai Shop first.
          </p>
          {can('locations', 'canCreate') ? (
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createLocation}>
              <div className="min-w-40 flex-1 space-y-2">
                <Label htmlFor="newLocationName">Location name</Label>
                <Input
                  id="newLocationName"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Lucknow Shop"
                  required
                />
              </div>
              <Button type="submit" disabled={creatingLocation}>
                Add location
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline">
              <Link to="/settings/locations">Open Locations</Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Marked dates</h3>
        <Select
          value={filterLocationId}
          onValueChange={(value) => {
            setFilterLocationId(value)
            loadHolidays(value)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
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

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={4}>
                  No holiday dates yet.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-medium">{row.date}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.location?.name || 'All locations'}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.description || '—'}</td>
                <td className="px-3 py-2 text-right">
                  {can('holidays', 'canDelete') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!window.confirm(row.locationId ? `Remove ${row.date}?` : `Remove ${row.date} for all locations?`)) return
                        try {
                          await holidaysApi.remove(row.id)
                          loadHolidays()
                        } catch (error) {
                          toast.error(apiMessage(error))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
