import { Bars, Dumbbell, Gear, HomeIcon, MapIcon, PianoIcon } from './dash/Icons'

/** The six places to go, in the order the side bar and the tab bar show them. */
export const NAV_ITEMS = [
  { to: '/', label: 'Learn', Icon: HomeIcon, end: true },
  { to: '/daily', label: 'Practice', Icon: Dumbbell, end: false },
  { to: '/progress', label: 'Progress', Icon: Bars, end: false },
  { to: '/map', label: 'Map', Icon: MapIcon, end: false },
  { to: '/piano', label: 'Piano', Icon: PianoIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: Gear, end: false },
] as const
