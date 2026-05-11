// icons.jsx — inline SVG icon set
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "trophy":    return <svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 4H3v3a3 3 0 0 0 3 3M17 4h4v3a3 3 0 0 1-3 3"/></svg>;
    case "ghost":     return <svg {...p}><path d="M12 2a8 8 0 0 0-8 8v11l3-2 3 2 2-2 2 2 3-2 3 2V10a8 8 0 0 0-8-8z"/><circle cx="9" cy="10" r="1" fill={color}/><circle cx="15" cy="10" r="1" fill={color}/></svg>;
    case "lock":      return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "bolt":      return <svg {...p}><path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/></svg>;
    case "target":    return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill={color}/></svg>;
    case "code":      return <svg {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case "quote":     return <svg {...p}><path d="M7 7h4v6H7zM13 7h4v6h-4z"/><path d="M7 13v3M13 13v3"/></svg>;
    case "type":      return <svg {...p}><path d="M4 7V5h16v2M9 5v14M15 19h-6"/></svg>;
    case "play":      return <svg {...p}><polygon points="6 4 20 12 6 20 6 4" fill={color}/></svg>;
    case "back":      return <svg {...p}><polyline points="15 18 9 12 15 6"/></svg>;
    case "chart":     return <svg {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>;
    case "settings":  return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2l-.4-2.4h-4l-.4 2.4a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.4h4l.4-2.4a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case "plus":      return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "x":         return <svg {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
    case "check":     return <svg {...p}><polyline points="5 12 10 17 19 7"/></svg>;
    case "trash":     return <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case "fire":      return <svg {...p}><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-2 2-2 5a5 5 0 0 0 10 0c0-6-5-10-5-10z"/></svg>;
    default:          return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
};
window.KQ_Icon = Icon;
