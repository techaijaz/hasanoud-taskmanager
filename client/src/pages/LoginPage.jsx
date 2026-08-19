import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiMessage } from '@/lib/utils'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = identifier.includes('@') ? { email: identifier.trim(), password } : { phone: identifier.trim(), password }
      await login(payload)
      toast.success('Signed in')
      navigate('/board')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not sign in'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Task Manager</CardTitle>
          <CardDescription>Sign in with email or phone</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link className="text-primary hover:underline" to="/forgot-password">
                Forgot password
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
