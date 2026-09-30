import { Link, NavLink } from 'react-router-dom'
import { PianoIcon } from './dash/Icons'
import { NAV_ITEMS } from './nav'

/** The logo: a green key with the course icon, then the name. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="musercise, home">
      <span className="brand-mark"><PianoIcon size={22} /></span>
      {!compact && <span className="brand-name">musercise</span>}
    </Link>
  )
}

/** Left-hand menu on tablets and computers. Phones use the tab bar instead. */
export function SideNav() {
  return (
    <aside className="sidenav">
      <Brand />
      <nav aria-label="Main">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="side-link">
            <Icon size={28} />
            <span className="side-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
