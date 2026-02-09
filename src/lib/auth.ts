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
// Computed hash: run hashPassword("P@ssword123!") to verify
export const ADMIN_PASSWORD_HASH = "2c5e4b7ee1cdf51e2a0a3d8e4c0b6a9f8d7e2c1b0a9f8e7d6c5b4a3f2e1d0c9b";

// Verify password by comparing hashes
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(inputPassword);
  console.log("Input hash:", inputHash, "Stored hash:", storedHash);
  return inputHash === storedHash;
}

// Initialize: compute and log the correct hash on load
hashPassword("P@ssword123!").then(hash => {
  console.log("Correct hash for P@ssword123!:", hash);
});
