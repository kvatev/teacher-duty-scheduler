## Какво ще се направи

### 1. Недостъпност на учители (нова функционалност)
Всеки учител ще има списък с дни, в които не е свободен за дежурство. Поддържат се **два типа** недостъпност:

- **Повтарящи се дни от седмицата** (напр. „всеки понеделник") — важат за целия учебен срок
- **Конкретни дати** (напр. „20.06.2026") — еднократно за избран ден

При опит да се сложи учител в ден, в който е маркиран като недостъпен:
- Полето визуално се маркира с предупредителна иконка/цвят
- Излиза toast съобщение „Учителят [Име] не е свободен този ден да бъде дежурен"
- Действието **остава позволено** (по твое желание), за да може админ да го forsne при изключителни случаи
- В списъка с учители за избор недостъпните за съответния ден ще са с лек warning маркер

Управлението на недостъпността ще е достъпно през ново „⚙ Достъпност" бутонче до всеки учител в `TeacherList`. Отваря диалог с:
- Checkbox-ове за дните от седмицата (Пн–Пт)
- Date picker за добавяне на конкретни недостъпни дати + списък с премахване
- Поле „Бележка" (по желание) — напр. „отпуск", „болничен"

Право: **същото `can_manage_schedule`**, което вече управлява графика.

### 2. Създаване на потребители от Главен админ (доизграждане)
Панелът `AdminUsersPanel` вече съществува, но няма реално създаване на акаунт. Ще се добави:

- Edge function `admin-create-user` (използва `SUPABASE_SERVICE_ROLE_KEY` за `auth.admin.createUser`) — задължително, защото от клиента не може да се създават потребители без self-signup
- Форма в панела: имейл, име, временна парола (с генератор), checkbox-ове за правата (`can_manage_schedule`, `can_manage_settings`, `can_send_broadcasts`)
- При успех — профилът се създава автоматично с тези права, а главният админ вижда временната парола веднъж, за да я предаде на потребителя
- Защита: edge функцията проверява, че извикващият е `super_admin`, преди да създаде потребител

## Технически детайли

**Нова таблица `teacher_unavailability`:**
```
id uuid PK
teacher_id uuid FK -> teachers(id) ON DELETE CASCADE
weekday text NULL          -- 'monday'..'friday' (NULL ако е по дата)
specific_date date NULL    -- конкретна дата (NULL ако е по weekday)
note text NULL
created_at timestamptz
CHECK ((weekday IS NOT NULL) <> (specific_date IS NOT NULL))
```
RLS: всички могат да четат; insert/update/delete — `can_manage_schedule` или `super_admin`. GRANT за `anon`, `authenticated`, `service_role`.

**Hook `useUnavailability`** — зарежда всички записи за текущия срок и предоставя `isUnavailable(teacherId, day)` функция.

**ScheduleCell / TeacherBadge** — приема `isUnavailable` и показва warning иконка + toast при добавяне.

**Edge function `admin-create-user`** (CORS, Zod валидация, проверка за super_admin):
- Вход: `{ email, password, display_name, can_manage_schedule, can_manage_settings, can_send_broadcasts }`
- Използва service role key за `auth.admin.createUser({ email_confirm: true })`
- След това upsert в `profiles` с правата

## Файлове за промяна
- `supabase/migrations/...` — нова таблица + RLS
- `supabase/functions/admin-create-user/index.ts` — нова
- `src/hooks/useUnavailability.ts` — нов
- `src/components/TeacherUnavailabilityDialog.tsx` — нов диалог
- `src/components/TeacherList.tsx` — бутон „Достъпност"
- `src/components/ScheduleCell.tsx` — warning при добавяне
- `src/components/AdminUsersPanel.tsx` — реална форма за създаване
- `src/integrations/supabase/types.ts` — auto-regen след миграция

Одобряваш ли да започна с миграцията?
