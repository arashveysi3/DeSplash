const paths = {
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="3" width="14" height="17" rx="3" />
      <path d="m9 8 4-2v12" />
      <path d="M8 18h8" />
    </>
  ),
  quiz: (
    <>
      <path d="M9.5 3.5a6.5 6.5 0 1 1-4.6 11.1L3 16l.7-3A6.5 6.5 0 0 1 9.5 3.5Z" />
      <path d="M8 8a2 2 0 1 1 2.2 2c-.7.2-.7.8-.7 1.3" />
      <path d="M9.5 14h.01" />
      <path d="M15 16h6v4h-6z" />
    </>
  ),
  exam: (
    <>
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  flame: (
    <path d="M12 22c4.4 0 7-3.1 7-7.2 0-3.5-2.2-6.7-5-9.8.2 3-1.5 4.3-2.5 2C10.7 5.3 9.2 3.2 7 2c.2 4.3-2 6.3-2 10.7C5 17.7 7.9 22 12 22Z" />
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  weak: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  board: (
    <path d="M6 21v-7h4v7M14 21V9h4v12M10 21V3h4v18" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.7-4 3.4-6 8-6s7.3 2 8 6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  book: (
    <>
      <path d="M4 4.5A3.5 3.5 0 0 1 7.5 1H12v18H7.5A3.5 3.5 0 0 0 4 22.5Z" />
      <path d="M20 4.5A3.5 3.5 0 0 0 16.5 1H12v18h4.5a3.5 3.5 0 0 1 3.5 3.5Z" />
    </>
  ),
  sound: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  mute: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4V21a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H2.8v-4H3a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V2.8h4V3a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.2v4H21a1.8 1.8 0 0 0-1.6 1Z" />
    </>
  ),
  offline: (
    <>
      <path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01" />
      <path d="M3 3l18 18" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  login: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5M15 12H3" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  puzzle: (
    <>
      <path d="M19 13h-2.5a2.5 2.5 0 1 0 0 5H19v3H5v-3h2.5a2.5 2.5 0 1 0 0-5H5V6h6V3.5A2.5 2.5 0 1 1 13.5 6H19v7Z" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H4a4 4 0 0 0 4 4M16 5h4a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
}

export default function Icon({ name, size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name] || paths.chevron}
    </svg>
  )
}
