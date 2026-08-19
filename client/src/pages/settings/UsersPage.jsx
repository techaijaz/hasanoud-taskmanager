import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { usersApi, locationsApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: 'user',
  reportsToId: '',
  locationIds: [],
  canManageUsers: false
}

const hasCustomPerms = (overrides) => {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return false
  return Object.keys(overrides).length > 0
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { isAdmin } = usePermissions()
  const [users, setUsers] = useState([])
  const [locations, setLocations] = useState([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [originalRole, setOriginalRole] = useState('user')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    usersApi
      .list()
      .then(setUsers)
      .catch((error) => toast.error(apiMessage(error)))
    locationsApi
      .list()
      .then(setLocations)
      .catch(() => setLocations([]))
  }

  useEffect(() => {
    load()
  }, [])

  const managerOptions = useMemo(() => {
    if (form.role === 'admin') return users.filter((u) => u.role === 'admin' && u.id !== editingId)
    if (form.role === 'manager') return users.filter((u) => u.role === 'admin')
    return users.filter((u) => u.role === 'admin' || u.role === 'manager')
  }, [users, form.role, editingId])

  const openCreate = () => {
    setEditingId(null)
    setOriginalRole('user')
    setForm({ ...emptyForm, reportsToId: currentUser?.id || '' })
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setOriginalRole(row.role)
    setForm({
      name: row.name,
      email: row.email,
      phone: `${row.phoneCountryCode || ''}${String(row.phoneInternationalNumber || '').replace(/\D/g, '').slice(-10)}`,
      role: row.role,
      reportsToId: row.reportsToId || '',
      locationIds: (row.locations || []).map((loc) => loc.id),
      canManageUsers: !!row.canManageUsers
    })
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone.replace(/\D/g, ''),
        role: form.role,
        reportsToId: form.reportsToId || undefined,
        locationIds: form.locationIds,
        canManageUsers: form.canManageUsers
      }
      if (editingId) {
        if (isAdmin && form.role !== originalRole) {
          payload.permissionOverrides = null
        }
        await usersApi.update(editingId, payload)
        toast.success(form.role !== originalRole ? 'User updated. Extra permissions reset to role defaults.' : 'User updated')
      } else {
        await usersApi.create(payload)
        toast.success('Invite sent')
      }
      setOpen(false)
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}?`)) return
    try {
      await usersApi.remove(row.id)
      toast.success('Deleted')
      load()
    } catch (error) {
      toast.error(apiMessage(error))
    }
  }

  const toggleLocation = (id) => {
    setForm((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(id) ? prev.locationIds.filter((item) => item !== id) : [...prev.locationIds, id]
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Reports to</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <div>{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.email}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="secondary">{row.role}</Badge>
                    {hasCustomPerms(row.permissionOverrides) ? <Badge variant="outline">Extra perms</Badge> : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.reportsTo?.name || '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(row)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pb-3 pt-6 pr-12">
            <DialogTitle>{editingId ? 'Edit user' : 'New user'}</DialogTitle>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
            <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-1">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="9198XXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(role) => setForm((prev) => ({ ...prev, role, reportsToId: '' }))}
                  disabled={!isAdmin && !!editingId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    {isAdmin && <SelectItem value="manager">Manager</SelectItem>}
                    {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This role&apos;s default permissions apply immediately. Extra access is granted later from Settings ? Permission.
                  {editingId && form.role !== originalRole ? ' Changing role clears extra permissions.' : ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reporting manager</Label>
                <Select value={form.reportsToId} onValueChange={(reportsToId) => setForm({ ...form, reportsToId })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.name} ({row.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.canManageUsers} onCheckedChange={(checked) => setForm({ ...form, canManageUsers: !!checked })} />
                  Can manage users
                </label>
              )}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <div className="grid gap-2">
                    {locations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.locationIds.includes(loc.id)} onCheckedChange={() => toggleLocation(loc.id)} />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
