import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/lib/api'
import { apiMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await authApi.changePassword({ oldPassword, newPassword })
      toast.success('Password updated')
      setOldPassword('')
      setNewPassword('')
    } catch (error) {
      toast.error(apiMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name</span> · {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email</span> · {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Phone</span> · {user?.phoneCountryCode}
            {user?.phoneInternationalNumber}
          </p>
          <Badge variant="secondary">{user?.role}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="max-w-sm space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={saving}>
              Update
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
