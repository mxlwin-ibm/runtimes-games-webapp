// Resolve the ?event= query param (e.g. "cricket") to a canonical name from
// `options` (e.g. "Cricket"). Falls back to `fallback` if absent or unknown.
export const resolveEventParam = (search, options, fallback) => {
  const value = new URLSearchParams(search).get("event");
  if (!value) return fallback;
  return options.find((o) => o.toLowerCase() === value.toLowerCase()) ?? fallback;
};
