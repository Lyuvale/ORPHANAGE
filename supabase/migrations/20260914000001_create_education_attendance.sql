-- =============================================================================
-- Migration: Education Attendance Tracking
-- Created: 2026-09-14
-- =============================================================================
-- Tracks school attendance for children (separate from centre daily presence).
-- =============================================================================

CREATE TABLE education_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present', 'absent', 'late', 'excused', 'holiday')),
  arrival_time    TIME,
  departure_time  TIME,
  notes           TEXT,
  recorded_by     UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, centre_id, attendance_date)
);

CREATE INDEX idx_edu_attendance_centre ON education_attendance (centre_id);
CREATE INDEX idx_edu_attendance_child ON education_attendance (child_id);
CREATE INDEX idx_edu_attendance_date ON education_attendance (centre_id, attendance_date);

CREATE TRIGGER set_education_attendance_updated_at
  BEFORE UPDATE ON education_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE education_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY education_attendance_select_centre
  ON education_attendance FOR SELECT TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY education_attendance_insert_admin
  ON education_attendance FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY education_attendance_update_admin
  ON education_attendance FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY education_attendance_delete_admin
  ON education_attendance FOR DELETE TO service_role USING (true);
