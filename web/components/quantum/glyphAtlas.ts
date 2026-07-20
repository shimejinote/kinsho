'use client';

import * as THREE from 'three';

/**
 * Glyph atlas for the word-dust starfield.
 *
 * All ~50k field particles carry prose glyphs. Positions come from the
 * starfield orbits (ParticleSwarm) — this module only paints the atlas and
 * assigns characters. On dive the field enlarges so drifting letters read.
 *
 * Fonts: canvas cannot resolve CSS `var()`, and next/font size-adjust fallbacks
 * are Latin-only — so we wait on real faces and fall through to a cross-OS
 * Mincho stack before painting the atlas.
 */

/** Matches ParticleSwarm DEFAULT_COUNT — every particle is a letter. */
export const PROSE_TARGET = 50_000;

const DUST_GLYPHS =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょ' +
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  '、。「」…—ー・！？' +
  '言葉物語心夢空宙音光風景時記憶想像創作街道旅路花月夜雨雪星海空森詩筆綴' +
  '虚空漂寄集読開指触静夜朝風街灯遠近続記端末扉橋迷保存道標完成閉';

/**
 * Seed corpus — tiled to exactly PROSE_TARGET characters.
 * Continuous prose so the full field reads as one flowing text.
 */
export const NOTE_PROSE_LINES = [
  '夜の静けさのなかで、ふと書いてみたくなった。画面の奥で星がまたたき、言葉はまだ形を持たないまま漂っている。指先が触れた瞬間、虚空が一文字ずつ寄り集まり、意味のあるかたちへ落ち着く。',
  '今日見た景色も、交わした言葉も、ここに残せば届くかもしれない。遠くの誰かが、同じ夜を見上げている気がした。風の音も、街の灯りも、すべてが行間に溶けていく。小さな文字ほど、むしろ確かに読める。',
  '空は広く、星は遠くても、筆を進める手が光だった。一文字ずつ確かめていくと、虚空がページではなく、ひとつながりの物語に変わっていく。読む速さで世界の輪郭が、静かに立ち上がる。',
  '誰かが読んだとき、また夜がひらく。その瞬間だけ、世界は少しやさしくなる。続きは、また次の夜に。星屑は言葉になり、言葉は再び星へ還る。静かな余白さえ、物語の一部だ。',
  '文字の大きさも、やがて揃っていく。最初はばらばらだった星が、読みやすい高さへ落ち着くのを、そのまま見ていてほしい。整列の過程そのものが、書くという行為に似ている。',
  'ここに記された行は、虚空の記録であり、同時にあなたへの手紙でもある。密に積まれた文字のあいだを、視線がゆっくりと進むとき、ポータルはまだ開かない。読むことが、いまの儀式だ。',
  '論文のように詰まっていても、一文字は見失われない。間隔は狭く、形は整い、意味だけが手前に出てくる。それが、この虚空に書いた本文の約束だ。続きを探す指が、また夜をひらく。',
  '星は遠く、文字は近い。その逆転のなかで、物語は静かに密度を増していく。読めば読むほど、画面は一枚の紙ではなく、夜そのものに近づく。五万の粒が、すべて言葉である。',
  '朝の匂いも、雨の気配も、遠い国の名前も、同じ流れの中に置ける。言葉は軽いのに、積もると重くなる。その重さを、虚空は文句も言わずに受け止める。',
  '扉の向こうには端末がある。端末の向こうには、また別の夜がある。夜と夜のあいだを縫うように、細い文字が橋をかける。橋を渡る者は急がなくてよい。足元の文字を一つずつ読めば、道は自然にひらける。',
  'もし途中で視線が迷っても、かまわない。迷った場所から、別の意味が生まれることもある。細かい活字は、迷いを隠さない。むしろ迷いを、丁寧に保存する。保存された迷いは、いつか誰かの道標になる。',
  '書き終えたあとも、星はまたたき続ける。物語は完成しても、閉じない。閉じない物語だけが、虚空にふさわしい。終わりのない本文を、いまもあなたは読んでいる。漂う文字が、そのまま意味を成す。',
] as const;

export type ProseLetter = {
  ch: string;
  atlasIndex: number;
  /** Reading order (0 = first). */
  order: number;
};

export type GlyphAtlas = {
  texture: THREE.Texture;
  cols: number;
  rows: number;
  count: number;
  letters: ProseLetter[];
};

const ATLAS_REV = 29;
let cached: GlyphAtlas | null = null;
let cachedRev = 0;
let pending: Promise<GlyphAtlas> | null = null;

/** Cross-OS Japanese mincho — never rely on Latin metric fallbacks for CJK. */
const SYSTEM_MINCHO_STACK = [
  "'Hiragino Mincho ProN'",
  "'Hiragino Mincho Pro'",
  "'Yu Mincho'",
  'YuMincho',
  "'Noto Serif CJK JP'",
  "'Noto Serif JP'",
  "'Source Han Serif JP'",
  'serif',
].join(', ');

/** Probe text: kana + kanji so Latin-only faces fail `fonts.check`. */
const FONT_PROBE = 'あア夜言';

