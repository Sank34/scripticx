"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  Code,
  List,
  LayoutDashboard,
  Shield,
  User,
  Settings,
  LogOut,
  PanelLeft,
} from "lucide-react";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function AppSidebar() {
  const pathname = usePathname();

  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      if (!mounted) return;

      setUser(currentUser);

      if (!currentUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!mounted) return;

      setRole(profile?.role || "user");
      setUsername(profile?.username || null);

      const validAvatar =
        profile?.avatar_url &&
        profile.avatar_url.startsWith("http");

      setAvatar(validAvatar ? profile.avatar_url : null);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setUsername(null);
        setAvatar(null);
        return;
      }

      supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          setRole(data?.role || "user");
          setUsername(data?.username || null);

          const validAvatar =
            data?.avatar_url &&
            data.avatar_url.startsWith("http");

          setAvatar(validAvatar ? data.avatar_url : null);
        });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();

    setUser(null);
    setRole(null);
    setUsername(null);
    setAvatar(null);

    window.location.href = "/login";
  }

  const initial = (username || user?.email || "U")[0]?.toUpperCase();

  function NavItem({ href, icon: Icon, label, active }: any) {
    const content = (
      <Link href={href}>
        <Button
          variant={active ? "secondary" : "ghost"}
          className={`w-full gap-2 ${
            collapsed ? "justify-center px-2" : "justify-start"
          }`}
        >
          <Icon size={18} />
          {!collapsed && label}
        </Button>
      </Link>
    );

    if (!collapsed) return content;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r">

      <SidebarContent>

        {/* HEADER */}
        <div className="flex items-center justify-between px-3 py-3">

          {!collapsed && (
            <span className="font-bold text-lg">
              Scripticx
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <PanelLeft
              size={18}
              className={`transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </Button>

        </div>

        {/* NAV */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
          )}

          <SidebarGroupContent className="space-y-1">

            <NavItem
              href="/editor"
              icon={Code}
              label="Editor"
              active={pathname === "/editor"}
            />

            <NavItem
              href="/problems"
              icon={List}
              label="Problems"
              active={pathname === "/problems"}
            />

            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === "/dashboard"}
            />

            {role === "admin" && (
              <NavItem
                href="/admin"
                icon={Shield}
                label="Admin"
                active={pathname.startsWith("/admin")}
              />
            )}

          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="p-3">

        {user ? (
          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <div
                className={`flex items-center gap-3 cursor-pointer hover:bg-muted/70 p-2 rounded-md transition ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <Avatar className="w-8 h-8">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>

                {!collapsed && (
                  <div className="text-sm truncate">
                    {username || user.email}
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">

              {/* USER HEADER */}
              <DropdownMenuLabel className="flex items-center gap-3 py-3">
                <Avatar className="w-9 h-9">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col leading-tight">
                  <span className="font-medium">
                    {username || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User size={16} />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings size={16} />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-red-500"
              >
                <LogOut size={16} />
                Log out
              </DropdownMenuItem>

            </DropdownMenuContent>

          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button className="w-full">
              {collapsed ? "→" : "Login"}
            </Button>
          </Link>
        )}

      </SidebarFooter>

    </Sidebar>
  );
}