import { redirect } from "next/navigation";

export default function LegacyLiveCodePage() {
  redirect("/editor?view=live");
}
