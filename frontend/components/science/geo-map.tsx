"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibre from "maplibre-gl";
import type * as GeoJSON from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { SelectBox } from "./primitives";
type View = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};
type Props = {
  center?: [number, number];
  bounds?: [number, number, number, number];
  analysisId?: string;
  product?: string;
  aoi?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  onAOI?: (value: GeoJSON.Polygon) => void;
  onPoint?: (point: [number, number]) => void;
  view?: View;
  onView?: (value: View) => void;
  height?: number;
};
export default function GeoMap(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibre.Map | null>(null),
    latest = useRef(props),
    vertices = useRef<[number, number][]>([]);
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState("inspect"),
    [count, setCount] = useState(0),
    [satellite, setSatellite] = useState(false),
    [globe, setGlobe] = useState(false),
    [terrain, setTerrain] = useState(false);
  const drawMode = useRef(mode);
  useEffect(() => {
    latest.current = props;
    drawMode.current = mode;
  }, [props, mode]);
  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (!container.current) return;
      try {
        const m = new maplibre.Map({
          container: container.current,
          center: latest.current.center || [78, 22],
          zoom: latest.current.bounds ? 7 : 3.6,
          maxZoom: 20,
          style: {
            version: 8,
            sources: {
              base: {
                type: "raster",
                tiles: [
                  "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors · © CARTO",
              },
              satellite: {
                type: "raster",
                tiles: [
                  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                ],
                tileSize: 256,
                attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
              },
              terrain: {
                type: "raster-dem",
                url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
                tileSize: 256,
              },
            },
            layers: [
              { id: "base", source: "base", type: "raster" },
              {
                id: "satellite",
                source: "satellite",
                type: "raster",
                layout: { visibility: "none" },
              },
            ],
          },
        });
        map.current = m;
        m.addControl(new maplibre.NavigationControl(), "top-right");
        m.addControl(new maplibre.ScaleControl(), "bottom-left");
        m.on("load", () => {
          if (active) setReady(true);
          if (latest.current.bounds)
            m.fitBounds(
              [
                [latest.current.bounds[0], latest.current.bounds[1]],
                [latest.current.bounds[2], latest.current.bounds[3]],
              ],
              { padding: 30, maxZoom: 16 },
            );
          m.addSource("aoi", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          m.addLayer({
            id: "aoi-fill",
            type: "fill",
            source: "aoi",
            paint: { "fill-color": "#24d8e9", "fill-opacity": 0.12 },
          });
          m.addLayer({
            id: "aoi-outline",
            type: "line",
            source: "aoi",
            paint: { "line-color": "#24d8e9", "line-width": 2 },
          });
          if (latest.current.aoi)
            (m.getSource("aoi") as maplibre.GeoJSONSource).setData({
              type: "Feature",
              geometry: latest.current.aoi,
              properties: {},
            });
          if (latest.current.analysisId) {
            m.addSource("result", {
              type: "raster",
              tiles: [
                `${location.origin}/api/science/analyses/${latest.current.analysisId}/tiles/${latest.current.product || "reconstruction"}/{z}/{x}/{y}.png`,
              ],
              tileSize: 256,
            });
            m.addLayer({
              id: "result",
              type: "raster",
              source: "result",
              paint: { "raster-opacity": 0.92 },
            });
          }
        });
        m.on("error", () => {
          if (active)
            setError(
              "Some geographic layers are unavailable. Check the provider connection.",
            );
        });
        m.on("click", (e) => {
          if (!m.getSource("aoi")) return;
          const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          if (drawMode.current === "inspect") {
            latest.current.onPoint?.(point);
            return;
          }
          vertices.current.push(point);
          setCount(vertices.current.length);
          let polygon: GeoJSON.Polygon | undefined;
          if (
            drawMode.current === "rectangle" &&
            vertices.current.length >= 2
          ) {
            const [a, b] = vertices.current;
            polygon = {
              type: "Polygon",
              coordinates: [
                [
                  [a[0], a[1]],
                  [b[0], a[1]],
                  [b[0], b[1]],
                  [a[0], b[1]],
                  [a[0], a[1]],
                ],
              ],
            };
            vertices.current = [];
            setCount(0);
            latest.current.onAOI?.(polygon);
          } else if (vertices.current.length >= 3) {
            polygon = {
              type: "Polygon",
              coordinates: [[...vertices.current, vertices.current[0]]],
            };
          }
          if (polygon)
            (m.getSource("aoi") as maplibre.GeoJSONSource).setData({
              type: "Feature",
              geometry: polygon,
              properties: {},
            });
        });
        m.on("moveend", () => {
          const c = m.getCenter();
          latest.current.onView?.({
            center: [c.lng, c.lat],
            zoom: m.getZoom(),
            bearing: m.getBearing(),
            pitch: m.getPitch(),
          });
        });
      } catch {
        if (active)
          setError(
            "This browser cannot initialize the geographic map. WebGL is required.",
          );
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (props.center && map.current)
      map.current.flyTo({
        center: props.center,
        zoom: Math.max(10, map.current.getZoom()),
      });
  }, [props.center]);
  useEffect(() => {
    const m = map.current;
    if (m?.getSource("aoi"))
      (m.getSource("aoi") as maplibre.GeoJSONSource).setData(
        props.aoi
          ? {
              type: "Feature",
              geometry: props.aoi,
              properties: {},
            }
          : { type: "FeatureCollection", features: [] },
      );
  }, [props.aoi]);
  useEffect(() => {
    const m = map.current;
    if (m?.getSource("result"))
      (m.getSource("result") as maplibre.RasterTileSource).setTiles([
        `${location.origin}/api/science/analyses/${props.analysisId}/tiles/${props.product || "reconstruction"}/{z}/{x}/{y}.png`,
      ]);
  }, [props.product, props.analysisId]);
  useEffect(() => {
    const m = map.current,
      v = props.view;
    if (!m || !v) return;
    const c = m.getCenter();
    if (
      Math.abs(c.lng - v.center[0]) +
        Math.abs(c.lat - v.center[1]) +
        Math.abs(m.getZoom() - v.zoom) +
        Math.abs(m.getBearing() - v.bearing) +
        Math.abs(m.getPitch() - v.pitch) >
      0.0001
    )
      m.jumpTo(v);
  }, [props.view]);
  return (
    <div className="se-map-wrap">
      <div className="se-map-tools">
        <button
          className="se-button"
          disabled={!ready}
          onClick={() => {
            const value = !satellite;
            setSatellite(value);
            map.current?.setLayoutProperty(
              "satellite",
              "visibility",
              value ? "visible" : "none",
            );
          }}
        >
          {satellite ? "Satellite imagery" : "Geographic labels"}
        </button>
        <button
          className="se-button"
          disabled={!ready}
          onClick={() => {
            const value = !globe;
            setGlobe(value);
            map.current?.setProjection({ type: value ? "globe" : "mercator" });
          }}
        >
          {globe ? "Globe" : "2D map"}
        </button>
        <button
          className="se-button"
          disabled={!ready}
          onClick={() => {
            const value = !terrain;
            setTerrain(value);
            map.current?.setTerrain(
              value ? { source: "terrain", exaggeration: 1 } : null,
            );
            map.current?.easeTo({ pitch: value ? 55 : 0 });
          }}
        >
          Terrain {terrain ? "on" : "off"}
        </button>
        {props.onAOI && (
          <SelectBox
            label="Drawing mode"
            value={mode}
            onChange={(value) => {
              setMode(value);
              vertices.current = [];
              setCount(0);
            }}
            options={["inspect", "rectangle", "polygon"].map((value) => ({
              value,
              label: value === "inspect" ? "Inspect point" : `Draw ${value}`,
            }))}
          />
        )}{" "}
        {mode === "polygon" && count >= 3 && (
          <button
            className="se-button primary"
            onClick={() => {
              props.onAOI?.({
                type: "Polygon",
                coordinates: [[...vertices.current, vertices.current[0]]],
              });
              vertices.current = [];
              setCount(0);
              setMode("inspect");
            }}
          >
            Finish area
          </button>
        )}
      </div>
      <div
        ref={container}
        className="se-map"
        style={{ height: props.height || 460 }}
      />
      {error && (
        <div className="se-map-error" role="status">
          {error}
        </div>
      )}
      {mode !== "inspect" && (
        <p className="se-meta">
          {mode === "rectangle"
            ? "Click two opposite corners."
            : "Click at least three vertices, then finish the area."}
        </p>
      )}
      <p className="se-map-credit">
        Reference basemap imagery has its own acquisition dates. Analysis layers
        come from your completed jobs.
      </p>
    </div>
  );
}
