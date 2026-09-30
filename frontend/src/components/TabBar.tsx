import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

/** Bottom navigation on phones. The side bar takes over from 48rem. */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className="tab">
          <Icon size={28} />
          <span className="tab-label" aria-hidden="true">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
