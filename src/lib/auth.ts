import { supabase } from "@/integrations/supabase/client";

// Hash a password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fallback hash (used only if DB lookup fails)
const FALLBACK_HASH = "c4ac81b4b37ebb96f1cc6031d2cdeeeb21f8e3223cbbafa0144876c1f6c238a2";

// Get the current admin password hash from DB
export async function getAdminPasswordHash(): Promise<string> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "admin_password_hash")
    .single();

  if (error || !data?.value) {
    return FALLBACK_HASH;
  }
  return data.value;
}

// Verify password against stored hash
export async function verifyPassword(inputPassword: string): Promise<boolean> {
  const storedHash = await getAdminPasswordHash();
  const inputHash = await hashPassword(inputPassword);
  return inputHash === storedHash;
}

// Change admin password
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await verifyPassword(currentPassword);
  if (!isValid) {
    return { success: false, error: "Текущата парола е грешна" };
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from("app_settings")
    .update({ value: newHash, updated_at: new Date().toISOString() })
    .eq("key", "admin_password_hash");

  if (error) {
    return { success: false, error: "Грешка при запазване на новата парола" };
  }

  return { success: true };
}
