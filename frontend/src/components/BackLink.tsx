import { Link } from 'react-router-dom'
import { Chevron } from './dash/Icons'

/** The way back from a detail page: a small key-shaped button with an arrow, like the other buttons. */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link className="back" to={to}>
      <Chevron size={18} direction="left" />
      <span>{children}</span>
    </Link>
  )
}
