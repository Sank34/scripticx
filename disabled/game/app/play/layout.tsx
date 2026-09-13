import { createPageMetadata } from '@/lib/metadata';
export const metadata = createPageMetadata({ title: 'Playground', description: 'Explore the ScripticX island with Mousey.', path: '/play', noIndex: true });
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
