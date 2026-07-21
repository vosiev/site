'use strict';

/* ============================================================
   ТРЕНАЖЁР ТЕСТОВ — app.js
   ------------------------------------------------------------
   Архитектура: модульные ES6-классы
     1. Utils              — утилиты (безопасность, хранилище)
     2. ToastManager       — всплывающие уведомления
     3. ThemeManager       — тёмная / светлая тема
     4. QuestionValidator  — строгая проверка вопросов
     5. StatsManager       — история экзаменов (localStorage)
     6. Confetti           — праздничная анимация
     7. TestTrainerApp     — главный класс приложения
   ============================================================ */


/* ============================================================
   0. ВОПРОСЫ ПО УМОЛЧАНИЮ
   Используются, если tests.json не загрузился
   (например, сайт открыт локально через file://)
   ============================================================ */
const DEFAULT_QUESTIONS = [
    {
        id: 1,
        question: 'Какие планеты Солнечной системы относятся к газовым гигантам?',
        options: ['Марс', 'Юпитер', 'Сатурн', 'Венера'],
        correct: [1, 2],
        category: 'Астрономия',
        difficulty: 'easy'
    },
    {
        id: 2,
        question: 'Какое животное считается самым крупным млекопитающим на Земле?',
        options: ['Африканский слон', 'Синий кит', 'Гигантский кальмар', 'Кашалот'],
        correct: [1],
        category: 'Биология',
        difficulty: 'easy'
    },
    {
        id: 3,
        question: 'Какая река считается самой длинной в мире?',
        options: ['Амазонка', 'Нил', 'Янцзы', 'Миссисипи'],
        correct: [1],
        category: 'География',
        difficulty: 'easy'
    },
    {
        id: 4,
        question: 'В каком году человек впервые побывал на Луне?',
        options: ['1965', '1969', '1972', '1959'],
        correct: [1],
        category: 'История',
        difficulty: 'medium'
    },
    {
        id: 5,
        question: 'Что означает аббревиатура HTML?',
        options: [
            'HyperText Markup Language',
            'HighTech Modern Language',
            'HyperTransfer Markup Logic',
            'HomeTool Markup Language'
        ],
        correct: [0],
        category: 'Информатика',
        difficulty: 'easy'
    },
    {
        id: 6,
        question: 'Какие из перечисленных чисел являются простыми?',
        options: ['2', '9', '17', '21'],
        correct: [0, 2],
        category: 'Математика',
        difficulty: 'medium'
    },
    {
        id: 7,
        question: 'Какие органы относятся к центральной нервной системе человека?',
        options: ['Головной мозг', 'Сердце', 'Спинной мозг', 'Печень'],
        correct: [0, 2],
        category: 'Биология',
        difficulty: 'medium'
    },
    {
        id: 8,
        question: 'Какой город является столицей Австралии?',
        options: ['Сидней', 'Мельбурн', 'Канберра', 'Перт'],
        correct: [2],
        category: 'География',
        difficulty: 'medium'
    },
    {
        id: 9,
        question: 'Какие языки программирования являются компилируемыми?',
        options: ['C++', 'Python', 'Go', 'JavaScript'],
        correct: [0, 2],
        category: 'Информатика',
        difficulty: 'hard'
    },
    {
        id: 10,
        question: 'Какие события произошли в XX веке?',
        options: [
            'Первая мировая война',
            'Полёт Юрия Гагарина в космос',
            'Падение Берлинской стены',
            'Все перечисленные'
        ],
        correct: [3],
        category: 'История',
        difficulty: 'hard'
    },
    {
        id: 11,
        question: 'Чему равно 7 × 8?',
        options: ['54', '56', '63', '48'],
        correct: [1],
        category: 'Математика',
        difficulty: 'easy'
    },
    {
        id: 12,
        question: 'Какие объекты входят в Солнечную систему?',
        options: ['Солнце', 'Проксима Центавра', 'Плутон', 'Туманность Андромеды'],
        correct: [0, 2],
        category: 'Астрономия',
        difficulty: 'hard'
    }
];

/* Русские буквы для вариантов ответов: А, Б, В, Г... */
const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];


/* ============================================================
   1. УТИЛИТЫ
   ============================================================ */
