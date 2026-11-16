import type { SVGProps } from "react";

/** Source unique des icônes (trait 1.8, viewBox 24). Dérivé du jeu 1TASK + icônes métier. */
const PATHS = {
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 12h16M10 12v2h4v-2",
  users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5A3 3 0 1 0 10 4.5a3 3 0 0 0 0 6ZM16 5a3 3 0 0 1 0 5.8M17 14.2a3.5 3.5 0 0 1 3 3.3V19",
  kanban: "M5 4h4v11H5zM15 4h4v16h-4zM5 18h4M15 4v4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  star: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  chart: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  sliders: "M4 7h8M16 7h4M4 17h4M12 17h8M14 5v4M10 15v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0",
  userPlus: "M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 8v6M16 11h6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 5 5 9-10",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 4.5-5",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowUpRight: "M7 17 17 7M8 7h9v9",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m6 15 6-6 6 6",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  chevronsUpDown: "m8 9 4-4 4 4M8 15l4 4 4-4",
  alertTriangle: "M12 4 3 20h18L12 4ZM12 10v4M12 17h.01",
  alertCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01",
  message: "M4 5h16v11H9l-5 4V5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  logout: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  refresh: "M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4",
  tag: "M4 4h8l8 8-8 8-8-8V4ZM8 8h.01",
  home: "M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  pencil: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  upload: "M12 16V5M7 10l5-5 5 5M5 20h14",
  filter: "M4 5h16l-6 7v6l-4 2v-8L4 5Z",
  gripVertical: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  printer: "M7 8V3h10v5M7 17H4V8h16v9h-3M7 13h10v8H7z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  note: "M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
  archive: "M3 5h18v4H3zM5 9v11h14V9M10 13h4",
  database: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01",
  trendingUp: "M3 17 9 11l4 4 8-8M15 7h6v6",
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  moreHorizontal: "M5 12h.01M12 12h.01M19 12h.01",
  panelLeftClose: "M4 4h16v16H4zM9 4v16M16 9l-3 3 3 3",
  panelLeftOpen: "M4 4h16v16H4zM9 4v16M13 9l3 3-3 3",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "", ...props }: { name: IconName } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg aria-hidden="true" className={`kit-icon ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
