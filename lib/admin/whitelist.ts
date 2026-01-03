/**
 * Admin Email Whitelist
 *
 * Production-ready admin authorization via email whitelist.
 * Only these emails can access the admin panel.
 *
 * Configuration:
 * - Set ADMIN_EMAIL_WHITELIST in environment variables
 * - Format: Comma-separated list of emails
 * - Example: "admin@example.com,another@example.com"
 * - Falls back to hardcoded defaults in development only
 *
 * Security:
 * - Environment variable must be set in production (Vercel)
 * - No fallback in production to prevent accidental exposure
 */

// Parse admin emails from environment variable
function getAdminEmails(): readonly string[] {
  const envEmails = process.env.ADMIN_EMAIL_WHITELIST;

  // Email format validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (envEmails) {
    // Parse comma-separated list
    const emails = envEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => {
        if (!email) return false;

        // Validate email format
        if (!emailRegex.test(email)) {
          console.error(`[Admin Whitelist] Invalid email format: "${email}"`);
          throw new Error(
            `Invalid email in ADMIN_EMAIL_WHITELIST: "${email}"`
          );
        }

        return true;
      });

    if (emails.length === 0) {
      console.error('[Admin Whitelist] ADMIN_EMAIL_WHITELIST is empty');
      throw new Error('ADMIN_EMAIL_WHITELIST must contain at least one email');
    }

    return emails;
  }

  // Fallback only when running locally (not on Vercel at all)
  // VERCEL_ENV is undefined only in local development
  // This prevents bypass via NODE_ENV manipulation in preview deployments
  if (process.env.VERCEL_ENV === undefined) {
    console.warn(
      '[Admin Whitelist] Using dev fallback (set ADMIN_EMAIL_WHITELIST to silence)'
    );
    return ['rbaten@gmail.com', 'gr0x01@pm.me'];
  }

  // No fallback on any Vercel environment (production, preview, development)
  console.error(
    '[Admin Whitelist] ADMIN_EMAIL_WHITELIST not set on Vercel deployment'
  );
  console.error(
    `[Admin Whitelist] VERCEL_ENV=${process.env.VERCEL_ENV}, NODE_ENV=${process.env.NODE_ENV}`
  );
  throw new Error(
    'ADMIN_EMAIL_WHITELIST environment variable is required on all Vercel deployments'
  );
}

export const ADMIN_EMAILS = getAdminEmails();

/**
 * Check if an email is authorized for admin access
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