function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * next/font variables look like `__Hina_xxx, __Hina_Fallback_xxx`.
 * The Fallback face is Latin-only — drop it for canvas painting.
 */
function primaryFace(raw: string): string {
  if (!raw) return '';
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first || /fallback/i.test(first)) return '';
  return first;
}

/**
 * Concrete canvas font stack (no CSS `var()` — canvas will not resolve them).
 * Prefer design tokens `--font-glyph` → `--font-shippori` → system mincho.
 */
function resolveFamily(): { css: string; loadFaces: string[]; weight: number } {
  const glyph = primaryFace(cssVar('--font-glyph'));
  const shippori = primaryFace(cssVar('--font-shippori'));
  const loadFaces = [glyph, shippori].filter(Boolean);
  const css = [...loadFaces, SYSTEM_MINCHO_STACK].join(', ');
  return { css: css || SYSTEM_MINCHO_STACK, loadFaces, weight: 400 };
}

async function ensureFacesReady(
  weight: number,
  fontPx: number,
  faces: string[],
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  for (const face of faces) {
    const spec = `${weight} ${fontPx}px ${face}`;
    try {
      await document.fonts.load(spec, FONT_PROBE);
    } catch {
      /* try next */
    }
  }
  const deadline = performance.now() + 1200;
  while (performance.now() < deadline) {
    const ready = faces.some((face) => {
      try {
        return document.fonts.check(
          `${weight} ${fontPx}px ${face}`,
          FONT_PROBE,
        );
      } catch {
        return false;
      }
    });
    if (ready) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

/** True if a cell has enough white ink to count as a real glyph (not tofu/empty). */
function cellHasInk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): boolean {
  const { data } = ctx.getImageData(x, y, size, size);
  let ink = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! > 12) {
      ink++;
      if (ink > 24) return true;
    }
  }
  return false;
}

function paintCharset(
  ctx: CanvasRenderingContext2D,
  charset: string[],
  cols: number,
  cell: number,
  fontCss: string,
  weight: number,
  fontPx: number,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${weight} ${fontPx}px ${fontCss}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < charset.length; i++) {
    const ch = charset[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.fillText(ch, col * cell + cell / 2, row * cell + cell / 2);
  }
}

/** Flatten seed lines into characters (no spaces). */
function seedChars(): string[] {
  const out: string[] = [];
  for (const line of NOTE_PROSE_LINES) {
    for (const ch of Array.from(line)) {
      if (ch === ' ' || ch === '　') continue;
      out.push(ch);
    }
  }
  return out;
}

/** Tile seed until exactly `target` characters — fills the full particle field. */
export function expandProseChars(target: number = PROSE_TARGET): string[] {
  const base = seedChars();
  if (base.length === 0) return [];
  const out: string[] = new Array(target);
  for (let i = 0; i < target; i++) {
    out[i] = base[i % base.length]!;
  }
  return out;
}

/** Soft hash unused — letters ride starfield seeds, not a plate. */
function buildLetters(charToIndex: Map<string, number>): ProseLetter[] {
  const chars = expandProseChars(PROSE_TARGET);
  const letters: ProseLetter[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const atlasIndex = charToIndex.get(ch);
    if (atlasIndex === undefined) continue;
    letters.push({
      ch,
      atlasIndex,
      order: letters.length,
    });
  }
  return letters;
}

async function draw(): Promise<GlyphAtlas> {
  const proseChars = expandProseChars(PROSE_TARGET);
  const seen = new Set<string>();
  const charset: string[] = [];
  for (const ch of [...Array.from(DUST_GLYPHS), ...proseChars]) {
    if (ch === ' ' || ch === '　') continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    charset.push(ch);
  }

  const charToIndex = new Map(charset.map((c, i) => [c, i]));
  const count = charset.length;
  const cols = 16;
  const rows = Math.ceil(count / cols);
  const cell = 96;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const { css, loadFaces, weight } = resolveFamily();
  const fontPx = Math.round(cell * 0.78);

  await ensureFacesReady(weight, fontPx, loadFaces);

  paintCharset(ctx, charset, cols, cell, css, weight, fontPx);

  const probeIdx = Math.max(0, charset.indexOf('あ'));
  const probeCol = probeIdx % cols;
  const probeRow = Math.floor(probeIdx / cols);
  if (
    !cellHasInk(ctx, probeCol * cell, probeRow * cell, cell) &&
    css !== SYSTEM_MINCHO_STACK
  ) {
    paintCharset(ctx, charset, cols, cell, SYSTEM_MINCHO_STACK, weight, fontPx);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  const letters = buildLetters(charToIndex);

  return {
    texture,
    cols,
    rows,
    count,
    letters,
  };
}

/** Build (or reuse) the glyph atlas. Client-only. */
export function loadGlyphAtlas(): Promise<GlyphAtlas> {
  if (cached && cachedRev === ATLAS_REV) return Promise.resolve(cached);
  if (pending) return pending;
  cached = null;
  pending = draw().then((atlas) => {
    cached = atlas;
    cachedRev = ATLAS_REV;
    pending = null;
    return atlas;
  });
  return pending;
}
