/**
 * A four point mark for the assistant: two strokes meeting at a point, drawn
 * in the current text colour. Ours, not anyone's brand.
 */
export default function Sparkle({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 2.5c0 5 1.6 7.1 6.5 8.2 0 0 .5.1.5.3s-.5.3-.5.3C13.6 12.4 12 14.5 12 19.5c0 0 0 .5-.2.5s-.2-.5-.2-.5c0-5-1.6-7.1-6.5-8.2 0 0-.5-.1-.5-.3s.5-.3.5-.3C10 9.6 11.6 7.5 11.6 2.5c0 0 0-.5.2-.5s.2.5.2.5z" />
      <path d="M18.5 15.5c0 2.1.7 3 2.8 3.5 0 0 .2 0 .2.1s-.2.1-.2.1c-2.1.5-2.8 1.4-2.8 3.5 0 0 0 .2-.1.2s-.1-.2-.1-.2c0-2.1-.7-3-2.8-3.5 0 0-.2 0-.2-.1s.2-.1.2-.1c2.1-.5 2.8-1.4 2.8-3.5 0 0 0-.2.1-.2s.1.2.1.2z" />
    </svg>
  );
}
