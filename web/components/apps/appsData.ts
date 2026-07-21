export type AppStatus = 'LIVE' | 'ARCHIVE' | 'SIGNAL';

export type AppEntry = {
  id: string;
  href: string;
  name: string;
  blurb: string;
  status: AppStatus;
  accent: string;
  /** Optional thumbnail under /public */
  thumb?: string;
};

export const APPS: AppEntry[] = [
  {
    id: '01',
    href: '/breakout/',
    name: 'VOID BREAKER',
    blurb: '自機が自動射撃。星を逃すかボス接近でミス。',
    status: 'LIVE',
    accent: '#00ffcc',
    thumb: '/breakout/thumb.png',
  },
  {
    id: '02',
    href: '/noumai/',
    name: 'BRAIN MAKER',
    blurb: '頭部内で Allen 脳をアセンブルする草案端末。',
    status: 'LIVE',
    accent: '#5ed2b4',
    thumb: '/noumai/thumb.png',
  },
  {
    id: '03',
    href: '/archive/void/',
    name: 'VOID ARCHIVE',
    blurb: '星塵トンネルの凍結スナップ',
    status: 'ARCHIVE',
    accent: '#7ec8ff',
  },
  {
    id: '04',
    href: '/archive/journey/',
    name: 'WORLD JOURNEY',
    blurb: '地表までの落下航路を再走',
    status: 'ARCHIVE',
    accent: '#7dffb3',
  },
];

export type NavId = 'directory' | 'archives' | 'signal';

export type NavItem = {
  id: NavId;
  label: string;
  hint: string;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'directory', label: 'すべて', hint: '端末一覧' },
  { id: 'archives', label: 'アーカイブ', hint: '保存済み' },
  { id: 'signal', label: '稼働中', hint: 'LIVE のみ' },
];

/** Rotating everyday tips — shown in the status rail. */
export const LIFE_TIPS = [
  '20分ごとに視線を遠くへ。目の疲れが減る。',
  '次の予定の5分前に席を立つと焦らない。',
  '水を一口。集中のリセットに効く。',
  '通知を閉じたまま、いまのタスクを1つだけ。',
  '短いメモを残すと、あとで探しやすい。',
  '立ち止まったら深呼吸を3回。',
  '終わったことはリストから消す。気分が軽くなる。',
  '次の区切りまで、余計なタブを増やさない。',
] as const;
