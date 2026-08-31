import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    // Still burn a comparison so that "account has no password" and
    // "wrong password" take comparable time.
    await bcrypt.compare(plain, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuu');
    return false;
  }
  return bcrypt.compare(plain, hash);
}