const Utils = {

    /** Защита от XSS: экранирует HTML-спецсимволы в пользовательских данных */
    escapeHtml(value) {
        const str = String(value ?? '');
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /** Равенство массивов без учёта порядка: [1,2] == [2,1] */
    arraysEqual(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const s1 = [...a].sort((x, y) => x - y);
        const s2 = [...b].sort((x, y) => x - y);
        return s1.every((v, i) => v === s2[i]);
    },

    /** Честное перемешивание по алгоритму Фишера–Йетса */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /** «95 сек» → «1 мин. 35 сек.» */
    formatTime(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h} ч. ${m} мин.`;
        if (m > 0) return `${m} мин. ${s} сек.`;
        return `${s} сек.`;
    },

    /** «95» → «01:35» (для таймера на экзамене) */
    formatTimer(totalSec) {
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${m}:${s}`;
    },

    /** Уникальный ID для записей истории */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    },

    /** Debounce: откладывает вызов, пока пользователь печатает */
    debounce(fn, delay = 250) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    /* --- Безопасная работа с localStorage --- */
    storageGet(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    storageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    storageRemove(key) {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
};


/* ============================================================
   2. МЕНЕДЖЕР УВЕДОМЛЕНИЙ (toast)
   ============================================================ */
class ToastManager {

    constructor(containerId = 'toast-container') {
        this.container = document.getElementById(containerId);
    }

    /** Показывает уведомление: success | error | warning | info */
    show(message, type = 'info', duration = 3500) {
        if (!this.container) return;

        const palette = {
            success: 'bg-emerald-600/95 text-white',
            error:   'bg-rose-600/95 text-white',
            warning: 'bg-amber-500/95 text-white',
            info:    'bg-indigo-600/95 text-white'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${palette[type] || palette.info}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `<span>${Utils.escapeHtml(message)}</span>`;
        this.container.appendChild(toast);

        /* Двойной requestAnimationFrame — гарантия запуска CSS-перехода */
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    success(msg) { this.show(msg, 'success'); }
    error(msg)   { this.show(msg, 'error'); }
    warning(msg) { this.show(msg, 'warning'); }
    info(msg)    { this.show(msg, 'info'); }
}


/* ============================================================
   3. МЕНЕДЖЕР ТЕМЫ (тёмная / светлая)
   ============================================================ */
class ThemeManager {

    constructor() {
        this.root = document.documentElement;
        this.apply(this.getInitialTheme(), false);
    }

    /** Сохранённая тема или системная (prefers-color-scheme) */
    getInitialTheme() {
        const saved = localStorage.getItem('app_theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /** Применяет тему: атрибут data-theme + иконки в сайдбаре */
    apply(theme, save = true) {
        this.root.setAttribute('data-theme', theme);
        if (save) localStorage.setItem('app_theme', theme);

        const isDark = theme === 'dark';
        /* В светлой теме показываем «луну» (зовём в темноту), и наоборот */
        document.getElementById('theme-icon-light')?.classList.toggle('hidden', isDark);
        document.getElementById('theme-icon-dark')?.classList.toggle('hidden', !isDark);

        const label = document.getElementById('theme-label');
        if (label) label.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
    }

    toggle() {
        const next = this.root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.apply(next);
    }
}


/* ============================================================
   4. ВАЛИДАТОР ВОПРОСОВ
   Строго проверяет импортируемый JSON и приводит к единому формату
   ============================================================ */
class QuestionValidator {

    /**
     * @param {*} data — распарсенный JSON
     * @returns {Array} — нормализованные вопросы
     * @throws {Error} — с понятным описанием проблемы
     */
    static validate(data) {
        if (!Array.isArray(data)) {
            throw new Error('Данные должны быть массивом вопросов');
        }
        if (data.length === 0) {
            throw new Error('Массив вопросов не может быть пустым');
        }

        return data.map((item, i) => {
            const n = i + 1;

            if (!item || typeof item.question !== 'string' || !item.question.trim()) {
                throw new Error(`Вопрос #${n}: отсутствует текст вопроса`);
            }
            if (!Array.isArray(item.options) || item.options.length < 2) {
                throw new Error(`Вопрос #${n}: нужно минимум 2 варианта ответа`);
            }
            if (!Array.isArray(item.correct) || item.correct.length === 0) {
                throw new Error(`Вопрос #${n}: не указаны правильные ответы`);
            }
            for (const idx of item.correct) {
                if (!Number.isInteger(idx) || idx < 0 || idx >= item.options.length) {
                    throw new Error(`Вопрос #${n}: индекс "${idx}" выходит за пределы вариантов`);
                }
            }

            /* Нормализация: единый формат для всего приложения */
            return {
                id:         item.id ?? n,
                question:   item.question.trim(),
                options:    item.options.map(String),
                correct:    [...new Set(item.correct)].sort((a, b) => a - b),
                category:   typeof item.category === 'string' && item.category.trim()
                                ? item.category.trim() : 'Общее',
                difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty)
                                ? item.difficulty : 'medium'
            };
        });
    }
}


/* ============================================================
   5. МЕНЕДЖЕР СТАТИСТИКИ (история экзаменов)
   ============================================================ */
class StatsManager {

    constructor() {
        this.key = 'exam_history';
    }

    getHistory() {
        return Utils.storageGet(this.key, []);
    }

    /** Добавляет результат в начало; хранит не более 50 записей */
    addResult(result) {
        const history = this.getHistory();
        history.unshift({
            id: Utils.generateId(),
            timestamp: Date.now(),
            ...result
        });
        if (history.length > 50) history.length = 50;
        Utils.storageSet(this.key, history);
    }

    /** Сводка: всего экзаменов, средний/лучший %, общее время */
    getSummary() {
        const h = this.getHistory();
        if (!h.length) {
            return { totalExams: 0, avgPercent: 0, bestPercent: 0, totalTime: 0, totalQuestions: 0 };
        }
        const percents = h.map(x => x.percent || 0);
        return {
            totalExams:     h.length,
            avgPercent:     Math.round(percents.reduce((a, b) => a + b, 0) / h.length),
            bestPercent:    Math.max(...percents),
            totalTime:      h.reduce((a, x) => a + (x.timeSpent || 0), 0),
            totalQuestions: h.reduce((a, x) => a + (x.totalCount || 0), 0)
        };
    }

    clear() {
        Utils.storageRemove(this.key);
    }
}


/* ============================================================
   6. КОНФЕТТИ (Web Animations API — без CSS-зависимостей)
   ============================================================ */
class Confetti {

    static burst(count = 90) {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            const size = 6 + Math.random() * 8;
            el.style.cssText = [
                'position:fixed',
                'top:-20px',
                `left:${Math.random() * 100}vw`,
                `width:${size}px`,
                `height:${size * 0.45}px`,
                `background:${colors[i % colors.length]}`,
                'z-index:9999',
                'pointer-events:none',
                'border-radius:2px'
            ].join(';');
            document.body.appendChild(el);

            el.animate(
                [
                    { transform: 'translateY(0) rotate(0deg)',        opacity: 1 },
                    { transform: `translateY(${innerHeight + 60}px) rotate(${540 + Math.random() * 720}deg)`, opacity: 0.7 }
                ],
                {
                    duration: 1800 + Math.random() * 1600,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }
            ).onfinish = () => el.remove();
        }
    }
}


/* ============================================================
   7. ГЛАВНЫЙ КЛАСС ПРИЛОЖЕНИЯ
   ============================================================ */
class TestTrainerApp {

    constructor() {
        /* --- Менеджеры --- */
        this.toast = new ToastManager();
        this.theme = new ThemeManager();
        this.stats = new StatsManager();

        /* --- Единое состояние приложения --- */
        this.state = {
            allQuestions: [],          // банк вопросов
            errors: [],                // вопросы-ошибки (снимки)
            currentTab: 'textbook',    // активная вкладка
            textbookFilter: 'all',     // all | single | multi
            textbookSearch: '',        // строка поиска
            exam: {
                active: false,
                phase: 'setup',        // setup | question | results
                mode: 'normal',        // normal | errors
                questions: [],
                currentIndex: 0,
                userSelections: [],    // выбор пользователя по каждому вопросу
                answerResults: [],     // true/false по каждому вопросу
                checked: false,        // проверен ли текущий вопрос
                elapsedSeconds: 0,
                timerInterval: null
            }
        };
    }

    /* ================= ИНИЦИАЛИЗАЦИЯ ================= */

    async init() {
        await this.loadQuestions();
        this.state.errors = Utils.storageGet('test_errors', []);

        this.cacheDom();
        this.bindEvents();
        this.setupDatabase();

        this.switchTab('textbook');
        this.updateGlobalStats();
    }

    /** Кэшируем ссылки на статические DOM-элементы */
    cacheDom() {
        this.dom = {
            sidebar:        document.getElementById('sidebar'),
            overlay:        document.getElementById('mobile-overlay'),
            mobileMenuBtn:  document.getElementById('mobile-menu-btn'),
            navLinks:       document.querySelectorAll('.nav-link'),
            errorsBadge:    document.getElementById('errors-badge'),
            sidebarQCount:  document.getElementById('sidebar-question-count'),
            sidebarECount:  document.getElementById('sidebar-error-count'),
            textbookSearch: document.getElementById('textbook-search'),
            filterBtns:     document.querySelectorAll('.filter-btn'),
            textbookBox:    document.getElementById('textbook-container'),
            examArea:       document.getElementById('exam-dynamic-area'),
            errorsBox:      document.getElementById('errors-container'),
            statsBox:       document.getElementById('stats-container')
        };
    }

    /** Подключение всех обработчиков событий */
    bindEvents() {
        /* Навигация по вкладкам */
        this.dom.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.switchTab(link.dataset.tab);
                this.closeMobileMenu();
            });
        });

        /* Мобильное меню */
        this.dom.mobileMenuBtn?.addEventListener('click', () => this.openMobileMenu());
        this.dom.overlay?.addEventListener('click', () => this.closeMobileMenu());

        /* Переключатели темы (сайдбар + мобильная шапка) */
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.theme.toggle());
        document.getElementById('mobile-theme-toggle')?.addEventListener('click', () => this.theme.toggle());

        /* Поиск в учебнике (с debounce, чтобы не дёргать рендер на каждую букву) */
        this.dom.textbookSearch?.addEventListener('input', Utils.debounce(e => {
            this.state.textbookSearch = e.target.value;
            this.renderTextbook();
        }, 250));

        /* Фильтры учебника: все / один ответ / несколько */
        this.dom.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.textbookFilter = btn.dataset.filter;
                this.dom.filterBtns.forEach(b => this.setChipClasses(b, b === btn));
                this.renderTextbook();
            });
        });

        /* Клавиатура: 1–9 — выбор варианта, Enter — проверить/далее, Esc — закрыть меню */
        document.addEventListener('keydown', e => this.handleKeydown(e));
    }

    /** Загрузка вопросов: свои → tests.json → встроенные по умолчанию */
    async loadQuestions() {
        const custom = Utils.storageGet('custom_questions');
        if (Array.isArray(custom) && custom.length) {
            this.state.allQuestions = custom;
            return;
        }
        try {
            const res = await fetch('tests.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            this.state.allQuestions = QuestionValidator.validate(await res.json());
        } catch {
            /* file:// или файл отсутствует — работаем со встроенными вопросами */
            this.state.allQuestions = DEFAULT_QUESTIONS;
        }
    }

    /* ================= ОБЩИЕ ХЕЛПЕРЫ ================= */

    /** Включение/выключение стилей «чипа» (фильтры, настройки экзамена) */
    setChipClasses(el, active) {
        const on  = ['bg-primary-500', 'text-white', 'shadow-sm', 'border-primary-500'];
        const off = ['bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300',
                     'border-slate-200', 'dark:border-slate-700'];
        el.classList.toggle('border', true);
        on.forEach(c  => el.classList.toggle(c, active));
        off.forEach(c => el.classList.toggle(c, !active));
    }

    /** Значок сложности */
    difficultyBadge(d) {
        const map = {
            easy:   ['badge-success', 'Лёгкий'],
            medium: ['badge-warning', 'Средний'],
            hard:   ['badge-danger',  'Сложный']
        };
        const [cls, label] = map[d] || map.medium;
        return `<span class="badge ${cls}">${label}</span>`;
    }

    /** Цвет процента: зелёный / жёлтый / красный */
    percentColor(p) {
        if (p >= 70) return '#10b981';
        if (p >= 50) return '#f59e0b';
        return '#ef4444';
    }

    /** Плавная анимация числа от 0 до target */
    animateCounter(el, target, suffix = '') {
        const duration = 700;
        const start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /** Счётчики в сайдбаре + бейдж ошибок */
    updateGlobalStats() {
        const qCount = this.state.allQuestions.length;
        const eCount = this.state.errors.length;

        if (this.dom.sidebarQCount) this.dom.sidebarQCount.textContent = qCount;
        if (this.dom.sidebarECount) this.dom.sidebarECount.textContent = eCount;

        const badge = this.dom.errorsBadge;
        if (badge) {
            badge.textContent = eCount;
            badge.classList.toggle('hidden', eCount === 0);
            badge.classList.toggle('flex',   eCount > 0);
        }
    }

    /* ================= МОБИЛЬНОЕ МЕНЮ ================= */

    openMobileMenu() {
        this.dom.sidebar?.classList.remove('-translate-x-full');
        this.dom.overlay?.classList.remove('hidden');
        this.dom.mobileMenuBtn?.setAttribute('aria-expanded', 'true');
    }

    closeMobileMenu() {
        this.dom.sidebar?.classList.add('-translate-x-full');
        this.dom.overlay?.classList.add('hidden');
        this.dom.mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    }

    /* ================= ВКЛАДКИ ================= */

    switchTab(tab) {
        this.state.currentTab = tab;

        /* Показать нужную секцию, скрыть остальные */
        document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        document.getElementById('tab-' + tab)?.classList.remove('hidden');

        /* Подсветка активного пункта навигации */
        const activeCls   = ['bg-primary-500/10', 'text-primary-600', 'dark:bg-primary-400/10', 'dark:text-primary-300'];
        const inactiveCls = ['text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800'];

        this.dom.navLinks.forEach(link => {
            const isActive = link.dataset.tab === tab;
            link.setAttribute('aria-current', isActive);
            activeCls.forEach(c   => link.classList.toggle(c, isActive));
            inactiveCls.forEach(c => link.classList.toggle(c, !isActive));
        });

        /* Рендер содержимого вкладки */
        switch (tab) {
            case 'textbook': this.renderTextbook(); break;
            case 'exam':
                /* Если экзамен идёт — не сбрасываем его */
                if (!this.state.exam.active || this.state.exam.phase === 'setup') {
                    this.renderExamSetup();
                }
                break;
            case 'errors':   this.renderErrors();   break;
            case 'stats':    this.renderStats();    break;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ================= УЧЕБНИК ================= */

    /** Карточка вопроса с подсвеченными правильными ответами */
    buildQuestionCard(q) {
        const typeBadge = q.correct.length > 1
            ? '<span class="badge badge-info">Несколько ответов</span>'
            : '<span class="badge badge-info">Один ответ</span>';

        const checkSvg = '<svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
        const dotSvg   = '<span class="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span></span>';

        const options = q.options.map((opt, i) => {
            const isCorrect = q.correct.includes(i);
            return `
                <li class="flex items-start gap-2.5 px-3 py-2 rounded-lg ${
                    isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400'
                }">
                    ${isCorrect ? checkSvg : dotSvg}
                    <span class="text-sm leading-relaxed">${Utils.escapeHtml(opt)}</span>
                </li>`;
        }).join('');

        return `
            <article class="question-card animate-fade-in" role="listitem">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="badge badge-warning">${Utils.escapeHtml(q.category)}</span>
                    ${this.difficultyBadge(q.difficulty)}
                    ${typeBadge}
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-3 leading-snug">${Utils.escapeHtml(q.question)}</h3>
                <ul class="space-y-1.5">${options}</ul>
            </article>`;
    }

    renderTextbook() {
        const search = this.state.textbookSearch.toLowerCase().trim();

        const filtered = this.state.allQuestions.filter(q => {
            /* Фильтр по типу ответа */
            const matchType =
                this.state.textbookFilter === 'all' ||
                (this.state.textbookFilter === 'single' ? q.correct.length === 1 : q.correct.length > 1);

            /* Поиск по тексту вопроса и вариантам */
            const matchSearch = !search ||
                q.question.toLowerCase().includes(search) ||
                q.options.some(o => o.toLowerCase().includes(search));

            return matchType && matchSearch;
        });

        if (!filtered.length) {
            this.dom.textbookBox.innerHTML = `
                <div class="lg:col-span-2 text-center py-16 animate-fade-in">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Ничего не найдено</h3>
                    <p class="text-sm text-slate-500 mt-1">Попробуйте изменить запрос или сбросить фильтр</p>
                </div>`;
            return;
        }

        const counter = `<div class="lg:col-span-2 text-sm text-slate-500 dark:text-slate-400">Найдено вопросов: <strong class="text-slate-700 dark:text-slate-200">${filtered.length}</strong></div>`;
        this.dom.textbookBox.innerHTML = counter + filtered.map(q => this.buildQuestionCard(q)).join('');
    }

    /* ================= ЭКЗАМЕН: НАСТРОЙКИ ================= */

    renderExamSetup() {
        const ex = this.state.exam;
        ex.active = false;
        ex.phase = 'setup';
        this.stopTimer();

        const total = this.state.allQuestions.length;

        this.dom.examArea.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <div class="mb-8 animate-fade-in">
                    <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">🎯 Экзамен</h2>
                    <p class="mt-2 text-slate-500 dark:text-slate-400">В банке вопросов: <strong class="text-primary-600 dark:text-primary-400">${total}</strong>. Настройте параметры и начните.</p>
                </div>

                <div class="question-card space-y-7 animate-slide-up">

                    <!-- Сложность -->
                    <div>
                        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Сложность вопросов</p>
                        <div class="flex flex-wrap gap-2">
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="all">Все</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="easy">Лёгкие</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="medium">Средние</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="hard">Сложные</button>
                        </div>
                    </div>

                    <!-- Количество -->
                    <div>
                        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Количество вопросов</p>
                        <div class="flex flex-wrap gap-2">
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="5">5</button>
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="10">10</button>
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="all">Все</button>
                        </div>
                    </div>

                    <!-- Перемешивание -->
                    <div class="flex items-center justify-between gap-4">
                        <div>
                            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Перемешать вопросы</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Случайный порядок при каждой попытке</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="exam-shuffle" class="sr-only peer" checked>
                            <div class="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer-checked:bg-primary-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
                        </label>
                    </div>

                    <!-- Старт -->
                    <button id="exam-start-btn" class="btn-primary w-full py-3.5 text-base">
                        🚀 Начать экзамен
                    </button>
                </div>
            </div>`;

        /* Активные чипы по умолчанию: «Все» + «Все» */
        const chips = this.dom.examArea.querySelectorAll('.diff-chip, .count-chip');
        chips.forEach(chip => {
            const isDefault = chip.dataset.diff === 'all' || chip.dataset.count === 'all';
            this.setChipClasses(chip, isDefault);
            chip.addEventListener('click', () => {
                const group = chip.classList.contains('diff-chip') ? '.diff-chip' : '.count-chip';
                this.dom.examArea.querySelectorAll(group).forEach(c => this.setChipClasses(c, c === chip));
            });
        });

        document.getElementById('exam-start-btn').addEventListener('click', () => this.handleStartExam());
    }

    /** Читает настройки из DOM и запускает экзамен */
    handleStartExam() {
        const area = this.dom.examArea;
        const diff     = area.querySelector('.diff-chip.active')?.dataset.diff  || 'all';
        const countVal = area.querySelector('.count-chip.active')?.dataset.count || 'all';
        const shuffle  = area.querySelector('#exam-shuffle')?.checked !== false;

        /* Фильтруем банк по сложности */
        let pool = diff === 'all'
            ? [...this.state.allQuestions]
            : this.state.allQuestions.filter(q => q.difficulty === diff);

        if (!pool.length) {
            this.toast.warning('Нет вопросов выбранной сложности');
            return;
        }
        if (shuffle) pool = Utils.shuffle(pool);

        const count = countVal === 'all' ? pool.length : Math.min(parseInt(countVal, 10), pool.length);
        this.beginExam(pool.slice(0, count), 'normal');
    }

    /* ================= ЭКЗАМЕН: ПРОХОЖДЕНИЕ ================= */

    /** Общий старт для обычного экзамена и тренировки ошибок */
    beginExam(questions, mode) {
        if (!questions.length) {
            this.toast.warning('Нет вопросов для экзамена');
            return;
        }
        const ex = this.state.exam;
        ex.active = true;
        ex.phase = 'question';
        ex.mode = mode;
        ex.questions = questions;
        ex.currentIndex = 0;
        ex.userSelections = questions.map(() => []);
        ex.answerResults = [];
        ex.checked = false;
        ex.elapsedSeconds = 0;

        this.startTimer();
        this.renderExamQuestion();
    }

    startTimer() {
        this.stopTimer();
        const ex = this.state.exam;
        ex.timerInterval = setInterval(() => {
            ex.elapsedSeconds++;
            const el = document.getElementById('exam-timer');
            if (el) el.textContent = Utils.formatTimer(ex.elapsedSeconds);
        }, 1000);
    }

    stopTimer() {
        if (this.state.exam.timerInterval) {
            clearInterval(this.state.exam.timerInterval);
            this.state.exam.timerInterval = null;
        }
    }

    /** Экран текущего вопроса */
    renderExamQuestion() {
        const ex = this.state.exam;
        const q = q_safe(ex);
        const total = ex.questions.length;
        const isMulti = q.correct.length > 1;
        const progress = Math.round((ex.currentIndex / total) * 100);

        /* Функция-хелпер: безопасное извлечение текущего вопроса */
        function q_safe(state) { return state.questions[state.currentIndex]; }

        const optionsHtml = q.options.map((opt, i) => `
            <button class="option-btn" data-index="${i}" aria-pressed="false">
                <span class="option-indicator">${OPTION_LETTERS[i] ?? i + 1}</span>
                <span class="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">${Utils.escapeHtml(opt)}</span>
            </button>`).join('');

        this.dom.examArea.innerHTML = `
            <div class="max-w-3xl mx-auto animate-fade-in">

                <!-- Верхняя панель -->
                <div class="flex items-center justify-between mb-4 gap-3">
                    <button id="exam-quit-btn" class="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        Выйти
                    </button>
                    <span id="exam-counter" class="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Вопрос ${ex.currentIndex + 1} из ${total}
                    </span>
                    <span id="exam-timer" class="timer-display text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-3 py-1 rounded-lg">
                        ${Utils.formatTimer(ex.elapsedSeconds)}
                    </span>
                </div>

                <!-- Прогресс -->
                <div class="progress-bar mb-6">
                    <div id="exam-progress-fill" class="progress-bar-fill" style="width:${progress}%"></div>
                </div>

                <!-- Карточка вопроса -->
                <div class="question-card animate-slide-up">
                    <div class="flex flex-wrap items-center gap-2 mb-4">
                        <span class="badge badge-warning">${Utils.escapeHtml(q.category)}</span>
                        ${this.difficultyBadge(q.difficulty)}
                        ${isMulti ? '<span class="badge badge-info">Несколько ответов</span>' : ''}
                    </div>

                    <h3 id="exam-question-text" class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-2">
                        ${Utils.escapeHtml(q.question)}
                    </h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mb-5">
                        ${isMulti ? '☑ Выберите все правильные варианты' : '○ Выберите один вариант'}
                    </p>

                    <div id="exam-options" class="space-y-3">${optionsHtml}</div>

                    <!-- Обратная связь после проверки -->
                    <div id="exam-feedback" class="hidden mt-5"></div>

                    <!-- Кнопки управления -->
                    <div class="mt-6 flex items-center justify-between gap-3">
                        <p class="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                            ⌨ Клавиши 1–${Math.min(q.options.length, 9)} — выбор · Enter — ответ
                        </p>
                        <div class="flex gap-2 ml-auto">
                            <button id="exam-check-btn" class="btn-primary" disabled>Проверить ответ</button>
                            <button id="exam-next-btn" class="btn-primary hidden">Далее →</button>
                        </div>
                    </div>
                </div>
            </div>`;

        /* --- Привязка событий --- */
        document.getElementById('exam-quit-btn').addEventListener('click', () => this.quitExam());

        this.dom.examArea.querySelectorAll('#exam-options .option-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleOption(parseInt(btn.dataset.index, 10)));
        });

        document.getElementById('exam-check-btn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('exam-next-btn').addEventListener('click', () => this.nextQuestion());
    }

    /** Выбор / снятие варианта ответа */
    toggleOption(index) {
        const ex = this.state.exam;
        if (ex.checked || ex.phase !== 'question') return;

        const q = ex.questions[ex.currentIndex];
        const sel = ex.userSelections[ex.currentIndex];

        if (q.correct.length === 1) {
            /* Одиночный выбор: заменяем полностью */
            sel.length = 0;
            sel.push(index);
        } else {
            /* Множественный: переключаем */
            const pos = sel.indexOf(index);
            if (pos === -1) sel.push(index);
            else sel.splice(pos, 1);
        }

        /* Обновляем подсветку без полного перерендера */
        this.dom.examArea.querySelectorAll('#exam-options .option-btn').forEach(btn => {
            const i = parseInt(btn.dataset.index, 10);
            const selected = sel.includes(i);
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', selected);
        });

        /* Кнопка «Проверить» активна только при выбранном ответе */
        const checkBtn = document.getElementById('exam-check-btn');
        if (checkBtn) checkBtn.disabled = sel.length === 0;
    }

    /** Проверка ответа: подсветка, обратная связь, учёт ошибок */
    checkAnswer() {
        const ex = this.state.exam;
        if (ex.checked || ex.phase !== 'question') return;

        const q = ex.questions[ex.currentIndex];
        const sel = ex.userSelections[ex.currentIndex];
        if (!sel.length) return;

        ex.checked = true;
        const isCorrect = Utils.arraysEqual(sel, q.correct);
        ex.answerResults.push(isCorrect);

        /* Раскраска вариантов */
        this.dom.examArea.querySelectorAll('#exam-options .option-btn').forEach(btn => {
            const i = parseInt(btn.dataset.index, 10);
            btn.disabled = true;
            const indicator = btn.querySelector('.option-indicator');
            if (q.correct.includes(i)) {
                btn.classList.add('correct');
                if (indicator) indicator.textContent = '✓';
            } else if (sel.includes(i)) {
                btn.classList.add('incorrect');
                if (indicator) indicator.textContent = '✕';
            }
        });

        /* Панель обратной связи */
        const correctTexts = q.correct.map(i => q.options[i]).join('; ');
        const fb = document.getElementById('exam-feedback');
        fb.innerHTML = isCorrect
            ? `<div class="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                   <span class="text-xl">🎉</span>
                   <div>
                       <p class="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Верно!</p>
                       <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Отличная работа, так держать.</p>
                   </div>
               </div>`
            : `<div class="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                   <span class="text-xl">❌</span>
                   <div>
                       <p class="font-bold text-rose-700 dark:text-rose-300 text-sm">Неверно</p>
                       <p class="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                           Правильный ответ: <strong>${Utils.escapeHtml(correctTexts)}</strong>
                       </p>
                   </div>
               </div>`;
        fb.classList.remove('hidden');
        fb.classList.add('animate-scale-in');

        /* Учёт ошибок: неверно → в копилку, верно (в режиме тренировки) → убираем */
        if (isCorrect) {
            if (ex.mode === 'errors') this.removeError(q.id);
        } else {
            if (ex.mode === 'normal') this.addError(q);
        }

        /* Меняем кнопку «Проверить» на «Далее» */
        document.getElementById('exam-check-btn')?.classList.add('hidden');
        const nextBtn = document.getElementById('exam-next-btn');
        if (nextBtn) {
            nextBtn.classList.remove('hidden');
            nextBtn.textContent = ex.currentIndex === ex.questions.length - 1 ? 'Завершить 🏁' : 'Далее →';
            nextBtn.focus();
        }
    }

    /** Переход к следующему вопросу или к результатам */
    nextQuestion() {
        const ex = this.state.exam;
        if (!ex.checked) return;
        ex.currentIndex++;
        ex.checked = false;

        if (ex.currentIndex >= ex.questions.length) {
            this.finishExam();
        } else {
            this.renderExamQuestion();
        }
    }

    /** Досрочный выход с подтверждением */
    quitExam() {
        if (!confirm('Прервать экзамен? Прогресс не будет сохранён.')) return;
        this.stopTimer();
        this.state.exam.active = false;
        this.state.exam.phase = 'setup';
        this.renderExamSetup();
        this.toast.info('Экзамен прерван');
    }

    /* ================= ЭКЗАМЕН: РЕЗУЛЬТАТЫ ================= */

    finishExam() {
        const ex = this.state.exam;
        this.stopTimer();
        ex.phase = 'results';
        ex.active = false;

        const total = ex.questions.length;
        const correct = ex.answerResults.filter(Boolean).length;
        const wrong = total - correct;
        const percent = total ? Math.round((correct / total) * 100) : 0;
        const color = this.percentColor(percent);

        /* Сохраняем в историю */
        this.stats.addResult({
            mode: ex.mode,
            percent,
            correctCount: correct,
            totalCount: total,
            timeSpent: ex.elapsedSeconds
        });

        /* Эмоциональная подпись к результату */
        let emoji, title;
        if (percent >= 90)      { emoji = '🏆'; title = 'Великолепно!'; }
        else if (percent >= 70) { emoji = '🎉'; title = 'Хороший результат!'; }
        else if (percent >= 50) { emoji = '💪'; title = 'Неплохо, но можно лучше'; }
        else                    { emoji = '📚'; title = 'Стоит потренироваться'; }

        /* Кольцо прогресса (SVG): длина окружности r=52 */
        const C = 2 * Math.PI * 52;

        /* Список ошибок для разбора */
        const mistakesHtml = ex.questions
            .map((q, i) => ({ q, ok: ex.answerResults[i] }))
            .filter(item => !item.ok)
            .map(item => `
                <div class="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                    <p class="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1.5">${Utils.escapeHtml(item.q.question)}</p>
                    <p class="text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ Правильно: <strong>${Utils.escapeHtml(item.q.correct.map(i => item.q.options[i]).join('; '))}</strong>
                    </p>
                </div>`).join('');

        this.dom.examArea.innerHTML = `
            <div class="max-w-3xl mx-auto animate-fade-in">
                <div class="question-card text-center py-10 px-6">

                    <!-- Кольцо процента -->
                    <div class="relative inline-flex items-center justify-center mb-6">
                        <svg viewBox="0 0 120 120" class="w-36 h-36 -rotate-90">
                            <circle cx="60" cy="60" r="52" fill="none" stroke-width="10"
                                class="stroke-slate-200 dark:stroke-slate-700"/>
                            <circle id="result-ring" cx="60" cy="60" r="52" fill="none" stroke-width="10"
                                stroke-linecap="round"
                                style="stroke:${color}; stroke-dasharray:${C}; stroke-dashoffset:${C};
                                       transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1);"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span id="result-percent" class="text-4xl font-extrabold text-slate-900 dark:text-white">0%</span>
                            <span class="text-xs text-slate-400 mt-1">результат</span>
                        </div>
                    </div>

                    <div class="text-4xl mb-2">${emoji}</div>
                    <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">${title}</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">
                        ${ex.mode === 'errors' ? 'Тренировка над ошибками завершена' : 'Экзамен завершён'}
                    </p>

                    <!-- Цифры -->
                    <div class="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
                        <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                            <p class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">${correct}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Верно</p>
                        </div>
                        <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                            <p class="text-2xl font-extrabold text-rose-500">${wrong}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ошибки</p>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                            <p class="text-2xl font-extrabold text-slate-700 dark:text-slate-200">${Utils.formatTimer(ex.elapsedSeconds)}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Время</p>
                        </div>
                    </div>

                    <!-- Кнопки -->
                    <div class="flex flex-wrap justify-center gap-3">
                        <button id="result-retry-btn" class="btn-primary">🔄 Пройти ещё раз</button>
                        ${wrong > 0 ? '<button id="result-errors-btn" class="btn-secondary">❌ Работа над ошибками</button>' : ''}
                        <button id="result-textbook-btn" class="btn-secondary">📚 В учебник</button>
                    </div>
                </div>

                ${wrong > 0 ? `
                <div class="mt-6 animate-slide-up">
                    <h3 class="font-bold text-slate-800 dark:text-slate-200 mb-3">Разбор ошибок (${wrong})</h3>
                    <div class="space-y-3">${mistakesHtml}</div>
                </div>` : ''}
            </div>`;

        /* --- Анимации результата --- */
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const ring = document.getElementById('result-ring');
            if (ring) ring.style.strokeDashoffset = C * (1 - percent / 100);
        }));
        this.animateCounter(document.getElementById('result-percent'), percent, '%');
        if (percent >= 80) Confetti.burst();

        /* --- Кнопки результата --- */
        document.getElementById('result-retry-btn').addEventListener('click', () => this.renderExamSetup());
        document.getElementById('result-errors-btn')?.addEventListener('click', () => this.switchTab('errors'));
        document.getElementById('result-textbook-btn').addEventListener('click', () => this.switchTab('textbook'));
    }

    /* ================= РАБОТА НАД ОШИБКАМИ ================= */

    /** Добавить вопрос в копилку ошибок (без дублей) */
    addError(q) {
        if (this.state.errors.some(e => e.id === q.id)) return;
        this.state.errors.unshift({ ...q });
        Utils.storageSet('test_errors', this.state.errors);
        this.updateGlobalStats();
    }

    /** Убрать усвоенный вопрос из копилки */
    removeError(id) {
        const before = this.state.errors.length;
        this.state.errors = this.state.errors.filter(e => e.id !== id);
        if (this.state.errors.length !== before) {
            Utils.storageSet('test_errors', this.state.errors);
            this.updateGlobalStats();
            this.toast.success('Вопрос усвоен! Отличная работа ✅');
        }
    }

    renderErrors() {
        const errors = this.state.errors;

        if (!errors.length) {
            this.dom.errorsBox.innerHTML = `
                <div class="text-center py-16 animate-fade-in">
                    <div class="text-6xl mb-4">🎉</div>
                    <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">Ошибок нет!</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Здесь появятся вопросы, в которых вы ошиблись на экзамене.
                    </p>
                </div>`;
            return;
        }

        this.dom.errorsBox.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fade-in">
                <p class="text-sm text-slate-500 dark:text-slate-400">
                    Вопросов на повторение: <strong class="text-rose-500">${errors.length}</strong>
                </p>
                <div class="flex gap-2">
                    <button id="errors-train-btn" class="btn-primary">🏋️ Тренироваться</button>
                    <button id="errors-clear-btn" class="btn-secondary">Очистить</button>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
                ${errors.map(q => this.buildQuestionCard(q)).join('')}
            </div>`;

        document.getElementById('errors-train-btn').addEventListener('click', () => {
            /* Тренировка: перемешанные вопросы-ошибки, режим 'errors' */
            this.switchTab('exam');
            this.beginExam(Utils.shuffle(this.state.errors), 'errors');
        });

        document.getElementById('errors-clear-btn').addEventListener('click', () => {
            if (!confirm('Очистить весь список ошибок?')) return;
            this.state.errors = [];
            Utils.storageSet('test_errors', []);
            this.updateGlobalStats();
            this.renderErrors();
            this.toast.info('Список ошибок очищен');
        });
    }

    /* ================= СТАТИСТИКА ================= */

    renderStats() {
        const s = this.stats.getSummary();
        const history = this.stats.getHistory();

        /* Карточки-счётчики */
        const summaryHtml = `
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                <div class="stat-card">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Экзаменов</p>
                    <p id="stat-exams" class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">0</p>
                </div>
                <div class="stat-card">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Средний балл</p>
                    <p id="stat-avg" class="text-3xl font-extrabold text-primary-600 dark:text-primary-400 mt-2">0%</p>
                    <div class="progress-bar mt-3"><div class="progress-bar-fill" style="width:${s.avgPercent}%"></div></div>
                </div>
                <div class="stat-card">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Лучший</p>
                    <p id="stat-best" class="text-3xl font-extrabold text-emerald-500 mt-2">0%</p>
                </div>
                <div class="stat-card">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Время всего</p>
                    <p id="stat-time" class="text-xl font-extrabold text-slate-900 dark:text-white mt-2 leading-tight">0</p>
                </div>
            </div>`;

        /* История попыток */
        const historyHtml = history.length
            ? history.map(item => {
                const date = new Date(item.timestamp).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                const modeBadge = item.mode === 'errors'
                    ? '<span class="badge badge-warning">Работа над ошибками</span>'
                    : '<span class="badge badge-info">Экзамен</span>';
                return `
                    <div class="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 animate-fade-in">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0"
                             style="color:${this.percentColor(item.percent)}; background:${this.percentColor(item.percent)}1a;">
                            ${item.percent}%
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                ${modeBadge}
                                <span class="text-xs text-slate-400">${date}</span>
                            </div>
                            <div class="progress-bar mt-2">
                                <div class="progress-bar-fill" style="width:${item.percent}%; background:${this.percentColor(item.percent)}"></div>
                            </div>
                        </div>
                        <div class="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">
                            ${item.correctCount}/${item.totalCount}<br>${Utils.formatTimer(item.timeSpent || 0)}
                        </div>
                    </div>`;
            }).join('')
            : `<div class="text-center py-12">
                   <div class="text-5xl mb-3">📭</div>
                   <p class="text-sm text-slate-500 dark:text-slate-400">Пока нет ни одной попытки.<br>Сдайте первый экзамен!</p>
               </div>`;

        this.dom.statsBox.innerHTML = `
            ${summaryHtml}
            <div class="question-card animate-slide-up">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="font-bold text-slate-800 dark:text-slate-200">История попыток</h3>
                    ${history.length ? '<button id="stats-clear-btn" class="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors">Очистить историю</button>' : ''}
                </div>
                <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1">${historyHtml}</div>
            </div>`;

        /* Анимированные счётчики */
        this.animateCounter(document.getElementById('stat-exams'), s.totalExams);
        this.animateCounter(document.getElementById('stat-avg'),  s.avgPercent, '%');
        this.animateCounter(document.getElementById('stat-best'), s.bestPercent, '%');
        const timeEl = document.getElementById('stat-time');
        if (timeEl) timeEl.textContent = Utils.formatTime(s.totalTime);

        document.getElementById('stats-clear-btn')?.addEventListener('click', () => {
            if (!confirm('Удалить всю историю экзаменов?')) return;
            this.stats.clear();
            this.renderStats();
            this.toast.info('История очищена');
        });
    }

    /* ================= БАЗА ТЕСТОВ (импорт / экспорт) ================= */

    setupDatabase() {
        /* Импорт из файла */
        document.getElementById('json-file-input')?.addEventListener('change', async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                this.importFromText(await file.text());
            } catch {
                this.toast.error('Не удалось прочитать файл');
            }
            e.target.value = ''; /* позволяет выбрать тот же файл повторно */
        });

        /* Импорт из текста */
        document.getElementById('load-json-text-btn')?.addEventListener('click', () => {
            const text = document.getElementById('json-text-input')?.value || '';
            if (!text.trim()) {
                this.toast.warning('Вставьте JSON в текстовое поле');
                return;
            }
            this.importFromText(text);
        });

        /* Экспорт */
        document.getElementById('export-tests-btn')?.addEventListener('click', () => this.exportQuestions());

        /* Сброс к исходным вопросам */
        document.getElementById('reset-tests-btn')?.addEventListener('click', () => this.resetQuestions());

        /* Копирование промта для ИИ */
        document.getElementById('copy-ai-prompt-btn')?.addEventListener('click', () => this.copyAiPrompt());
    }

    /** Парсит JSON, валидирует и применяет как новый банк вопросов */
    importFromText(text) {
        try {
            const parsed = JSON.parse(text);
            const valid = QuestionValidator.validate(parsed);

            this.state.allQuestions = valid;
            Utils.storageSet('custom_questions', valid);

            this.updateGlobalStats();
            if (this.state.currentTab === 'textbook') this.renderTextbook();

            this.toast.success(`Импортировано вопросов: ${valid.length}`);
        } catch (err) {
            this.toast.error('Ошибка импорта: ' + err.message, 6000);
        }
    }

    /** Скачивает текущий банк вопросов файлом tests.json */
    exportQuestions() {
        const json = JSON.stringify(this.state.allQuestions, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'tests.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        this.toast.success('Файл tests.json скачан');
    }

    /** Возврат к вопросам по умолчанию */
    async resetQuestions() {
        if (!confirm('Сбросить банк вопросов к исходному? Ваши импортированные вопросы будут удалены.')) return;
        Utils.storageRemove('custom_questions');
        await this.loadQuestions();
        this.updateGlobalStats();
        if (this.state.currentTab === 'textbook') this.renderTextbook();
        this.toast.info('База вопросов сброшена к исходной');
    }

    /** Копирует текст промта в буфер обмена (с fallback для старых браузеров) */
    async copyAiPrompt() {
        const text = document.getElementById('ai-prompt-text')?.textContent || '';
        try {
            await navigator.clipboard.writeText(text);
            this.toast.success('Промт скопирован в буфер обмена');
        } catch {
            /* Fallback: через временный textarea */
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            this.toast.success('Промт скопирован в буфер обмена');
        }
    }

    /* ================= КЛАВИАТУРА ================= */

    handleKeydown(e) {
        /* Esc — закрыть мобильное меню */
        if (e.key === 'Escape') {
            this.closeMobileMenu();
            return;
        }

        const ex = this.state.exam;
        if (!ex.active || ex.phase !== 'question') return;

        /* Не перехватываем ввод в полях */
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        /* Цифры 1–9: выбор варианта */
        if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key, 10) - 1;
            const q = ex.questions[ex.currentIndex];
            if (q && idx < q.options.length && !ex.checked) {
                this.toggleOption(idx);
            }
            return;
        }

        /* Enter: проверить ответ или перейти дальше */
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!ex.checked) {
                if (ex.userSelections[ex.currentIndex]?.length) this.checkAnswer();
            } else {
                this.nextQuestion();
            }
        }
    }
}


/* ============================================================
   ЗАПУСК ПРИЛОЖЕНИЯ
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TestTrainerApp();
    window.app.init();
});
