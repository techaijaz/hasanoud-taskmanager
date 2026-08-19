import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { rbacApi, usersApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const ACTIONS = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' }
]

const emptyActions = () => ({ canView: false, canCreate: false, canEdit: false, canDelete: false })

const samePerms = (a, b) => ACTIONS.every((action) => !!a?.[action.key] === !!b?.[action.key])

const normalizeRow = (actions) => ({
  canView: !!actions?.canView,
  canCreate: !!actions?.canCreate,
  canEdit: !!actions?.canEdit,
  canDelete: !!actions?.canDelete
})

const roleRow = (matrix, role, moduleKey) =>
  normalizeRow(matrix?.[String(role || '').toLowerCase()]?.[moduleKey] || emptyActions())

const buildPermGrid = (matrix, role, stored, mods) => {
  const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  const grid = {}
  for (const mod of mods) {
    const baseline = roleRow(matrix, role, mod.key)
    const custom = source[mod.key]
    const normalized = custom && typeof custom === 'object' ? normalizeRow(custom) : null
    grid[mod.key] = normalized && !samePerms(normalized, baseline) ? normalized : baseline
  }
  return grid
}

const overridesVsRole = (overrides, matrix, role, modules) => {
  const clean = {}
  for (const mod of modules) {
    const next = normalizeRow(overrides?.[mod.key] || roleRow(matrix, role, mod.key))
    if (samePerms(next, roleRow(matrix, role, mod.key))) continue
    clean[mod.key] = next
  }
  return Object.keys(clean).length ? clean : null
}

const hasCustomPerms = (overrides) => {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return false
  return Object.keys(overrides).length > 0
}

export default function PermissionsPage() {
  const { isAdmin } = usePermissions()
  const [tab, setTab] = useState('roles')
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [activeRole, setActiveRole] = useState('admin')
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userGrid, setUserGrid] = useState({})
  const [savingUser, setSavingUser] = useState(false)

  const loadRoles = () => {
    rbacApi
      .matrix()
      .then((data) => {
        setRoles(data.roles || [])
        setModules(data.modules || [])
        setMatrix(data.matrix || {})
        if (data.roles?.length) setActiveRole((current) => (data.roles.includes(current) ? current : data.roles[0]))
      })
      .catch((error) => toast.error(apiMessage(error)))
  }

  const loadUsers = () => {
    usersApi
      .list()
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch((error) => toast.error(apiMessage(error)))
  }

  useEffect(() => {
    loadRoles()
    if (isAdmin) loadUsers()
  }, [isAdmin])

  const selectedUser = useMemo(() => users.find((row) => row.id === selectedUserId) || null, [users, selectedUserId])

  useEffect(() => {
    if (!selectedUser || !matrix || !modules.length) {
      setUserGrid({})
      return
    }
    setUserGrid(buildPermGrid(matrix, selectedUser.role, selectedUser.permissionOverrides, modules))
  }, [selectedUser, matrix, modules])

  const toggleRole = (moduleKey, actionKey) => {
    setMatrix((prev) => {
      const next = structuredClone(prev)
      if (!next[activeRole][moduleKey]) {
        next[activeRole][moduleKey] = emptyActions()
      }
      next[activeRole][moduleKey][actionKey] = !next[activeRole][moduleKey][actionKey]
      if (actionKey !== 'canView' && next[activeRole][moduleKey][actionKey]) {
        next[activeRole][moduleKey].canView = true
      }
      return next
    })
  }

  const saveRoles = async () => {
    setSaving(true)
    try {
      const data = await rbacApi.save(matrix)
      setMatrix(data.matrix)
      toast.success('Role permissions saved')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleUser = (moduleKey, actionKey) => {
    setUserGrid((prev) => {
      const current = prev[moduleKey] || emptyActions()
      const nextRow = { ...current, [actionKey]: !current[actionKey] }
      if (actionKey !== 'canView' && nextRow[actionKey]) nextRow.canView = true
      return { ...prev, [moduleKey]: nextRow }
    })
  }

  const saveUser = async () => {
    if (!selectedUser) return
    setSavingUser(true)
    try {
      const permissionOverrides = overridesVsRole(userGrid, matrix, selectedUser.role, modules)
      await usersApi.update(selectedUser.id, { permissionOverrides })
      toast.success('User extra permissions saved')
      loadUsers()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSavingUser(false)
    }
  }

  const resetUser = async () => {
    if (!selectedUser) return
    setSavingUser(true)
    try {
      await usersApi.update(selectedUser.id, { permissionOverrides: null })
      toast.success('Reset to role defaults')
      loadUsers()
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSavingUser(false)
    }
  }

  if (!matrix) return <p className="text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Roles & permissions</h2>
        {tab === 'roles' ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                rbacApi.reset().then((d) => {
                  setMatrix(d.matrix)
                  toast.success('Reset')
                })
              }
            >
              Reset defaults
            </Button>
            <Button onClick={saveRoles} disabled={saving}>
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'roles' ? 'default' : 'outline'} size="sm" onClick={() => setTab('roles')}>
          Roles
        </Button>
        {isAdmin ? (
          <Button variant={tab === 'users' ? 'default' : 'outline'} size="sm" onClick={() => setTab('users')}>
            Extra for user
          </Button>
        ) : null}
      </div>

      {tab === 'roles' ? (
        <>
          <div className="flex gap-2">
            {roles.map((role) => (
              <Button key={role} variant={activeRole === role ? 'default' : 'outline'} size="sm" onClick={() => setActiveRole(role)}>
                {role}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">These defaults apply to every new user of this role.</p>
          <PermissionTable modules={modules} rowFor={(mod) => matrix[activeRole]?.[mod.key]} onToggle={toggleRole} />
        </>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name} ({row.role})
                    {hasCustomPerms(row.permissionOverrides) ? ' · extra' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedUser ? (
            <p className="text-sm text-muted-foreground">Pick a user to grant extra access beyond their role.</p>
          ) : selectedUser.role === 'admin' ? (
            <p className="text-sm text-muted-foreground">Admin already has every module. Extra permissions apply to user and manager only.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedUser.role}</Badge>
                {hasCustomPerms(selectedUser.permissionOverrides) ? <Badge variant="outline">Has extra perms</Badge> : null}
                <p className="text-xs text-muted-foreground">Checked boxes start as this role&apos;s defaults. Change only what should be extra for this person.</p>
              </div>
              <PermissionTable modules={modules} rowFor={(mod) => userGrid[mod.key]} onToggle={toggleUser} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetUser} disabled={savingUser}>
                  Reset to role defaults
                </Button>
                <Button onClick={saveUser} disabled={savingUser}>
                  {savingUser ? 'Saving…' : 'Save extra permissions'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PermissionTable({ modules, rowFor, onToggle }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Module</th>
            {ACTIONS.map((action) => (
              <th key={action.key} className="px-3 py-2 text-left font-medium">
                {action.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => (
            <tr key={mod.key} className="border-t">
              <td className="px-3 py-2">{mod.label}</td>
              {ACTIONS.map((action) => (
                <td key={action.key} className="px-3 py-2">
                  <Checkbox checked={!!rowFor(mod)?.[action.key]} onCheckedChange={() => onToggle(mod.key, action.key)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
