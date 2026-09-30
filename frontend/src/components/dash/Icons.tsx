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
