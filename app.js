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

/* === ГЛАВНЫЙ КЛАСС === */
class TestTrainerApp {
    constructor() {
        this.state = { allQuestions: [], errors: [], currentTab: 'textbook', textbookFilter: 'all', textbookSearch: '', exam: { active:false, questions:[], currentIndex:0, userSelections:[], checked:false, results:null, timerInterval:null, elapsedSeconds:0, mode:'normal' } };
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

    // ... (все методы: loadQuestions, switchTab, renderTextbook, 
    //      renderExamSetup, startExam, renderExamQuestion, checkAnswer,
    //      finishExam, renderErrors, renderStats, setupDatabase, etc.)
    // Полный код — 65KB, показан выше в code_interpreter
}

/* === INIT === */
let app;
document.addEventListener('DOMContentLoaded', () => { app = new TestTrainerApp(); app.init(); });
