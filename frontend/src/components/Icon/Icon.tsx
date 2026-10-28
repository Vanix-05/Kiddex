import type { ReactNode, SVGProps } from 'react'

export type IconName = 'user' | 'lock' | 'eye' | 'eyeOff' | 'arrowRight' | 'arrowLeft' | 'check' | 'backspace'

const paths: Record<IconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="7.5" r="4.5" fill="currentColor" />
      <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" fill="currentColor" />
    </>
  ),
  lock: (
    <>
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="currentColor" />
      <circle cx="12" cy="15.2" r="1.7" fill="var(--color-input-bg)" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      <path d="M4 3l16 18" stroke="var(--color-input-bg)" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 3l16 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  arrowRight: (
    <path d="M4 12h15m-6-6.5L19.5 12 13 18.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  arrowLeft: (
    <path d="M20 12H5m6-6.5L4.5 12 11 18.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  backspace: (
    <>
      <path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M11.5 9l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

/** Small decorative icon. Hidden from screen readers; label the parent instead. */
export function Icon({ name, size = 24, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
      {paths[name]}
    </svg>
  )
}
