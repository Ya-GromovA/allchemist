import type { ShellIconName } from "./layoutTypes";

export function ShellIcon({ name }: { name: ShellIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "home" ? <path {...common} d="M3 11.5 12 4l9 7.5M6.5 10.5V20h11v-9.5" /> : null}
      {name === "courses" ? <path {...common} d="M5 5.5h10.5A3.5 3.5 0 0 1 19 9v10H7.5A2.5 2.5 0 0 1 5 16.5v-11Zm0 11A2.5 2.5 0 0 1 7.5 14H19" /> : null}
      {name === "theory" ? <path {...common} d="M7 4h10v16H7zM10 8h4m-4 4h4m-4 4h2" /> : null}
      {name === "tasks" ? <path {...common} d="M8 6h10v14H6V6h2Zm1-2h6M9 11l2 2 4-5m-6 8h6" /> : null}
      {name === "labs" || name === "flask" ? <path {...common} d="M10 3h4M11 3v5l-5 9a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 17l-5-9V3M8.5 16h7" /> : null}
      {name === "visualization" || name === "cube" ? <path {...common} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9M12 12 4 7.5" /> : null}
      {name === "references" ? <path {...common} d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 1 4 16.5v-10ZM8 8h8M8 12h7" /> : null}
      {name === "exams" ? <path {...common} d="m12 4 8 4-8 4-8-4 8-4Zm-5 7v4c2.5 2 7.5 2 10 0v-4" /> : null}
      {name === "diagnostics" || name === "chart" ? <path {...common} d="M4 19V5m4 14v-6m4 6V8m4 11v-9m4 9H4" /> : null}
      {name === "ai" || name === "sparkles" ? <path {...common} d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 10 .9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9L18 13Z" /> : null}
      {name === "progress" ? <path {...common} d="M4 19h16M7 16v-4m5 4V7m5 9v-7" /> : null}
      {name === "messages" ? <path {...common} d="M5 6h14v10H8l-3 3V6Z" /> : null}
      {name === "settings" ? <path {...common} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2M4.2 6.2l1.4 1.4m12.8 8.8 1.4 1.4m0-11.6-1.4 1.4M5.6 16.4l-1.4 1.4" /> : null}
      {name === "menu" ? <path {...common} d="M5 7h14M5 12h14M5 17h14" /> : null}
      {name === "search" ? <path {...common} d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /> : null}
      {name === "bell" ? <path {...common} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12a2 2 0 0 0 4 0" /> : null}
      {name === "shield" ? <path {...common} d="M12 3 5 6v5c0 4.5 2.9 8 7 10 4.1-2 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-5" /> : null}
      {name === "chevron" ? <path {...common} d="m8 10 4 4 4-4" /> : null}
      {name === "book" ? <path {...common} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3V5.5Z" /> : null}
    </svg>
  );
}
