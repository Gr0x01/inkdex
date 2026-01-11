/**
 * Admin Audit Logging
 *
 * Records all admin actions for security and compliance tracking.
 */

import { createClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'artist.feature'
  | 'artist.unfeature'
  | 'artist.toggle_pro'
  | 'artist.hard_delete'
  | 'artist.images_deleted'
  | 'artist.bulk_feature'
  | 'artist.bulk_unfeature'
  | 'artist.blacklist'
  | 'artist.unblacklist'
  | 'artist.rescrape'
  | 'admin.login'
  | 'admin.logout'
  | 'pipeline.trigger'
  | 'pipeline.retry'
  | 'pipeline.cancel'
  | 'seo.indexnow_submit';

export type AuditResourceType = 'artist' | 'admin_session' | 'pipeline_run' | 'indexnow';

interface AuditLogEntry {
  adminEmail: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Audit] Missing Supabase configuration');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_email: entry.adminEmail,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      old_value: entry.oldValue,
      new_value: entry.newValue,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });

    if (error) {
      console.error('[Audit] Failed to log action:', error);
    }
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    console.error('[Audit] Unexpected error:', error);
  }
}

/**
 * Extract client info from request for audit logging
 */
export function getClientInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
