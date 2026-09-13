export function isEmailVerificationCallback(search: string, hash: string) {
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const hashParams = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash
  );

  return (
    searchParams.get("flow") === "verification" ||
    searchParams.get("type") === "signup" ||
    hashParams.get("type") === "signup"
  );
}
