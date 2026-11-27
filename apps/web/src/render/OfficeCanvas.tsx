import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, type Ticker } from 'pixi.js';
import { drawOrder, ZOOM_MAX, type Camera, type Coord, type Point } from '@ai-hq/domain';
import { attachKeyboard, createKeyboardInput } from '../input/keyboard';
import { attachMouse, createMouseInput } from '../input/mouse';
import { officeStore, type OfficeStore } from '../state/store';
import { installTestHook } from '../testHook';
import { drawFloor } from './drawFloor';
import { drawDebugOverlay } from './drawDebugOverlay';
import { drawObject } from './drawObject';
import { drawOverlay } from './drawOverlay';
import { theme } from './palette';

interface Scene {
  readonly root: Container;
  readonly order: string[];
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

  const objects = new Container({ label: 'objects' });
  const order = drawOrder(layout);
  const byId = new Map(layout.objects.map((o) => [o.id, o]));
  for (const id of order) {
    const obj = byId.get(id);
    if (obj) objects.addChild(drawObject(obj, layout.tile));
  }

  const overlay = new Container({ label: 'overlay' });
  const debugLayer = new Graphics({ label: 'debug' });
  const highlight = new Graphics({ label: 'hover' });
  overlay.addChild(debugLayer, highlight);
  root.addChild(floor, objects, overlay);
  return { root, order, highlight, debugLayer };
}

/** Mouse and keyboard drive the camera and hover through the store; returns a detach function. */
function attachInput(app: Application, host: HTMLElement, store: OfficeStore): () => void {
  const camera = {
    panBy: (delta: Point) => store.getState().panBy(delta),
    zoomAt: (anchor: Point, factor: number) => store.getState().zoomAt(anchor, factor),
    recenter: () => store.getState().recenter(),
    getViewport: () => store.getState().viewport,
  };
  const pointer = {
    pointerMove: (screenPoint: Point) => store.getState().pointerMove(screenPoint),
    pointerLeave: () => store.getState().pointerLeave(),
  };
  const debug = {
    toggleDebug: () => store.getState().toggleDebug(),
    isDebugEnabled: () => store.getState().debug.enabled,
    getCamera: () => store.getState().camera,
    getLayout: () => store.getState().layout,
    selectTile: (tile: Coord) => store.getState().selectTile(tile),
  };
  const detachMouse = attachMouse(
    host,
    createMouseInput({ ...camera, ...pointer, ...debug }, host),
  );
  const keyboard = createKeyboardInput({ ...camera, ...debug });
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

        const { root, order, highlight, debugLayer } = buildScene(store);
        app.stage.addChild(root);
        const initial = store.getState();
        applyCamera(root, initial.camera);
        drawDebugOverlay(debugLayer, initial.debug, initial.layout);
        drawOverlay(highlight, initial.hover, initial.layout);
        unsubscribe = store.subscribe((state, prev) => {
          if (state.camera !== prev.camera) applyCamera(root, state.camera);
          if (state.debug !== prev.debug) drawDebugOverlay(debugLayer, state.debug, state.layout);
          if (state.hover !== prev.hover) drawOverlay(highlight, state.hover, state.layout);
        });

        app.renderer.on('resize', (width: number, height: number) =>
          store.getState().setViewport({ width, height }),
        );
        store.getState().setViewport({ width: app.screen.width, height: app.screen.height });

        detachInput = attachInput(app, host, store);
        app.ticker.add(() => hook?.recordFrame(performance.now()));
        app.render();
        hook?.markReady(order);
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
