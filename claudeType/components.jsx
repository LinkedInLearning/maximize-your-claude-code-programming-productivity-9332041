// Shared UI components — Avatar, TopBar, Confetti

const Avatar = ({ avatar, size = 56, halo = false }) => {
  const palette = avatar?.palette || { bg: "#FF5F8A", glow: "#FFB7CE" };
  const glyph = avatar?.glyph || "?";
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.5,
      background: `radial-gradient(circle at 30% 30%, ${palette.glow}, ${palette.bg} 70%)`,
      boxShadow: halo
        ? `0 0 0 4px white, 0 0 0 8px ${palette.bg}, 0 6px 0 rgba(45,27,78,0.18)`
        : `0 4px 0 rgba(45,27,78,0.18)`,
    }}>
      <span style={{ textShadow: "0 2px 0 rgba(0,0,0,0.18)" }}>{glyph}</span>
    </div>
  );
};

const TopBar = ({ screen, onNav, player, onSwitchPlayer }) => {
  const items = [
    { id: "home", label: "Play", icon: "play" },
    { id: "dashboard", label: "Progress", icon: "chart" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  return (
    <div className="topbar">
      <div className="brand" onClick={() => onNav("home")}>
        <div className="brand-mark"><span>K</span></div>
        <div>KEYQUEST</div>
      </div>
      <div className="nav">
        {items.map(it => (
          <button key={it.id}
            className={"nav-btn" + (screen === it.id ? " active" : "")}
            onClick={() => onNav(it.id)}>
            <Icon name={it.icon} size={16} />
            {it.label}
          </button>
        ))}
      </div>
      {player && (
        <button className="player-chip" onClick={onSwitchPlayer}>
          <Avatar avatar={player.avatar} size={32} />
          <span>{player.name}</span>
          <Icon name="swap" size={14} />
        </button>
      )}
    </div>
  );
};

const Confetti = ({ count = 80 }) => {
  const colors = ["#FF5F8A", "#4FB8E0", "#FFCC2E", "#4DD9A1", "#B69CFF", "#FF9450"];
  const pieces = React.useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.6 + Math.random() * 1.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      size: 8 + Math.random() * 8,
    }));
  }, [count]);
  return (
    <div className="confetti-layer">
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${p.left}%`,
          background: p.color,
          width: p.size, height: p.size * 1.3,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
};

// Mini line chart with playful style
const LineChart = ({ data, color = "#FF5F8A", height = 140, label, accentLast = true }) => {
  const w = 100, h = 100;
  if (!data || data.length === 0) {
    return <div style={{ height, display: "grid", placeItems: "center", color: "var(--ink-faint)", fontWeight: 600 }}>No runs yet — let's go!</div>;
  }
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05 + 0.0001;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${label})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={accentLast && i===pts.length-1 ? 3 : 1.6}
            fill={accentLast && i===pts.length-1 ? color : "white"}
            stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
};

Object.assign(window, { Avatar, TopBar, Confetti, LineChart });
