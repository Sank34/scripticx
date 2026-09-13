"use client";
import { usePathname } from 'next/navigation';
import { isGameRoute } from '@/lib/game-routes';
export function PlayShellBoundary({ children, game }: { children: React.ReactNode; game: React.ReactNode }) {
  return isGameRoute(usePathname()) ? <main className="h-dvh w-full overflow-hidden bg-background">{game}</main> : children;
}
export function OutsideGame({ children }: { children: React.ReactNode }) {
  return isGameRoute(usePathname()) ? null : children;
}
