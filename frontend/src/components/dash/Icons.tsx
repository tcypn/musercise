/** Small inline icons, drawn for this app. All decorative unless a caller labels them. */
interface IconProps {
  size?: number
  className?: string
  title?: string
}

const svg = (size: number, className?: string, title?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  className,
  role: title ? ('img' as const) : undefined,
  'aria-label': title,
  'aria-hidden': title ? undefined : true,
  focusable: false,
})

export function Flame({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path
        d="M12.2 2.2c.5 3 2.2 4.4 3.7 6.2 1.5 1.8 2.4 3.5 2.4 5.9A6.3 6.3 0 0 1 12 20.6a6.3 6.3 0 0 1-6.3-6.3c0-1.9.8-3.4 1.8-4.7.3 1.5 1.1 2.4 2.1 2.7C9.4 8.7 10.6 5.1 12.2 2.2z"
        fill="#f0a91e"
        stroke="#c27c0a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 20.6a3.4 3.4 0 0 1-3.4-3.4c0-1.5.9-2.6 1.9-3.6.4 1 1.1 1.5 1.8 1.6.3-1.1 1-2.1 1.9-3 .6 2 1.2 2.6 1.2 4.4a3.4 3.4 0 0 1-3.4 4z" fill="#fff3c9" />
    </svg>
  )
}

export function Moon({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M19.5 14.6A8.2 8.2 0 0 1 9.4 4.5a8.2 8.2 0 1 0 10.1 10.1z" fill="#dfe6f1" stroke="#7b8497" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function Check({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M5 12.6l4.3 4.3L19 7.2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowUp({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M12 5.5 20 18H4z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ArrowDown({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M12 18.5 4 6h16z" fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function Equal({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M5 9h14M5 15h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Target({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function Steps({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <path d="M4 18h5v-5h5V8h6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Clock({ size = 24, className, title }: IconProps) {
  return (
    <svg {...svg(size, className, title)}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5.2l3.4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Chevron({ size = 24, className, title, direction = 'right' }: IconProps & { direction?: 'left' | 'right' }) {
  return (
    <svg {...svg(size, className, title)}>
      <path d={direction === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Stroke icons for the path, tab bar and lesson screens (round caps, 2.6 weight). */
const stroke = (size: number, className?: string, title?: string, width = 2.6) => ({
  ...svg(size, className, title),
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function Lock({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title, 2.8)}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function Ear({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 3.4-3.3 4.4-3.3 7.4A3.4 3.4 0 0 1 8 18" />
      <path d="M9.6 9.4a2.4 2.4 0 0 1 4.8 0c0 1.4-1.3 1.8-1.7 2.8" />
    </svg>
  )
}

export function Speaker({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19.2 5.8a8.8 8.8 0 0 1 0 12.4" />
    </svg>
  )
}

export function Snail({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title, 2.4)}>
      <path d="M4 17h14a3 3 0 0 0 3-3v-1" />
      <path d="M6 17a6 6 0 0 1 12 0" />
      <circle cx="12" cy="13" r="2" />
    </svg>
  )
}

export function Close({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title, 3)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function CheckBold({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title, 4)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function Trophy({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3.2 4M16 6h3a3 3 0 0 1-3.2 4" />
      <path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z" />
    </svg>
  )
}

export function Book({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title, 2.5)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5V5.5M8 7.5h8" />
    </svg>
  )
}

export function HomeIcon({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z" />
    </svg>
  )
}

export function Dumbbell({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
    </svg>
  )
}

export function Bars({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M5 20v-8M12 20V5M19 20v-5" />
    </svg>
  )
}

export function MapIcon({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  )
}

export function Gear({ size = 24, className, title }: IconProps) {
  return (
    <svg {...stroke(size, className, title)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9" />
    </svg>
  )
}
