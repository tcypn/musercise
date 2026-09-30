import { NavLink } from 'react-router-dom'
import { Bars, Dumbbell, Gear, HomeIcon, MapIcon } from './dash/Icons'

const TABS: readonly { to: string; label: string; Icon: typeof HomeIcon; end?: boolean }[] = [
  { to: '/', label: 'Learn', Icon: HomeIcon, end: true },
  { to: '/daily', label: 'Practice', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: Bars },
  { to: '/map', label: 'Map', Icon: MapIcon },
  { to: '/settings', label: 'Settings', Icon: Gear },
]

/** Bottom navigation on small screens. The header links take over from 48rem. */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className="tab">
          <Icon size={28} />
          <span className="tab-label" aria-hidden="true">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
