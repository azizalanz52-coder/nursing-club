'use client';

import type { ReactNode } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  Activity,
  Archive,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Crown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderOpen,
  Gauge,
  Handshake,
  Heart,
  Hospital,
  Image as ImageIcon,
  Inbox,
  Info,
  KeyRound,
  Landmark,
  Lightbulb,
  Lock,
  LogOut,
  MapPin,
  Medal,
  Menu,
  MessageSquare,
  Newspaper,
  Package,
  Palette,
  PenLine,
  Phone,
  Plus,
  Printer,
  Radar,
  Rocket,
  ScrollText,
  Search,
  Send,
  Settings,
  Shield,
  Siren,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Trophy,
  Upload,
  User,
  UserPlus,
  Users,
  Video,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { siInstagram, siTiktok, siWhatsapp, siX } from 'simple-icons';

export const CLUB_ICONS = {
  palette: Palette,
  camera: Camera,
  calendar: CalendarDays,
  users: Users,
  handshake: Handshake,
  flask: FlaskConical,
  gauge: Gauge,
  settings: Settings,
  stethoscope: Stethoscope,
  wrench: Wrench,
  zap: Zap,
  userPlus: UserPlus,
  lock: Lock,
  award: Award,
  medal: Medal,
  alert: TriangleAlert,
  siren: Siren,
  menu: Menu,
  close: X,
  lightbulb: Lightbulb,
  newspaper: Newspaper,
  trophy: Trophy,
  radar: Radar,
  video: Video,
  archive: Archive,
  image: ImageIcon,
  inbox: Inbox,
  landmark: Landmark,
  heart: Heart,
  building: Building2,
  logout: LogOut,
  user: User,
  chevronDown: ChevronDown,
  eye: Eye,
  trash: Trash2,
  download: Download,
  upload: Upload,
  spreadsheet: FileSpreadsheet,
  shield: Shield,
  bell: Bell,
  printer: Printer,
  phone: Phone,
  check: Check,
  info: Info,
  star: Star,
  crown: Crown,
  sparkles: Sparkles,
  file: FileText,
  clipboard: ClipboardList,
  book: BookOpen,
  key: KeyRound,
  scroll: ScrollText,
  package: Package,
  message: MessageSquare,
  pen: PenLine,
  send: Send,
  plus: Plus,
  search: Search,
  folder: FolderOpen,
  activity: Activity,
  badge: BadgeCheck,
  mapPin: MapPin,
  clock: Clock,
  rocket: Rocket,
  hospital: Hospital,
} as const;

export type ClubIconName = keyof typeof CLUB_ICONS;

const COMMITTEE_ICONS: Record<string, ClubIconName> = {
  design: 'palette',
  media: 'camera',
  'events-org': 'calendar',
  hr: 'users',
  pr: 'handshake',
  scientific: 'flask',
  quality: 'gauge',
};

const EMOJI_ICONS: Record<string, ClubIconName> = {
  '🎨': 'palette',
  '📸': 'camera',
  '📅': 'calendar',
  '👥': 'users',
  '🌐': 'handshake',
  '🤝': 'handshake',
  '🔬': 'flask',
  '📊': 'gauge',
  '⚙️': 'settings',
  '🩺': 'stethoscope',
  '🛠': 'wrench',
  '🛠️': 'wrench',
  '⚡': 'zap',
  '✨': 'sparkles',
  '🔒': 'lock',
  '🎖️': 'medal',
  '🏅': 'medal',
  '🚨': 'siren',
  '⚠️': 'alert',
  '💡': 'lightbulb',
  '❓': 'info',
  '📰': 'newspaper',
  '🏆': 'trophy',
  '🎥': 'video',
  '📦': 'archive',
  '🖼️': 'image',
  '📥': 'inbox',
  '🏛️': 'landmark',
  '👑': 'crown',
  '👤': 'user',
  '🗑️': 'trash',
  '👁️': 'eye',
  '💬': 'message',
  '📘': 'book',
  '🔑': 'key',
  '📜': 'scroll',
  '📌': 'clipboard',
  '📢': 'bell',
  '🛡️': 'shield',
  '✏️': 'pen',
  '✍️': 'pen',
  '📨': 'send',
  '🖨️': 'printer',
  '🌟': 'star',
  '🎀': 'heart',
  '🟢': 'badge',
  '📍': 'mapPin',
  '📆': 'calendar',
  '⏱️': 'clock',
  '🚀': 'rocket',
  '📝': 'pen',
  '🔍': 'search',
  '🏥': 'hospital',
  '📂': 'folder',
  '📄': 'file',
};

type SocialName = 'x' | 'tiktok' | 'whatsapp' | 'instagram';

const SOCIAL = {
  x: siX,
  tiktok: siTiktok,
  whatsapp: siWhatsapp,
  instagram: siInstagram,
} as const;

type IconSize = number | string;

function px(size: IconSize) {
  return typeof size === 'number' ? size : undefined;
}

export function ClubIcon({
  name,
  size = 16,
  className,
  strokeWidth = 2,
  ...props
}: {
  name: ClubIconName;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
} & Omit<LucideProps, 'size' | 'name'>) {
  const Icon = CLUB_ICONS[name] as LucideIcon;
  return (
    <Icon
      size={px(size) ?? 16}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className || ''}`}
      aria-hidden
      {...props}
    />
  );
}

export function CommitteeIcon({
  id,
  size = 22,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  return <ClubIcon name={COMMITTEE_ICONS[id] || 'users'} size={size} className={className} />;
}

export function SocialIcon({
  name,
  size = 16,
  className,
  title,
}: {
  name: SocialName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const icon = SOCIAL[name];
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className || ''}`}
      fill="currentColor"
      aria-hidden={!title}
      aria-label={title || icon.title}
    >
      {title ? <title>{title}</title> : null}
      <path d={icon.path} />
    </svg>
  );
}

export function IconText({
  text,
  size = 15,
  className,
}: {
  text: string;
  size?: number;
  className?: string;
}) {
  const keys = Object.keys(EMOJI_ICONS).sort((a, b) => b.length - a.length);
  const nodes: ReactNode[] = [];
  let rest = text;
  let n = 0;

  while (rest.length) {
    let matched = false;
    for (const key of keys) {
      if (rest.startsWith(key)) {
        nodes.push(<ClubIcon key={`i${n++}`} name={EMOJI_ICONS[key]} size={size} />);
        rest = rest.slice(key.length).replace(/^\s+/, '');
        matched = true;
        break;
      }
    }
    if (matched) continue;
    let cut = rest.length;
    for (const key of keys) {
      const at = rest.indexOf(key);
      if (at >= 0 && at < cut) cut = at;
    }
    nodes.push(<span key={`t${n++}`}>{rest.slice(0, cut)}</span>);
    rest = rest.slice(cut);
  }

  return <span className={`inline-flex items-center gap-1.5 ${className || ''}`}>{nodes}</span>;
}
