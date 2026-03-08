CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on app_settings" ON public.app_settings FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes on app_settings" ON public.app_settings FOR DELETE USING (true);

-- Insert default values
INSERT INTO public.app_settings (key, value) VALUES
  ('header_title', 'График за дежурства'),
  ('header_subtitle', 'СУ "Константин Петканов", град Бургас'),
  ('footer_note', '*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40'),
  ('admin_name', 'Красимир Ватев'),
  ('admin_email', 'kvatev@outlook.com'),
  ('pdf_school_name', 'СУ „КОНСТАНТИН ПЕТКАНОВ" – БУРГАС'),
  ('pdf_school_info1', 'гр. Бургас тел: 0876335444; тел:852-709; 854-704'),
  ('pdf_school_info2', 'ж.к. „Меден рудник" e-mail: info-200232@edu.mon.bg'),
  ('pdf_director_name', 'ИВАЙЛО МАРКОВ'),
  ('pdf_schedule_description', 'за дежурство на учителите от прогимназиален и гимназиален етап');