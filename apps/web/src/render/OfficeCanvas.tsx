import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, type Ticker } from 'pixi.js';
import {
  agentColorHex,
  CHARACTER_BODY,
  drawOrder,
  positionToWorld,
  sceneOrder,
  ZOOM_MAX,
  type Camera,
  type CharacterPlacement,
  type Point,
} from '@ai-hq/domain';
import { attachKeyboard, createKeyboardInput } from '../input/keyboard';
import { attachMouse, createMouseInput } from '../input/mouse';
import {
  characterPlacements,
  officeStore,
  type OfficeState,
  type OfficeStore,
} from '../state/store';
import { installTestHook } from '../testHook';
import { createCharacterView, updateCharacterView, type CharacterView } from './character/pixi';
import { poseFor } from './character/pose';
import { bubbleSpec, createBubbleView, updateBubbleView, type BubbleView } from './drawBubble';
import { drawFloor } from './drawFloor';
import { drawDebugOverlay } from './drawDebugOverlay';
import { drawObject } from './drawObject';
import { drawOverlay } from './drawOverlay';
import { drawRing } from './drawRing';
import { theme } from './palette';

/** Gap between the top of the body and the bubble tail (px at zoom 1). */
const BUBBLE_GAP = 16;

interface AgentViews {
  readonly character: CharacterView;
  readonly bubble: BubbleView;
}

interface Scene {
  readonly root: Container;
  /** Furniture and characters, sorted by `zIndex` = position in `sceneOrder` (research R11). */
  readonly objects: Container;
  readonly objectViews: ReadonlyMap<string, Container>;
  readonly agents: ReadonlyMap<string, AgentViews>;
  /** Hover highlight, redrawn when `hover` changes. */
  readonly highlight: Graphics;
  /** Debug overlay (walkable grid, entrance, use points, route), under the hover highlight. */
  readonly debugLayer: Graphics;
}

function buildScene(store: OfficeStore): Scene {
  const { layout } = store.getState();
  const root = new Container({ label: 'camera' });

  const floor = new Container({ label: 'floor' });
  floor.addChild(drawFloor(layout));
  // Sharp up to the maximum zoom on high-density screens (research R2).
  floor.cacheAsTexture({ resolution: ZOOM_MAX * (window.devicePixelRatio || 1), antialias: true });

  const objects = new Container({ label: 'objects', sortableChildren: true });
  const objectViews = new Map<string, Container>();
  const byId = new Map(layout.objects.map((o) => [o.id, o]));
  for (const id of drawOrder(layout)) {
    const obj = byId.get(id);
    if (!obj) continue;
    const view = drawObject(obj, layout.tile);
    objectViews.set(id, view);
    objects.addChild(view);
  }

  // Bubbles above every object and character, so they are always readable (FR-025).
  const bubbles = new Container({ label: 'bubbles' });
  const agents = new Map<string, AgentViews>();
  for (const profile of store.getState().team) {
    const views = {
      character: createCharacterView(profile.id),
      bubble: createBubbleView(profile.id),
    };
    agents.set(profile.id, views);
    objects.addChild(views.character.root);
    bubbles.addChild(views.bubble.root);
  }

  const overlay = new Container({ label: 'overlay' });
  const debugLayer = new Graphics({ label: 'debug' });
  const highlight = new Graphics({ label: 'hover' });
  overlay.addChild(debugLayer, highlight);
  root.addChild(floor, objects, bubbles, overlay);
  return { root, objects, objectViews, agents, highlight, debugLayer };
}

/** Depth order of objects and characters for the current positions (FR-023, research R10). */
function sortScene(
  scene: Scene,
  state: OfficeState,
  placements: readonly CharacterPlacement[],
): void {
  sceneOrder(state.layout, placements).forEach((item, i) => {
    const view =
      item.type === 'object'
        ? scene.objectViews.get(item.id)
        : scene.agents.get(item.id)?.character.root;
    if (view) view.zIndex = i;
  });
  // Sorted now (not at the next render) so the hook always reads the real child order.
  scene.objects.sortChildren();
}

/** Places, animates and labels every character from the simulation (FR-024, FR-025). */
function updateAgents(
  scene: Scene,
  state: OfficeState,
  placements: readonly CharacterPlacement[],
): void {
  const { layout, sim, selection } = state;
  const profiles = new Map(state.team.map((p) => [p.id, p]));
  for (const placement of placements) {
    const agent = sim.agents[placement.teamIndex];
    const profile = profiles.get(placement.id);
    const views = scene.agents.get(placement.id);
    if (!agent || !profile || !views) continue;
    const { pose, seated } = poseFor(agent, layout);
    const selected = selection.agentId === agent.id;
    const color = agentColorHex(profile.color);
    // Ring in the agent color under the selected one only (FR-027).
    drawRing(views.character.ring, selected ? color : null);
    updateCharacterView(
      views.character,
      {
        appearance: profile.appearance,
        color,
        position: placement.position,
        facing: agent.facing,
        pose,
        seated,
        t: sim.timeMs,
      },
      layout.tile,
    );
    const feet = positionToWorld(placement.position, layout.tile);
    views.bubble.root.position.set(feet.x, feet.y - CHARACTER_BODY.height - BUBBLE_GAP);
    updateBubbleView(views.bubble, bubbleSpec(agent.status, selected));
  }
}

