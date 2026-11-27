import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { agentColorHex, marketingTeam } from '@ai-hq/domain';
import { CharacterSvg } from '../../src/render/character/svg';
import { characterShapes } from '../../src/render/character/shapes';
import { toCss } from '../../src/render/palette';

afterEach(cleanup);

const { appearance, color } = marketingTeam[0]!;

describe('CharacterSvg (FR-031)', () => {
  it('is an image with an accessible name drawing every character shape', () => {
    render(
      <CharacterSvg appearance={appearance} color={agentColorHex(color)} label="Vista previa" />,
    );
    const img = screen.getByRole('img', { name: 'Vista previa' });
    const expected = characterShapes(appearance, agentColorHex(color), 'S', 'idle', 0);
    expect(img.querySelectorAll('ellipse, rect, polygon')).toHaveLength(expected.length);
  });

  it('uses the agent color and changes with the appearance', () => {
    const { rerender } = render(
      <CharacterSvg appearance={appearance} color={agentColorHex('sky')} label="A" />,
    );
    const img = screen.getByRole('img', { name: 'A' });
    expect(img.innerHTML).toContain(toCss(agentColorHex('sky')));
    const before = img.innerHTML;
    rerender(
      <CharacterSvg
        appearance={{ ...appearance, hairStyle: 'bun' }}
        color={agentColorHex('sky')}
        label="A"
      />,
    );
    expect(screen.getByRole('img', { name: 'A' }).innerHTML).not.toBe(before);
  });
});
