# Публикация на GitHub Pages

## Как должно выглядеть в репозитории (вкладка Code)

Файлы **в корне**, не внутри папки `WORKOUT SITE`:

```
site/                    ← корень репозитория
├── index.html           ← обязательно!
├── logo.jpg
├── .nojekyll
├── css/
│   └── main.css
├── js/
│   └── main.js
└── data/
    ├── content.json
    └── vk-videos.json
```

`scripts/`, `video/`, `.docx` — **не нужны** для работы сайта на Pages.

## Админ-панель на сайте

- Кнопка **«Админ»** внизу страницы
- Пароль по умолчанию: **workout2026** (смените во вкладке «Настройки»)
- Добавляйте и редактируйте материалы без кода
- **GitHub:** «Скачать content.json» → заменить `data/content.json` в репозитории
- **Для всех сразу:** JSONBin во вкладке «Настройки» (бесплатный jsonbin.io)

## Настройки Pages

**Settings → Pages**

- Source: **Deploy from a branch**
- Branch: **main** (или master)
- Folder: **/ (root)** — не `/docs`

Подождите 1–3 минуты. Адрес сайта:

`https://ВАШ_ЛОГИН.github.io/site/`

(если репозиторий называется `site`)

## Частые ошибки

1. Загрузили всю папку «WORKOUT SITE» целиком → получилось `site/WORKOUT SITE/index.html` — **не сработает**
2. Загрузили только `scripts/` — GitHub видит Python, **сайта нет**
3. Pages включён на папку `/docs`, а файлы в корне
4. Открываете `github.com/.../site` вместо `ВАШ_ЛОГИН.github.io/site/`

## Проверка

Откройте в браузере:

`https://ВАШ_ЛОГИН.github.io/site/index.html`

Должны быть тёмный фон, красный акцент, карточки.
