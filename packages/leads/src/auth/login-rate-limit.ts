import { createRateLimiter } from "../rate-limit";

/**
 * Admin login throttle — keyed by IP and by IP+email so one attacker cannot
 * spray many accounts from one address, and one account cannot be hammered
 * from many addresses without eventually hitting the IP bucket too.
 */

export const loginIpLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

export const loginEmailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8 });

export function checkLoginRateLimit(ip: string, email: string): void {
  loginIpLimiter.check(`ip:${ip}`);
  loginEmailLimiter.check(`email:${ip}:${email.trim().toLowerCase()}`);
}

/** Test seam. */
export function resetLoginRateLimiter(): void {
  loginIpLimiter.reset();
  loginEmailLimiter.reset();
}
