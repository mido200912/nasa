import "server-only";
import { isIP } from "node:net";

// Only enable when the approved edge overwrites this header and Next's ingress
// cannot be reached except through that edge. X-Forwarded-For is never trusted here.
export function trustedClientIp(headers: Headers): string | null {
  if (process.env.FIRE_SAFETY_TRUST_EDGE_CLIENT_IP !== "true") return null;
  const value = headers.get("x-flame-client-ip")?.trim();
  return value && isIP(value) ? value : null;
}
