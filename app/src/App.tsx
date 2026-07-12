import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Copy,
  Download,
  FileText,
  Heart,
  Inbox,
  Info,
  Mail,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
  Settings2,
  Sparkles,
  Terminal,
  Users,
  X,
  Zap
} from "lucide-react";
import { ToastNotification } from "./components/ToastNotification";
import "./styles.css";

type Notice = {
  id: string;
  label: string;
  kind: string;
  title: string;
  copy: string;
  time: string;
  icon: typeof Bell;
  tone: "violet" | "blue" | "green" | "amber" | "rose" | "slate";
};

const notices: Notice[] = [
  { id: "toast", label: "01 / Toast", kind: "Toast", title: "Project published", copy: "Your changes are live at northstar.app.", time: "Just now", icon: CheckCircle2, tone: "green" },
  { id: "banner", label: "02 / Banner", kind: "Banner", title: "Maintenance tonight at 22:00", copy: "Expect a short interruption while we upgrade search.", time: "In 5h", icon: Info, tone: "blue" },
  { id: "inbox", label: "03 / Inbox", kind: "Inbox", title: "Mina shared a research brief", copy: "The Q3 customer interview synthesis is ready to review.", time: "12m", icon: FileText, tone: "violet" },
  { id: "progress", label: "04 / Progress", kind: "Progress", title: "Export is almost ready", copy: "Compiling 1,248 events into your CSV export.", time: "84%", icon: Download, tone: "blue" },
  { id: "mention", label: "05 / Mention", kind: "Mention", title: "You were mentioned in #design", copy: "@nikol could you review the empty state before stand-up?", time: "14m", icon: MessageCircle, tone: "violet" },
  { id: "security", label: "06 / Security", kind: "Security", title: "New sign-in from Warsaw", copy: "Chrome on Windows · 185.67.21.4", time: "Now", icon: AlertTriangle, tone: "amber" },
  { id: "release", label: "07 / Release", kind: "Release", title: "Version 2.8 is ready", copy: "Faster sharing, refined filters, and 18 fixes.", time: "Today", icon: PackageCheck, tone: "green" },
  { id: "failed", label: "08 / Error", kind: "Error", title: "Payment could not be processed", copy: "Your card ending in 4242 needs attention.", time: "2m", icon: CircleAlert, tone: "rose" },
  { id: "digest", label: "09 / Digest", kind: "Digest", title: "Your weekly pulse", copy: "42 new replies, 8 decisions, and 3 things to celebrate.", time: "Mon", icon: Sparkles, tone: "slate" },
  { id: "command", label: "10 / Command", kind: "Command", title: "Deployment completed", copy: "production · 47s · all checks passed", time: "3m", icon: Terminal, tone: "green" }
];

export default function App() {
  const [active, setActive] = useState("All");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const activeNotices = useMemo(() => notices.filter((notice) => !dismissed.includes(notice.id)), [dismissed]);
  const display = active === "All" ? activeNotices : activeNotices.filter((notice) => notice.kind === active);

  function dismiss(id: string) {
    setDismissed((current) => [...current, id]);
  }

  function restore() {
    setDismissed([]);
  }

  async function copySnippet() {
    await navigator.clipboard?.writeText('<Notification variant="success" title="Project published" />');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="showcase-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Notifylab home">
          <span className="brand-orb"><Bell size={17} fill="currentColor" /></span>
          <span>notifylab</span>
        </a>
        <div className="header-actions">
          <button className="icon-button" aria-label="Settings"><Settings2 size={17} /></button>
          <button className="avatar" aria-label="Account menu">NK</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Notification patterns</p>
          <h1>Every signal deserves<br /><em>the right moment.</em></h1>
          <p className="hero-description">Ten expressive patterns for product updates, tiny wins, urgent attention, and everything in between.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={restore}><RotateCcw size={16} /> Restore all <kbd>R</kbd></button>
            <button className="quiet-button" onClick={copySnippet}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy component"}</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbital orbital-one" /><div className="orbital orbital-two" />
          <div className="hero-notification"><span className="pulse-dot" /><Bell size={24} /><div><strong>Stay in the loop</strong><small>Thoughtfully, not loudly.</small></div></div>
          <div className="spark spark-one">✦</div><div className="spark spark-two">✦</div>
        </div>
      </section>

      <section className="gallery-header" aria-label="Notification gallery controls">
        <div className="filter-tabs">
          {["All", "Toast", "Banner", "Inbox", "Progress", "Mention", "Security", "Release", "Error", "Digest", "Command"].map((item) => (
            <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}{item === "All" && <span>{activeNotices.length}</span>}</button>
          ))}
        </div>
        <p>{dismissed.length ? `${dismissed.length} dismissed` : "Click any close button to try it"}</p>
      </section>

      <section className="notification-grid" aria-live="polite">
        {display.map((notice) => <NotificationCard key={notice.id} notice={notice} onDismiss={() => dismiss(notice.id)} />)}
        {display.length === 0 && <div className="empty-state"><Archive size={25} /><strong>All clear</strong><span>Bring the examples back whenever you’re ready.</span><button onClick={restore}>Restore notifications</button></div>}
      </section>

      <section className="bottom-note">
        <div><span className="mini-logo"><Zap size={15} fill="currentColor" /></span><strong>Built for a calmer product.</strong><p>Each pattern prioritizes meaning, action, and a graceful exit.</p></div>
        <a href="#top">Back to top <ArrowUpRight size={15} /></a>
      </section>
    </main>
  );
}

