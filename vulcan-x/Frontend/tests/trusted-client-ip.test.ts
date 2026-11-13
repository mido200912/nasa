import { afterEach, expect, it, vi } from "vitest";
import { trustedClientIp } from "@/lib/server/trusted-client-ip";
afterEach(() => vi.unstubAllEnvs());
it("ignores arbitrary forwarding headers by default", () => {
  vi.stubEnv("FIRE_SAFETY_TRUST_EDGE_CLIENT_IP", "");
  expect(trustedClientIp(new Headers({ "x-forwarded-for": "1.2.3.4", "x-flame-client-ip": "1.2.3.4" }))).toBeNull();
});
it("only forwards one valid edge-owned IP when explicitly configured", () => {
  vi.stubEnv("FIRE_SAFETY_TRUST_EDGE_CLIENT_IP", "true");
  expect(trustedClientIp(new Headers({ "x-flame-client-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  expect(trustedClientIp(new Headers({ "x-flame-client-ip": "1.2.3.4, 5.6.7.8" }))).toBeNull();
  expect(trustedClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
});
