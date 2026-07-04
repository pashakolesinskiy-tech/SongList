# Архитектура проекта: Druisk (SongList)

## Обзор

**Druisk** — одностраничальное веб-приложение для просмотра и управления текстами песен с гитарными аккордами. Ориентировано на мобильных пользователей (совместный доступ с друзьями).

**Стек**: Vanilla JS (ES-модули), CSS, Supabase (облачное хранилище) + localStorage (офлайн-фоллбэк). Без сборщиков и фреймворков.

---

## Структура проекта

```
SongList/
├── index.html              # Точка входа
├── package.json            # Метаданные, скрипты запуска
├── SETUP.md                # Инструкция по настройке Supabase
├── css/
│   └── style.css           # Все стили (865 строк)
└── js/
    ├── app.js              # Главный контроллер (роутинг, настройки, shell)
    ├── parser/
    │   ├── index.js        # Точка входа парсера (автоопределение формата)
    │   ├── chordpro.js     # Парсер формата ChordPro
    │   └── plain-text.js   # Парсер простого текста (inline и above)
    ├── renderer/
    │   ├── index.js        # Реэкспорт
    │   └── chord-renderer.js  # Рендеринг аккордов в HTML
    ├── storage/
    │   └── firebase.js     # Слой хранения (Supabase + localStorage)
    ├── utils/
    │   └── transpose.js    # Транспозиция аккордов
    └── views/
        ├── home.js         # Главная страница (список песен)
        ├── song.js         # Просмотр песни
        ├── upload.js       # Добавление песни
        └── edit.js         # Редактирование песни
```

---

## Модули и зависимости

### Модульная структура

```
app.js ──┬── views/home.js ──┬── storage/firebase.js
         │                   └── (удаление через showConfirm)
         ├── views/song.js ──┬── storage/firebase.js
         │                   ├── renderer/chord-renderer.js
         │                   └── utils/transpose.js
         ├── views/upload.js ─┬── parser/index.js
         │                   ├── renderer/chord-renderer.js
         │                   └── storage/firebase.js
         ├── views/edit.js ───┬── storage/firebase.js
         │                   ├── parser/index.js
         │                   └── renderer/chord-renderer.js
         ├── parser/index.js ─┬── parser/chordpro.js
         │                   └── parser/plain-text.js
         └── utils/transpose.js (также на window._transposeModule)
```

### Глобальные зависимости (window)

| Имя | Описание |
|------|----------|
| `window._parseModule` | Экспорты парсера (`parse`) — для доступа из song.js |
| `window._transposeModule` | Экспорты транспозиции (`transposeSongText`) |
| `window._currentSongId` | ID текущей открытой песни |
| `window._currentSongData` | Данные текущей песни |
| `window._currentTransposeOffset` | Текущий смещение транспозиции |
| `window._currentSongRender` | Колбэк перерисовки песни |
| `window._lastSongId` | ID последней просмотренной песни |
| `window.showConfirm` | Модальное подтверждение удаления |
| `window.updateSongActions` | Обновление действий в settings sheet |

---

## Роутинг

Хеш-роутинг через `window.location.hash`:

| Маршрут | Вид | Описание |
|---------|-----|----------|
| `#/` или `#/home` | `createHomeView` | Список песен |
| `#/upload` | `createUploadView` | Добавление песни (требует разблокировку) |
| `#/song/:id` | `createSongView` | Просмотр песни |
| `#/edit/:id` | `createEditView` | Редактирование (требует разблокировку) |

---

## Система хранения

### Supabase (облако)

```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  capo INTEGER,
  tuning TEXT DEFAULT 'standard',
  rawText TEXT,        -- исходный текст песни
  format TEXT,         -- 'chordpro' | 'plain'
  parsedData JSONB,    -- распарсенные секции
  createdAt TEXT       -- ISO timestamp
);
```

**Политики RLS**: полный публичный доступ (SELECT, INSERT, UPDATE, DELETE).

### localStorage (фоллбэк)

- `chord-viewer-songs` — массив песен
- `chord-viewer-config` — конфигурация Supabase
- `druisk-settings` — настройки приложения
- `druisk-favorites` — избранные песни (IDs)
- `druisk-unlocked` — состояние разблокировки

---

## Парсинг аккордов

### Поддерживаемые форматы

1. **ChordPro**: `{Am}В лесу {Em}родилась`
2. **Plain inline**: `[Am]В лесу [Em]родилась`
3. **Plain above**: аккорды на отдельной строке над текстом

### Секции песен

Теги: `[verse]`, `[chorus]`, `[bridge]`, `[intro]`, `[outro]`, `[prechorus]`

Детекция по ключевым словам (русские и английские): припев, бридж, предприпев.

---

## Настройки приложения

| Настройка | Тип | По умолчанию | Описание |
|-----------|-----|-------------|----------|
| `darkTheme` | boolean | `true` | Тёмная тема |
| `showNumbers` | boolean | `true` | Нумерация песен в списке |
| `showChords` | boolean | `true` | Показывать аккорды |
| `fontSize` | number | `16` | Размер шрифта (10–30) |
| `fontFamily` | string | `'sans'` | Шрифт: sans / serif / rounded |

---

## Система блокировки

- 6-значный PIN-код: `080826` (зашит в `app.js:10`)
- Разблокировка сохраняется в `localStorage`
- Блокируются: добавление, редактирование, удаление песен
- Настройки Supabase доступны только в разблокированном состоянии

---

## CSS архитектура

- Единый файл `style.css` (865 строк)
- CSS-переменные для темизации (dark/light)
- Адаптивная вёрстка: `@media (max-width: 600px)`
- Bottom sheet для настроек (`.settings-sheet`)
- Кастомные компоненты: toggle, slider, confirm modal

---

## Ключевые особенности

1. **Автопрокрутка** — регулируемая скорость (1x–10x)
2. **Транспозиция** — сдвиг аккордов на полутона (+/-)
3. **Поиск** — по названию, исполнителю и тексту песни
4. **Избранное** — локальная пометка песен
5. **Drag & drop** — загрузка .txt файлов
6. **Экспорт** — скачивание песни как .txt
7. **Легенда аккордов** — список уникальных аккордов в песне
8. **Предпросмотр** — рендеринг перед сохранением

---

## Технические замечания

| Проблема | Описание |
|----------|----------|
| Имя файла `firebase.js` | Файл называется `firebase.js`, но использует Supabase (устаревшее имя) |
| Глобальные переменные | Тяжёлое использование `window._*` для межмодульной связи |
| PIN в исходниках | Код блокировки `080826` зашит прямо в код |
| Нет сборки | Нет бандлера, minификации, tree-shaking |
| Нет тестов | Отсутствуют unit-тесты |
| Supabase credentials в коде | URL и ключ в `app.js:49-50` |
| Нет PWA | Нет service worker, манифеста, офлайн-режима |
| XSS через `innerHTML` | Много ручного escaping через `esc()`, но есть риски |
