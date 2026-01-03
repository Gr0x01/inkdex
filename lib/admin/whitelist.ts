/**
 * Admin Email Whitelist
 *
 * Production-ready admin authorization via email whitelist.
 * Only these emails can access the admin panel.
 */

export const ADMIN_EMAILS = [
  'rbaten@gmail.com',
  'gr0x01@pm.me',
] as const;

export type AdminEmail = (typeof ADMIN_EMAILS)[number];

/**
 * Check if an email is authorized for admin access
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(
    email.toLowerCase() as AdminEmail
  );
}
