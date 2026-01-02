/**
 * TypeScript type augmentation for Navigator
 * Adds support for Global Privacy Control and Do Not Track
 */

interface Navigator {
  /**
   * Global Privacy Control (GPC) signal
   * Browser-level privacy preference (modern standard)
   * @see https://globalprivacycontrol.org/
   */
  globalPrivacyControl?: boolean

  /**
   * Do Not Track (DNT) signal
   * Legacy privacy preference (being phased out in favor of GPC)
   * Values: "1" (enabled), "0" (disabled), null (not set)
   */
  doNotTrack?: string | null
}
