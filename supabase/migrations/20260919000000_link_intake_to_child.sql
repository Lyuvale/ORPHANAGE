-- -----------------------------------------------------------------------------
-- Link intake records to the registered child (child-centric hub).
--
-- Referrals, admissions, placements and guardians are no longer standalone
-- sections: they live together on the child's profile. To make that possible,
-- referrals and admissions gain an optional link to the child row that was
-- officially registered from them (placements already reference child_id).
--
-- Flow: SOCIAL WORKER submits referral + admission recommendation ->
-- CENTRE MANAGER reviews/approves -> RECORDS OFFICER registers the child
-- and links the approved admission (and its referral) to the child row.
-- -----------------------------------------------------------------------------

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE SET NULL;

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_child_id ON referrals (child_id);
CREATE INDEX IF NOT EXISTS idx_admissions_child_id ON admissions (child_id);
