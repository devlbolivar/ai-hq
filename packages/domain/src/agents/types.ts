import type { Coord, Direction, OfficeLayout, WalkabilityGrid } from '../types';
import type { RngState } from './rng';
import type { AgentStatus } from './stateMachine';

/** Catalog ids (data-model.md "Catálogo"); each list lives in `catalog.ts`. */
export type AgentColorId =
  'coral' | 'amber' | 'lime' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'rose' | 'sand' | 'slate';
export type SkinTone = 'skin-1' | 'skin-2' | 'skin-3' | 'skin-4';
export type HairStyle = 'short' | 'long' | 'curly' | 'bun';
export type HairColor = 'black' | 'brown' | 'auburn' | 'blonde' | 'gray';
export type Accessory = 'none' | 'glasses' | 'headphones' | 'cap';

export interface Appearance {
  readonly skinTone: SkinTone;
  readonly hairStyle: HairStyle;
  readonly hairColor: HairColor;
  readonly accessory: Accessory;
}

/** Editable agent data plus its stable identity (data-model.md "AgentProfile"). */
export interface AgentProfile {
  /** Stable id; future capabilities bind to it. */
  readonly id: string;
  /** 1–30 chars after trim; unique case-insensitively. */
  readonly name: string;
  /** 1–40 chars after trim; a visible label only. */
  readonly role: string;
  /** Unique among agents. */
  readonly color: AgentColorId;
  readonly appearance: Appearance;
  /** Id of a `desk` object of the layout; unique; not editable. */
  readonly deskId: string;
  /** 1–4000 chars after `cleanSystemPrompt`; never contains the zero-invention rule. */
  readonly systemPrompt: string;
}

/** What the editor changes. */
export type AgentDraft = Pick<
  AgentProfile,
  'name' | 'role' | 'color' | 'appearance' | 'systemPrompt'
>;

/** Fractional tile coordinates (not pixels); `positionToWorld` converts them. */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

/** Use point `index` of the object `objectId`. */
export interface UsePointRef {
  readonly objectId: string;
  readonly index: number;
}

export type Activity = 'work' | 'meeting' | 'break' | 'review' | 'whiteboard' | 'wander';

export interface AgentTarget {
  /** `null`: destination without activity (`go-to` order, test hook only). */
  readonly activity: Activity | null;
  readonly tile: Coord;
  readonly usePoint: UsePointRef | null;
  readonly facing: Direction | null;
}

/** Simulation state of one agent (data-model.md "AgentRuntime"). */
export interface AgentRuntime {
  readonly id: string;
  /** Only changes through `transition`. */
  readonly status: AgentStatus;
  /** Last tile reached (integer). */
  readonly tile: Coord;
  /** 4-neighbour of `tile` being stepped into; `null` when still. */
  readonly next: Coord | null;
  /** Integer ms elapsed in the current step: 0 ≤ stepMs < STEP_DURATION_MS. */
  readonly stepMs: number;
  /** Tiles left after `next`. */
  readonly route: readonly Coord[];
  readonly facing: Direction;
  readonly target: AgentTarget | null;
  readonly reservation: UsePointRef | null;
  /** Has an active external order (no autonomy). */
  readonly forced: boolean;
  /** Remaining idle pause or autonomous activity time; `null` when forced or not timed. */
  readonly timerMs: number | null;
  /** > 0 while celebrating (still `working`). */
  readonly celebrateMs: number;
}

/** Immutable context of a simulation. */
export interface SimWorld {
  readonly layout: OfficeLayout;
  readonly walk: WalkabilityGrid;
  /** Team order. */
  readonly team: readonly AgentProfile[];
}

export interface Simulation {
  /** Multiple of SIM_STEP_MS. */
  readonly timeMs: number;
  readonly rng: RngState;
  /** Team order. */
  readonly agents: readonly AgentRuntime[];
}

export type Order =
  | { readonly type: 'activity'; readonly activity: 'work' | 'meeting' | 'break' | 'review' }
  | { readonly type: 'go-to'; readonly tile: Coord }
  | { readonly type: 'idle' };

export type OrderResult =
  | { readonly ok: true; readonly changed: boolean }
  | {
      readonly ok: false;
      readonly reason: 'NO_FREE_SPOT' | 'UNREACHABLE' | 'INVALID_DESTINATION' | 'UNKNOWN_AGENT';
    };
