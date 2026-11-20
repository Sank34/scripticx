import { getRepositoryListMetadata } from "@/lib/server/repository-metadata";

export const generateMetadata = getRepositoryListMetadata;

export default function RepositoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