/**
 * Mouse and keyboard drive the camera, hover, selection, pause and debug mode through the store,
 * and do nothing while the editor is open; returns a detach function.
 */
function attachInput(app: Application, host: HTMLElement, store: OfficeStore): () => void {
  const camera = {
    panBy: (delta: Point) => store.getState().panBy(delta),
    zoomAt: (anchor: Point, factor: number) => store.getState().zoomAt(anchor, factor),
    recenter: () => store.getState().recenter(),
    getViewport: () => store.getState().viewport,
  };
  const modal = { isEditorOpen: () => store.getState().editor !== null };
  const pointer = {
    pointerMove: (screenPoint: Point) => store.getState().pointerMove(screenPoint),
    pointerLeave: () => store.getState().pointerLeave(),
  };
  const detachMouse = attachMouse(
    host,
    createMouseInput(
      { ...camera, ...modal, ...pointer, clickAt: (at: Point) => store.getState().clickAt(at) },
      host,
    ),
  );
  const selection = {
    selectNumber: (n: number) => store.getState().selectNumber(n),
    cycle: (direction: 1 | -1) => store.getState().cycle(direction),
    deselect: () => store.getState().deselect(),
    togglePause: () => store.getState().togglePause(),
  };
  const keyboard = createKeyboardInput({
    ...camera,
    ...modal,
    ...selection,
    toggleDebug: () => store.getState().toggleDebug(),
  });
  const detachKeyboard = attachKeyboard(window, keyboard);
  const tick = (ticker: Ticker) => keyboard.tick(ticker.deltaMS);
  app.ticker.add(tick);
  return () => {
    detachMouse();
    detachKeyboard();
    app.ticker.remove(tick);
  };
}

function applyCamera(root: Container, camera: Camera): void {
  root.position.set(camera.offset.x, camera.offset.y);
  root.scale.set(camera.zoom);
}

/**
 * Imperative Pixi scene inside React (research R1): React only mounts the host element; Pixi
 * reads the store with `subscribe`, so camera changes never re-render React.
 */
export function OfficeCanvas({ store = officeStore }: { store?: OfficeStore }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    const hook = installTestHook(window, store, import.meta.env);
    let disposed = false;
    let initialized = false;
    let unsubscribe = () => {};
    let detachInput = () => {};

    app
      .init({
        resizeTo: host,
        background: theme.background,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
      .then(() => {
        initialized = true;
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        host.appendChild(app.canvas);

        const scene = buildScene(store);
        const { root, highlight, debugLayer } = scene;
        app.stage.addChild(root);
        const initial = store.getState();
        applyCamera(root, initial.camera);
        const placements = characterPlacements(initial.sim);
        sortScene(scene, initial, placements);
        updateAgents(scene, initial, placements);
        drawDebugOverlay(debugLayer, initial.debug, initial.layout);
        drawOverlay(highlight, initial.hover, initial.layout);
        unsubscribe = store.subscribe((state, prev) => {
          if (state.camera !== prev.camera) applyCamera(root, state.camera);
          if (state.debug !== prev.debug) drawDebugOverlay(debugLayer, state.debug, state.layout);
          const moved = state.sim !== prev.sim;
          const placements = characterPlacements(state.sim);
          // A hovered character's highlight moves with it.
          if (state.hover !== prev.hover || (state.hover?.type === 'agent' && moved))
            drawOverlay(highlight, state.hover, state.layout, placements);
          if (moved) sortScene(scene, state, placements);
          if (moved || state.team !== prev.team || state.selection !== prev.selection)
            updateAgents(scene, state, placements);
        });

        app.renderer.on('resize', (width: number, height: number) =>
          store.getState().setViewport({ width, height }),
        );
        store.getState().setViewport({ width: app.screen.width, height: app.screen.height });

        detachInput = attachInput(app, host, store);
        // One simulation frame per rendered frame (fixed steps inside, research R6).
        app.ticker.add((ticker: Ticker) => store.getState().tick(ticker.deltaMS));
        app.ticker.add(() => hook?.recordFrame(performance.now()));
        app.render();
        hook?.markReady(scene.objects);
      })
      .catch((error: unknown) => {
        console.error('No se pudo iniciar el render de la oficina', error);
      });

    return () => {
      disposed = true;
      unsubscribe();
      detachInput();
      hook?.dispose();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [store]);

  return <div ref={hostRef} className="absolute inset-0 touch-none overflow-hidden select-none" />;
}