function NotificationCard({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const Icon = notice.icon;
  const common = <><div className={`notice-icon ${notice.tone}`}><Icon size={18} /></div><div className="notice-content"><div className="notice-meta"><span>{notice.kind}</span><time>{notice.time}</time></div><h2>{notice.title}</h2><p>{notice.copy}</p></div><button className="dismiss" onClick={onDismiss} aria-label={`Dismiss ${notice.kind} example`}><X size={16} /></button></>;

  if (notice.id === "banner") return <article className="notification-card banner-card"><div className="card-label">{notice.label}</div><div className="banner-inner">{common}<button className="small-action">Details <ChevronRight size={14} /></button></div></article>;
  if (notice.id === "progress") return <article className="notification-card progress-card"><div className="card-label">{notice.label}</div><div className="progress-inner">{common}<div className="progress-track"><i /></div><div className="progress-footer"><span>Preparing download</span><strong>84%</strong></div></div></article>;
  if (notice.id === "mention") return <article className="notification-card mention-card"><div className="card-label">{notice.label}</div><div className="mention-inner"><div className="people"><span>JH</span><span>MS</span><span>AN</span></div>{common}<div className="reply-line"><button>Reply</button><button><Heart size={14} /> 2</button></div></div></article>;
  if (notice.id === "security") return <article className="notification-card security-card"><div className="card-label">{notice.label}</div><div className="security-inner">{common}<div className="security-actions"><button className="approve"><Check size={14} /> It was me</button><button>Secure account</button></div></div></article>;
  if (notice.id === "release") return <article className="notification-card release-card"><div className="card-label">{notice.label}</div><div className="release-inner"><div className="release-glow" />{common}<button className="release-button">Explore what’s new <ArrowUpRight size={14} /></button></div></article>;
  if (notice.id === "failed") return <article className="notification-card error-card"><div className="card-label">{notice.label}</div><div className="error-inner">{common}<button className="fix-button">Update payment method <ChevronRight size={14} /></button></div></article>;
  if (notice.id === "digest") return <article className="notification-card digest-card"><div className="card-label">{notice.label}</div><div className="digest-inner"><div className="digest-top"><span>MONDAY, 14 JULY</span><button onClick={onDismiss}><MoreHorizontal size={17} /></button></div>{common}<div className="digest-stats"><span><Inbox size={13} /> 42 replies</span><span><Users size={13} /> 8 teammates</span><span><Heart size={13} /> 3 wins</span></div></div></article>;
  if (notice.id === "command") return <article className="notification-card command-card"><div className="card-label">{notice.label}</div><div className="command-inner"><div className="terminal-bar"><i /><i /><i /><span>deploy / production</span><button onClick={onDismiss}><X size={15} /></button></div>{common}<pre>$ deploy --environment production{`\n`}✓ Build complete — 47.2s</pre></div></article>;
  if (notice.id === "inbox") return <article className="notification-card inbox-card"><div className="card-label">{notice.label}</div><div className="inbox-inner"><div className="sender">MS</div>{common}<div className="inbox-actions"><button><Check size={14} /> Mark read</button><button><Archive size={14} /> Archive</button></div></div></article>;
  return <ToastNotification title={notice.title} copy={notice.copy} time={notice.time} onDismiss={onDismiss} />;
}
