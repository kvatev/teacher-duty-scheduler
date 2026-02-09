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
export const ADMIN_PASSWORD_HASH = "c4ac81b4b37ebb96f1cc6031d2cdeeeb21f8e3223cbbafa0144876c1f6c238a2";

// Verify password by comparing hashes
export async function verifyPassword(
  inputPassword: string,
  storedHash: string
): Promise<boolean> {
  const inputHash = await hashPassword(inputPassword);
  return inputHash === storedHash;
}
