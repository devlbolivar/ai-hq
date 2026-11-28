import type { Accessory, AgentColorId, HairColor, HairStyle, SkinTone } from './types';

export interface CatalogEntry<Id extends string> {
  readonly id: Id;
  /** Spanish label shown by the editor. */
  readonly name: string;
}

export interface ColorEntry<Id extends string> extends CatalogEntry<Id> {
  readonly hex: number;
}

/** Agent colors, chosen away from the network colors of the 001 (research R3). */
export const AGENT_COLORS: readonly ColorEntry<AgentColorId>[] = [
  { id: 'coral', name: 'Coral', hex: 0xff8a65 },
  { id: 'amber', name: 'Ámbar', hex: 0xf5b942 },
  { id: 'lime', name: 'Lima', hex: 0xa3d65c },
  { id: 'emerald', name: 'Esmeralda', hex: 0x34b37a },
  { id: 'sky', name: 'Cielo', hex: 0x7cc4f2 },
  { id: 'indigo', name: 'Índigo', hex: 0x7a5cf0 },
  { id: 'violet', name: 'Violeta', hex: 0xb46fe0 },
  { id: 'rose', name: 'Rosa', hex: 0xf6a5c0 },
  { id: 'sand', name: 'Arena', hex: 0xd9b98c },
  { id: 'slate', name: 'Pizarra', hex: 0x8796a8 },
];

export const SKIN_TONES: readonly ColorEntry<SkinTone>[] = [
  { id: 'skin-1', name: 'Claro', hex: 0xf5d0b5 },
  { id: 'skin-2', name: 'Medio claro', hex: 0xe0a985 },
  { id: 'skin-3', name: 'Medio oscuro', hex: 0xb97a56 },
  { id: 'skin-4', name: 'Oscuro', hex: 0x7a4b33 },
];

export const HAIR_STYLES: readonly CatalogEntry<HairStyle>[] = [
  { id: 'short', name: 'Corto' },
  { id: 'long', name: 'Largo' },
  { id: 'curly', name: 'Rizado' },
  { id: 'bun', name: 'Moño' },
];

export const HAIR_COLORS: readonly ColorEntry<HairColor>[] = [
  { id: 'black', name: 'Negro', hex: 0x2b2b2b },
  { id: 'brown', name: 'Castaño', hex: 0x6b4423 },
  { id: 'auburn', name: 'Pelirrojo', hex: 0x9a3f22 },
  { id: 'blonde', name: 'Rubio', hex: 0xe3c16f },
  { id: 'gray', name: 'Canoso', hex: 0xa8a8a8 },
];

export const ACCESSORIES: readonly CatalogEntry<Accessory>[] = [
  { id: 'none', name: 'Ninguno' },
  { id: 'glasses', name: 'Gafas' },
  { id: 'headphones', name: 'Auriculares' },
  { id: 'cap', name: 'Gorra' },
];

const COLOR_HEX = new Map(AGENT_COLORS.map((entry) => [entry.id, entry.hex]));

export function agentColorHex(id: AgentColorId): number {
  return COLOR_HEX.get(id)!;
}
