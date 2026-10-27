export default function Availability({ availability }) {
  if (!availability?.text) return null;
  const status = availability.status || 'available';
  const label = { available: 'Available', limited: 'Limited availability', unavailable: 'Not taking new work' }[status];
  return (
    <p className="availability" data-status={status}>
      <span className="availability-mark" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M6.75 3.5v2M13.25 3.5v2M4 7.25h12M5.75 4.75h8.5A1.75 1.75 0 0 1 16 6.5v8a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 4 14.5v-8a1.75 1.75 0 0 1 1.75-1.75Z" />
          {status === 'unavailable' ? <path d="m8 10 4 4m0-4-4 4" /> : <path d="m7.25 11.75 1.75 1.75 3.75-4" />}
        </svg>
      </span>
      <span className="availability-text"><span className="sr-only">{label}: </span>{availability.text}</span>
    </p>
  );
}
