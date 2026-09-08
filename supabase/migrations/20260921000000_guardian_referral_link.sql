-- -----------------------------------------------------------------------------
-- Link guardians to the referral they were submitted with.
--
-- A Social Worker records guardian information during intake (referral).
-- The Records Officer must receive those guardians automatically instead of
-- re-typing them: guardians carry the referral_id, and linking an approved
-- admission to the registered child auto-links the referral's guardians.
-- -----------------------------------------------------------------------------

ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guardians_referral_id ON guardians (referral_id);
