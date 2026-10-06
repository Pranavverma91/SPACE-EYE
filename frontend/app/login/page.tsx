import AuthForm from "@/components/science/auth-form";
import { chatGPTSignInPath } from "../chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      mode="login"
      token={typeof p.token === "string" ? p.token : undefined}
      returnTo={typeof p.return_to === "string" ? p.return_to : undefined}
      signInHref={
        process.env.SPACE_EYE_STANDALONE === "true"
          ? undefined
          : chatGPTSignInPath(
              typeof p.return_to === "string" &&
                p.return_to.startsWith("/workspace")
                ? p.return_to
                : "/workspace",
            )
      }
    />
  );
}
