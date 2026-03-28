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
  MessageSquare,
  Search,
  Trophy,
  Code,
  List,
  LayoutDashboard,
  Shield,
  User,
  Settings,
  LogOut,
  PanelLeft,
  BookOpen,
  ChevronDown,
} from "lucide-react";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [openDocs, setOpenDocs] = useState(false);
  const [manualToggle, setManualToggle] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      if (!active) return;

      setUser(currentUser);

      if (!currentUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!active) return;

      setRole(profile?.role || "user");
      setUsername(profile?.username || null);

      const validAvatar =
        profile?.avatar_url &&
        profile.avatar_url.startsWith("http");

      setAvatar(validAvatar ? profile.avatar_url : null);
    }

    load();

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
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/learn") && !manualToggle) {
      setOpenDocs(true);
    }
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
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

  function SubItem({ href, label }: any) {
    const active = pathname === href;

    return (
      <Link href={href}>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start pl-8 text-sm"
        >
          {label}
        </Button>
      </Link>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>

        <div className="flex items-center justify-between px-3 py-3">
          {!collapsed && <span className="font-bold text-lg">Scripticx</span>}

          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <PanelLeft
              size={18}
              className={`transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Platform</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">
            { user && (
              <NavItem href="/editor" icon={Code} label="Editor" active={pathname.startsWith("/editor")} />
            )}
            <NavItem href="/problems" icon={List} label="Problems" active={pathname.startsWith("/problems")} />
            <NavItem href="/leaderboard" icon={Trophy} label="Leaderboard" active={pathname.startsWith("/leaderboard")} />
            {user && (
              <NavItem href="/feed" icon={MessageSquare} label="Feed" active={pathname.startsWith("/feed")} />
            )}
            {user && (
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname.startsWith("/dashboard")} />
            )}
            {user && (
              <NavItem href="/search" icon={Search} label="Search" active={pathname.startsWith("/search")} />
            )}
            {role === "admin" && (
              <NavItem href="/admin" icon={Shield} label="Admin" active={pathname.startsWith("/admin")} />
            )}

          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Learn</SidebarGroupLabel>}

          <SidebarGroupContent className="space-y-1">

            <div
              onMouseEnter={() => {
                if (!manualToggle) setOpenDocs(true);
              }}
              onMouseLeave={() => {
                if (!manualToggle) setOpenDocs(false);
              }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <NavItem
                  href="/learn"
                  icon={BookOpen}
                  label="Docs"
                  active={pathname.startsWith("/learn")}
                />

                {!collapsed && (
                  <button
                    onClick={() => {
                      setOpenDocs((prev) => !prev);
                      setManualToggle(true);
                    }}
                    className="mr-2 p-1 hover:bg-muted rounded"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        openDocs ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {!collapsed && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openDocs ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-2 border-l pl-2 space-y-1">
                    <SubItem href="/learn/basics" label="Basics" />
                    <SubItem href="/learn/variables" label="Variables" />
                    <SubItem href="/learn/loops" label="Loops" />
                    <SubItem href="/learn/input-output" label="Input / Output" />
                  </div>
                </div>
              )}

            </div>

          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      <div className="border-b mt-4" />
      <SidebarFooter className="p-3">
        {user ? (
          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <div className={`flex items-center gap-3 cursor-pointer hover:bg-muted/70 p-2 rounded-md transition ${collapsed ? "justify-center" : ""}`}>
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

              <DropdownMenuLabel className="flex items-center gap-3 py-3">
                <Avatar className="w-9 h-9">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{username || "User"}</span>
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

              <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-500">
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