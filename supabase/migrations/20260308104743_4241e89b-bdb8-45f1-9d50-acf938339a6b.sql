ALTER TABLE public.broadcasts 
ADD COLUMN priority text NOT NULL DEFAULT 'info' 
CHECK (priority IN ('info', 'warning', 'urgent'));