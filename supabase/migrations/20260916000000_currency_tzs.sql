-- -----------------------------------------------------------------------------
-- Switch the platform's default & stored currency to Tanzania Shillings (TZS).
--
-- The platform operates in Tanzania, so the default currency for
-- payment_transactions is changed from KES to TZS and any existing rows that
-- were recorded as KES are migrated to TZS.
-- -----------------------------------------------------------------------------

-- 1. Update existing payment_transactions rows that used the old default.
UPDATE payment_transactions
   SET currency = 'TZS',
       updated_at = now()
 WHERE currency = 'KES';

-- 2. Change the column default so future rows default to TZS.
ALTER TABLE payment_transactions
  ALTER COLUMN currency SET DEFAULT 'TZS';
