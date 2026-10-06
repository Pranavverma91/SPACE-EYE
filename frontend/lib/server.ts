import { env } from "@/lib/runtime-env";
import { ApiError } from "./api-error";
export { ApiError } from "./api-error";
export function bindings() {
    const e = env as unknown as {
        DB?: D1Database;
        BUCKET?: R2Bucket;
    };
    if (!e.DB || !e.BUCKET)
        throw new ApiError(503, "The observation archive is temporarily unavailable. Please try again.");
    return { db: e.DB, bucket: e.BUCKET };
}
export async function identity(req: Request) {
    if (process.env.SPACE_EYE_STANDALONE === "true") throw new ApiError(503, "The legacy archive requires the hosted Sites environment.");
    const uid = req.headers.get("oai-authenticated-user-id");
    const email = req.headers.get("oai-authenticated-user-email");
    if (!uid || !email)
        throw new ApiError(401, "Sign in to analyze imagery and open your private observation archive.");
    const raw = uid;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const owner = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    let name = req.headers.get("oai-authenticated-user-full-name") || email?.split("@")[0] || "Researcher";
    if (req.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
        try {
            name = decodeURIComponent(name);
        }
        catch { }
    }
    return { owner, name, email: email || null };
}
export function sameOrigin(req: Request) {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
        throw new ApiError(403, "This request must come from your observation workspace.");
}
export function fail(error: unknown) {
    if (error instanceof ApiError)
        return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    console.error("SPACE EYE request failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "We could not complete this request. Your inputs are still here; please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
export async function readAnalysis(req: Request, id: string) {
    const { owner } = await identity(req), { db, bucket } = bindings();
    const row = await db.prepare("SELECT payload FROM analyses WHERE id = ? AND owner = ?").bind(id, owner).first<{
        payload: string;
    }>();
    if (!row)
        throw new ApiError(404, "This observation could not be found.");
    return { analysis: JSON.parse(row.payload), owner, db, bucket };
}
