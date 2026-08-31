import 'server-only';

import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { generateOtpCode } from '@/lib/auth/tokens';
import { OtpPurpose } from '@/generated/prisma';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export interface IssuedOtp {
  /**
   * Present ONLY when no SMS/email provider is configured, so a developer can
   * complete the flow locally. It is never returned to the browser — see the
   * route handler, which logs it server-side instead.
   */
  devCode?: string;
}

/**
 * Issues an OTP challenge. The code itself is hashed before storage and is
 * never logged in production or returned through the API.
 */
export async function issueOtp(
  identifier: string,
  purpose: OtpPurpose,
  userId?: string | null,
): Promise<IssuedOtp> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  // Invalidate any outstanding challenge for this identifier + purpose so an
  // older code cannot be replayed after a resend.
  await prisma.otpChallenge.updateMany({
    where: { identifier, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpChallenge.create({
    data: {
      identifier,
      purpose,
      userId: userId ?? null,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  // A real deployment plugs an SMS/email provider in here. Until then the code
  // goes to the server log only — never to the client.
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[otp] ${purpose} code for ${identifier}: ${code}`);
    return { devCode: code };
  }

  console.info(`[otp] issued ${purpose} challenge for ${identifier}`);
  return {};
}

export type OtpResult =
  | { ok: true; userId: string | null }
  | { ok: false; reason: string };

/**
 * Verifies a submitted code. Attempts are counted on the challenge row, and
 * the challenge is consumed on success so a code works exactly once.
 */
export async function verifyOtp(
  identifier: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      codeHash: true,
      expiresAt: true,
      attempts: true,
      maxAttempts: true,
      userId: true,
    },
  });

  if (!challenge) {
    return { ok: false, reason: 'That code is not valid. Request a new one.' };
  }
  if (challenge.expiresAt < new Date()) {
    return { ok: false, reason: 'That code has expired. Request a new one.' };
  }
  if (challenge.attempts >= challenge.maxAttempts) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      reason: 'Too many incorrect attempts. Request a new code.',
    };
  }

  const matches = await bcrypt.compare(code, challenge.codeHash);

  if (!matches) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = challenge.maxAttempts - challenge.attempts - 1;
    return {
      ok: false,
      reason:
        remaining > 0
          ? `That code is not correct. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : 'That code is not correct. Request a new one.',
    };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, userId: challenge.userId };
}

export async function pruneExpiredOtps(): Promise<number> {
  const result = await prisma.otpChallenge.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return result.count;
}
