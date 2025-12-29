-- Migration: Add Performance Index for Status Column
-- Created: 2025-12-29
-- Purpose: Optimize embedding batch queries that filter by status='pending' or status='failed'
--
-- Impact: Improves query performance for:
--   - Modal.com batch processing (finds pending images)
--   - Error recovery scripts (finds failed images)
--   - Progress monitoring (counts by status)
--
-- Performance: Partial index (only pending/failed) is smaller and faster than full index
-- Estimated speedup: 50-100ms → 5-10ms for batch queries

-- Add partial index on status column
-- Only indexes 'pending' and 'failed' rows (excludes 'processed' which is majority)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_status_pending
ON portfolio_images(status)
WHERE status IN ('pending', 'failed');

-- Add comment for documentation
COMMENT ON INDEX idx_portfolio_images_status_pending IS
'Partial index for finding images needing embedding generation. Excludes processed images.';
