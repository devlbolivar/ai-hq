/** Integer tile coordinate: `x` = column (0..cols-1), `y` = row (0..rows-1). */
export interface Coord {
  readonly x: number;
  readonly y: number;
}

/** Grid directions: N = y-1, S = y+1, E = x+1, W = x-1. */
export type Direction = 'N' | 'E' | 'S' | 'W';

/** Footprint size in tiles (integers >= 1). */
export interface Size {
  readonly w: number;
  readonly h: number;
}

/** Real-valued point in world or screen pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface GridSize {
  readonly cols: number;
  readonly rows: number;
}

export interface TileSize {
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export type ObjectKind =
  | 'wall'
  | 'screen'
  | 'whiteboard'
  | 'desk'
  | 'chair'
  | 'monitor'
  | 'plant'
  | 'sofa'
  | 'meeting-table'
  | 'coffee-machine';

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x';

export interface UsePoint {
  /** Walkable tile reachable from the entrance where a person stands. */
  readonly tile: Coord;
  /** Where the person faces while using the object. */
  readonly facing: Direction;
}

export interface OfficeObject {
  /** Unique and stable (`desk-1`…`desk-6`, `screen-tiktok`, …). */
  readonly id: string;
  readonly kind: ObjectKind;
  /** Spanish hover label ("Escritorio 3", "Pantalla TikTok"). */
  readonly name: string;
  /** Tile with the lowest `x` and `y` of the footprint. */
  readonly origin: Coord;
  readonly size: Size;
  /** Visual height in px at zoom 1. */
  readonly height: number;
  /** Base elevation in px (0 on the floor; monitor > 0). */
  readonly z: number;
  readonly blocking: boolean;
  /** Walls, screens and whiteboard: live on row y=0 or column x=0. */
  readonly wallMounted: boolean;
  readonly usePoints: readonly UsePoint[];
  /** Required when `kind === 'screen'`. */
  readonly network?: SocialNetwork;
  /** Parent object id (monitor/chair → desk). */
  readonly attachedTo?: string;
}

export interface Zone {
  readonly id: string;
  /** Spanish display name. */
  readonly name: string;
  readonly area: { readonly origin: Coord; readonly size: Size };
}

export interface OfficeLayout {
  /** Stable department slug, e.g. `'marketing'`. */
  readonly departmentId: string;
  readonly departmentName: string;
  readonly grid: GridSize;
  readonly tile: TileSize;
  /** Walkable tile on the open front edge. */
  readonly entrance: Coord;
  readonly zones: readonly Zone[];
  readonly objects: readonly OfficeObject[];
}

export interface Camera {
  /** Translation in screen px. */
  readonly offset: Point;
  /** Always within [ZOOM_MIN, ZOOM_MAX]. */
  readonly zoom: number;
}

export type HoverTarget =
  | { readonly type: 'object'; readonly id: string }
  | { readonly type: 'tile'; readonly tile: Coord }
  | null;

export type PathFailureReason = 'blocked' | 'unreachable' | 'out-of-bounds';

export type PathResult =
  | { readonly ok: true; readonly path: readonly Coord[] }
  | { readonly ok: false; readonly reason: PathFailureReason };

/** `walk[y][x]` is true when the tile can be stepped on. */
export type WalkabilityGrid = readonly (readonly boolean[])[];

export type LayoutErrorCode =
  | 'OUT_OF_BOUNDS'
  | 'DUPLICATE_ID'
  | 'BLOCKING_OVERLAP'
  | 'ENTRANCE_BLOCKED'
  | 'USE_POINT_BLOCKED'
  | 'USE_POINT_UNREACHABLE'
  | 'MISSING_NETWORK'
  | 'DESK_USE_POINT'
  | 'BAD_ATTACHMENT';

export interface LayoutError {
  readonly code: LayoutErrorCode;
  readonly objectId?: string;
  readonly tile?: Coord;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly LayoutError[] };
