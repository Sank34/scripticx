import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserAvatarProps = {
  avatarUrl?: string | null;
  className?: string;
  email?: string | null;
  username?: string | null;
};

export function UserAvatar({
  avatarUrl,
  className,
  email,
  username,
}: UserAvatarProps) {
  const initial = (username || email || "U")[0]?.toUpperCase() || "U";

  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}
