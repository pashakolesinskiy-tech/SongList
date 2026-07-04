# Настройка Supabase для общего доступа

## 1. Создай проект
- Зайди на https://supabase.com
- Нажми "New project"
- Введи имя и пароль
- Скопируй **Project URL** и **Anon Key**

## 2. Создай таблицу
В SQL-редакторе Supabase выполни:

```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  capo INTEGER,
  tuning TEXT DEFAULT 'standard',
  rawText TEXT,
  format TEXT,
  parsedData JSONB,
  createdAt TEXT
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON songs FOR SELECT USING (true);
CREATE POLICY "Public insert" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON songs FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON songs FOR DELETE USING (true);
```

## 3. Введи данные в приложении
1. Открой приложение
2. Нажми ⚙️ (настройки)
3. Введи URL и Key от Supabase
4. Нажми «Сохранить»

## 4. Дай доступ друзьям
Просто отправь им адрес приложения. Они увидят все песни.
