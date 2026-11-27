import { Container, Graphics, Text } from 'pixi.js';
import type { AgentStatus } from '@ai-hq/domain';
import type { CharacterShape } from './character/shapes';
import { STATUS_LABELS, theme } from './palette';

export type BubbleIcon = 'steps' | 'keyboard' | 'chat' | 'cup' | 'check';

const ICONS: Readonly<Record<Exclude<AgentStatus, 'idle'>, BubbleIcon>> = {
  walking: 'steps',
  working: 'keyboard',
  meeting: 'chat',
  break: 'cup',
  waiting_review: 'check',
};

export interface BubbleSpec {
  readonly icon: BubbleIcon;
  /** Spanish status text, only for the selected agent. */
  readonly label: string | null;
}

/** What the bubble over an agent shows (FR-025): nothing while idle. */
export function bubbleSpec(status: AgentStatus, selected: boolean): BubbleSpec | null {
  if (status === 'idle') return null;
  return { icon: ICONS[status], label: selected ? STATUS_LABELS[status] : null };
}

const INK = 0x1f2937;

function r(x: number, y: number, w: number, h: number, fill = INK): CharacterShape {
  return { kind: 'rect', part: 'accessory', fill, x, y, w, h };
}
function e(x: number, y: number, rx: number, ry: number, fill = INK): CharacterShape {
  return { kind: 'ellipse', part: 'accessory', fill, x, y, rx, ry };
}

/** Icon geometry centred on (0, 0) inside a 12×12 box, drawn by code (FR-021). */
export function iconShapes(icon: BubbleIcon): CharacterShape[] {
  switch (icon) {
    case 'steps':
      return [e(-2.5, 2, 1.8, 2.8), e(2.5, -2, 1.8, 2.8)];
    case 'keyboard':
      return [r(-5.5, -3, 11, 6), ...[-3.5, -0.5, 2.5].map((x) => r(x, -1.5, 1.5, 1.2, 0xf8fafc))];
    case 'chat':
      return [
        e(0, -1, 5.5, 3.8),
        { kind: 'polygon', part: 'accessory', fill: INK, points: [-2, 2, 0, 2, -3.5, 5] },
      ];
    case 'cup':
      return [r(-4, -3, 6, 6.5), e(3.2, 0, 1.6, 2, INK), e(-1, -4.5, 2.5, 0.8, 0x94a3b8)];
    case 'check':
      return [
        {
          kind: 'polygon',
          part: 'accessory',
          fill: 0x16a34a,
          points: [-5, 0, -3, -2, -1, 0, 4, -5, 6, -3, -1, 4],
        },
      ];
  }
}

export interface BubbleView {
  readonly root: Container;
  readonly shape: Graphics;
  readonly text: Text;
  key: string;
}

export function createBubbleView(id: string): BubbleView {
  const root = new Container({ label: `bubble:${id}`, visible: false });
  const shape = new Graphics();
  const text = new Text({
    text: '',
    style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fill: INK },
  });
  text.anchor.set(0, 0.5);
  root.addChild(shape, text);
  return { root, shape, text, key: '' };
}

/** Redraws only when the bubble content changes; the caller positions `root` over the head. */
export function updateBubbleView(view: BubbleView, spec: BubbleSpec | null): void {
  view.root.visible = spec !== null;
  const key = spec ? `${spec.icon}|${spec.label ?? ''}` : '';
  if (!spec || key === view.key) return;
  view.key = key;
  view.text.text = spec.label ?? '';
  view.text.visible = spec.label !== null;
  const width = 20 + (spec.label ? view.text.width + 6 : 0);
  const g = view.shape.clear();
  g.roundRect(-10, -10, width, 20, 9)
    .fill(theme.text)
    .stroke({ color: INK, width: 1, alpha: 0.25 });
  g.poly([-3, 9, 3, 9, 0, 14]).fill(theme.text);
  for (const s of iconShapes(spec.icon)) {
    if (s.kind === 'ellipse') g.ellipse(s.x, s.y, s.rx, s.ry);
    else if (s.kind === 'rect') g.rect(s.x, s.y, s.w, s.h);
    else g.poly([...s.points]);
    g.fill(s.fill);
  }
  view.text.position.set(12, 0);
}
