type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const SearchIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const ClockIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const PeopleIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.6 3 5.2" />
  </svg>
);
export const PlusIcon = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <path d="M5 12h14" />
  </svg>
);
export const BackIcon = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
export const BookIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </svg>
);
export const CalendarIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const LinkIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const PencilIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);
export const XIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const CheckCircleIcon = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
  </svg>
);
export const ForwardIcon = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const ListIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
  </svg>
);
export const CopyIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);
