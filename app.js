'use strict';

/* ============================================================
   ТРЕНАЖЁР ТЕСТОВ — app.js (v3.0)
   Поддержка: тестовые (choice) + открытые (open) вопросы
   ============================================================ */


/* ============================================================
   0. ВОПРОСЫ ПО УМОЛЧАНИЮ (fallback, если tests.json не загрузился)
   ============================================================ */
const DEFAULT_QUESTIONS = [
    { id: 1, type: 'choice', question: 'Какие планеты Солнечной системы относятся к газовым гигантам?', options: ['Марс', 'Юпитер', 'Сатурн', 'Венера'], correct: [1, 2], category: 'Астрономия', difficulty: 'easy' },
    { id: 2, type: 'choice', question: 'Какое животное считается самым крупным млекопитающим на Земле?', options: ['Африканский слон', 'Синий кит', 'Гигантский кальмар', 'Кашалот'], correct: [1], category: 'Биология', difficulty: 'easy' },
    { id: 3, type: 'choice', question: 'Что означает аббревиатура HTML?', options: ['HyperText Markup Language', 'HighTech Modern Language', 'HyperTransfer Markup Logic', 'HomeTool Markup Language'], correct: [0], category: 'Информатика', difficulty: 'easy' },
    { id: 4, type: 'open', question: 'Переведите двоичное число 1101011 в десятичную систему счисления. В ответе укажите число.', answer: '107', category: 'ОГЭ Информатика', difficulty: 'easy' },
    { id: 5, type: 'open', question: 'Найдите значение логического выражения: (1 И 0) ИЛИ (НЕ 0). Ответ запишите в виде 0 или 1.', answer: '1', category: 'ОГЭ Информатика', difficulty: 'easy' }
];

/* Русские буквы для вариантов: А, Б, В, Г... */
const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];


/* ============================================================
   1. УТИЛИТЫ
   ============================================================ */
const Utils = {
    /** Защита от XSS */
    escapeHtml(value) {
        const str = String(value ?? '');
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    arraysEqual(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const s1 = [...a].sort((x, y) => x - y);
        const s2 = [...b].sort((x, y) => x - y);
        return s1.every((v, i) => v === s2[i]);
    },
    /** Перемешивание Фишера–Йетса */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    formatTime(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h} ч. ${m} мин.`;
        if (m > 0) return `${m} мин. ${s} сек.`;
        return `${s} сек.`;
    },
    formatTimer(totalSec) {
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${m}:${s}`;
    },
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    },
    debounce(fn, delay = 250) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
    },
    storageGet(key, fallback = null) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
        catch { return fallback; }
    },
    storageSet(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch { return false; }
    },
    storageRemove(key) {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
};


/* ============================================================
   2. УВЕДОМЛЕНИЯ (toast)
   ============================================================ */
class ToastManager {
    constructor(containerId = 'toast-container') {
        this.container = document.getElementById(containerId);
    }
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
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }
    success(m) { this.show(m, 'success'); }
    error(m)   { this.show(m, 'error', 6000); }
    warning(m) { this.show(m, 'warning'); }
    info(m)    { this.show(m, 'info'); }
}


/* ============================================================
   3. ТЕМА (тёмная / светлая)
   ============================================================ */
