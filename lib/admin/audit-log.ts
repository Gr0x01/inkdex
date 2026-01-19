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
  | 'artist.bulk_blacklist'
  | 'artist.rescrape'
  | 'artist.locations_updated'
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

    // Parse resource_id as UUID if valid, otherwise store in event_data
    const isValidUuid = entry.resourceId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.resourceId);

    const { error } = await supabase.from('unified_audit_log').insert({
      event_category: 'admin',
      event_type: entry.action,
      actor_type: 'admin',
      actor_id: entry.adminEmail,
      actor_ip: entry.ipAddress,
      actor_user_agent: entry.userAgent,
      resource_type: entry.resourceType,
      resource_id: isValidUuid ? entry.resourceId : null,
      event_data: {
        old_value: entry.oldValue,
        new_value: entry.newValue,
        ...(entry.resourceId && !isValidUuid ? { resource_id_string: entry.resourceId } : {}),
      },
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
