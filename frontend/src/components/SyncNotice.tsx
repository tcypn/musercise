import { Link } from 'react-router-dom'
import type { SyncState } from '../store/useProgress'

interface Props {
  sync: SyncState
  message?: string
  pendingCount: number
}

export function SyncNotice({ sync, message, pendingCount }: Props) {
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
