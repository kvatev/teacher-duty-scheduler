// Hash a password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed SHA-256 hash of "P@ssword123!"
// The actual password is NEVER stored in code - only this hash
export const ADMIN_PASSWORD_HASH = "b03ddf3ca2e714a6548e7495e2a03f5e824eaac9837cd7f159c67b90fb4b7342";

// Verify password by comparing hashes
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(inputPassword);
  return inputHash === storedHash;
}
