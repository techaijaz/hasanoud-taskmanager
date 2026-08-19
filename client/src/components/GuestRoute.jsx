import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>
  }
  if (user) return <Navigate to="/board" replace />
  return children
}
