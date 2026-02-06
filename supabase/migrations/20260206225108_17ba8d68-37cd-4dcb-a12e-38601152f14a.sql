-- Create table for school periods
CREATE TABLE public.school_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year TEXT NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (year, term)
);

-- Create table for teachers
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.school_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (period_id, name)
);

-- Create table for duty assignments
CREATE TABLE public.duty_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.school_periods(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (period_id, teacher_id, day, location)
);

-- Enable Row Level Security
ALTER TABLE public.school_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies - everyone can read (public schedule)
CREATE POLICY "Anyone can view school periods" 
ON public.school_periods FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view teachers" 
ON public.teachers FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view duty assignments" 
ON public.duty_assignments FOR SELECT 
USING (true);

-- For now, allow all operations (we'll add admin auth later if needed)
CREATE POLICY "Allow all inserts on school_periods" 
ON public.school_periods FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all updates on school_periods" 
ON public.school_periods FOR UPDATE 
USING (true);

CREATE POLICY "Allow all deletes on school_periods" 
ON public.school_periods FOR DELETE 
USING (true);

CREATE POLICY "Allow all inserts on teachers" 
ON public.teachers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all updates on teachers" 
ON public.teachers FOR UPDATE 
USING (true);

CREATE POLICY "Allow all deletes on teachers" 
ON public.teachers FOR DELETE 
USING (true);

CREATE POLICY "Allow all inserts on duty_assignments" 
ON public.duty_assignments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all updates on duty_assignments" 
ON public.duty_assignments FOR UPDATE 
USING (true);

CREATE POLICY "Allow all deletes on duty_assignments" 
ON public.duty_assignments FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_teachers_period ON public.teachers(period_id);
CREATE INDEX idx_assignments_period ON public.duty_assignments(period_id);
CREATE INDEX idx_assignments_teacher ON public.duty_assignments(teacher_id);