class ThemeManager {
    constructor() {
        this.root = document.documentElement;
        this.apply(this.getInitialTheme(), false);
    }
    getInitialTheme() {
        const saved = localStorage.getItem('app_theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    apply(theme, save = true) {
        this.root.setAttribute('data-theme', theme);
        if (save) localStorage.setItem('app_theme', theme);
        const isDark = theme === 'dark';
        document.getElementById('theme-icon-light')?.classList.toggle('hidden', isDark);
        document.getElementById('theme-icon-dark')?.classList.toggle('hidden', !isDark);
        const label = document.getElementById('theme-label');
        if (label) label.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
    }
    toggle() {
        this.apply(this.root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
}


/* ============================================================
   4. ВАЛИДАТОР ВОПРОСОВ (choice + open)
   ============================================================ */
class QuestionValidator {
    static validate(data) {
        if (!Array.isArray(data)) throw new Error('Данные должны быть массивом вопросов');
        if (data.length === 0) throw new Error('Массив вопросов не может быть пустым');

        return data.map((item, i) => {
            const n = i + 1;
            if (!item || typeof item.question !== 'string' || !item.question.trim()) {
                throw new Error(`Вопрос #${n}: отсутствует текст вопроса`);
            }

            const type = item.type === 'open' ? 'open' : 'choice';
            const base = {
                id: item.id ?? n,
                type,
                question: item.question.trim(),
                category: (typeof item.category === 'string' && item.category.trim()) ? item.category.trim() : 'Общее',
                difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium'
            };

            /* --- ОТКРЫТЫЙ ВОПРОС --- */
            if (type === 'open') {
                let answers = [];
                if (Array.isArray(item.answers)) {
                    answers = item.answers.map(String).map(s => s.trim()).filter(Boolean);
                } else if (typeof item.answer === 'string' && item.answer.trim()) {
                    answers = [item.answer.trim()];
                }
                if (!answers.length) {
                    throw new Error(`Вопрос #${n} (открытый): не указан правильный ответ (поле "answer" или "answers")`);
                }
                return { ...base, answers };
            }

            /* --- ТЕСТОВЫЙ ВОПРОС --- */
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
            return {
                ...base,
                options: item.options.map(String),
                correct: [...new Set(item.correct)].sort((a, b) => a - b)
            };
        });
    }
}


/* ============================================================
   5. СТАТИСТИКА (история экзаменов)
   ============================================================ */
class StatsManager {
    constructor() { this.key = 'exam_history'; }
    getHistory() { return Utils.storageGet(this.key, []); }
    addResult(result) {
        const history = this.getHistory();
        history.unshift({ id: Utils.generateId(), timestamp: Date.now(), ...result });
        if (history.length > 50) history.length = 50;
        Utils.storageSet(this.key, history);
    }
    getSummary() {
        const h = this.getHistory();
        if (!h.length) return { totalExams: 0, avgPercent: 0, bestPercent: 0, totalTime: 0, totalQuestions: 0 };
        const percents = h.map(x => x.percent || 0);
        return {
            totalExams: h.length,
            avgPercent: Math.round(percents.reduce((a, b) => a + b, 0) / h.length),
            bestPercent: Math.max(...percents),
            totalTime: h.reduce((a, x) => a + (x.timeSpent || 0), 0),
            totalQuestions: h.reduce((a, x) => a + (x.totalCount || 0), 0)
        };
    }
    clear() { Utils.storageRemove(this.key); }
}


/* ============================================================
   6. КОНФЕТТИ
   ============================================================ */
class Confetti {
    static burst(count = 90) {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            const size = 6 + Math.random() * 8;
            el.style.cssText = [
                'position:fixed', 'top:-20px', `left:${Math.random() * 100}vw`,
                `width:${size}px`, `height:${size * 0.45}px`,
                `background:${colors[i % colors.length]}`,
                'z-index:9999', 'pointer-events:none', 'border-radius:2px'
            ].join(';');
            document.body.appendChild(el);
            el.animate(
                [
                    { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                    { transform: `translateY(${innerHeight + 60}px) rotate(${540 + Math.random() * 720}deg)`, opacity: 0.7 }
                ],
                { duration: 1800 + Math.random() * 1600, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
            ).onfinish = () => el.remove();
        }
    }
}


/* ============================================================
   7. ГЛАВНЫЙ КЛАСС ПРИЛОЖЕНИЯ
   ============================================================ */
class TestTrainerApp {
    constructor() {
        this.toast = new ToastManager();
        this.theme = new ThemeManager();
        this.stats = new StatsManager();
        this.state = {
            allQuestions: [],
            errors: [],
            currentTab: 'textbook',
            textbookFilter: 'all',
            textbookSearch: '',
            exam: {
                active: false,
                phase: 'setup',
                mode: 'normal',
                questions: [],
                currentIndex: 0,
                userSelections: [],   // для choice — массив индексов, для open — строка
                answerResults: [],
                checked: false,
                elapsedSeconds: 0,
                timerInterval: null
            }
        };
    }

    async init() {
        await this.loadQuestions();
        this.state.errors = Utils.storageGet('test_errors', []);
        this.cacheDom();
        this.bindEvents();
        this.setupDatabase();
        this.switchTab('textbook');
        this.updateGlobalStats();
    }

    cacheDom() {
        this.dom = {
            sidebar: document.getElementById('sidebar'),
            overlay: document.getElementById('mobile-overlay'),
            mobileMenuBtn: document.getElementById('mobile-menu-btn'),
            navLinks: document.querySelectorAll('.nav-link'),
            errorsBadge: document.getElementById('errors-badge'),
            sidebarQCount: document.getElementById('sidebar-question-count'),
            sidebarECount: document.getElementById('sidebar-error-count'),
            textbookSearch: document.getElementById('textbook-search'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            textbookBox: document.getElementById('textbook-container'),
            examArea: document.getElementById('exam-dynamic-area'),
            errorsBox: document.getElementById('errors-container'),
            statsBox: document.getElementById('stats-container')
        };
    }

    bindEvents() {
        this.dom.navLinks.forEach(link => {
            link.addEventListener('click', () => { this.switchTab(link.dataset.tab); this.closeMobileMenu(); });
        });
        this.dom.mobileMenuBtn?.addEventListener('click', () => this.openMobileMenu());
        this.dom.overlay?.addEventListener('click', () => this.closeMobileMenu());
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.theme.toggle());
        document.getElementById('mobile-theme-toggle')?.addEventListener('click', () => this.theme.toggle());

        this.dom.textbookSearch?.addEventListener('input', Utils.debounce(e => {
            this.state.textbookSearch = e.target.value;
            this.renderTextbook();
        }, 250));

        this.dom.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.textbookFilter = btn.dataset.filter;
                this.dom.filterBtns.forEach(b => this.setChipClasses(b, b === btn));
                this.renderTextbook();
            });
        });

        document.addEventListener('keydown', e => this.handleKeydown(e));
    }

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
            this.state.allQuestions = DEFAULT_QUESTIONS;
        }
    }

    /* ================= ХЕЛПЕРЫ ================= */

    setChipClasses(el, active) {
        const on  = ['bg-primary-500', 'text-white', 'shadow-sm', 'border-primary-500'];
        const off = ['bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border-slate-200', 'dark:border-slate-700'];
        el.classList.add('border');
        on.forEach(c => el.classList.toggle(c, active));
        off.forEach(c => el.classList.toggle(c, !active));
    }

    difficultyBadge(d) {
        const map = { easy: ['badge-success', 'Лёгкий'], medium: ['badge-warning', 'Средний'], hard: ['badge-danger', 'Сложный'] };
        const [cls, label] = map[d] || map.medium;
        return `<span class="badge ${cls}">${label}</span>`;
    }

    typeBadge(q) {
        if (q.type === 'open') return '<span class="badge badge-info">✍ Открытый</span>';
        return q.correct.length > 1
            ? '<span class="badge badge-info">Несколько ответов</span>'
            : '<span class="badge badge-info">Один ответ</span>';
    }

    percentColor(p) {
        if (p >= 70) return '#10b981';
        if (p >= 50) return '#f59e0b';
        return '#ef4444';
    }

    animateCounter(el, target, suffix = '') {
        if (!el) return;
        const duration = 700;
        const start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    updateGlobalStats() {
        const qCount = this.state.allQuestions.length;
        const eCount = this.state.errors.length;
        if (this.dom.sidebarQCount) this.dom.sidebarQCount.textContent = qCount;
        if (this.dom.sidebarECount) this.dom.sidebarECount.textContent = eCount;
        const badge = this.dom.errorsBadge;
        if (badge) {
            badge.textContent = eCount;
            badge.classList.toggle('hidden', eCount === 0);
            badge.classList.toggle('flex', eCount > 0);
        }
    }

    /** Нормализация текста открытого ответа: регистр, пробелы, ё→е */
    normalizeOpenAnswer(text) {
        return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/ё/g, 'е');
    }

    /** Проверка открытого ответа (учитывает все допустимые варианты) */
    isOpenCorrect(userText, answers) {
        const normalized = this.normalizeOpenAnswer(userText);
        if (!normalized) return false;
        return answers.some(a => this.normalizeOpenAnswer(a) === normalized);
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
        document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        document.getElementById('tab-' + tab)?.classList.remove('hidden');

        const activeCls = ['bg-primary-500/10', 'text-primary-600', 'dark:bg-primary-400/10', 'dark:text-primary-300'];
        const inactiveCls = ['text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800'];
        this.dom.navLinks.forEach(link => {
            const isActive = link.dataset.tab === tab;
            link.setAttribute('aria-current', isActive);
            activeCls.forEach(c => link.classList.toggle(c, isActive));
            inactiveCls.forEach(c => link.classList.toggle(c, !isActive));
        });

        switch (tab) {
            case 'textbook': this.renderTextbook(); break;
            case 'exam':
                if (!this.state.exam.active || this.state.exam.phase === 'setup') this.renderExamSetup();
                break;
            case 'errors': this.renderErrors(); break;
            case 'stats': this.renderStats(); break;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ================= УЧЕБНИК ================= */

    buildQuestionCard(q) {
        const checkSvg = '<svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
        const dotSvg = '<span class="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span></span>';

        let answerBlock;
        if (q.type === 'open') {
            answerBlock = `
                <div class="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium">
                    ${checkSvg}
                    <span class="text-sm leading-relaxed">${Utils.escapeHtml(q.answers.join('  /  '))}</span>
                </div>`;
        } else {
            answerBlock = `<ul class="space-y-1.5">${q.options.map((opt, i) => {
                const isCorrect = q.correct.includes(i);
                return `
                    <li class="flex items-start gap-2.5 px-3 py-2 rounded-lg ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-600 dark:text-slate-400'}">
                        ${isCorrect ? checkSvg : dotSvg}
                        <span class="text-sm leading-relaxed">${Utils.escapeHtml(opt)}</span>
                    </li>`;
            }).join('')}</ul>`;
        }

        return `
            <article class="question-card animate-fade-in" role="listitem">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="badge badge-warning">${Utils.escapeHtml(q.category)}</span>
                    ${this.difficultyBadge(q.difficulty)}
                    ${this.typeBadge(q)}
                </div>
                <h3 class="font-bold text-slate-900 dark:text-white mb-3 leading-snug whitespace-pre-line">${Utils.escapeHtml(q.question)}</h3>
                ${answerBlock}
            </article>`;
    }

    renderTextbook() {
        const search = this.state.textbookSearch.toLowerCase().trim();
        const filtered = this.state.allQuestions.filter(q => {
            const matchType =
                this.state.textbookFilter === 'all' ||
                (this.state.textbookFilter === 'single' ? (q.type === 'choice' && q.correct.length === 1) : (q.type === 'open' || q.correct.length > 1));
            const matchSearch = !search ||
                q.question.toLowerCase().includes(search) ||
                (q.type === 'open'
                    ? q.answers.some(a => a.toLowerCase().includes(search))
                    : q.options.some(o => o.toLowerCase().includes(search)));
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
                    <div>
                        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Сложность вопросов</p>
                        <div class="flex flex-wrap gap-2">
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="all">Все</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="easy">Лёгкие</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="medium">Средние</button>
                            <button class="diff-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-diff="hard">Сложные</button>
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Количество вопросов</p>
                        <div class="flex flex-wrap gap-2">
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="5">5</button>
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="10">10</button>
                            <button class="count-chip px-4 py-2 rounded-xl text-sm font-medium border transition-all" data-count="all">Все</button>
                        </div>
                    </div>
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
                    <button id="exam-start-btn" class="btn-primary w-full py-3.5 text-base">🚀 Начать экзамен</button>
                </div>
            </div>`;

        this.dom.examArea.querySelectorAll('.diff-chip, .count-chip').forEach(chip => {
            const isDefault = chip.dataset.diff === 'all' || chip.dataset.count === 'all';
            this.setChipClasses(chip, isDefault);
            chip.addEventListener('click', () => {
                const group = chip.classList.contains('diff-chip') ? '.diff-chip' : '.count-chip';
                this.dom.examArea.querySelectorAll(group).forEach(c => this.setChipClasses(c, c === chip));
            });
        });

        document.getElementById('exam-start-btn').addEventListener('click', () => this.handleStartExam());
    }

    handleStartExam() {
        const area = this.dom.examArea;
        const diff = area.querySelector('.diff-chip.active')?.dataset.diff || 'all';
        const countVal = area.querySelector('.count-chip.active')?.dataset.count || 'all';
        const shuffle = area.querySelector('#exam-shuffle')?.checked !== false;

        let pool = diff === 'all' ? [...this.state.allQuestions] : this.state.allQuestions.filter(q => q.difficulty === diff);
        if (!pool.length) { this.toast.warning('Нет вопросов выбранной сложности'); return; }
        if (shuffle) pool = Utils.shuffle(pool);

        const count = countVal === 'all' ? pool.length : Math.min(parseInt(countVal, 10), pool.length);
        this.beginExam(pool.slice(0, count), 'normal');
    }

    /* ================= ЭКЗАМЕН: ПРОХОЖДЕНИЕ ================= */

    beginExam(questions, mode) {
        if (!questions.length) { this.toast.warning('Нет вопросов для экзамена'); return; }
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

    renderExamQuestion() {
        const ex = this.state.exam;
        const q = ex.questions[ex.currentIndex];
        const total = ex.questions.length;
        const isOpen = q.type === 'open';
        const isMulti = !isOpen && q.correct.length > 1;
        const progress = Math.round((ex.currentIndex / total) * 100);

        /* Тело вопроса: либо варианты, либо поле ввода */
        let bodyHtml;
        if (isOpen) {
            bodyHtml = `
                <input id="exam-open-input" type="text" autocomplete="off" spellcheck="false"
                    placeholder="Введите ваш ответ..."
                    class="answer-input w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                    aria-label="Ваш ответ" />`;
        } else {
            bodyHtml = `<div id="exam-options" class="space-y-3">${q.options.map((opt, i) => `
                <button class="option-btn" data-index="${i}" aria-pressed="false">
                    <span class="option-indicator">${OPTION_LETTERS[i] ?? i + 1}</span>
                    <span class="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">${Utils.escapeHtml(opt)}</span>
                </button>`).join('')}</div>`;
        }

        const hint = isOpen
            ? '✍ Введите ответ в поле и нажмите «Проверить» (или Enter)'
            : (isMulti ? '☑ Выберите все правильные варианты' : '○ Выберите один вариант');

        this.dom.examArea.innerHTML = `
            <div class="max-w-3xl mx-auto animate-fade-in">
                <div class="flex items-center justify-between mb-4 gap-3">
                    <button id="exam-quit-btn" class="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        Выйти
                    </button>
                    <span id="exam-counter" class="text-sm font-semibold text-slate-500 dark:text-slate-400">Вопрос ${ex.currentIndex + 1} из ${total}</span>
                    <span id="exam-timer" class="timer-display text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-3 py-1 rounded-lg">${Utils.formatTimer(ex.elapsedSeconds)}</span>
                </div>
                <div class="progress-bar mb-6">
                    <div id="exam-progress-fill" class="progress-bar-fill" style="width:${progress}%"></div>
                </div>
                <div class="question-card animate-slide-up">
                    <div class="flex flex-wrap items-center gap-2 mb-4">
                        <span class="badge badge-warning">${Utils.escapeHtml(q.category)}</span>
                        ${this.difficultyBadge(q.difficulty)}
                        ${this.typeBadge(q)}
                    </div>
                    <h3 id="exam-question-text" class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-2 whitespace-pre-line">${Utils.escapeHtml(q.question)}</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mb-5">${hint}</p>
                    ${bodyHtml}
                    <div id="exam-feedback" class="hidden mt-5"></div>
                    <div class="mt-6 flex items-center justify-between gap-3">
                        <p class="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                            ${isOpen ? '⌨ Enter — проверить ответ' : `⌨ Клавиши 1–${Math.min(q.options.length, 9)} — выбор · Enter — ответ`}
                        </p>
                        <div class="flex gap-2 ml-auto">
                            <button id="exam-check-btn" class="btn-primary" ${isOpen ? 'disabled' : 'disabled'}>Проверить ответ</button>
                            <button id="exam-next-btn" class="btn-primary hidden">Далее →</button>
                        </div>
                    </div>
                </div>
            </div>`;

        /* --- События --- */
        document.getElementById('exam-quit-btn').addEventListener('click', () => this.quitExam());
        document.getElementById('exam-check-btn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('exam-next-btn').addEventListener('click', () => this.nextQuestion());

        if (isOpen) {
            const input = document.getElementById('exam-open-input');
            input.addEventListener('input', () => {
                const checkBtn = document.getElementById('exam-check-btn');
                if (checkBtn) checkBtn.disabled = !input.value.trim();
            });
            input.focus();
        } else {
            this.dom.examArea.querySelectorAll('#exam-options .option-btn').forEach(btn => {
                btn.addEventListener('click', () => this.toggleOption(parseInt(btn.dataset.index, 10)));
            });
        }
    }

    toggleOption(index) {
        const ex = this.state.exam;
        if (ex.checked || ex.phase !== 'question') return;
        const q = ex.questions[ex.currentIndex];
        if (q.type === 'open') return;

        const sel = ex.userSelections[ex.currentIndex];
        if (q.correct.length === 1) {
            sel.length = 0;
            sel.push(index);
        } else {
            const pos = sel.indexOf(index);
            if (pos === -1) sel.push(index);
            else sel.splice(pos, 1);
        }

        this.dom.examArea.querySelectorAll('#exam-options .option-btn').forEach(btn => {
            const i = parseInt(btn.dataset.index, 10);
            const selected = sel.includes(i);
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', selected);
        });

        const checkBtn = document.getElementById('exam-check-btn');
        if (checkBtn) checkBtn.disabled = sel.length === 0;
    }

    checkAnswer() {
        const ex = this.state.exam;
        if (ex.checked || ex.phase !== 'question') return;
        const q = ex.questions[ex.currentIndex];

        let isCorrect;
        let correctText;

        if (q.type === 'open') {
            /* --- ОТКРЫТЫЙ ВОПРОС --- */
            const input = document.getElementById('exam-open-input');
            const userText = (input?.value ?? '').trim();
            if (!userText) return;

            isCorrect = this.isOpenCorrect(userText, q.answers);
            correctText = q.answers.join(' / ');
            ex.userSelections[ex.currentIndex] = userText; // сохраняем строку

            if (input) {
                input.disabled = true;
                input.classList.add(isCorrect ? 'input-correct' : 'input-incorrect');
            }
        } else {
            /* --- ТЕСТОВЫЙ ВОПРОС --- */
            const sel = ex.userSelections[ex.currentIndex];
            if (!sel.length) return;
            isCorrect = Utils.arraysEqual(sel, q.correct);
            correctText = q.correct.map(i => q.options[i]).join('; ');

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
        }

        ex.checked = true;
        ex.answerResults.push(isCorrect);

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
                       <p class="text-xs text-rose-600 dark:text-rose-400 mt-0.5">Правильный ответ: <strong>${Utils.escapeHtml(correctText)}</strong></p>
                   </div>
               </div>`;
        fb.classList.remove('hidden');
        fb.classList.add('animate-scale-in');

        if (isCorrect) {
            if (ex.mode === 'errors') this.removeError(q.id);
        } else {
            if (ex.mode === 'normal') this.addError(q);
        }

        document.getElementById('exam-check-btn')?.classList.add('hidden');
        const nextBtn = document.getElementById('exam-next-btn');
        if (nextBtn) {
            nextBtn.classList.remove('hidden');
            nextBtn.textContent = ex.currentIndex === ex.questions.length - 1 ? 'Завершить 🏁' : 'Далее →';
            nextBtn.focus();
        }
    }

    nextQuestion() {
        const ex = this.state.exam;
        if (!ex.checked) return;
        ex.currentIndex++;
        ex.checked = false;
        if (ex.currentIndex >= ex.questions.length) this.finishExam();
        else this.renderExamQuestion();
    }

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

        this.stats.addResult({ mode: ex.mode, percent, correctCount: correct, totalCount: total, timeSpent: ex.elapsedSeconds });

        let emoji, title;
        if (percent >= 90)      { emoji = '🏆'; title = 'Великолепно!'; }
        else if (percent >= 70) { emoji = '🎉'; title = 'Хороший результат!'; }
        else if (percent >= 50) { emoji = '💪'; title = 'Неплохо, но можно лучше'; }
        else                    { emoji = '📚'; title = 'Стоит потренироваться'; }

        const C = 2 * Math.PI * 52;

        /* Разбор ошибок (учитывает оба типа) */
        const mistakesHtml = ex.questions
            .map((q, i) => ({ q, ok: ex.answerResults[i], user: ex.userSelections[i] }))
            .filter(item => !item.ok)
            .map(item => {
                const correctText = item.q.type === 'open'
                    ? item.q.answers.join(' / ')
                    : item.q.correct.map(i => item.q.options[i]).join('; ');
                const yourAnswer = item.q.type === 'open'
                    ? (item.user || '—')
                    : (Array.isArray(item.user) && item.user.length ? item.user.map(i => item.q.options[i]).join('; ') : '—');
                return `
                    <div class="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                        <p class="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1.5 whitespace-pre-line">${Utils.escapeHtml(item.q.question)}</p>
                        <p class="text-xs text-rose-500 mb-1">✗ Ваш ответ: <strong>${Utils.escapeHtml(yourAnswer)}</strong></p>
                        <p class="text-xs text-emerald-600 dark:text-emerald-400">✓ Правильно: <strong>${Utils.escapeHtml(correctText)}</strong></p>
                    </div>`;
            }).join('');

        this.dom.examArea.innerHTML = `
            <div class="max-w-3xl mx-auto animate-fade-in">
                <div class="question-card text-center py-10 px-6">
                    <div class="relative inline-flex items-center justify-center mb-6">
                        <svg viewBox="0 0 120 120" class="w-36 h-36 -rotate-90">
                            <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" class="stroke-slate-200 dark:stroke-slate-700"/>
                            <circle id="result-ring" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round"
                                style="stroke:${color}; stroke-dasharray:${C}; stroke-dashoffset:${C}; transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1);"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span id="result-percent" class="text-4xl font-extrabold text-slate-900 dark:text-white">0%</span>
                            <span class="text-xs text-slate-400 mt-1">результат</span>
                        </div>
                    </div>
                    <div class="text-4xl mb-2">${emoji}</div>
                    <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">${title}</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">${ex.mode === 'errors' ? 'Тренировка над ошибками завершена' : 'Экзамен завершён'}</p>
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

        requestAnimationFrame(() => requestAnimationFrame(() => {
            const ring = document.getElementById('result-ring');
            if (ring) ring.style.strokeDashoffset = C * (1 - percent / 100);
        }));
        this.animateCounter(document.getElementById('result-percent'), percent, '%');
        if (percent >= 80) Confetti.burst();

        document.getElementById('result-retry-btn').addEventListener('click', () => this.renderExamSetup());
        document.getElementById('result-errors-btn')?.addEventListener('click', () => this.switchTab('errors'));
        document.getElementById('result-textbook-btn').addEventListener('click', () => this.switchTab('textbook'));
    }

    /* ================= РАБОТА НАД ОШИБКАМИ ================= */

    addError(q) {
        if (this.state.errors.some(e => e.id === q.id)) return;
        this.state.errors.unshift({ ...q });
        Utils.storageSet('test_errors', this.state.errors);
        this.updateGlobalStats();
    }

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
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Здесь появятся вопросы, в которых вы ошиблись на экзамене.</p>
                </div>`;
            return;
        }
        this.dom.errorsBox.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fade-in">
                <p class="text-sm text-slate-500 dark:text-slate-400">Вопросов на повторение: <strong class="text-rose-500">${errors.length}</strong></p>
                <div class="flex gap-2">
                    <button id="errors-train-btn" class="btn-primary">🏋️ Тренироваться</button>
                    <button id="errors-clear-btn" class="btn-secondary">Очистить</button>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
                ${errors.map(q => this.buildQuestionCard(q)).join('')}
            </div>`;

        document.getElementById('errors-train-btn').addEventListener('click', () => {
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

        const historyHtml = history.length
            ? history.map(item => {
                const date = new Date(item.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const modeBadge = item.mode === 'errors'
                    ? '<span class="badge badge-warning">Работа над ошибками</span>'
                    : '<span class="badge badge-info">Экзамен</span>';
                return `
                    <div class="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 animate-fade-in">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0"
                             style="color:${this.percentColor(item.percent)}; background:${this.percentColor(item.percent)}1a;">${item.percent}%</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2">${modeBadge}<span class="text-xs text-slate-400">${date}</span></div>
                            <div class="progress-bar mt-2"><div class="progress-bar-fill" style="width:${item.percent}%; background:${this.percentColor(item.percent)}"></div></div>
                        </div>
                        <div class="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">${item.correctCount}/${item.totalCount}<br>${Utils.formatTimer(item.timeSpent || 0)}</div>
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

        this.animateCounter(document.getElementById('stat-exams'), s.totalExams);
        this.animateCounter(document.getElementById('stat-avg'), s.avgPercent, '%');
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

    /* ================= БАЗА ТЕСТОВ ================= */

    setupDatabase() {
        document.getElementById('json-file-input')?.addEventListener('change', async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try { this.importFromText(await file.text()); }
            catch { this.toast.error('Не удалось прочитать файл'); }
            e.target.value = '';
        });
        document.getElementById('load-json-text-btn')?.addEventListener('click', () => {
            const text = document.getElementById('json-text-input')?.value || '';
            if (!text.trim()) { this.toast.warning('Вставьте JSON в текстовое поле'); return; }
            this.importFromText(text);
        });
        document.getElementById('export-tests-btn')?.addEventListener('click', () => this.exportQuestions());
        document.getElementById('reset-tests-btn')?.addEventListener('click', () => this.resetQuestions());
        document.getElementById('copy-ai-prompt-btn')?.addEventListener('click', () => this.copyAiPrompt());
    }

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
            this.toast.error('Ошибка импорта: ' + err.message);
        }
    }

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

    async resetQuestions() {
        if (!confirm('Сбросить банк вопросов к исходному? Ваши импортированные вопросы будут удалены.')) return;
        Utils.storageRemove('custom_questions');
        await this.loadQuestions();
        this.updateGlobalStats();
        if (this.state.currentTab === 'textbook') this.renderTextbook();
        this.toast.info('База вопросов сброшена к исходной');
    }

    async copyAiPrompt() {
        const text = document.getElementById('ai-prompt-text')?.textContent || '';
        try {
            await navigator.clipboard.writeText(text);
            this.toast.success('Промт скопирован в буфер обмена');
        } catch {
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
        if (e.key === 'Escape') { this.closeMobileMenu(); return; }

        const ex = this.state.exam;
        if (!ex.active || ex.phase !== 'question') return;

        const tag = e.target.tagName;

        /* Enter в поле открытого ответа — проверить */
        if (tag === 'INPUT' && e.key === 'Enter') {
            e.preventDefault();
            if (!ex.checked) this.checkAnswer();
            return;
        }

        /* Не перехватываем ввод в полях */
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        /* Цифры 1–9 — выбор варианта (только для тестовых) */
        if (e.key >= '1' && e.key <= '9') {
            const q = ex.questions[ex.currentIndex];
            if (q && q.type === 'choice' && !ex.checked) {
                const idx = parseInt(e.key, 10) - 1;
                if (idx < q.options.length) this.toggleOption(idx);
            }
            return;
        }

        /* Enter — проверить / далее */
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!ex.checked) {
                const q = ex.questions[ex.currentIndex];
                const hasAnswer = q.type === 'open'
                    ? !!String(ex.userSelections[ex.currentIndex] || '').trim()
                    : (ex.userSelections[ex.currentIndex]?.length > 0);
                if (hasAnswer) this.checkAnswer();
            } else {
                this.nextQuestion();
            }
        }
    }
}


/* ============================================================
   ЗАПУСК
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TestTrainerApp();
    window.app.init();
});
