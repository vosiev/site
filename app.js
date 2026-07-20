'use strict';

/* === УТИЛИТЫ === */
const Utils = {
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    arraysEqual(arr1, arr2) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        if (arr1.length !== arr2.length) return false;
        const s1 = [...arr1].sort((a,b) => a-b);
        const s2 = [...arr2].sort((a,b) => a-b);
        return s1.every((v,i) => v === s2[i]);
    },
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    formatTime(s) { const m = Math.floor(s/60); return m === 0 ? `${s} сек.` : `${m} мин. ${s%60} сек.`; },
    formatTimer(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; },
    generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,9); },
    debounce(fn, delay=300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; },
    storageGet(key, fallback=null) { try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : fallback; } catch(e) { return fallback; } },
    storageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { return false; } },
    storageRemove(key) { try { localStorage.removeItem(key); } catch(e) {} }
};

/* === TOAST MANAGER === */
class ToastManager {
    constructor(id='toast-container') { this.container = document.getElementById(id); }
    show(message, type='info', duration=4000) {
        if (!this.container) return;
        const colors = { success:'bg-emerald-600/95 text-white', error:'bg-rose-600/95 text-white', warning:'bg-amber-500/95 text-white', info:'bg-indigo-600/95 text-white' };
        const toast = document.createElement('div');
        toast.className = `toast ${colors[type]||colors.info}`;
        toast.setAttribute('role','alert');
        toast.innerHTML = `<span>${Utils.escapeHtml(message)}</span>`;
        this.container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hide'); setTimeout(() => toast.remove(), 400); }, duration);
    }
    success(m) { this.show(m,'success'); }
    error(m) { this.show(m,'error'); }
    warning(m) { this.show(m,'warning'); }
    info(m) { this.show(m,'info'); }
}

