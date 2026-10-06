import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import ObservatoryWorkspace from "@/components/observatory-workspace";
import { workspaceReturnTo } from "@/lib/workspace-navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Workspace — SPACE EYE", robots: {index: false, follow: false} };

async function SignedInWorkspace({ returnTo }: { returnTo: string }) {
  const user = await requireChatGPTUser(returnTo);
  return <ObservatoryWorkspace profile={{name: user.displayName, email: user.email}}/>;
}

export default async function Workspace({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const returnTo = workspaceReturnTo(`/workspace?view=${typeof params.view === "string" ? encodeURIComponent(params.view) : "overview"}`);
  return <SignedInWorkspace returnTo={returnTo}/>;
}
