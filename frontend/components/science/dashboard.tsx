"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, number, useResource } from "@/lib/science/client";
import type { Dashboard, Analysis } from "@/lib/science/types";
import {
  Title,
  Failure,
  Loading,
  Empty,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./primitives";
const GeoMap = dynamic(() => import("./geo-map"), { ssr: false });
export function AnalysisTable({ rows }: { rows: Analysis[] }) {
  return rows.length ? (
    <div className="se-table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Investigation</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cloud</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link className="se-text-link" href={"/analysis/" + a.id}>
                  {a.name}
                </Link>
              </TableCell>
              <TableCell>{a.model_id}</TableCell>
              <TableCell>
                <Badge>{a.status}</Badge>
              </TableCell>
              <TableCell>
                {a.result ? number(a.result.cloud_percent) + "%" : "—"}
              </TableCell>
              <TableCell>
                {new Date(a.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <Empty title="Your first investigation starts here">
      Upload a georeferenced observation to build your research archive.
    </Empty>
  );
}
export default function DashboardPage() {
  const { data, error, loading, refresh } = useResource<Dashboard>(
    "/dashboard",
    15000,
  );
  return (
    <>
      <Title
        title="A clearer view of Earth."
        description="Your observations, processing activity and research results."
        action={
          <Link className="se-button primary" href="/analysis/new">
            New analysis
          </Link>
        }
      />
      {error ? (
        <Failure message={error} retry={refresh} />
      ) : loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="se-stats">
            {[
              ["Uploaded imagery", data.images, "source observations"],
              ["Completed analyses", data.completed, "traceable results"],
              ["In processing", data.processing, "active jobs"],
              [
                "Processed area",
                number(data.processed_area_m2 / 1e6),
                "km² · includes repeated coverage",
              ],
            ].map(([label, value, note]) => (
              <article className="se-panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <div className="se-dashboard-grid">
            <section className="se-panel">
              <div className="se-panel-heading">
                <h2>Your geographic context</h2>
                <Link href="/explorer">Open explorer</Link>
              </div>
              <GeoMap
                analysisId={
                  data.recent.find((a) => a.status === "Completed")?.id
                }
                bounds={
                  data.recent.find((a) => a.result)?.result?.metadata.bounds
                }
                height={360}
              />
            </section>
            <section className="se-panel">
              <p className="se-eyebrow">PROCESSING INTELLIGENCE</p>
              <h2>Cloud coverage</h2>
              {data.cloud_coverage.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={data.cloud_coverage}>
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} unit="%" stroke="#78909f" />
                    <Tooltip
                      contentStyle={{
                        background: "#0d1b2a",
                        border: "1px solid #263d4d",
                      }}
                    />
                    <Area
                      dataKey="percent"
                      name="Cloud pixels"
                      stroke="#27d8e8"
                      fill="#27d8e822"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty title="No coverage measurements">
                  Coverage is calculated from completed cloud masks.
                </Empty>
              )}
              <div className="se-model-summary">
                {data.models.map((m) => (
                  <div key={m.id}>
                    <span>{m.name}</span>
                    <Badge>
                      {m.available ? "Available" : "Weights needed"}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="se-panel">
            <div className="se-panel-heading">
              <h2>Recent investigations</h2>
              <Link href="/history">View history</Link>
            </div>
            <AnalysisTable rows={data.recent} />
          </section>
        </>
      )}
    </>
  );
}
