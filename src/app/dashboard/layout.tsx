import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/dashboard-data";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Briefcase,
  Trophy,
  Users,
  TrendingUp,
  Sparkles,
  Mail,
  Rocket,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/achievements", label: "Achievements", icon: Trophy },
  { href: "/dashboard/network", label: "Network", icon: Users },
  { href: "/dashboard/promotion", label: "Promotion", icon: TrendingUp },
  { href: "/dashboard/skills", label: "Skills", icon: Sparkles },
  { href: "/dashboard/briefs", label: "Weekly Brief", icon: Mail },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/login");
  }
  if (!profile?.onboarded) {
    redirect("/onboarding");
  }

  const initial = (profile.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Rocket className="h-5 w-5" />
            <span className="text-base font-semibold">Launchpad</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {profile.name ?? user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.target_role ?? "No goal set"}
              </p>
            </div>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">
            {profile.target_role ?? "Set a goal"} · {profile.timeline ?? "no timeline"}
          </span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
