"use client";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
export default function Comparison({ id }: { id: string }) {
  const [split, setSplit] = useState(50),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [blink, setBlink] = useState(false),
    [show, setShow] = useState(false),
    [error, setError] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  useEffect(() => {
    if (!blink) return;
    const timer = setInterval(() => setShow((v) => !v), 650);
    return () => clearInterval(timer);
  }, [blink]);
  const transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
  return (
    <section className="se-comparison">
      <div className="se-comparison-bar">
        <span>
          Original <b>↔</b> Reconstruction
        </span>
        <div>
          <button
            onClick={() => setZoom((z) => Math.min(6, z + 0.5))}
            aria-label="Zoom in"
          >
            ＋
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset view
          </button>
          <button aria-pressed={blink} onClick={() => setBlink((v) => !v)}>
            Blink {blink ? "on" : "off"}
          </button>
        </div>
      </div>
      <div
        className="se-comparison-viewport"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPan({
              x: drag.current.px + e.clientX - drag.current.x,
              y: drag.current.py + e.clientY - drag.current.y,
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <img
          draggable={false}
          style={{ transform }}
          src={`/api/science/analyses/${id}/preview/original`}
          alt="Original false-color observation"
          onError={() => setError(true)}
        />
        <div
          className="se-comparison-overlay"
          style={{
            clipPath: `inset(0 ${blink ? (show ? 0 : 100) : 100 - split}% 0 0)`,
          }}
        >
          <img
            draggable={false}
            style={{ transform }}
            src={`/api/science/analyses/${id}/preview/reconstruction`}
            alt="Reconstructed false-color estimate"
            onError={() => setError(true)}
          />
        </div>
        {!blink && (
          <div className="se-swipe-line" style={{ left: split + "%" }} />
        )}
        <span className="se-image-label">
          {blink ? "Blink comparison" : "Shared grid · shared stretch"}
        </span>
        {error && (
          <p className="se-map-error">
            Preview unavailable. Check the service and completed products.
          </p>
        )}
      </div>
      <Slider
        aria-label="Comparison divider"
        min={0}
        max={100}
        step={1}
        value={[split]}
        onValueChange={(v) => setSplit(v[0])}
      />
      <p className="se-meta">
        Drag to pan; controls zoom both previews together. Display previews are
        bounded to 1,024 pixels. Export GeoTIFFs for original spatial
        resolution.
      </p>
    </section>
  );
}
