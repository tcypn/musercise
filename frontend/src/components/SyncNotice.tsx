import { Link } from 'react-router-dom'
import type { SyncState } from '../store/useProgress'

interface Props {
  sync: SyncState
  message?: string
  pendingCount: number
  rejectedCount?: number
}

export function SyncNotice({ sync, message, pendingCount, rejectedCount = 0 }: Props) {
  if (rejectedCount > 0) {
    return (
      <p className="notice warn" role="status">
        The server refused {rejectedCount} {rejectedCount === 1 ? 'session' : 'sessions'}, most likely because it is not updated yet. They are kept on this device. <Link to="/settings">Try again in Settings</Link>
      </p>
    )
  }
  if (sync === 'local') {
    return (
      <p className="notice">
        Progress is saved in this browser only. <Link to="/settings">Connect a server</Link> to keep it safe.
      </p>
    )
  }
  if (sync === 'offline') {
    return (
      <p className="notice warn" role="status">
        {message ?? 'Cannot reach the server.'}
        {pendingCount > 0 && ` ${pendingCount} ${pendingCount === 1 ? 'session is' : 'sessions are'} saved here and will upload later.`}{' '}
        <Link to="/settings">Check connection</Link>
      </p>
    )
  }
  return null
}
