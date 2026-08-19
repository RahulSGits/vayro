'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useProgress } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Product, ProductHotspot } from '@/types';
import { three as threeTokens } from '@/lib/design-tokens';
import { cn, clamp } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { VayroMark } from '@/components/brand';
import { SceneCanvas, InvalidateOnChange } from '@/components/three/Canvas';
import { StudioEnvironment } from '@/components/three/Environment';
import { JacketModel } from '@/components/three/JacketModel';
import { SHELL_FINISHES, type FinishKey } from '@/components/three/materials';
import type { JacketQuality } from '@/components/three/geometry';
import { colorwaysOf } from './product-source';

/* ==========================================================================
   ProductViewerScene — the full interactive view.

   Drag to rotate, pinch or wheel to zoom, step through fixed views, switch
   colourway and finish, open the annotated details, explode the construction,
   or run the fold from WEAR to CARRY by hand.

   Analytics uses the closed event union in @/lib/analytics. The mapping from
   controls to the six permitted `3d_interaction` actions is:
     rotate     drag, arrow keys, ROTATE, the fixed views, AUTO
     zoom       wheel, pinch, ZOOM
     hotspot    a marker or DETAILS
     variant    colourway, finish, EXPLODE, TRANSFORM — what is being shown
     reset      RESET
     fullscreen FULLSCREEN
   ========================================================================== */

const DEFAULT_VIEW = { theta: 0.34, phi: 1.36, radius: 4.9 };
const RANGE = { min: 2.6, max: 7.4 };
const TARGET = new THREE.Vector3(0, 0.04, 0);

type ViewCommandPayload =
  | { kind: 'view'; theta: number; phi?: number }
  | { kind: 'nudge'; theta: number }
  | { kind: 'zoom'; factor: number }
  | { kind: 'reset' };

/** Imperative bridge from the control bar to the camera, without a ref maze. */
type ViewCommand = ViewCommandPayload & { id: number };

export type ProductViewerSceneProps = {
  product: Product;
  className?: string;
  colorway?: string;
  finish?: FinishKey;
};

