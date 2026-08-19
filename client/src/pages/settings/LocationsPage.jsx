import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { locationsApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function LocationsPage() {
  const { can } = usePermissions()
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    locationsApi
      .list()
      .then(setRows)
      .catch((error) => toast.error(apiMessage(error)))
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingId) await locationsApi.update(editingId, { name, address })
      else await locationsApi.create({ name, address })
      toast.success('Saved')
      setOpen(false)
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Locations</h2>
        {can('locations', 'canCreate') && (
          <Button
            onClick={() => {
              setEditingId(null)
              setName('')
              setAddress('')
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.address || '—'}</td>
                <td className="px-3 py-2 text-right">
                  {can('locations', 'canEdit') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(row.id)
                        setName(row.name)
                        setAddress(row.address || '')
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can('locations', 'canDelete') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!window.confirm('Delete location?')) return
                        try {
                          await locationsApi.remove(row.id)
                          load()
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit location' : 'New location'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={save}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
