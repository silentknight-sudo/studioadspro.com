// Client-side password hashing. This is NOT a substitute for server-side auth,
// but it ensures credentials are never stored or compared in plaintext.
const PEPPER = 'studioadspro-crm-v1';

export async function hashPassword(rawPassword: string): Promise<string> {
  const data = new TextEncoder().encode(`${PEPPER}:${rawPassword}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(rawPassword: string, storedHash: string): Promise<boolean> {
  const computed = await hashPassword(rawPassword);
  return computed === storedHash;
}
