"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function EditorSnippetPage() {
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      const { data: snippet } = await supabase
        .from("snippets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      setData(snippet);

      if (snippet?.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", snippet.user_id)
          .maybeSingle();

        setProfile(prof);
      }
    }

    fetchData();
  }, [id]);

  if (!data) {
    return <div className="p-6">Snippet not found</div>;
  }

  const initial = profile?.username?.[0]?.toUpperCase() || "U";

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success("Code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/editor/${data.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {data.title || "Untitled"}
        </h1>

        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <Badge variant="secondary">Public</Badge>
          <span>
            {new Date(data.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} />
            )}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>

          <div>
            <Link
              href={`/u/${profile?.username}`}
              className="font-semibold hover:underline"
            >
              {profile?.username || "Unknown"}
            </Link>

            <p className="text-xs text-muted-foreground">
              Shared a snippet
            </p>
          </div>
        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
          >
            <Copy size={14} className="mr-2" />
            Copy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
          >
            <Share2 size={14} className="mr-2" />
            Share
          </Button>

          <Link href="/editor">
            <Button size="sm">
              <ExternalLink size={14} className="mr-2" />
              Open Editor
            </Button>
          </Link>

        </div>

      </div>

      {data.description && (
        <p className="text-muted-foreground">
          {data.description}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Code</CardTitle>
        </CardHeader>

        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto whitespace-pre-wrap break-words">
            {data.code}
          </pre>
        </CardContent>
      </Card>

    </div>
  );
}