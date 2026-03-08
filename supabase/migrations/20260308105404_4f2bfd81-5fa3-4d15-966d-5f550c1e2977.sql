-- Create enum for roles
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin');

-- Create profiles table for authenticated users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  role admin_role NOT NULL DEFAULT 'admin',
  can_manage_schedule boolean NOT NULL DEFAULT true,
  can_manage_settings boolean NOT NULL DEFAULT false,
  can_send_broadcasts boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role = 'super_admin'
  )
$$;

-- Security definer function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE (
  can_manage_schedule boolean,
  can_manage_settings boolean,
  can_send_broadcasts boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT can_manage_schedule, can_manage_settings, can_send_broadcasts 
  FROM public.profiles 
  WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Super admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update profiles" ON public.profiles
FOR UPDATE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete profiles" ON public.profiles
FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Remove the admin_password_hash from app_settings (no longer needed)
DELETE FROM public.app_settings WHERE key = 'admin_password_hash';

-- Update other tables to restrict write access to authenticated admins only
DROP POLICY IF EXISTS "Allow all inserts on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all updates on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all deletes on app_settings" ON public.app_settings;

CREATE POLICY "Admins with settings permission can update app_settings" ON public.app_settings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_settings = true)
  )
);

-- Update broadcasts table policies
DROP POLICY IF EXISTS "Allow all inserts on broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Allow all deletes on broadcasts" ON public.broadcasts;

CREATE POLICY "Admins with broadcast permission can insert broadcasts" ON public.broadcasts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_send_broadcasts = true)
  )
);

CREATE POLICY "Admins with broadcast permission can delete broadcasts" ON public.broadcasts
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_send_broadcasts = true)
  )
);

-- Update teachers table policies
DROP POLICY IF EXISTS "Allow all inserts on teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow all updates on teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow all deletes on teachers" ON public.teachers;

CREATE POLICY "Admins with schedule permission can insert teachers" ON public.teachers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can update teachers" ON public.teachers
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can delete teachers" ON public.teachers
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

-- Update duty_assignments table policies
DROP POLICY IF EXISTS "Allow all inserts on duty_assignments" ON public.duty_assignments;
DROP POLICY IF EXISTS "Allow all updates on duty_assignments" ON public.duty_assignments;
DROP POLICY IF EXISTS "Allow all deletes on duty_assignments" ON public.duty_assignments;

CREATE POLICY "Admins with schedule permission can insert duty_assignments" ON public.duty_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can update duty_assignments" ON public.duty_assignments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can delete duty_assignments" ON public.duty_assignments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

-- Update school_periods table policies
DROP POLICY IF EXISTS "Allow all inserts on school_periods" ON public.school_periods;
DROP POLICY IF EXISTS "Allow all updates on school_periods" ON public.school_periods;
DROP POLICY IF EXISTS "Allow all deletes on school_periods" ON public.school_periods;

CREATE POLICY "Admins with schedule permission can insert school_periods" ON public.school_periods
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can update school_periods" ON public.school_periods
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);

CREATE POLICY "Admins with schedule permission can delete school_periods" ON public.school_periods
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'super_admin' OR can_manage_schedule = true)
  )
);