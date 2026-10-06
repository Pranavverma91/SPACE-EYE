"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  ScanLine,
  Layers,
  Database,
  FlaskConical,
  History,
  Settings,
  BookOpen,
  LogOut,
  Search,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Brand, Notice } from "./primitives";
import { api } from "@/lib/science/client";
const nav = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/explorer", "Earth explorer", Globe],
  ["/analysis/new", "New analysis", ScanLine],
  ["/reconstructions", "Reconstructions", Layers],
  ["/datasets", "Datasets", Database],
  ["/models", "Model registry", Layers],
  ["/models/lab", "Model laboratory", FlaskConical],
  ["/history", "Analysis history", History],
  ["/settings", "Settings", Settings],
  ["/research", "Research", BookOpen],
] as const;
export default function Shell({
  children,
  name,
  research,
}: {
  children: React.ReactNode;
  name: string;
  research: boolean;
}) {
  const pathname = usePathname(),
    router = useRouter();
  return (
    <div className="se-app">
      <SidebarProvider>
        <Sidebar className="se-sidebar">
          <SidebarHeader>
            <Brand />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <p className="se-eyebrow">RESEARCH WORKSPACE</p>
              <SidebarMenu>
                {nav.map(([href, label, Icon]) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            <div className="se-sidebar-note">
              <OrbitBadge />
              <p>
                Real observations.
                <br />
                Reproducible research.
              </p>
              <Link href="/workspace">Sentinel-2 workspace</Link>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <span className="se-profile">
              {name}
              <small>{research ? "Research account" : "ChatGPT account"}</small>
            </span>
            {research ? (
              <button
                onClick={async () => {
                  await api("/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <a href="/signout-with-chatgpt?return_to=/" target="_top">
                Sign out
              </a>
            )}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="se-topbar">
            <SidebarTrigger />
            <span>
              Earth observation /{" "}
              <b>{nav.find((n) => n[0] === pathname)?.[1] || "Analysis"}</b>
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                router.push(
                  "/history?q=" + encodeURIComponent(String(q || "")),
                );
              }}
            >
              <Search size={16} />
              <input
                name="q"
                aria-label="Search analyses"
                placeholder="Search analyses…"
              />
            </form>
            <span className="se-badge">RESEARCH EDITION</span>
          </header>
          {!research && (
            <Notice>
              Your observation account is connected.{" "}
              <Link href="/login">Sign in to the research service</Link> to
              upload GeoTIFFs and run cloud reconstruction.
            </Notice>
          )}
          <main className="se-main">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
function OrbitBadge() {
  return <Globe size={28} />;
}
