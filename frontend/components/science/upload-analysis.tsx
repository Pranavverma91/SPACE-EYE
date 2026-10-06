"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type * as GeoJSON from "geojson";
import { UploadCloud } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api, number, useResource } from "@/lib/science/client";
import type { Raster, Model, Analysis } from "@/lib/science/types";
import { Title, Failure, Notice, SelectBox } from "./primitives";
export default function UploadAnalysis() {
  const router = useRouter(),
    search = useSearchParams(),
    images = useResource<Raster[]>("/images"),
    models = useResource<Model[]>("/models"),
    areas =
      useResource<{ id: string; name: string; geojson: GeoJSON.Polygon }[]>(
        "/aoi",
      );
  const [selected, setSelected] = useState("none"),
    [model, setModel] = useState(search.get("model") || "spatial-baseline"),
    [role, setRole] = useState("cloudy"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [shadows, setShadows] = useState(true),
    [area, setArea] = useState("none"),
    [relation, setRelation] = useState("none"),
    [aux, setAux] = useState<Record<string, string>>({
      mask: "none",
      reference: "none",
      temporal: "none",
      sentinel1: "none",
    });
  const chosen = images.data?.find((i) => i.id === selected),
    chosenModel = models.data?.find((m) => m.id === model);
  const bandNames =
    role === "sentinel1"
      ? ["vv", "vh"]
      : role === "mask"
        ? ["mask"]
        : role === "dem"
          ? ["elevation"]
          : ["green", "red", "nir"];
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget),
      bands: Record<string, number> = {};
    for (const name of bandNames) {
      bands[name] = Number(form.get(name));
      form.delete(name);
    }
    form.set("bands", JSON.stringify(bands));
    form.set("role", role);
    try {
      const image = await api<Raster>("/images", {
        method: "POST",
        body: form,
      });
      await images.refresh();
      if (["cloudy", "synthetic"].includes(role)) setSelected(image.id);
      else
        setAux((a) => ({
          ...a,
          [role === "clear" ? "reference" : role]: image.id,
        }));
      e.currentTarget?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await api<Analysis>("/analyses", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          image_id: selected,
          model_id: model,
          ...Object.fromEntries(
            Object.entries(aux).map(([key, value]) => [
              key + "_id",
              value === "none" ? null : value,
            ]),
          ),
          reference_relation: aux.reference === "none" ? "none" : relation,
          aoi: areas.data?.find((a) => a.id === area)?.geojson || null,
          patch_size: Number(f.get("patch_size")),
          overlap: Number(f.get("overlap")),
          brightness_threshold: Number(f.get("threshold")),
          detect_shadows: shadows,
          feather: Number(f.get("feather")),
          target_crs: f.get("crs") || null,
          resolution: f.get("resolution") ? Number(f.get("resolution")) : null,
        }),
      });
      router.push("/analysis/" + result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start analysis");
    } finally {
      setBusy(false);
    }
  }
  const optical = (images.data || []).filter((i) => "nir" in i.bands);
  const imageOptions = (items: Raster[]) => [
    { value: "none", label: "None selected" },
    ...items.map((i) => ({ value: i.id, label: i.name })),
  ];
  return (
    <>
      <Title
        title="New investigation"
        description="Bring a real observation. Inspect its metadata. Choose an explicit reconstruction method."
      />
      {(images.error || models.error) && (
        <Failure
          message={images.error || models.error}
          retry={() => {
            images.refresh();
            models.refresh();
          }}
        />
      )}
      {error && <Failure message={error} />}
      <div className="se-two-columns">
        <section className="se-panel">
          <p className="se-eyebrow">01 / INGEST OBSERVATIONS</p>
          <h2>Upload GeoTIFF</h2>
          <form className="se-form" onSubmit={upload}>
            <label className="se-upload">
              <UploadCloud />
              <strong>Choose a georeferenced TIFF</strong>
              <span>CRS required · configured size limits apply</span>
              <input name="file" type="file" accept=".tif,.tiff" required />
            </label>
            <div className="se-field-grid">
              <label>
                Image role
                <SelectBox
                  label="Image role"
                  value={role}
                  onChange={setRole}
                  options={[
                    "cloudy",
                    "clear",
                    "mask",
                    "temporal",
                    "sentinel1",
                    "sentinel2",
                    "dem",
                    "synthetic",
                  ].map((value) => ({ value, label: value }))}
                />
              </label>
              <label>
                Sensor
                <input
                  name="sensor"
                  defaultValue="LISS-IV"
                  required
                  maxLength={60}
                />
              </label>
              <label>
                Acquisition date
                <input name="acquired_at" type="date" />
              </label>
            </div>
            <h3>Map the actual band indices</h3>
            <div className="se-field-grid">
              {bandNames.map((name, i) => (
                <label key={name}>
                  {name.toUpperCase()}
                  <input
                    name={name}
                    type="number"
                    min={1}
                    max={16}
                    defaultValue={i + 1}
                    required
                  />
                </label>
              ))}
            </div>
            <p className="se-meta">
              LISS-IV has Green, Red and NIR bands. Its preview uses false color
              NIR/Red/Green. A supplied mask uses 0 clear, 1 cloud and 2 shadow.
            </p>
            <button className="se-button primary" disabled={busy}>
              {busy ? "Working…" : "Upload & inspect"}
            </button>
          </form>
          <hr />
          <label>
            Or choose an uploaded observation
            <SelectBox
              label="Source observation"
              value={selected}
              onChange={setSelected}
              options={imageOptions(optical)}
            />
          </label>
          {chosen && (
            <div className="se-metadata">
              <img
                src={"/api/science/images/" + chosen.id + "/preview"}
                alt="Uploaded false-color observation"
              />
              <dl>
                <dt>Dimensions</dt>
                <dd>
                  {chosen.metadata.width} × {chosen.metadata.height}
                </dd>
                <dt>CRS</dt>
                <dd>{chosen.metadata.crs}</dd>
                <dt>Resolution</dt>
                <dd>
                  {chosen.metadata.resolution
                    .map((v) => number(v, 4))
                    .join(" × ")}{" "}
                  CRS units
                </dd>
                <dt>Bands / type</dt>
                <dd>
                  {chosen.metadata.count} / {chosen.metadata.dtype}
                </dd>
                <dt>NoData</dt>
                <dd>{String(chosen.metadata.nodata ?? "Not specified")}</dd>
                <dt>SHA-256</dt>
                <dd className="se-hash">{chosen.sha256}</dd>
              </dl>
            </div>
          )}
        </section>
        <section className="se-panel">
          <p className="se-eyebrow">02 / DESIGN THE ANALYSIS</p>
          <h2>Processing configuration</h2>
          <form className="se-form" onSubmit={run}>
            <label>
              Investigation name
              <input
                name="name"
                placeholder="Name your investigation"
                required
                maxLength={160}
              />
            </label>
            <label>
              Model
              <SelectBox
                label="Reconstruction model"
                value={model}
                onChange={setModel}
                options={(models.data || []).map((m) => ({
                  value: m.id,
                  label: m.name + (m.available ? "" : " — weights unavailable"),
                  disabled: !m.available,
                }))}
              />
            </label>
            <Notice>
              {chosenModel?.baseline
                ? "This is a non-generative baseline. It estimates missing values from clear spatial or temporal observations."
                : "Learned reconstruction requires a registered, compatible trained checkpoint."}
            </Notice>
            {(["mask", "temporal", "sentinel1", "reference"] as const).map(
              (key) => (
                <label key={key}>
                  {key === "sentinel1"
                    ? "Calibrated SAR (VV/VH)"
                    : key === "reference"
                      ? "Evaluation reference"
                      : key === "temporal"
                        ? "Temporal optical"
                        : "Supplied cloud mask"}
                  {chosenModel?.required_auxiliary.includes(key) &&
                    " · required"}
                  <SelectBox
                    label={key + " imagery"}
                    value={aux[key]}
                    onChange={(value) =>
                      setAux((a) => ({ ...a, [key]: value }))
                    }
                    options={imageOptions(
                      (images.data || []).filter((i) =>
                        key === "mask"
                          ? i.role === "mask"
                          : key === "sentinel1"
                            ? "vv" in i.bands
                            : "nir" in i.bands,
                      ),
                    )}
                  />
                </label>
              ),
            )}
            {aux.reference !== "none" && (
              <label>
                Reference relationship
                <SelectBox
                  label="Reference relationship"
                  value={relation}
                  onChange={setRelation}
                  options={[
                    { value: "none", label: "Choose the known relationship" },
                    {
                      value: "same-acquisition",
                      label: "Verified same-acquisition reference",
                    },
                    {
                      value: "synthetic-ground-truth",
                      label:
                        "Original clean image from synthetic contamination",
                    },
                    {
                      value: "temporal",
                      label: "Different-date comparison (no accuracy metrics)",
                    },
                  ]}
                />
              </label>
            )}
            <label>
              Study area
              <SelectBox
                label="Study area"
                value={area}
                onChange={setArea}
                options={[
                  { value: "none", label: "Entire source footprint" },
                  ...(areas.data || []).map((a) => ({
                    value: a.id,
                    label: a.name,
                  })),
                ]}
              />
            </label>
            <div className="se-field-grid">
              <label>
                Patch size
                <input
                  name="patch_size"
                  type="number"
                  defaultValue={256}
                  min={256}
                  max={512}
                  step={256}
                />
              </label>
              <label>
                Patch overlap
                <input
                  name="overlap"
                  type="number"
                  min={16}
                  max={128}
                  defaultValue={32}
                />
              </label>
              <label>
                Brightness threshold
                <input
                  name="threshold"
                  type="number"
                  min={0.4}
                  max={0.99}
                  step={0.01}
                  defaultValue={0.75}
                />
              </label>
              <label>
                Mask feathering (px)
                <input
                  name="feather"
                  type="number"
                  min={0}
                  max={16}
                  defaultValue={0}
                />
              </label>
            </div>
            <label className="se-switch-label">
              Detect candidate shadows
              <Switch checked={shadows} onCheckedChange={setShadows} />
            </label>
            <details>
              <summary>Output grid options</summary>
              <div className="se-field-grid">
                <label>
                  Target CRS
                  <input name="crs" placeholder="Keep source CRS" />
                </label>
                <label>
                  Resolution in target CRS units
                  <input
                    name="resolution"
                    type="number"
                    min={0.0000001}
                    step="any"
                    placeholder="Keep native resolution"
                  />
                </label>
              </div>
            </details>
            <p className="se-meta">
              Clear pixels are preserved on the processing grid. Reprojection
              resamples the source; reconstructed pixels are estimates.
            </p>
            <button
              className="se-button primary"
              disabled={busy || selected === "none" || !chosenModel?.available}
            >
              {busy ? "Submitting…" : "Run reconstruction"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
