// Brand mark from the Figma icon pack (desplash-navbar-mark).
// Inline SVG so it stays crisp at any size without an extra request.
export default function BrandMark({ size = 24, title = 'GermanSplash logo', style, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...props}
    >
      <path d="M104 97 263 57c21-5 42 8 47 29l71 284c5 21-8 42-29 47l-159 40c-21 5-42-8-47-29L75 144c-5-21 8-42 29-47Z" fill="#DD1833" />
      <path fillRule="evenodd" d="M150 66h112c112 0 194 78 194 190s-82 190-194 190H150a38 38 0 0 1-38-38V104a38 38 0 0 1 38-38Zm81 108v164h30c54 0 91-32 91-82s-37-82-91-82h-30Z" fill="#FFCE00" />
      <path d="m96 325 61 16-24 58-37-74ZM417 88l-18 61 60 12-42-73ZM407 370l-12 42 42-8-30-34Z" fill="#DD1833" />
    </svg>
  );
}
