// Provider-neutral release gate. Reads environment, never prints its values.
const role = process.argv[2];
const failures = [];
const hasProviderSecret = () => Object.keys(process.env).some(key =>
  /^(?:OPENROUTER_API_KEY(?:_[1-5])?|AI_KEY_[1-5]|AI_API_KEY_[1-5])$/.test(key) && process.env[key]);
const need = name => { if (!process.env[name]?.trim()) failures.push(`${name}: required`); };
const num = (name, fallback) => Number(process.env[name] ?? fallback);
const origin = name => {
  need(name);
  try { const u = new URL(process.env[name]); if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) throw Error(); }
  catch { failures.push(`${name}: invalid origin`); }
};
if (role === "frontend") {
  origin("FIRE_SAFETY_API_BASE_URL");
  need("FIRE_SAFETY_MAX_EXECUTION_SECONDS");
  const api = num("FIRE_SAFETY_API_TIMEOUT_SECONDS", 75), ai = num("FIRE_SAFETY_AI_TIMEOUT_SECONDS", 60), ceiling = num("FIRE_SAFETY_MAX_EXECUTION_SECONDS", NaN);
  if (![api, ai, ceiling].every(Number.isInteger) || api < ai + 15 || api + 5 > ceiling) failures.push("incompatible actual host/AI/proxy timeout budget");
  if (Object.keys(process.env).some(key => /^NEXT_PUBLIC_/.test(key) && /KEY|TOKEN|SECRET|PASSWORD|CONNECTION|CREDENTIAL/i.test(key))) failures.push("public secret-shaped environment variable prohibited");
  if (hasProviderSecret() || process.env.ConnectionStrings__FireSafetyDb) failures.push("provider/SQL secrets do not belong in frontend");
} else if (role === "api") {
  need("ConnectionStrings__FireSafetyDb"); origin("VulcanX__BaseUrl");
  if (process.env.HabitatSubmission__Enabled === "true") failures.push("Habitat must remain disabled until independent approval and adapter validation");
  if (hasProviderSecret()) failures.push("provider key belongs only in Bun");
} else if (role === "ai") {
  need("OPENROUTER_API_KEY_1");
  if ((process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1") !== "https://openrouter.ai/api/v1") failures.push("unapproved provider destination");
  if (process.env.ConnectionStrings__FireSafetyDb) failures.push("SQL secret does not belong in Bun");
} else failures.push("usage: node preflight.mjs frontend|api|ai");
console.log(JSON.stringify({ role, ready: failures.length === 0, checks: failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
