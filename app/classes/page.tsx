"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Plus, Users, Link as LinkIcon } from "lucide-react";

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data: memberships } = await supabase
      .from("class_members")
      .select("class_id, role")
      .eq("user_id", user.id);

    const ids = memberships?.map((m) => m.class_id) || [];

    let data: any[] = [];

    if (ids.length) {
      const res = await supabase
        .from("classes")
        .select("*")
        .in("id", ids);

      data = res.data || [];
    }

    const enriched = data.map((cls) => {
      const m = memberships?.find((x) => x.class_id === cls.id);
      return {
        ...cls,
        role: m?.role || "student",
      };
    });

    setClasses(enriched);
    setLoading(false);
  }

  async function createClass() {
    if (!name.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const inviteCode = Math.random().toString(36).substring(2, 8);

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name,
        teacher_id: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (error || !data) return;

    await supabase.from("class_members").insert({
      class_id: data.id,
      user_id: user.id,
      role: "teacher",
    });

    setClasses((prev) => [data, ...prev]);
    setOpen(false);
    setName("");
  }

  async function joinClass() {
    if (!joinCode.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data: cls } = await supabase
      .from("classes")
      .select("*")
      .eq("invite_code", joinCode)
      .maybeSingle();

    if (!cls) return;

    await supabase.from("class_members").insert({
      class_id: cls.id,
      user_id: user.id,
      role: "student",
    });

    setClasses((prev) => [cls, ...prev]);
    setJoinCode("");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">
            Manage and join your coding classes
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="flex gap-2">
          <Plus size={16} />
          Create Class
        </Button>
      </div>

      {/* Join */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon size={16} />
            Join with code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Enter invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <Button onClick={joinClass}>Join</Button>
        </CardContent>
      </Card>

      {/* Classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div>Loading...</div>}

        {!loading && classes.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No classes yet
          </p>
        )}

        {classes.map((cls) => (
          <Card
            key={cls.id}
            onClick={() => router.push(`/classes/${cls.id}`)}
            className="hover:scale-[1.02] transition cursor-pointer"
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{cls.name}</h2>
                <Users size={16} />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-mono">
                  {cls.invite_code}
                </p>
                <span className={`text-[10px] px-2 py-[2px] rounded ${
                  cls.role === "teacher"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {cls.role === "teacher" ? "Teacher" : "Student"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <DialogFooter>
            <Button onClick={createClass}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}