export function ProductViewerScene({
  product,
  className,
  colorway: initialColorway,
  finish: initialFinish = 'ripstop',
}: ProductViewerSceneProps) {
  const { tier, reducedMotion, coarsePointer } = useDeviceTier();
  const quality: JacketQuality = tier === 'high' ? 'high' : tier === 'medium' ? 'medium' : 'low';

  const colorways = useMemo(() => colorwaysOf(product), [product]);
  const hotspots = useMemo(() => product.hotspots.filter((h) => h.anchor3d), [product.hotspots]);

  const [colorway, setColorway] = useState(initialColorway ?? colorways[0]?.name ?? 'Basalt');
  const [finish, setFinish] = useState<FinishKey>(initialFinish);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const [details, setDetails] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [pack, setPack] = useState(0);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const [command, setCommand] = useState<ViewCommand | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const commandId = useRef(0);
  const started = useRef(false);
  const lastTracked = useRef<Record<string, number>>({});
  const assets = useProgress();

  const progress = assets.active ? assets.progress / 100 : buildProgress;
  const fullscreen = nativeFullscreen || expanded;

  /* ------------------------------------------------------------ events --- */

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track('3d_view_started', { productId: product.id, tier });
  }, [product.id, tier]);

  const interaction = useCallback(
    (action: 'rotate' | 'zoom' | 'hotspot' | 'variant' | 'reset' | 'fullscreen') => {
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      if (now - (lastTracked.current[action] ?? 0) < 900) return;
      lastTracked.current[action] = now;
      track('3d_interaction', { productId: product.id, action });
    },
    [product.id],
  );

  const send = useCallback((next: ViewCommandPayload) => {
    commandId.current += 1;
    setCommand({ ...next, id: commandId.current });
  }, []);

  /* -------------------------------------------------------- fullscreen --- */

  useEffect(() => {
    const sync = () => setNativeFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    interaction('fullscreen');
    const element = shellRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (element.requestFullscreen) {
      try {
        await element.requestFullscreen({ navigationUI: 'hide' });
        return;
      } catch {
        // iOS Safari refuses on non-video elements — the CSS route covers it.
      }
    }
    setExpanded(true);
  }, [expanded, interaction]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  /* ---------------------------------------------------------- keyboard --- */

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        send({ kind: 'nudge', theta: -0.26 });
        interaction('rotate');
        break;
      case 'ArrowRight':
        event.preventDefault();
        send({ kind: 'nudge', theta: 0.26 });
        interaction('rotate');
        break;
      case '+':
      case '=':
        event.preventDefault();
        send({ kind: 'zoom', factor: 0.82 });
        interaction('zoom');
        break;
      case '-':
      case '_':
        event.preventDefault();
        send({ kind: 'zoom', factor: 1.22 });
        interaction('zoom');
        break;
      case 'r':
      case 'R':
        send({ kind: 'reset' });
        interaction('reset');
        break;
      case 'Escape':
        if (openHotspot) setOpenHotspot(null);
        else if (expanded) setExpanded(false);
        break;
      default:
        break;
    }
  };

  /* ------------------------------------------------------------- render --- */

  const openMark = hotspots.find((mark) => mark.id === openHotspot) ?? null;
  const packLabel = pack < 0.2 ? 'Wear' : pack < 0.75 ? 'Pack' : 'Carry';

  const renderAnchor = useCallback(
    (hotspot: ProductHotspot, index: number) => (
      <Html center zIndexRange={[9, 0]} pointerEvents="auto">
        <button
          type="button"
          aria-label={`Detail ${index + 1}: ${hotspot.title}`}
          aria-expanded={openHotspot === hotspot.id}
          onClick={() => {
            setOpenHotspot((current) => (current === hotspot.id ? null : hotspot.id));
            interaction('hotspot');
          }}
          className={cn(
            'grid h-6 w-6 place-items-center border text-[0.5rem] tracking-[0.08em]',
            'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
            openHotspot === hotspot.id
              ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
              : 'border-[var(--border-strong)] bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] text-[var(--fg)] backdrop-blur-sm hover:border-[var(--fg)]',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </button>
      </Html>
    ),
    [openHotspot, interaction],
  );

  return (
    <div
      ref={shellRef}
      className={cn(
        'flex h-full w-full flex-col bg-[var(--bg-sunken)]',
        expanded && 'fixed inset-0 z-[500] h-screen w-screen',
        className,
      )}
    >
      {/* ------------------------------------------------------------ stage */}
      <div
        role="application"
        tabIndex={0}
        aria-label={`${product.name} — interactive three-dimensional view`}
        aria-describedby="viewer-help"
        onKeyDown={onKeyDown}
        onWheel={() => interaction('zoom')}
        onTouchStart={(event) => {
          if (event.touches.length > 1) interaction('zoom');
        }}
        className="relative min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--fg)]"
      >
        <p id="viewer-help" className="sr-only">
          Drag to rotate. Use the left and right arrow keys to turn the shell, plus and minus to
          zoom, R to reset the view, and Escape to close a detail card.
        </p>

        <SceneCanvas
          label={`${product.name} in three dimensions`}
          camera={{ position: [1.62, 0.52, 4.6] }}
        >
          <StudioEnvironment particles={false} intensity={1} />
          <ViewerRig
            command={command}
            autoRotate={autoRotate && !transforming}
            coarsePointer={coarsePointer}
            onRotate={() => interaction('rotate')}
          >
            <JacketModel
              colorway={colorway}
              finish={finish}
              quality={quality}
              packProgress={transforming ? pack : 0}
              explode={exploded ? 1 : 0}
              hotspots={details && !transforming ? hotspots : []}
              renderAnchor={renderAnchor}
              onProgress={setBuildProgress}
              onReady={() => setReady(true)}
            />
          </ViewerRig>
          <InvalidateOnChange
            values={[colorway, finish, pack, exploded, transforming, details, autoRotate]}
          />
        </SceneCanvas>

        {/* Branded loader — a real value, from a real staged build. */}
        <div
          aria-hidden={ready}
          className={cn(
            'absolute inset-0 z-20 grid place-items-center bg-[var(--bg-sunken)]',
            'transition-opacity duration-[var(--d-slow)] ease-[var(--e-out)]',
            ready ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          <div className="flex w-44 flex-col items-center gap-5">
            <VayroMark size={30} className="text-[var(--fg)]" />
            <div className="h-px w-full bg-[var(--border)]">
              <div
                className="h-full origin-left bg-[var(--fg)] transition-transform duration-[var(--d-standard)] ease-[var(--e-out)]"
                style={{ transform: `scaleX(${clamp(progress, 0.02, 1)})` }}
              />
            </div>
            <p className="t-spec text-[var(--fg-subtle)]">
              {String(Math.round(clamp(progress, 0, 1) * 100)).padStart(3, '0')}%
            </p>
          </div>
        </div>

        {/* Annotation card */}
        {openMark ? (
          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-elevated)_92%,transparent)] p-5 backdrop-blur-md sm:right-auto">
            <div className="flex items-start justify-between gap-4">
              <p className="t-label text-[var(--fg-subtle)]">{openMark.title}</p>
              <button
                type="button"
                onClick={() => setOpenHotspot(null)}
                aria-label="Close detail"
                className="t-label-sm text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]"
              >
                Close
              </button>
            </div>
            <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{openMark.body}</p>
          </div>
        ) : null}

        {/* Transformation read-out */}
        {transforming ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <p className="t-label-sm text-[var(--fg-subtle)]">{packLabel}</p>
            <p className="t-spec text-[var(--fg-muted)]">
              {pack < 0.5 ? '318 g worn' : '2.1 L · 24 × 16 × 9 cm'}
            </p>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------ control bar */}
      <div className="border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="flex flex-wrap items-stretch divide-x divide-[var(--border)]">
          <Segment>
            <IconButton label="Turn left" onClick={() => { send({ kind: 'nudge', theta: -Math.PI / 2 }); interaction('rotate'); }}>
              &#8249;
            </IconButton>
            <BarLabel>Rotate</BarLabel>
            <IconButton label="Turn right" onClick={() => { send({ kind: 'nudge', theta: Math.PI / 2 }); interaction('rotate'); }}>
              &#8250;
            </IconButton>
          </Segment>

          <Segment>
            <IconButton label="Zoom out" onClick={() => { send({ kind: 'zoom', factor: 1.22 }); interaction('zoom'); }}>
              &#8722;
            </IconButton>
            <BarLabel>Zoom</BarLabel>
            <IconButton label="Zoom in" onClick={() => { send({ kind: 'zoom', factor: 0.82 }); interaction('zoom'); }}>
              &#43;
            </IconButton>
          </Segment>

          <BarButton
            active={autoRotate}
            onClick={() => {
              setAutoRotate((value) => !value);
              interaction('rotate');
            }}
            pressed
          >
            Auto
          </BarButton>

          <BarButton
            active={details}
            pressed
            onClick={() => {
              setDetails((value) => !value);
              interaction('hotspot');
            }}
          >
            Details
          </BarButton>

          <BarButton active={fullscreen} pressed onClick={toggleFullscreen}>
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </BarButton>
        </div>

        {/* ----------------------------------------------------- options */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="t-label-sm text-[var(--fg-subtle)]">View</span>
            <div className="flex gap-1">
              {(
                [
                  ['Front', 0],
                  ['Side', Math.PI / 2],
                  ['Back', Math.PI],
                ] as const
              ).map(([label, theta]) => (
                <MiniButton
                  key={label}
                  onClick={() => {
                    send({ kind: 'view', theta, phi: DEFAULT_VIEW.phi });
                    interaction('rotate');
                  }}
                >
                  {label}
                </MiniButton>
              ))}
              <MiniButton
                onClick={() => {
                  send({ kind: 'reset' });
                  setExploded(false);
                  setTransforming(false);
                  setPack(0);
                  interaction('reset');
                }}
              >
                Reset
              </MiniButton>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="t-label-sm text-[var(--fg-subtle)]">Colour</span>
            <div className="flex gap-2">
              {colorways.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  aria-label={entry.name}
                  aria-pressed={colorway === entry.name}
                  title={entry.name}
                  onClick={() => {
                    setColorway(entry.name);
                    interaction('variant');
                  }}
                  className={cn(
                    'h-6 w-6 border transition-transform duration-[var(--d-fast)] ease-[var(--e-out)]',
                    colorway === entry.name
                      ? 'border-[var(--fg)] scale-105'
                      : 'border-[var(--border-strong)] hover:scale-105',
                  )}
                  style={{ backgroundColor: entry.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="t-label-sm text-[var(--fg-subtle)]">Fabric</span>
            <div className="flex flex-wrap gap-1">
              {SHELL_FINISHES.map((entry) => (
                <MiniButton
                  key={entry.key}
                  active={finish === entry.key}
                  title={entry.spec}
                  onClick={() => {
                    setFinish(entry.key);
                    interaction('variant');
                  }}
                >
                  {entry.label}
                </MiniButton>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <MiniButton
              active={exploded}
              onClick={() => {
                setExploded((value) => !value);
                if (!exploded) setTransforming(false);
                interaction('variant');
              }}
            >
              Exploded
            </MiniButton>
            <MiniButton
              active={transforming}
              onClick={() => {
                setTransforming((value) => !value);
                if (!transforming) setExploded(false);
                interaction('variant');
              }}
            >
              Transform
            </MiniButton>
          </div>

          {transforming ? (
            <label className="flex min-w-[13rem] flex-1 items-center gap-3">
              <span className="t-label-sm text-[var(--fg-subtle)]">Wear</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(pack * 100)}
                aria-label="Fold the shell from worn to carried"
                aria-valuetext={`${packLabel}, ${Math.round(pack * 100)} per cent packed`}
                onChange={(event) => setPack(Number(event.target.value) / 100)}
                className="h-1 flex-1 cursor-pointer appearance-none bg-[var(--border-strong)] accent-[var(--fg)]"
              />
              <span className="t-label-sm text-[var(--fg-subtle)]">Carry</span>
            </label>
          ) : null}
        </div>

        {/* The PDP overlays a reduced-motion notice along this edge. */}
        {reducedMotion ? <div aria-hidden className="h-9" /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ bar atoms --- */

function Segment({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center">{children}</div>;
}

function BarLabel({ children }: { children: React.ReactNode }) {
  return <span className="t-label-sm px-1 text-[var(--fg-subtle)]">{children}</span>;
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-9 place-items-center text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[color-mix(in_oklab,var(--fg)_8%,transparent)] hover:text-[var(--fg)]"
    >
      <span aria-hidden className="text-base leading-none">
        {children}
      </span>
    </button>
  );
}

function BarButton({
  children,
  active,
  pressed,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed ? active : undefined}
      onClick={onClick}
      className={cn(
        't-label-sm h-11 px-4 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        active
          ? 'bg-[var(--fg)] text-[var(--bg)]'
          : 'text-[var(--fg-muted)] hover:bg-[color-mix(in_oklab,var(--fg)_8%,transparent)] hover:text-[var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}

function MiniButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        't-label-sm border px-3 py-2 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        active
          ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- rig --- */

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();

function shortestAngle(delta: number) {
  const twoPi = Math.PI * 2;
  let d = delta % twoPi;
  if (d > Math.PI) d -= twoPi;
  if (d < -Math.PI) d += twoPi;
  return d;
}

function ViewerRig({
  command,
  autoRotate,
  coarsePointer,
  onRotate,
  children,
}: {
  command: ViewCommand | null;
  autoRotate: boolean;
  coarsePointer: boolean;
  onRotate: () => void;
  children: React.ReactNode;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef({ ...DEFAULT_VIEW, active: false });
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!command) return;
    const node = controls.current;
    if (!node) return;

    offset.copy(camera.position).sub(node.target);
    spherical.setFromVector3(offset);

    switch (command.kind) {
      case 'view':
        goal.current.theta = command.theta;
        goal.current.phi = command.phi ?? spherical.phi;
        goal.current.radius = spherical.radius;
        break;
      case 'nudge':
        goal.current.theta = spherical.theta + command.theta;
        goal.current.phi = spherical.phi;
        goal.current.radius = spherical.radius;
        break;
      case 'zoom':
        goal.current.theta = spherical.theta;
        goal.current.phi = spherical.phi;
        goal.current.radius = clamp(spherical.radius * command.factor, RANGE.min, RANGE.max);
        break;
      case 'reset':
        goal.current.theta = DEFAULT_VIEW.theta;
        goal.current.phi = DEFAULT_VIEW.phi;
        goal.current.radius = DEFAULT_VIEW.radius;
        break;
    }
    goal.current.active = true;
    invalidate();
  }, [command, camera, invalidate]);

  useFrame((state, delta) => {
    const node = controls.current;
    if (!node) return;

    node.autoRotate = autoRotate && !goal.current.active;

    if (!goal.current.active) return;

    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 6.5);
    offset.copy(state.camera.position).sub(node.target);
    spherical.setFromVector3(offset);

    const dTheta = shortestAngle(goal.current.theta - spherical.theta);
    const dPhi = goal.current.phi - spherical.phi;
    const dRadius = goal.current.radius - spherical.radius;

    spherical.theta += dTheta * k;
    spherical.phi = clamp(
      spherical.phi + dPhi * k,
      threeTokens.orbit.minPolar,
      threeTokens.orbit.maxPolar,
    );
    spherical.radius += dRadius * k;

    offset.setFromSpherical(spherical);
    state.camera.position.copy(node.target).add(offset);
    state.camera.lookAt(node.target);

    if (Math.abs(dTheta) < 0.002 && Math.abs(dPhi) < 0.002 && Math.abs(dRadius) < 0.004) {
      goal.current.active = false;
    } else {
      invalidate();
    }
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[TARGET.x, TARGET.y, TARGET.z]}
        enablePan={false}
        enableDamping
        dampingFactor={threeTokens.orbit.damping}
        rotateSpeed={coarsePointer ? 0.62 : 0.85}
        zoomSpeed={0.7}
        minDistance={RANGE.min}
        maxDistance={RANGE.max}
        minPolarAngle={threeTokens.orbit.minPolar}
        maxPolarAngle={threeTokens.orbit.maxPolar}
        autoRotateSpeed={threeTokens.orbit.speed * 6}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        onStart={() => {
          goal.current.active = false;
          onRotate();
        }}
      />
      {children}
    </>
  );
}
