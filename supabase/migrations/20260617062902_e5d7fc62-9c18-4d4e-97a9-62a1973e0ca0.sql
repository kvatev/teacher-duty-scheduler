
CREATE TABLE public.teacher_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  weekday text NULL,
  specific_date date NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unavailability_one_type CHECK (
    (weekday IS NOT NULL AND specific_date IS NULL)
    OR (weekday IS NULL AND specific_date IS NOT NULL)
  ),
  CONSTRAINT unavailability_weekday_valid CHECK (
    weekday IS NULL OR weekday IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')
  )
);

CREATE INDEX idx_unavail_teacher ON public.teacher_unavailability(teacher_id);
CREATE UNIQUE INDEX uniq_unavail_weekday ON public.teacher_unavailability(teacher_id, weekday) WHERE weekday IS NOT NULL;
CREATE UNIQUE INDEX uniq_unavail_date ON public.teacher_unavailability(teacher_id, specific_date) WHERE specific_date IS NOT NULL;

GRANT SELECT ON public.teacher_unavailability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teacher_unavailability TO authenticated;
GRANT ALL ON public.teacher_unavailability TO service_role;

ALTER TABLE public.teacher_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unavailability"
  ON public.teacher_unavailability FOR SELECT USING (true);

CREATE POLICY "Schedule admins can insert unavailability"
  ON public.teacher_unavailability FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin'::admin_role OR profiles.can_manage_schedule = true)
  ));

CREATE POLICY "Schedule admins can update unavailability"
  ON public.teacher_unavailability FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin'::admin_role OR profiles.can_manage_schedule = true)
  ));

CREATE POLICY "Schedule admins can delete unavailability"
  ON public.teacher_unavailability FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin'::admin_role OR profiles.can_manage_schedule = true)
  ));
