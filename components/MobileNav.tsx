"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Code,
  Trophy,
  Search,
  User,
} from "lucide-react";

const items = [
  { href: "/dashboard", icon: Home },
  { href: "/problems", icon: Code },
  { href: "/leaderboard", icon: Trophy },
  { href: "/search", icon: Search },
  { href: "/profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="grid grid-cols-5">

        {items.map((item, i) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={i}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}

      </div>
    </div>
  );
}
