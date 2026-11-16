import { describe, expect, it } from "vitest";
import { safeOrigin } from "@/lib/server/origin";

const request = (target: string, origin?: string, extra: Record<string, string> = {}) =>
  new Request(target, {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), ...extra },
  });

describe("safeOrigin (Render TLS termination / CSRF)", () => {
  const render = { renderExternalUrl: "https://rh-desk.onrender.com" };

  it("accepts the public HTTPS origin even when the backend request URL uses HTTP", () => {
    expect(safeOrigin(request(
      "http://rh-desk.onrender.com/api/auth/login",
      "https://rh-desk.onrender.com",
    ), render)).toBe(true);
    expect(safeOrigin(request(
      "http://10.26.51.105:10000/api/workspace",
      "https://rh-desk.onrender.com",
    ), render)).toBe(true);
  });

  it("rejects a different HTTPS origin even with forged proxy headers", () => {
    expect(safeOrigin(request(
      "http://10.26.51.105:10000/api/auth/logout",
      "https://evil.example",
      { "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
    ), render)).toBe(false);
  });

  it("rejects missing, null and malformed origin headers", () => {
    expect(safeOrigin(request("https://rh-desk.onrender.com/api/auth/login"), render)).toBe(false);
    expect(safeOrigin(request("https://rh-desk.onrender.com/api/auth/login", "null"), render)).toBe(false);
    expect(safeOrigin(request("https://rh-desk.onrender.com/api/auth/login", "https://rh-desk.onrender.com.evil.example"), render)).toBe(false);
    expect(safeOrigin(request("https://rh-desk.onrender.com/api/auth/login", "https://rh-desk.onrender.com/path"), render)).toBe(false);
  });

  it("supports a deployment-controlled custom domain and rejects the old host", () => {
    const cfg = { ...render, publicOrigin: "https://rh.bios-expertise.com" };
    expect(safeOrigin(request(
      "http://internal:10000/api/workspace",
      "https://rh.bios-expertise.com",
    ), cfg)).toBe(true);
    expect(safeOrigin(request(
      "http://internal:10000/api/workspace",
      "https://rh-desk.onrender.com",
    ), cfg)).toBe(false);
  });

  it("fails closed on an invalid deployment setting", () => {
    expect(safeOrigin(request(
      "https://rh-desk.onrender.com/api/auth/login",
      "https://rh-desk.onrender.com",
    ), { publicOrigin: "not-a-valid-url" })).toBe(false);
  });

  it("allows ordinary same-origin local development", () => {
    expect(safeOrigin(request(
      "http://localhost:3000/api/auth/login",
      "http://localhost:3000",
    ), {})).toBe(true);
    expect(safeOrigin(request(
      "http://localhost:3000/api/auth/login",
      "https://attacker.example",
    ), {})).toBe(false);
  });
});
