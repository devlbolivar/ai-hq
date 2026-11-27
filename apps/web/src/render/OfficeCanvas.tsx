import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { drawOrder, ZOOM_MAX, type Camera } from '@ai-hq/domain';
import { officeStore, type OfficeStore } from '../state/store';
import { installTestHook } from '../testHook';
import { drawFloor } from './drawFloor';
import { drawObject } from './drawObject';
import { theme } from './palette';

interface Scene {
  readonly root: Container;
  readonly order: string[];
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
  root.addChild(floor, objects, overlay);
  return { root, order };
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

        const { root, order } = buildScene(store);
        app.stage.addChild(root);
        applyCamera(root, store.getState().camera);
        unsubscribe = store.subscribe((state, prev) => {
          if (state.camera !== prev.camera) applyCamera(root, state.camera);
        });

        app.renderer.on('resize', (width: number, height: number) =>
          store.getState().setViewport({ width, height }),
        );
        store.getState().setViewport({ width: app.screen.width, height: app.screen.height });

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
      hook?.dispose();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [store]);

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" />;
}
