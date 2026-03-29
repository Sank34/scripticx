export function getLocalized(obj: any, locale: string) {
  if (!obj) return "";

  return (
    obj[locale] ||
    obj.en ||
    Object.values(obj)[0] ||
    ""
  );
}