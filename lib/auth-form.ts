export function readAuthFormCredentials(data: FormData) {
  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value : "";
  };
  return { email: text("email").trim(), password: text("password"), username: text("username").trim() };
}
