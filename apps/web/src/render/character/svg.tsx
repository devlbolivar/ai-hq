import type { Appearance, Direction } from '@ai-hq/domain';
import { CHARACTER_BODY } from '@ai-hq/domain';
import { toCss } from '../palette';
import { characterShapes, type Pose } from './shapes';

export interface CharacterSvgProps {
  readonly appearance: Appearance;
  readonly color: number;
  readonly label: string;
  readonly facing?: Direction;
  readonly pose?: Pose;
  /** Rendered height in px. */
  readonly size?: number;
}

const PAD = 2;
const VIEW_BOX = [
  -CHARACTER_BODY.width / 2 - PAD,
  -CHARACTER_BODY.height - PAD,
  CHARACTER_BODY.width + PAD * 2,
  CHARACTER_BODY.height + PAD * 2,
].join(' ');

/** SVG drawing of `characterShapes` for the editor preview and team cards (research R11). */
export function CharacterSvg({
  appearance,
  color,
  label,
  facing = 'S',
  pose = 'idle',
  size = 56,
}: CharacterSvgProps): JSX.Element {
  const shapes = characterShapes(appearance, color, facing, pose, 0);
  const width = (size * (CHARACTER_BODY.width + PAD * 2)) / (CHARACTER_BODY.height + PAD * 2);
  return (
    <svg role="img" aria-label={label} viewBox={VIEW_BOX} width={width} height={size}>
      {shapes.map((s, i) => {
        const fill = toCss(s.fill);
        if (s.kind === 'ellipse')
          return <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={fill} />;
        if (s.kind === 'rect')
          return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={1} fill={fill} />;
        return <polygon key={i} points={s.points.join(' ')} fill={fill} />;
      })}
    </svg>
  );
}
