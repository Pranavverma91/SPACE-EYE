import { redirect } from "next/navigation";
import { researchUser } from "@/lib/science/server";
import { getChatGPTUser } from "../chatgpt-auth";
import Shell from "@/components/science/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await researchUser(),
    sso = await getChatGPTUser();
  if (!user && !sso) redirect("/login?return_to=/dashboard");
  return (
    <Shell
      name={user?.name || sso?.displayName || "Researcher"}
      research={!!user}
    >
      {children}
    </Shell>
  );
}
