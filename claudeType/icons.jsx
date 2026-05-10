// Lightweight SVG icon set — Lucide-inspired strokes
const Icon = ({ name, size = 18, stroke = 2, ...rest }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
    className: "ico " + (rest.className || ""),
    style: rest.style,
  };
  switch (name) {
    case "play": return (<svg {...props}><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none"/></svg>);
    case "trophy": return (<svg {...props}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3"/></svg>);
    case "chart": return (<svg {...props}><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 6-6"/></svg>);
    case "settings": return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "users": return (<svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    case "swap": return (<svg {...props}><path d="M7 16l-4-4 4-4M3 12h13M17 8l4 4-4 4M21 12H8"/></svg>);
    case "plus": return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "check": return (<svg {...props}><path d="M5 12l5 5L20 7"/></svg>);
    case "x": return (<svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>);
    case "back": return (<svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
    case "refresh": return (<svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>);
    case "bolt": return (<svg {...props}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="currentColor"/></svg>);
    case "target": return (<svg {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>);
    case "ghost": return (<svg {...props}><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-2 3 2 2-2 2 2 3-2 3 2V10a8 8 0 0 0-8-8z"/></svg>);
    case "code": return (<svg {...props}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>);
    case "quote": return (<svg {...props}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c1 0 1 1 1 2v1c0 1-1 2-2 2H3v3z" fill="currentColor"/><path d="M14 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c1 0 1 1 1 2v1c0 1-1 2-2 2h-2v3z" fill="currentColor"/></svg>);
    case "type": return (<svg {...props}><path d="M4 7V5h16v2M9 20h6M12 5v15"/></svg>);
    case "calendar": return (<svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    case "fire": return (<svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5-1.6-1.6-3.5-2.5-3-4.5-3 0-9 1-9 8.5a8 8 0 0 0 1.5 5z" fill="currentColor"/></svg>);
    case "sparkle": return (<svg {...props}><path d="M12 3l1.6 4.8L18 9l-4.4 1.2L12 15l-1.6-4.8L6 9l4.4-1.2L12 3z" fill="currentColor"/></svg>);
    case "medal": return (<svg {...props}><circle cx="12" cy="15" r="6"/><path d="M8 21l4-3 4 3M9 9L6 3h12l-3 6"/></svg>);
    case "lock": return (<svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>);
    case "star": return (<svg {...props}><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" fill="currentColor"/></svg>);
    case "music": return (<svg {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    default: return null;
  }
};
window.Icon = Icon;
