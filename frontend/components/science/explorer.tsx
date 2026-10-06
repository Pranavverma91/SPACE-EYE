"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type * as GeoJSON from "geojson";
import { api, useResource } from "@/lib/science/client";
import type { Analysis } from "@/lib/science/types";
import { Title, Failure, Notice, SelectBox, Empty } from "./primitives";
const GeoMap = dynamic(() => import("./geo-map"), { ssr: false });
type Place = {
  properties: { name?: string; city?: string; country?: string };
  geometry: { coordinates: [number, number] };
};
type Scene = {
  id: string;
  datetime: string;
  cloud_cover: number | null;
  collection: string;
};
export default function Explorer() {
  const [point, setPoint] = useState<[number, number]>([78, 22]),
    [query, setQuery] = useState(""),
    [places, setPlaces] = useState<Place[]>([]),
    [area, setArea] = useState<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>(
      null,
    ),
    [areaName, setAreaName] = useState(""),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [scenes, setScenes] = useState<Scene[] | null>(null),
    [sensor, setSensor] = useState("sentinel-2"),
    [selected, setSelected] = useState("none"),
    [busy, setBusy] = useState(false);
  const saved =
      useResource<{ id: string; name: string; geojson: GeoJSON.Polygon }[]>(
        "/aoi",
      ),
    analyses = useResource<Analysis[]>("/analyses");
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nums = query.split(",").map(Number);
    if (
      nums.length === 2 &&
      nums.every(Number.isFinite) &&
      Math.abs(nums[0]) <= 180 &&
      Math.abs(nums[1]) <= 85
    ) {
      setPoint(nums as [number, number]);
      setPlaces([]);
      return;
    }
    try {
      setPlaces(await api("/geography/places?q=" + encodeURIComponent(query)));
    } catch (e) {
      setError(String(e));
    }
  }
  async function importArea(file: File) {
    try {
      const text = await file.text();
      let geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
      if (file.name.toLowerCase().endsWith(".kml")) {
        const xml = new DOMParser().parseFromString(text, "text/xml"),
          coordinates = xml.querySelector(
            "Polygon outerBoundaryIs LinearRing coordinates",
          )?.textContent;
        if (!coordinates) throw Error("KML needs a polygon");
        geometry = {
          type: "Polygon",
          coordinates: [
            coordinates
              .trim()
              .split(/\s+/)
              .map((v) => v.split(",").slice(0, 2).map(Number)),
          ],
        };
      } else {
        const value = JSON.parse(text);
        geometry =
          value.type === "FeatureCollection"
            ? value.features[0]?.geometry
            : value.type === "Feature"
              ? value.geometry
              : value;
      }
      if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type))
        throw Error("Use a polygon GeoJSON or KML");
      setArea(geometry);
      setNote("Imported area. Save it to validate and use it in analysis.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function catalog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget),
      q = new URLSearchParams({
        lon: String(point[0]),
        lat: String(point[1]),
        sensor,
        start: String(form.get("start")),
        end: String(form.get("end")),
        cloud: String(form.get("cloud")),
      });
    try {
      setScenes(await api("/geography/scenes?" + q));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const result = analyses.data?.find((a) => a.id === selected);
  return (
    <>
      <Title
        title="Earth explorer"
        description="Find real places, define a study area and inspect available acquisitions."
      />
      <div className="se-explorer-grid">
        <aside className="se-panel se-form">
          <h2>Locate your study area</h2>
          <form onSubmit={search} className="se-form">
            <label>
              Place or longitude, latitude
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Meerut or 77.7, 28.98"
                required
              />
            </label>
            <button className="se-button">Find location</button>
          </form>
          {places.map((p, i) => (
            <button
              className="se-place"
              key={i}
              onClick={() => {
                setPoint(p.geometry.coordinates);
                setPlaces([]);
              }}
            >
              {[p.properties.name, p.properties.city, p.properties.country]
                .filter(Boolean)
                .join(", ")}
            </button>
          ))}
          <p className="se-meta">
            Selected {point[0].toFixed(5)}, {point[1].toFixed(5)}
          </p>
          <label>
            Saved area
            <SelectBox
              label="Saved area"
              value="choose"
              onChange={(id) =>
                setArea(saved.data?.find((a) => a.id === id)?.geojson || null)
              }
              options={[
                { value: "choose", label: "Choose a saved area" },
                ...(saved.data || []).map((a) => ({
                  value: a.id,
                  label: a.name,
                })),
              ]}
            />
          </label>
          <label>
            Import GeoJSON / KML
            <input
              type="file"
              accept=".geojson,.json,.kml"
              onChange={(e) => {
                if (e.target.files?.[0]) void importArea(e.target.files[0]);
              }}
            />
          </label>
          {area && (
            <>
              <label>
                Area name
                <input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  maxLength={160}
                />
              </label>
              <button
                className="se-button primary"
                disabled={!areaName}
                onClick={async () => {
                  try {
                    await api("/aoi", {
                      method: "POST",
                      body: JSON.stringify({ name: areaName, geojson: area }),
                    });
                    saved.refresh();
                    setNote(
                      "Study area saved. Select it when creating an analysis.",
                    );
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                Save study area
              </button>
            </>
          )}
          <label>
            Completed raster layer
            <SelectBox
              label="Analysis layer"
              value={selected}
              onChange={setSelected}
              options={[
                { value: "none", label: "Basemap only" },
                ...(analyses.data || [])
                  .filter((a) => a.status === "Completed")
                  .map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </label>
          <Link className="se-button" href="/analysis/new">
            Upload LISS-IV imagery
          </Link>
        </aside>
        <section>
          <GeoMap
            key={selected}
            center={point}
            bounds={result?.result?.metadata.bounds}
            analysisId={result?.id}
            aoi={area}
            onAOI={setArea}
            onPoint={setPoint}
            height={540}
          />
          {note && <Notice>{note}</Notice>}
          {error && <Failure message={error} />}
        </section>
      </div>
      <section className="se-panel">
        <h2>Satellite catalogue</h2>
        <p>
          Live catalogue metadata around the selected point. Up to 12 matching
          acquisitions. LISS-IV requires licensed manual upload.
        </p>
        <form className="se-filter-row" onSubmit={catalog}>
          <SelectBox
            label="Catalogue sensor"
            value={sensor}
            onChange={setSensor}
            options={[
              { value: "sentinel-2", label: "Sentinel-2 optical" },
              { value: "sentinel-1", label: "Sentinel-1 SAR" },
            ]}
          />
          <label>
            From
            <input
              name="start"
              type="date"
              defaultValue="2025-01-01"
              required
            />
          </label>
          <label>
            To
            <input
              name="end"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <label>
            Maximum cloud %
            <input
              name="cloud"
              type="number"
              min={0}
              max={100}
              defaultValue={30}
            />
          </label>
          <button className="se-button primary" disabled={busy}>
            {busy ? "Searching…" : "Search acquisitions"}
          </button>
        </form>
        {scenes?.length === 0 && (
          <Empty title="No matching acquisitions">
            Try another date range or location.
          </Empty>
        )}
        <div className="se-card-grid">
          {scenes?.map((s) => (
            <article className="se-panel" key={s.id}>
              <p className="se-eyebrow">{s.collection}</p>
              <h3>
                {s.datetime
                  ? new Date(s.datetime).toLocaleDateString()
                  : "Date unavailable"}
              </h3>
              <p className="se-meta">{s.id}</p>
              <p>
                Cloud coverage:{" "}
                {s.cloud_cover == null
                  ? "Unavailable"
                  : s.cloud_cover.toFixed(1) + "%"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
