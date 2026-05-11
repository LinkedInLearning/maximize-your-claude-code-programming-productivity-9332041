// data.jsx — all content: words, quotes, code samples, avatars, palettes, achievements, modes

const WORDS = ("the of and to in a is that it was for on are with as I his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them would write like so these her long make thing see him two has look more day could go come did my no most who over know than first been call its now find down side been made may part build space year live me back give very after our just name good sentence man think say great where help through much before line right too means old any same tell boy follow came want show also around farm three small set put end why again turn here off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always show large often together asked house don't world going want school important until form food keep children feet land side without boy once animal life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light country father let night picture being study second soon story since white ever paper hard near sentence better best across during today however sure knew it's try told young sun thing whole hear example heard several change answer room sea against top turned learn point city play toward five himself usually money seen didn't car morning I'm body upon family later turn move face door cut done group true half red fish plants live water rain river road yes city north fast often gave box fun bag dark game ride bird tree tall short pull push wind wave dance music dream chair table floor mouse house mouse light dark fire stone wood metal glass paper plant rock sand seed leaf branch root stem rose grass green blue black white pink gold cold warm hot mild cool soft hard loud quiet still busy slow quick true safe brave kind smart calm proud happy sad angry tired sleep dream wake jump run walk swim climb crawl drive sing read write play work eat drink cook bake clean wash help find lose keep give take open close build draw paint color cut tape glue snap clap stretch bend hold reach kick lift carry catch throw share lift pour wash hide seek tell ask laugh smile cry frown blink yawn whisper shout pull push stop start follow lead enter leave arrive return rest pause begin finish train plane boat truck bus car bike skate sled wagon kite ball doll book pen pencil paper crayon glue scissors paint brush hat coat boot sock shoe scarf glove ring watch lamp bed desk").split(/\s+/).filter(Boolean);

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Life is what happens to us while we are making other plans.", author: "Allen Saunders" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" }
];

const CODE_SAMPLES = [
  { lang: "JS", text: "function fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}" },
  { lang: "Python", text: "def greet(name):\n    msg = f\"Hello, {name}!\"\n    print(msg)\n    return msg" },
  { lang: "TS", text: "type User = { id: number; name: string };\nconst users: User[] = [];\nfunction add(u: User) {\n  users.push(u);\n}" },
  { lang: "CSS", text: ".btn {\n  color: #fff;\n  background: #FF5F8A;\n  padding: 8px 16px;\n  border-radius: 8px;\n}" },
  { lang: "Rust", text: "fn main() {\n    let nums = vec![1, 2, 3];\n    let sum: i32 = nums.iter().sum();\n    println!(\"{}\", sum);\n}" }
];

const AVATARS = ["🦊","🐱","🐶","🐼","🐸","🦄","🐙","🦖","🦉","🐝","🦋","🐢","🐰","🐯","🦁","🐨","🦊","🐺","🦝","🐬"];

const PALETTES = [
  { id: "coral",   primary: "#FF5F8A", bg: "#fff5f8" },
  { id: "sky",     primary: "#4FB8E0", bg: "#f0fafd" },
  { id: "lavender",primary: "#B69CFF", bg: "#f7f4ff" },
  { id: "mint",    primary: "#4DD9A1", bg: "#f0fcf6" },
  { id: "sun",     primary: "#FFCC2E", bg: "#fffbe8" },
  { id: "berry",   primary: "#C04CCD", bg: "#fbf2fc" },
  { id: "ocean",   primary: "#1F7AE0", bg: "#eef5fc" },
  { id: "forest",  primary: "#2FA56E", bg: "#eef9f3" }
];

const MODES = [
  { id: "words",  label: "Words",      sub: "Practice common English" },
  { id: "quote",  label: "Quote",      sub: "Curated quotations" },
  { id: "code",   label: "Code",       sub: "Symbols + indentation" },
  { id: "ghost",  label: "Ghost Race", sub: "Beat 95% of your best" }
];

const ACHIEVEMENTS = [
  { id: "first",       name: "First Steps",  desc: "Complete your first run",                   icon: "👣", test: (r, s) => s.totalRuns >= 1 },
  { id: "cruisin",     name: "Cruisin'",     desc: "Hit 40 WPM",                                icon: "🚗", test: (r, s) => r.wpm >= 40 },
  { id: "speed",       name: "Speed Demon",  desc: "Hit 60 WPM",                                icon: "⚡", test: (r, s) => r.wpm >= 60 },
  { id: "lightning",   name: "Lightning",    desc: "Hit 80 WPM",                                icon: "🌩️", test: (r, s) => r.wpm >= 80 },
  { id: "untouchable", name: "Untouchable",  desc: "Hit 100 WPM",                               icon: "🔥", test: (r, s) => r.wpm >= 100 },
  { id: "sharpshooter",name: "Sharpshooter", desc: "Finish a run at 95% accuracy or better",    icon: "🎯", test: (r, s) => r.accuracy >= 95 },
  { id: "flawless",    name: "Flawless",     desc: "Finish a run at 100% accuracy",             icon: "💎", test: (r, s) => r.accuracy >= 100 },
  { id: "warming",     name: "Warming Up",   desc: "Complete 10 runs",                          icon: "☕", test: (r, s) => s.totalRuns >= 10 },
  { id: "marathon",    name: "Marathoner",   desc: "Complete 50 runs",                          icon: "🏃", test: (r, s) => s.totalRuns >= 50 },
  { id: "coder",       name: "Code Master",  desc: "Complete a Code-mode run",                  icon: "💻", test: (r, s) => r.mode === "code" },
  { id: "wordsmith",   name: "Wordsmith",    desc: "Complete a Quote-mode run",                 icon: "📜", test: (r, s) => r.mode === "quote" },
  { id: "ghostbuster", name: "Ghostbuster",  desc: "Beat your ghost in Ghost Race",             icon: "👻", test: (r, s) => r.mode === "ghost" && r.beatGhost }
];

window.KQ_DATA = { WORDS, QUOTES, CODE_SAMPLES, AVATARS, PALETTES, MODES, ACHIEVEMENTS };
