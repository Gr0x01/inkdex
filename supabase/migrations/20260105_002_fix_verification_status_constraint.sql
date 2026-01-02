-- Fix verification_status constraint to include 'claimed' value
-- The Phase 3 claim flow uses 'claimed' but the original constraint only allowed 'unclaimed', 'pending', 'verified'

-- Drop both existing constraints (there are two for some reason)
ALTER TABLE artists
DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE artists
DROP CONSTRAINT IF EXISTS valid_verification_status;

-- Add single unified constraint with 'claimed' included
ALTER TABLE artists
ADD CONSTRAINT check_verification_status
CHECK (verification_status IN ('unclaimed', 'pending', 'verified', 'claimed'));

COMMENT ON CONSTRAINT check_verification_status ON artists IS 'Valid verification statuses: unclaimed (default), pending (verification requested), verified (manual verification), claimed (claimed via OAuth)';
