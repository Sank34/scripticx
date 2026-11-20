import { getRepositoryMetadata } from "@/lib/server/repository-metadata";

export const generateMetadata = getRepositoryMetadata;

export default function RepositoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