/* === THEME MANAGER === */
class ThemeManager {
    constructor() { this.root = document.documentElement; this.init(); }
    init() {
        const saved = localStorage.getItem('app_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.set(saved || (prefersDark ? 'dark' : 'light'), false);
    }
    set(theme, save=true) {
        this.root.setAttribute('data-theme', theme);
        if (save) localStorage.setItem('app_theme', theme);
        const isDark = theme === 'dark';
        document.getElementById('theme-icon-light')?.classList.toggle('hidden', !isDark);
        document.getElementById('theme-icon-dark')?.classList.toggle('hidden', isDark);
        const label = document.getElementById('theme-label');
        if (label) label.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
    }
    toggle() { this.set(this.root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
}

/* === QUESTION VALIDATOR === */
class QuestionValidator {
    static validate(data) {
        if (!Array.isArray(data)) throw new Error('Данные должны быть массивом');
        if (data.length === 0) throw new Error('Массив не может быть пустым');
        return data.map((item, i) => {
            if (!item.question?.trim()) throw new Error(`Вопрос #${i+1}: нет текста`);
            if (!Array.isArray(item.options) || item.options.length < 2) throw new Error(`Вопрос #${i+1}: нужно минимум 2 варианта`);
            if (!Array.isArray(item.correct) || item.correct.length === 0) throw new Error(`Вопрос #${i+1}: нет правильных ответов`);
            for (const idx of item.correct) {
                if (idx < 0 || idx >= item.options.length) throw new Error(`Вопрос #${i+1}: индекс ${idx} вне диапазона`);
            }
            return { id: item.id || i+1, question: item.question.trim(), options: item.options.map(String), correct: [...new Set(item.correct)].sort((a,b)=>a-b), category: item.category || 'Общее', difficulty: ['easy','medium','hard'].includes(item.difficulty) ? item.difficulty : 'medium' };
        });
    }
}

/* === STATS MANAGER === */
class StatsManager {
    constructor() { this.key = 'exam_history'; }
    getHistory() { return Utils.storageGet(this.key, []); }
    addResult(r) { const h = this.getHistory(); h.unshift({ id: Utils.generateId(), timestamp: Date.now(), ...r }); if (h.length > 50) h.length = 50; Utils.storageSet(this.key, h); }
    getSummary() {
        const h = this.getHistory();
        if (!h.length) return { totalExams:0, avgPercent:0, bestPercent:0, totalTime:0, totalQuestions:0 };
        const ps = h.map(x => x.percent||0);
        return { totalExams: h.length, avgPercent: Math.round(ps.reduce((a,b)=>a+b,0)/h.length), bestPercent: Math.max(...ps), totalTime: h.reduce((a,x)=>a+(x.timeSpent||0),0), totalQuestions: h.reduce((a,x)=>a+(x.totalCount||0),0) };
    }
    clear() { Utils.storageRemove(this.key); }
}

/* === BACKUP QUESTIONS (for when tests.json can't be loaded) === */
const BACKUP_QUESTIONS = [
    {
        "id": 1,
        "question": "Какие планеты Солнечной системы относятся к газовым гигантам?",
        "options": ["Марс", "Юпитер", "Сатурн", "Венера"],
        "correct": [1, 2],
        "category": "Астрономия",
        "difficulty": "easy"
    },
    {
        "id": 2,
        "question": "Какое животное считается самым крупным млекопитающим на Земле?",
        "options": ["Африканский слон", "Синий кит", "Гигантский кальмак", "Кашалот"],
        "correct": [1],
        "category": "Биология",
        "difficulty": "easy"
    }
];

/* === ГЛАВНЫЙ КЛАСС === */
class TestTrainerApp {
    constructor() {
        this.state = {
            allQuestions: [],
            errors: [],
            currentTab: 'textbook',
            textbookFilter: 'all',
            textbookSearch: '',
            exam: {
                active: false,
                questions: [],
                currentIndex: 0,
                userSelections: [],
                questionChecked: [],
                results: null,
                timerInterval: null,
                elapsedSeconds: 0,
                mode: 'normal'
            }
        };
        this.toast = new ToastManager();
        this.theme = new ThemeManager();
        this.stats = new StatsManager();
    }

    async init() {
        await this.loadQuestions();
        this.state.errors = Utils.storageGet('test_errors', []);
        this.setupNavigation();
        this.setupTextbook();
        this.setupDatabase();
        this.setupThemeToggles();
        this.switchTab('textbook');
        this.updateGlobalStats();
    }

    /* === LOAD QUESTIONS === */
    async loadQuestions(forceReload = false) {
        if (!forceReload) {
            const saved = Utils.storageGet('saved_questions');
            if (saved && Array.isArray(saved) && saved.length > 0) {
                try {
                    this.state.allQuestions = QuestionValidator.validate(saved);
                    return;
                } catch(e) {
                    this.toast.error(`Ошибка загрузки сохранённых вопросов: ${e.message}`);
                }
            }
        }
        // Try to fetch tests.json
        try {
            const response = await fetch('tests.json?v=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                this.state.allQuestions = QuestionValidator.validate(data);
                return;
            }
        } catch(e) {
            // Fall through to backup
        }
        // Use backup
        this.state.allQuestions = QuestionValidator.validate(BACKUP_QUESTIONS);
    }

    /* === NAVIGATION === */
    setupNavigation() {
        // Tab switching
        document.querySelectorAll('.nav-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
        // Mobile menu
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const sidebar = document.getElementById('sidebar');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.remove('-translate-x-full');
                mobileOverlay.classList.remove('hidden');
            });
        }
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                sidebar.classList.add('-translate-x-full');
                mobileOverlay.classList.add('hidden');
            });
        }
    }

    switchTab(tab) {
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.add('hidden');
        });
        // Show selected tab
        const selected = document.getElementById(`tab-${tab}`);
        if (selected) {
            selected.classList.remove('hidden');
        }
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(btn => {
            btn.setAttribute('aria-current', 'false');
            btn.classList.remove('bg-primary-500', 'text-white');
            btn.classList.add('text-slate-600', 'dark:text-slate-400');
        });
        const activeLink = document.querySelector(`.nav-link[data-tab="${tab}"]`);
        if (activeLink) {
            activeLink.setAttribute('aria-current', 'true');
            activeLink.classList.add('bg-primary-500', 'text-white');
            activeLink.classList.remove('text-slate-600', 'dark:text-slate-400');
        }
        this.state.currentTab = tab;
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobile-overlay');
        if (sidebar) sidebar.classList.add('-translate-x-full');
        if (mobileOverlay) mobileOverlay.classList.add('hidden');
        // Render tab-specific content
        if (tab === 'textbook') {
            this.renderTextbook();
        } else if (tab === 'exam') {
            if (this.state.exam.active) {
                this.renderExamQuestion();
            } else {
                this.renderExamSetup();
            }
        } else if (tab === 'errors') {
            this.renderErrors();
        } else if (tab === 'stats') {
            this.renderStats();
        }
    }

    /* === TEXTBOOK === */
    setupTextbook() {
        const searchInput = document.getElementById('textbook-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.state.textbookSearch = e.target.value;
                this.renderTextbook();
            }, 300));
        }
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active', 'bg-primary-500', 'text-white');
                    b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border', 'border-slate-200', 'dark:border-slate-700');
                });
                btn.classList.add('active', 'bg-primary-500', 'text-white');
                btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border', 'border-slate-200', 'dark:border-slate-700');
                this.state.textbookFilter = btn.getAttribute('data-filter');
                this.renderTextbook();
            });
        });
    }

    getFilteredQuestions() {
        let q = [...this.state.allQuestions];
        // Filter by type
        if (this.state.textbookFilter === 'single') {
            q = q.filter(item => item.correct.length === 1);
        } else if (this.state.textbookFilter === 'multi') {
            q = q.filter(item => item.correct.length > 1);
        }
        // Search
        if (this.state.textbookSearch.trim()) {
            const term = this.state.textbookSearch.toLowerCase();
            q = q.filter(item => {
                const inQuestion = item.question.toLowerCase().includes(term);
                const inOptions = item.options.some(opt => opt.toLowerCase().includes(term));
                return inQuestion || inOptions;
            });
        }
        return q;
    }

    renderTextbook() {
        const container = document.getElementById('textbook-container');
        if (!container) return;
        const questions = this.getFilteredQuestions();
        if (questions.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400">Нет вопросов, соответствующих вашему запросу.</div>';
            return;
        }
        container.innerHTML = '';
        container.classList.add('stagger-children');
        questions.forEach(q => {
            const card = this.createQuestionCard(q, true);
            container.appendChild(card);
        });
    }

    createQuestionCard(question, showCorrect = false) {
        const card = document.createElement('div');
        card.className = 'question-card animate-fade-in mb-4';
        const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];
        const optionsHtml = question.options.map((opt, i) => {
            const isCorrect = question.correct.includes(i);
            let classes = 'option-btn';
            if (showCorrect) {
                if (isCorrect) classes += ' correct';
            }
            return `
                <button type="button" class="${classes}" data-idx="${i}" ${showCorrect ? 'disabled' : ''}>
                    <span class="option-indicator">${letters[i] || i + 1}</span>
                    <span class="flex-1">${Utils.escapeHtml(opt)}</span>
                    ${isCorrect && showCorrect ? '<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
                </button>
            `;
        }).join('');
        const difficultyLabels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
        const difficultyColors = { easy: 'badge-success', medium: 'badge-info', hard: 'badge-warning' };
        card.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <span class="badge ${difficultyColors[question.difficulty] || 'badge-info'}">${difficultyLabels[question.difficulty] || question.difficulty}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">${Utils.escapeHtml(question.category)}</span>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">${Utils.escapeHtml(question.question)}</h3>
            <div class="space-y-2">${optionsHtml}</div>
        `;
        return card;
    }

    /* === EXAM === */
    renderExamSetup() {
        const area = document.getElementById('exam-dynamic-area');
        if (!area) return;
        const examFromErrors = this.state.errors.length > 0;
        area.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">📝 Экзамен</h2>
                    <p class="text-slate-500 dark:text-slate-400 mb-6">Настройте параметры экзамена и проверьте свои знания</p>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Количество вопросов</label>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <button class="exam-count-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-count="5">5 вопросов</button>
                                <button class="exam-count-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-count="10">10 вопросов</button>
                                <button class="exam-count-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-count="20">20 вопросов</button>
                                <button class="exam-count-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-count="50">50 вопросов</button>
                                <button class="exam-count-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all sm:col-span-2" data-count="all">Все вопросы</button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Порядок вопросов</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button class="exam-order-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-order="random">Случайный</button>
                                <button class="exam-order-btn px-4 py-3 rounded-xl text-sm font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:bg-primary-50 transition-all" data-order="sequential">По порядку</button>
                            </div>
                        </div>
                        ${examFromErrors ? `<div class="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button id="exam-errors-btn" class="w-full px-4 py-3 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-all">
                                Экзамен по ошибкам (${this.state.errors.length})
                            </button>
                        </div>` : ''}
                        <button id="exam-start-btn" class="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]">
                            Начать экзамен
                        </button>
                    </div>
                </div>
            </div>
        `;
        let selectedCount = '10';
        let selectedOrder = 'random';
        // Set default selections
        const defaultCount = document.querySelector('.exam-count-btn[data-count="10"]');
        if (defaultCount) {
            defaultCount.classList.add('border-primary-500', 'bg-primary-50');
            defaultCount.classList.remove('border-slate-200', 'dark:border-slate-700');
        }
        const defaultOrder = document.querySelector('.exam-order-btn[data-order="random"]');
        if (defaultOrder) {
            defaultOrder.classList.add('border-primary-500', 'bg-primary-50');
            defaultOrder.classList.remove('border-slate-200', 'dark:border-slate-700');
        }
        // Count button handlers
        document.querySelectorAll('.exam-count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.exam-count-btn').forEach(b => {
                    b.classList.remove('border-primary-500', 'bg-primary-50');
                    b.classList.add('border-slate-200', 'dark:border-slate-700');
                });
                btn.classList.add('border-primary-500', 'bg-primary-50');
                btn.classList.remove('border-slate-200', 'dark:border-slate-700');
                selectedCount = btn.getAttribute('data-count');
            });
        });
        // Order button handlers
        document.querySelectorAll('.exam-order-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.exam-order-btn').forEach(b => {
                    b.classList.remove('border-primary-500', 'bg-primary-50');
                    b.classList.add('border-slate-200', 'dark:border-slate-700');
                });
                btn.classList.add('border-primary-500', 'bg-primary-50');
                btn.classList.remove('border-slate-200', 'dark:border-slate-700');
                selectedOrder = btn.getAttribute('data-order');
            });
        });
        // Start button
        const startBtn = document.getElementById('exam-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!selectedCount) {
                    this.toast.warning('Выберите количество вопросов');
                    return;
                }
                this.startExam(selectedCount, selectedOrder, 'normal');
            });
        }
        // Errors exam button
        const errorsBtn = document.getElementById('exam-errors-btn');
        if (errorsBtn) {
            errorsBtn.addEventListener('click', () => {
                this.startExam('all', 'random', 'errors');
            });
        }
    }

    startExam(count, order, mode) {
        let questions = [];
        if (mode === 'errors') {
            questions = this.state.errors.map(e => this.state.allQuestions.find(q => q.id === e.questionId)).filter(Boolean);
        } else {
            questions = [...this.state.allQuestions];
        }
        if (order === 'random') {
            questions = Utils.shuffle(questions);
        }
        if (count !== 'all') {
            questions = questions.slice(0, parseInt(count));
        }
        if (questions.length === 0) {
            this.toast.warning('Нет вопросов для экзамена');
            return;
        }
        this.state.exam = {
            active: true,
            questions,
            currentIndex: 0,
            userSelections: questions.map(() => []),
            questionChecked: questions.map(() => false),
            results: null,
            timerInterval: null,
            elapsedSeconds: 0,
            mode
        };
        this.startTimer();
        this.renderExamQuestion();
    }

    startTimer() {
        if (this.state.exam.timerInterval) {
            clearInterval(this.state.exam.timerInterval);
        }
        this.state.exam.timerInterval = setInterval(() => {
            this.state.exam.elapsedSeconds++;
            const timerEl = document.getElementById('exam-timer');
            if (timerEl) {
                timerEl.textContent = Utils.formatTimer(this.state.exam.elapsedSeconds);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.state.exam.timerInterval) {
            clearInterval(this.state.exam.timerInterval);
            this.state.exam.timerInterval = null;
        }
    }

    renderExamQuestion() {
        const area = document.getElementById('exam-dynamic-area');
        if (!area) return;
        const exam = this.state.exam;
        const question = exam.questions[exam.currentIndex];
        const total = exam.questions.length;
        const current = exam.currentIndex + 1;
        const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];
        const progress = (current / total) * 100;
        const userSel = exam.userSelections[exam.currentIndex] || [];
        const isChecked = exam.questionChecked[exam.currentIndex];

        const optionsHtml = question.options.map((opt, i) => {
            const isSelected = userSel.includes(i);
            const isCorrect = question.correct.includes(i);
            let classes = 'option-btn';
            if (isChecked) {
                if (isCorrect) classes += ' correct';
                else if (isSelected) classes += ' incorrect';
            } else {
                if (isSelected) classes += ' selected';
            }
            return `
                <button type="button" class="${classes}" data-idx="${i}" ${isChecked ? 'disabled' : ''}>
                    <span class="option-indicator">${letters[i] || i + 1}</span>
                    <span class="flex-1">${Utils.escapeHtml(opt)}</span>
                    ${isChecked && isCorrect ? '<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
                    ${isChecked && !isCorrect && isSelected ? '<svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' : ''}
                </button>
            `;
        }).join('');

        const difficultyLabels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
        const difficultyColors = { easy: 'badge-success', medium: 'badge-info', hard: 'badge-warning' };

        area.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Вопрос</span>
                        <span class="text-sm font-bold text-primary-600 dark:text-primary-400">${current} / ${total}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3M12 8V4m0 0l-3 3m3-3v8"/></svg>
                            <span id="exam-timer" class="timer-display font-mono">${Utils.formatTimer(exam.elapsedSeconds)}</span>
                        </div>
                        <span class="badge ${difficultyColors[question.difficulty] || 'badge-info'}">${difficultyLabels[question.difficulty] || question.difficulty}</span>
                    </div>
                </div>
                <div class="progress-bar mb-6"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>
                <div class="question-card p-6 mb-6">
                    <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-1">${Utils.escapeHtml(question.question)}</h3>
                    <span class="text-xs text-slate-500 dark:text-slate-400">${Utils.escapeHtml(question.category)}</span>
                    <div class="space-y-2 mt-4">${optionsHtml}</div>
                </div>
                <div class="flex items-center justify-between">
                    <button id="exam-prev-btn" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ${current === 1 ? 'invisible' : ''}">Назад</button>
                    <div class="flex gap-3">
                        ${isChecked ? `
                            <button id="exam-next-btn" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-all">
                                ${current === total ? 'Завершить' : 'Далее'}
                            </button>
                        ` : `
                            <button id="exam-check-btn" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                                Проверить
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
        // Add event listeners to options
        if (!isChecked) {
            area.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'));
                    const sel = exam.userSelections[exam.currentIndex] || [];
                    if (question.correct.length === 1) {
                        // Single answer mode
                        exam.userSelections[exam.currentIndex] = [idx];
                    } else {
                        // Multiple answer mode
                        if (sel.includes(idx)) {
                            sel.splice(sel.indexOf(idx), 1);
                        } else {
                            sel.push(idx);
                        }
                        exam.userSelections[exam.currentIndex] = [...sel];
                    }
                    this.renderExamQuestion();
                });
            });
        }
        // Previous button
        const prevBtn = document.getElementById('exam-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (exam.currentIndex > 0) {
                    exam.currentIndex--;
                    this.renderExamQuestion();
                }
            });
        }
        // Check button
        const checkBtn = document.getElementById('exam-check-btn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                this.checkAnswer();
            });
        }
        // Next/Finish button
        const nextBtn = document.getElementById('exam-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (exam.currentIndex < exam.questions.length - 1) {
                    exam.currentIndex++;
                    this.renderExamQuestion();
                } else {
                    this.finishExam();
                }
            });
        }
    }

    checkAnswer() {
        const exam = this.state.exam;
        if (exam.questionChecked[exam.currentIndex]) return;
        const question = exam.questions[exam.currentIndex];
        const userSel = exam.userSelections[exam.currentIndex] || [];
        if (userSel.length === 0) {
            this.toast.warning('Выберите хотя бы один вариант ответа');
            return;
        }
        exam.questionChecked[exam.currentIndex] = true;
        const isCorrect = Utils.arraysEqual(userSel, question.correct);
        if (!isCorrect) {
            this.addError(question.id, userSel, question.correct);
        } else {
            // Smart auto-clear: remove from errors if answered correctly
            const errorIdx = this.state.errors.findIndex(e => e.questionId === question.id);
            if (errorIdx !== -1) {
                this.state.errors.splice(errorIdx, 1);
                Utils.storageSet('test_errors', this.state.errors);
                this.updateGlobalStats();
                this.toast.success('Ошибка исправлена! Вопрос удалён из списка ошибок');
            }
        }
        this.renderExamQuestion();
    }

    addError(questionId, userSelection, correct) {
        const existing = this.state.errors.find(e => e.questionId === questionId);
        if (existing) {
            existing.userSelection = [...userSelection];
            existing.correct = [...correct];
            existing.timestamp = Date.now();
        } else {
            this.state.errors.push({
                questionId,
                userSelection: [...userSelection],
                correct: [...correct],
                timestamp: Date.now()
            });
        }
        Utils.storageSet('test_errors', this.state.errors);
        this.updateGlobalStats();
    }

    removeError(questionId) {
        this.state.errors = this.state.errors.filter(e => e.questionId !== questionId);
        Utils.storageSet('test_errors', this.state.errors);
        this.updateGlobalStats();
    }

    clearErrors() {
        this.state.errors = [];
        Utils.storageSet('test_errors', []);
        this.updateGlobalStats();
        this.toast.success('Все ошибки очищены');
        this.renderErrors();
    }

    finishExam() {
        this.stopTimer();
        const exam = this.state.exam;
        const total = exam.questions.length;
        let correctCount = 0;
        const results = exam.questions.map((q, i) => {
            const userSel = exam.userSelections[i] || [];
            const isCorrect = Utils.arraysEqual(userSel, q.correct);
            if (isCorrect) correctCount++;
            return { question: q, userSel, isCorrect };
        });
        const percent = Math.round((correctCount / total) * 100);
        const timeSpent = exam.elapsedSeconds;

        // Save to stats
        this.stats.addResult({
            percent,
            correctCount,
            totalCount: total,
            timeSpent,
            mode: exam.mode
        });

        // Render results
        const area = document.getElementById('exam-dynamic-area');
        if (!area) return;

        const resultLabel = percent >= 80 ? 'Отлично!' : percent >= 50 ? 'Хорошо' : 'Нужно повторить';
        const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];

        area.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center mb-6">
                    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                        <span class="text-3xl font-bold text-white">${percent}%</span>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">${resultLabel}</h2>
                    <p class="text-slate-500 dark:text-slate-400 mb-6">
                        Правильно: <span class="font-bold text-emerald-500">${correctCount}</span> / ${total}<br>
                        Время: ${Utils.formatTime(timeSpent)}
                    </p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center">
                        <button id="exam-restart-btn" class="px-6 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-all">
                            Начать заново
                        </button>
                        <button id="exam-back-btn" class="px-6 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                            Назад к настройкам
                        </button>
                    </div>
                </div>
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Подробные результаты</h3>
                    ${results.map((r, i) => {
                        const isCorrect = r.isCorrect;
                        const q = r.question;
                        const userSel = r.userSel;
                        const optionsHtml = q.options.map((opt, j) => {
                            const correct = q.correct.includes(j);
                            const selected = userSel.includes(j);
                            let classes = 'option-btn text-left';
                            if (correct) classes += ' correct';
                            else if (selected) classes += ' incorrect';
                            return `
                                <button type="button" class="${classes}" disabled>
                                    <span class="option-indicator">${letters[j] || j + 1}</span>
                                    <span class="flex-1">${Utils.escapeHtml(opt)}</span>
                                    ${correct ? '<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
                                    ${!correct && selected ? '<svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' : ''}
                                </button>
                            `;
                        }).join('');
                        return `
                            <div class="question-card p-6">
                                <div class="flex items-start justify-between mb-3">
                                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">${isCorrect ? 'Верно' : 'Неверно'}</span>
                                    <span class="text-xs text-slate-500 dark:text-slate-400">${Utils.escapeHtml(q.category)}</span>
                                </div>
                                <h4 class="font-semibold text-slate-900 dark:text-white mb-4">${i + 1}. ${Utils.escapeHtml(q.question)}</h4>
                                <div class="space-y-2">${optionsHtml}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        document.getElementById('exam-restart-btn')?.addEventListener('click', () => {
            this.renderExamSetup();
        });
        document.getElementById('exam-back-btn')?.addEventListener('click', () => {
            this.renderExamSetup();
        });
    }

    /* === ERRORS === */
    renderErrors() {
        const container = document.getElementById('errors-container');
        if (!container) return;
        if (this.state.errors.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.616-4.906a2.25 2.25 0 0 1 .732 1.464V12a2.25 2.25 0 0 1-.232 1.032L13.3 19.57a2.25 2.25 0 0 1-1.538.83H7.5a2.25 2.25 0 0 1-2.25-2.25V7.5a2.25 2.25 0 0 1 .83-1.538l7.22-3.616a2.25 2.25 0 0 1 2.032-.192z"/></svg>
                    </div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Нет ошибок!</h3>
                    <p class="text-slate-500 dark:text-slate-400">Вы ответили на все вопросы правильно. Продолжайте в том же духе!</p>
                </div>
            `;
            return;
        }
        container.innerHTML = '';
        // Header with clear button
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-6';
        header.innerHTML = `
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Найдено ошибок: ${this.state.errors.length}</h3>
            <button id="clear-errors-btn" class="px-4 py-2 rounded-xl text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/30 transition-all">
                Очистить все ошибки
            </button>
        `;
        container.appendChild(header);
        // Error cards
        const errorList = document.createElement('div');
        errorList.className = 'space-y-4';
        this.state.errors.forEach(err => {
            const question = this.state.allQuestions.find(q => q.id === err.questionId);
            if (question) {
                errorList.appendChild(this.createErrorCard(question, err));
            }
        });
        container.appendChild(errorList);
        // Clear errors handler
        document.getElementById('clear-errors-btn')?.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить все ошибки?')) {
                this.clearErrors();
            }
        });
    }

    createErrorCard(question, error) {
        const card = document.createElement('div');
        card.className = 'question-card p-6 mb-4 animate-fade-in';
        const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];
        const optionsHtml = question.options.map((opt, i) => {
            const isCorrect = question.correct.includes(i);
            const wasSelected = error.userSelection.includes(i);
            let classes = 'option-btn';
            if (isCorrect) classes += ' correct';
            else if (wasSelected) classes += ' incorrect';
            return `
                <button type="button" class="${classes}" disabled>
                    <span class="option-indicator">${letters[i] || i + 1}</span>
                    <span class="flex-1">${Utils.escapeHtml(opt)}</span>
                    ${isCorrect ? '<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
                    ${!isCorrect && wasSelected ? '<svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' : ''}
                </button>
            `;
        }).join('');
        card.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <span class="badge badge-danger">Ошибка</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">${Utils.escapeHtml(question.category)}</span>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">${Utils.escapeHtml(question.question)}</h3>
            <div class="space-y-2">${optionsHtml}</div>
            <div class="mt-4 text-xs text-slate-500 dark:text-slate-400">
                <span class="text-emerald-500 font-medium">✓ Правильные:</span> ${question.correct.map(i => letters[i] || (i+1)).join(', ')} |
                <span class="text-rose-500 font-medium">✗ Вы выбрали:</span> ${(error.userSelection.length ? error.userSelection.map(i => letters[i] || (i+1)).join(', ') : '—')}
            </div>
        `;
        return card;
    }

    /* === STATS === */
    renderStats() {
        const container = document.getElementById('stats-container');
        if (!container) return;
        const summary = this.stats.getSummary();
        const history = this.stats.getHistory();

        container.innerHTML = `
            <div class="space-y-8">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Статистика</h3>
                    ${history.length > 0 ? `<button id="clear-history-btn" class="px-4 py-2 rounded-xl text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/30 transition-all">
                        Очистить историю
                    </button>` : ''}
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="stat-card p-6">
                        <div class="text-3xl font-bold text-primary-600 dark:text-primary-400">${summary.totalExams}</div>
                        <div class="text-sm text-slate-500 dark:text-slate-400 mt-1">Всего экзаменов</div>
                    </div>
                    <div class="stat-card p-6">
                        <div class="text-3xl font-bold text-emerald-500">${summary.avgPercent}%</div>
                        <div class="text-sm text-slate-500 dark:text-slate-400 mt-1">Средний балл</div>
                    </div>
                    <div class="stat-card p-6">
                        <div class="text-3xl font-bold text-amber-500">${summary.bestPercent}%</div>
                        <div class="text-sm text-slate-500 dark:text-slate-400 mt-1">Лучший результат</div>
                    </div>
                    <div class="stat-card p-6">
                        <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${Utils.formatTime(summary.totalTime)}</div>
                        <div class="text-sm text-slate-500 dark:text-slate-400 mt-1">Общее время</div>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">История экзаменов</h3>
                    ${history.length === 0 ? '<div class="text-center py-8 text-slate-500 dark:text-slate-400">История пуста. Сдайте первый экзамен!</div>' : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-slate-200 dark:border-slate-700">
                                        <th class="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Дата</th>
                                        <th class="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Результат</th>
                                        <th class="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Время</th>
                                        <th class="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Вопросов</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr class="border-b border-slate-100 dark:border-slate-800">
                                            <td class="py-2 text-slate-600 dark:text-slate-300">${new Date(h.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td class="py-2"><span class="font-bold ${h.percent >= 80 ? 'text-emerald-500' : h.percent >= 50 ? 'text-amber-500' : 'text-rose-500'}">${h.percent}%</span></td>
                                            <td class="py-2 text-slate-600 dark:text-slate-300">${Utils.formatTime(h.timeSpent || 0)}</td>
                                            <td class="py-2 text-slate-600 dark:text-slate-300">${h.correctCount || 0} / ${h.totalCount || 0}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить историю экзаменов?')) {
                this.clearHistory();
            }
        });
    }

    clearHistory() {
        this.stats.clear();
        this.toast.success('История очищена');
        this.renderStats();
    }

    /* === DATABASE === */
    setupDatabase() {
        // Import from file
        const fileInput = document.getElementById('json-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const data = JSON.parse(ev.target.result);
                            const validated = QuestionValidator.validate(data);
                            this.state.allQuestions = validated;
                            Utils.storageSet('saved_questions', validated);
                            this.toast.success(`Загружено ${validated.length} вопросов`);
                            this.updateGlobalStats();
                            if (this.state.currentTab === 'textbook') this.renderTextbook();
                        } catch(e) {
                            this.toast.error(`Ошибка импорта: ${e.message}`);
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }
        // Load from text
        const loadTextBtn = document.getElementById('load-json-text-btn');
        if (loadTextBtn) {
            loadTextBtn.addEventListener('click', () => {
                const textInput = document.getElementById('json-text-input');
                if (textInput && textInput.value.trim()) {
                    try {
                        const data = JSON.parse(textInput.value);
                        const validated = QuestionValidator.validate(data);
                        this.state.allQuestions = validated;
                        Utils.storageSet('saved_questions', validated);
                        this.toast.success(`Загружено ${validated.length} вопросов`);
                        this.updateGlobalStats();
                        if (this.state.currentTab === 'textbook') this.renderTextbook();
                        textInput.value = '';
                    } catch(e) {
                        this.toast.error(`Ошибка импорта: ${e.message}`);
                    }
                } else {
                    this.toast.warning('Введите JSON-текст');
                }
            });
        }
        // Export
        const exportBtn = document.getElementById('export-tests-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const dataStr = JSON.stringify(this.state.allQuestions, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tests_export.json';
                a.click();
                URL.revokeObjectURL(url);
                this.toast.success('Экспорт завершён');
            });
        }
        // Reset
        const resetBtn = document.getElementById('reset-tests-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                Utils.storageRemove('saved_questions');
                this.loadQuestions(true).then(() => {
                    this.toast.success('Вопросы сброшены к исходным');
                    this.updateGlobalStats();
                    if (this.state.currentTab === 'textbook') this.renderTextbook();
                });
            });
        }
        // Copy AI prompt
        const copyPromptBtn = document.getElementById('copy-ai-prompt-btn');
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', () => {
                const promptText = document.getElementById('ai-prompt-text')?.textContent || '';
                navigator.clipboard.writeText(promptText).then(() => {
                    this.toast.success('Промт скопирован в буфер обмена');
                }).catch(() => {
                    this.toast.error('Не удалось скопировать');
                });
            });
        }
    }

    /* === THEME TOGGLES === */
    setupThemeToggles() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.theme.toggle());
        }
        const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
        if (mobileThemeToggle) {
            mobileThemeToggle.addEventListener('click', () => this.theme.toggle());
        }
    }

    /* === GLOBAL STATS === */
    updateGlobalStats() {
        const qCount = document.getElementById('sidebar-question-count');
        const eCount = document.getElementById('sidebar-error-count');
        const errorsBadge = document.getElementById('errors-badge');
        if (qCount) qCount.textContent = this.state.allQuestions.length;
        if (eCount) eCount.textContent = this.state.errors.length;
        if (errorsBadge) {
            if (this.state.errors.length > 0) {
                errorsBadge.textContent = this.state.errors.length;
                errorsBadge.classList.remove('hidden');
            } else {
                errorsBadge.classList.add('hidden');
            }
        }
    }
}

/* === INIT === */
let app;
document.addEventListener('DOMContentLoaded', () => { app = new TestTrainerApp(); app.init(); });
