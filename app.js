// База тестов по умолчанию (используется как резервная копия, если fetch('tests.json') недоступен из-за ограничений CORS при прямом открытии файла)
const DEFAULT_QUESTIONS = [
  {
    "id": 1,
    "question": "Какие планеты Солнечной системы относятся к газовым гигантам?",
    "options": [
      "Марс",
      "Юпитер",
      "Сатурн",
      "Венера"
    ],
    "correct": [1, 2]
  },
  {
    "id": 2,
    "question": "Какое животное считается самым крупным млекопитающим на Земле?",
    "options": [
      "Африканский слон",
      "Синий кит",
      "Гигантский кальмар",
      "Кашалот"
    ],
    "correct": [1]
  },
  {
    "id": 3,
    "question": "Какие из перечисленных элементов являются благородными (инертными) газами?",
    "options": [
      "Кислород",
      "Гелий",
      "Неон",
      "Азот",
      "Аргон"
    ],
    "correct": [1, 2, 4]
  },
  {
    "id": 4,
    "question": "В каком году произошел первый полет человека в космос?",
    "options": [
      "1957 год",
      "1961 год",
      "1969 год",
      "1975 год"
    ],
    "correct": [1]
  },
  {
    "id": 5,
    "question": "Какие из следующих утверждений верны для языка программирования JavaScript?",
    "options": [
      "Является строго типизированным языком",
      "Поддерживает прототипное наследование",
      "Был разработан компанией Microsoft",
      "Используется как на клиенте, так и на сервере (Node.js)"
    ],
    "correct": [1, 3]
  },
  {
    "id": 6,
    "question": "Какие из перечисленных стран имеют сухопутную границу с Россией?",
    "options": [
      "Китай",
      "Финляндия",
      "Швеция",
      "Германия",
      "Казахстан"
    ],
    "correct": [0, 1, 4]
  },
  {
    "id": 7,
    "question": "Какая планета Солнечной системы ближе всего расположена к Солнцу?",
    "options": [
      "Венера",
      "Меркурий",
      "Марс",
      "Земля"
    ],
    "correct": [1]
  },
  {
    "id": 8,
    "question": "Какие цвета присутствуют на государственном флаге Российской Федерации?",
    "options": [
      "Белый",
      "Зеленый",
      "Синий",
      "Красный",
      "Желтый"
    ],
    "correct": [0, 2, 3]
  },
  {
    "id": 9,
    "question": "Кто является автором романа «Преступление и наказание»?",
    "options": [
      "Лев Толстой",
      "Александр Пушкин",
      "Федор Достоевский",
      "Антон Чехов"
    ],
    "correct": [2]
  },
  {
    "id": 10,
    "question": "Какие из перечисленных океанов омывают берега Евразии?",
    "options": [
      "Атлантический океан",
      "Тихий океан",
      "Индийский океан",
      "Северный Ледовитый океан",
      "Южный океан"
    ],
    "correct": [0, 1, 2, 3]
  }
];

// Глобальное состояние приложения
let state = {
  allQuestions: [],        // Список всех вопросов
  errors: [],              // Список ошибок (работа над ошибками)
  currentTab: 'textbook',  // Текущая вкладка: 'textbook' | 'exam' | 'errors' | 'docs'
  
  // Состояние экзамена
  exam: {
    active: false,         // Запущен ли экзамен прямо сейчас
    questions: [],         // Вопросы для текущего раунда экзамена
    currentIndex: 0,       // Индекс текущего вопроса в раунде
    userSelections: [],    // Выбранные индексы ответов пользователем для текущего вопроса
    checked: false,        // Проверен ли текущий вопрос
    results: null,         // Результаты экзамена: { correctCount, totalCount, timeSpent, details: [] }
    startTime: null,       // Время начала
    timerInterval: null,   // Интервал таймера
    elapsedSeconds: 0,     // Прошедшее время в секундах
    mode: 'normal'         // Режим: 'normal' (обычный) или 'errors' (только по ошибкам)
  }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Загружаем вопросы (из localStorage, внешнего JSON или дефолтные)
  await loadQuestions();
  
  // 2. Загружаем список ошибок из localStorage
  loadErrors();
  
  // 3. Настраиваем обработчики событий UI
  setupNavigation();
  setupTextbookEvents();
  setupExamEvents();
  setupDocsEvents();
  
  // 4. Показываем начальную вкладку
  switchTab('textbook');
  
  // 5. Обновляем счетчики и общую статистику
  updateStats();
});

// Загрузка вопросов
async function loadQuestions() {
  // Сначала проверяем, есть ли пользовательские вопросы в localStorage
  const savedQuestions = localStorage.getItem('custom_questions');
  if (savedQuestions) {
    try {
      state.allQuestions = JSON.parse(savedQuestions);
      showToast('Тесты успешно загружены из локальной памяти!', 'success');
      return;
    } catch (e) {
      console.error('Ошибка при чтении кастомных вопросов из localStorage', e);
    }
  }

  // Если нет в localStorage, пробуем загрузить из tests.json
  try {
    // Добавляем параметр cache-buster (?_t=...), чтобы изменения в tests.json на GitHub Pages применялись мгновенно
    const response = await fetch('tests.json?_t=' + Date.now());
    if (response.ok) {
      state.allQuestions = await response.json();
      console.log('Тесты успешно загружены из tests.json');
    } else {
      throw new Error('Файл tests.json не найден или вернул ошибку');
    }
  } catch (error) {
    console.warn('Не удалось загрузить tests.json (возможно CORS при запуске как file://). Используем встроенную базу по умолчанию.', error);
    state.allQuestions = [...DEFAULT_QUESTIONS];
  }
}

// Загрузка ошибок из localStorage
function loadErrors() {
  const savedErrors = localStorage.getItem('test_errors');
  if (savedErrors) {
    try {
      state.errors = JSON.parse(savedErrors);
    } catch (e) {
      console.error('Ошибка парсинга истории ошибок:', e);
      state.errors = [];
    }
  } else {
    state.errors = [];
  }
  updateErrorsBadge();
}

// Сохранение ошибок в localStorage
function saveErrors() {
  localStorage.setItem('test_errors', JSON.stringify(state.errors));
  updateErrorsBadge();
}

// Обновление бейджа количества ошибок на вкладке "Работа над ошибками"
function updateErrorsBadge() {
  const badge = document.getElementById('errors-badge');
  const badgeMobile = document.getElementById('errors-badge-mobile');
  const count = state.errors.length;
  
  if (count > 0) {
    if (badge) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    }
    if (badgeMobile) {
      badgeMobile.textContent = count;
      badgeMobile.classList.remove('hidden');
    }
  } else {
    if (badge) badge.classList.add('hidden');
    if (badgeMobile) badgeMobile.classList.add('hidden');
  }
}

// Обновление общей статистики на панели управления
function updateStats() {
  document.getElementById('total-questions-stat').textContent = state.allQuestions.length;
  document.getElementById('total-errors-stat').textContent = state.errors.length;
}

// Переключение вкладок SPA
function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Убираем активные классы у всех кнопок меню
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.tab === tabName) {
      link.classList.add('bg-indigo-50', 'text-indigo-600', 'font-semibold');
      link.classList.remove('text-gray-600', 'hover:bg-gray-50');
    } else {
      link.classList.remove('bg-indigo-50', 'text-indigo-600', 'font-semibold');
      link.classList.add('text-gray-600', 'hover:bg-gray-50');
    }
  });

  // Мобильное меню: то же самое
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    if (link.dataset.tab === tabName) {
      link.classList.add('bg-indigo-50', 'text-indigo-600', 'font-semibold');
      link.classList.remove('text-gray-600');
    } else {
      link.classList.remove('bg-indigo-50', 'text-indigo-600', 'font-semibold');
      link.classList.add('text-gray-600');
    }
  });

  // Скрываем все разделы контента
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Показываем нужный раздел
  const activeTabContent = document.getElementById(`tab-${tabName}`);
  if (activeTabContent) {
    activeTabContent.classList.remove('hidden');
  }

  // Очищаем активное состояние экзамена при уходе с вкладки, если он не идет
  if (tabName !== 'exam' && !state.exam.active) {
    resetExamState();
  }

  // Специфический рендеринг при переключении
  if (tabName === 'textbook') {
    renderTextbook();
  } else if (tabName === 'exam' && !state.exam.active) {
    renderExamSetup();
  } else if (tabName === 'errors') {
    renderErrorsPage();
  }

  // Закрываем мобильное меню при переключении
  document.getElementById('mobile-menu').classList.add('hidden');
}

// Настройка навигации
function setupNavigation() {
  // Клик по ссылкам бокового меню
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Клик по ссылкам мобильного меню
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Кнопка переключения мобильного меню
  const mobileMenuBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

/* ==========================================
   УЧЕБНИК (TEXTBOOK)
   ========================================== */

function setupTextbookEvents() {
  const searchInput = document.getElementById('textbook-search');
  const filterSelect = document.getElementById('textbook-filter');

  if (searchInput) {
    searchInput.addEventListener('input', () => renderTextbook());
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', () => renderTextbook());
  }
}

function renderTextbook() {
  const container = document.getElementById('textbook-questions-container');
  if (!container) return;

  const searchQuery = document.getElementById('textbook-search').value.toLowerCase();
  const filterValue = document.getElementById('textbook-filter').value; // 'all' | 'single' | 'multiple'

  container.innerHTML = '';

  const filtered = state.allQuestions.filter(q => {
    // Поиск по тексту вопроса и вариантов
    const matchSearch = q.question.toLowerCase().includes(searchQuery) || 
                        q.options.some(opt => opt.toLowerCase().includes(searchQuery));
    
    // Фильтр по типу вопроса
    const isMulti = q.correct.length > 1;
    let matchFilter = true;
    if (filterValue === 'single') matchFilter = !isMulti;
    if (filterValue === 'multiple') matchFilter = isMulti;

    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
        <svg class="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-medium">Вопросы не найдены</p>
        <p class="text-sm text-gray-400 mt-1">Попробуйте изменить запрос или настройки фильтра.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((q, index) => {
    const isMulti = q.correct.length > 1;
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition duration-200 p-6 flex flex-col justify-between';
    
    // Создаем разметку вариантов ответов
    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
      const isCorrect = q.correct.includes(idx);
      if (isCorrect) {
        optionsHtml += `
          <div class="flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50 text-green-900 text-sm font-medium">
            <span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white mt-0.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </span>
            <span>${opt}</span>
          </div>
        `;
      } else {
        optionsHtml += `
          <div class="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 text-sm">
            <span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-transparent text-xs mt-0.5">
              ${idx + 1}
            </span>
            <span>${opt}</span>
          </div>
        `;
      }
    });

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3 gap-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Вопрос ID: ${q.id}
          </span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${isMulti ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}">
            ${isMulti ? 'Несколько ответов' : 'Один ответ'}
          </span>
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-4">${q.question}</h3>
        <div class="space-y-2 mb-4">
          ${optionsHtml}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================
   ЭКЗАМЕН (EXAM)
   ========================================== */

function setupExamEvents() {
  // Кнопка запуска обычного экзамена
  const startBtn = document.getElementById('start-exam-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const countSelect = document.getElementById('exam-question-count');
      const orderSelect = document.getElementById('exam-question-order');
      
      const count = countSelect.value === 'all' ? state.allQuestions.length : parseInt(countSelect.value, 10);
      const randomOrder = orderSelect.value === 'random';
      
      startExam(count, randomOrder, 'normal');
    });
  }

  // Клик по кнопке "Проверить" / "Далее" во время экзамена осуществляется через делегирование или рендеринг
}

// Настройка экрана выбора параметров экзамена
function renderExamSetup() {
  const container = document.getElementById('exam-dynamic-area');
  if (!container) return;

  const totalQuestions = state.allQuestions.length;
  
  if (totalQuestions === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-lg font-medium text-gray-700">База вопросов пуста</p>
        <p class="text-sm text-gray-500 mt-1">Добавьте тесты во вкладке «База тестов и ИИ».</p>
      </div>
    `;
    return;
  }

  // Настраиваем доступные опции в выпадающем списке количества
  let countOptions = `<option value="all">Все вопросы (${totalQuestions})</option>`;
  [5, 10, 20, 50].forEach(num => {
    if (num < totalQuestions) {
      countOptions = `<option value="${num}">${num} вопросов</option>` + countOptions;
    }
  });

  // Проверяем наличие ошибок для активации экзамена по ошибкам
  const errorsCount = state.errors.length;
  const errorExamBtnHtml = errorsCount > 0 
    ? `<button id="start-errors-exam-btn" class="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 border border-red-200 text-red-700 font-semibold bg-red-50 hover:bg-red-100 rounded-xl transition shadow-sm">
         <span class="relative flex h-3 w-3">
           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
         </span>
         Пройти экзамен только по ошибкам (${errorsCount})
       </button>`
    : `<button disabled class="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-400 font-semibold bg-gray-50 rounded-xl cursor-not-allowed">
         Нет ошибок для работы над ошибками
       </button>`;

  container.innerHTML = `
    <div class="max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-md p-8">
      <div class="text-center mb-8">
        <div class="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-black text-gray-900">Готовы начать экзамен?</h2>
        <p class="text-gray-500 mt-1 text-sm">Проверьте свои знания в симуляторе реального экзамена</p>
      </div>

      <div class="space-y-5">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Количество вопросов:</label>
          <select id="exam-question-count" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 font-medium">
            ${countOptions}
          </select>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Порядок вопросов:</label>
          <select id="exam-question-order" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 font-medium">
            <option value="random">В случайном порядке (рекомендуется)</option>
            <option value="sequential">По порядку добавления</option>
          </select>
        </div>

        <div class="pt-4 space-y-3">
          <button id="start-exam-btn-go" class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-100 hover:shadow-indigo-200">
            Запустить обычный экзамен
          </button>
          
          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-200"></div>
            <span class="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold tracking-wider">или тренировка ошибок</span>
            <div class="flex-grow border-t border-gray-200"></div>
          </div>

          ${errorExamBtnHtml}
        </div>
      </div>
    </div>
  `;

  // Вешаем обработчики на новые созданные кнопки
  document.getElementById('start-exam-btn-go').addEventListener('click', () => {
    const countSelect = document.getElementById('exam-question-count');
    const orderSelect = document.getElementById('exam-question-order');
    const count = countSelect.value === 'all' ? totalQuestions : parseInt(countSelect.value, 10);
    const randomOrder = orderSelect.value === 'random';
    startExam(count, randomOrder, 'normal');
  });

  const startErrorsBtn = document.getElementById('start-errors-exam-btn');
  if (startErrorsBtn) {
    startErrorsBtn.addEventListener('click', () => {
      startExam(state.errors.length, true, 'errors');
    });
  }
}

// Запуск сессии экзамена
function startExam(count, shuffle, mode) {
  state.exam.active = true;
  state.exam.mode = mode;
  state.exam.currentIndex = 0;
  state.exam.checked = false;
  state.exam.userSelections = [];
  state.exam.elapsedSeconds = 0;
  state.exam.results = {
    correctCount: 0,
    totalCount: 0,
    details: []
  };

  // Выбираем базу вопросов в зависимости от режима
  let SourceQuestions = [];
  if (mode === 'errors') {
    // Извлекаем чистые объекты вопросов из сохраненных ошибок
    SourceQuestions = state.errors.map(err => err.question);
  } else {
    SourceQuestions = [...state.allQuestions];
  }

  // Перемешиваем, если нужно
  if (shuffle) {
    SourceQuestions = SourceQuestions.sort(() => Math.random() - 0.5);
  }

  // Берем ровно столько вопросов, сколько выбрано
  state.exam.questions = SourceQuestions.slice(0, Math.min(count, SourceQuestions.length));
  state.exam.results.totalCount = state.exam.questions.length;

  // Запуск таймера
  state.exam.startTime = Date.now();
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
  state.exam.timerInterval = setInterval(() => {
    state.exam.elapsedSeconds++;
    updateExamTimerDisplay();
  }, 1000);

  // Отрендерить первый вопрос
  renderExamQuestion();
}

// Сброс состояния экзамена
function resetExamState() {
  state.exam.active = false;
  state.exam.questions = [];
  state.exam.currentIndex = 0;
  state.exam.checked = false;
  state.exam.userSelections = [];
  if (state.exam.timerInterval) {
    clearInterval(state.exam.timerInterval);
    state.exam.timerInterval = null;
  }
}

// Обновление таймера в UI
function updateExamTimerDisplay() {
  const timerEl = document.getElementById('exam-timer');
  if (timerEl) {
    const minutes = Math.floor(state.exam.elapsedSeconds / 60);
    const seconds = state.exam.elapsedSeconds % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Отрендерить текущий вопрос экзамена
function renderExamQuestion() {
  const container = document.getElementById('exam-dynamic-area');
  if (!container) return;

  const question = state.exam.questions[state.exam.currentIndex];
  const total = state.exam.questions.length;
  const currentNum = state.exam.currentIndex + 1;
  const percent = Math.round((currentNum / total) * 100);

  const isMulti = question.correct.length > 1;

  // Очищаем текущие выборы для нового вопроса
  if (!state.exam.checked) {
    state.exam.userSelections = [];
  }

  container.innerHTML = `
    <div class="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-md p-6 md:p-8">
      
      <!-- Заголовок с прогрессом и таймером -->
      <div class="flex items-center justify-between gap-4 mb-4">
        <div>
          <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">экзамен ${state.exam.mode === 'errors' ? 'по ошибкам' : ''}</span>
          <h2 class="text-lg font-black text-gray-900 mt-0.5">Вопрос ${currentNum} из ${total}</h2>
        </div>
        <div class="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-gray-100 rounded-xl text-sm font-mono text-gray-600">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span id="exam-timer">00:00</span>
        </div>
      </div>

      <!-- Прогресс-бар -->
      <div class="w-full bg-gray-100 h-2 rounded-full mb-6 overflow-hidden">
        <div class="bg-indigo-600 h-full transition-all duration-300" style="width: ${percent}%"></div>
      </div>

      <!-- Карточка вопроса -->
      <div class="mb-6">
        <div class="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold ${isMulti ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}">
          <span>${isMulti ? 'Несколько правильных ответов' : 'Один правильный ответ'}</span>
        </div>
        <h3 class="text-lg md:text-xl font-bold text-gray-900">${question.question}</h3>
      </div>

      <!-- Варианты ответов -->
      <div id="exam-options-container" class="space-y-3 mb-8">
        <!-- Варианты генерируются динамически -->
      </div>

      <!-- Нижняя панель действий -->
      <div class="flex items-center justify-between border-t border-gray-100 pt-6">
        <button id="exam-exit-btn" class="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition">
          Прервать экзамен
        </button>
        
        <button id="exam-action-btn" disabled class="px-6 py-2.5 bg-gray-200 text-gray-400 font-bold rounded-xl cursor-not-allowed transition">
          Выбрать вариант
        </button>
      </div>

    </div>
  `;

  // Обновляем таймер сразу, чтобы не ждать секунду
  updateExamTimerDisplay();

  // Рендерим варианты ответов
  renderExamOptions(question);

  // Настройка кнопки "Прервать"
  document.getElementById('exam-exit-btn').addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите прервать экзамен? Прогресс этого раунда будет потерян.')) {
      resetExamState();
      renderExamSetup();
    }
  });

  // Настройка кнопки "Проверить" / "Далее"
  const actionBtn = document.getElementById('exam-action-btn');
  actionBtn.addEventListener('click', () => {
    if (!state.exam.checked) {
      checkCurrentAnswer();
    } else {
      nextExamQuestion();
    }
  });
}

// Рендеринг вариантов во время экзамена
function renderExamOptions(question) {
  const container = document.getElementById('exam-options-container');
  if (!container) return;

  container.innerHTML = '';

  question.options.forEach((opt, idx) => {
    const isSelected = state.exam.userSelections.includes(idx);
    const isCorrect = question.correct.includes(idx);
    
    const optionDiv = document.createElement('div');
    optionDiv.dataset.index = idx;

    // Стили зависят от того, проверен ли вопрос
    if (!state.exam.checked) {
      // Обычный режим (до проверки)
      optionDiv.className = `flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition select-none ${
        isSelected 
          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium' 
          : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50/50 text-gray-700'
      }`;

      // Иконка чекбокса/радио
      const inputIcon = isSelected
        ? `<div class="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-md bg-indigo-600 text-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
           </div>`
        : `<div class="flex-shrink-0 w-5.5 h-5.5 rounded-md border-2 border-gray-300 bg-white"></div>`;

      optionDiv.innerHTML = `
        ${inputIcon}
        <span class="text-sm md:text-base">${opt}</span>
      `;

      // Добавляем событие клика
      optionDiv.addEventListener('click', () => {
        toggleExamOption(idx);
      });

    } else {
      // Режим отображения результатов вопроса (после проверки)
      let borderStyle = 'border-gray-100 bg-gray-50 text-gray-400';
      let iconHtml = '';

      if (isCorrect) {
        // Правильный вариант
        borderStyle = 'border-green-500 bg-green-50 text-green-900 font-medium';
        iconHtml = `
          <div class="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-green-500 text-white shadow-sm shadow-green-100">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        `;
      } else if (isSelected && !isCorrect) {
        // Пользователь выбрал неправильный вариант
        borderStyle = 'border-red-500 bg-red-50 text-red-900 font-medium';
        iconHtml = `
          <div class="flex-shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-red-500 text-white shadow-sm shadow-red-100">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        `;
      } else {
        // Неправильный невыбранный
        iconHtml = `<div class="flex-shrink-0 w-5.5 h-5.5 rounded-full border border-gray-200 bg-white text-transparent text-xs flex items-center justify-center">${idx + 1}</div>`;
      }

      // Добавим подписи, если пользователь пропустил или верно выбрал
      let labelHtml = '';
      if (isCorrect && isSelected) {
        labelHtml = `<span class="ml-auto text-xs font-bold text-green-600 bg-green-100/50 px-2 py-0.5 rounded-md">Верно выбран</span>`;
      } else if (isCorrect && !isSelected) {
        labelHtml = `<span class="ml-auto text-xs font-bold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-md">Пропущено</span>`;
      } else if (!isCorrect && isSelected) {
        labelHtml = `<span class="ml-auto text-xs font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded-md">Ваша ошибка</span>`;
      }

      optionDiv.className = `flex items-center gap-3 p-4 rounded-xl border-2 transition select-none ${borderStyle}`;
      optionDiv.innerHTML = `
        ${iconHtml}
        <span class="text-sm md:text-base">${opt}</span>
        ${labelHtml}
      `;
    }

    container.appendChild(optionDiv);
  });
}

// Переключение выбора варианта ответа
function toggleExamOption(idx) {
  const question = state.exam.questions[state.exam.currentIndex];
  const isMulti = question.correct.length > 1;

  if (isMulti) {
    // Несколько правильных ответов: можно выбирать сколько угодно
    const currentIdx = state.exam.userSelections.indexOf(idx);
    if (currentIdx === -1) {
      state.exam.userSelections.push(idx);
    } else {
      state.exam.userSelections.splice(currentIdx, 1);
    }
  } else {
    // Один правильный ответ: выбираем только его
    state.exam.userSelections = [idx];
  }

  // Обновляем варианты ответов
  renderExamOptions(question);

  // Настройка кнопки "Проверить"
  const actionBtn = document.getElementById('exam-action-btn');
  if (state.exam.userSelections.length > 0) {
    actionBtn.disabled = false;
    actionBtn.className = "px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition";
    actionBtn.textContent = "Проверить ответ";
  } else {
    actionBtn.disabled = true;
    actionBtn.className = "px-6 py-2.5 bg-gray-200 text-gray-400 font-bold rounded-xl cursor-not-allowed transition";
    actionBtn.textContent = "Выбрать вариант";
  }
}

// Проверка правильности текущего ответа
function checkCurrentAnswer() {
  const question = state.exam.questions[state.exam.currentIndex];
  state.exam.checked = true;

  // Сравниваем выбор пользователя и правильные ответы
  const isCorrect = isArraysEqual(question.correct, state.exam.userSelections);

  // Записываем детали для итогового экрана
  state.exam.results.details.push({
    question: question,
    userSelected: [...state.exam.userSelections],
    isCorrect: isCorrect
  });

  if (isCorrect) {
    state.exam.results.correctCount++;
    // Если вопрос отвечен правильно, и он был в списке ошибок, удаляем его из работы над ошибками (умное авто-очищение)
    const errorIndex = state.errors.findIndex(err => err.id === question.id);
    if (errorIndex !== -1) {
      state.errors.splice(errorIndex, 1);
      saveErrors();
      showToast('Умная система: Вопрос удален из работы над ошибками, так как вы ответили на него правильно!', 'info');
    }
  } else {
    // Если ответ неправильный, заносим в работу над ошибками
    const errorItem = {
      id: question.id,
      question: question,
      userSelected: [...state.exam.userSelections],
      timestamp: Date.now()
    };

    // Если этот вопрос уже был в ошибках, перезаписываем более свежим результатом
    const existingIndex = state.errors.findIndex(err => err.id === question.id);
    if (existingIndex !== -1) {
      state.errors[existingIndex] = errorItem;
    } else {
      state.errors.push(errorItem);
    }
    saveErrors();
  }

  // Обновляем общий счетчик на лету
  updateStats();

  // Перерисовываем варианты с выделением правильных/неправильных
  renderExamOptions(question);

  // Меняем состояние кнопки действий
  const actionBtn = document.getElementById('exam-action-btn');
  actionBtn.textContent = state.exam.currentIndex + 1 < state.exam.questions.length ? "Следующий вопрос" : "Посмотреть результаты";
  actionBtn.className = "px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition cursor-pointer";

  // Показываем плашку с вердиктом
  const optionsContainer = document.getElementById('exam-options-container');
  const verdictDiv = document.createElement('div');
  
  if (isCorrect) {
    verdictDiv.className = "p-4 rounded-xl bg-green-100 border border-green-200 text-green-800 flex items-center gap-3 animate-fade-in";
    verdictDiv.innerHTML = `
      <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-bold text-sm md:text-base">Великолепно! Абсолютно верно.</p>
      </div>
    `;
  } else {
    verdictDiv.className = "p-4 rounded-xl bg-red-100 border border-red-200 text-red-800 flex items-center gap-3 animate-fade-in";
    verdictDiv.innerHTML = `
      <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-bold text-sm md:text-base">Допущена ошибка!</p>
        <p class="text-xs text-red-600 mt-0.5">Правильные варианты выделены зеленым. Вопрос добавлен в «Работу над ошибками».</p>
      </div>
    `;
  }
  optionsContainer.appendChild(verdictDiv);
}

// Переход к следующему вопросу или завершение экзамена
function nextExamQuestion() {
  state.exam.currentIndex++;
  state.exam.checked = false;

  if (state.exam.currentIndex < state.exam.questions.length) {
    renderExamQuestion();
  } else {
    finishExam();
  }
}

// Завершение экзамена и вывод итогов
function finishExam() {
  if (state.exam.timerInterval) {
    clearInterval(state.exam.timerInterval);
    state.exam.timerInterval = null;
  }
  state.exam.active = false;

  const container = document.getElementById('exam-dynamic-area');
  if (!container) return;

  const correct = state.exam.results.correctCount;
  const total = state.exam.results.totalCount;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const errorsCount = total - correct;

  // Форматируем затраченное время
  const minutes = Math.floor(state.exam.elapsedSeconds / 60);
  const seconds = state.exam.elapsedSeconds % 60;
  const timeStr = `${minutes} мин. ${seconds} сек.`;

  // Оценка и цвета
  let gradeColor = 'text-red-600';
  let gradeBg = 'bg-red-50';
  let gradeBorder = 'border-red-100';
  let title = 'Нужно еще потренироваться!';
  let desc = 'Просмотрите ваши ошибки и изучите теорию в учебнике, чтобы улучшить результат.';

  if (percent >= 90) {
    gradeColor = 'text-emerald-600';
    gradeBg = 'bg-emerald-50';
    gradeBorder = 'border-emerald-100';
    title = 'Превосходный результат!';
    desc = 'Вы показали великолепные знания! Можете смело идти сдавать реальный экзамен.';
  } else if (percent >= 70) {
    gradeColor = 'text-blue-600';
    gradeBg = 'bg-blue-50';
    gradeBorder = 'border-blue-100';
    title = 'Хороший результат!';
    desc = 'Отличный уровень, но есть пара пробелов. Посмотрите, где были сделаны ошибки.';
  } else if (percent >= 50) {
    gradeColor = 'text-amber-600';
    gradeBg = 'bg-amber-50';
    gradeBorder = 'border-amber-100';
    title = 'Удовлетворительно!';
    desc = 'Вы прошли порог, однако результат нестабильный. Рекомендуем пройти тренировку ошибок.';
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-md p-8">
      
      <!-- Круговой результат -->
      <div class="text-center mb-8">
        <div class="mx-auto w-32 h-32 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-indigo-50/20 mb-4">
          <span class="text-3xl font-black text-indigo-700">${percent}%</span>
          <span class="text-xs text-indigo-500 font-semibold uppercase mt-0.5">успешно</span>
        </div>
        
        <div class="inline-block px-4 py-2 rounded-xl border ${gradeBorder} ${gradeBg} ${gradeColor} font-black text-lg mb-2">
          ${title}
        </div>
        <p class="text-gray-500 max-w-md mx-auto text-sm">${desc}</p>
      </div>

      <!-- Статистика в ряд -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-5 rounded-2xl border border-gray-100">
        <div class="text-center">
          <span class="block text-xs text-gray-400 font-bold uppercase">Всего вопросов</span>
          <span class="text-xl font-black text-gray-800 mt-1 block">${total}</span>
        </div>
        <div class="text-center">
          <span class="block text-xs text-gray-400 font-bold uppercase">Верно</span>
          <span class="text-xl font-black text-green-600 mt-1 block">${correct}</span>
        </div>
        <div class="text-center">
          <span class="block text-xs text-gray-400 font-bold uppercase">Ошибок</span>
          <span class="text-xl font-black text-red-500 mt-1 block">${errorsCount}</span>
        </div>
        <div class="text-center">
          <span class="block text-xs text-gray-400 font-bold uppercase">Время</span>
          <span class="text-xl font-black text-gray-800 mt-1 block font-mono">${timeStr}</span>
        </div>
      </div>

      <!-- Специфический лог текущих ошибок (если они были) -->
      ${errorsCount > 0 ? `
        <div class="mb-8">
          <h3 class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Где вы ошиблись в этом тесте:</h3>
          <div class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            ${state.exam.results.details.filter(d => !d.isCorrect).map(d => `
              <div class="p-3.5 rounded-xl border border-red-100 bg-red-50/30 text-xs flex justify-between items-center gap-4">
                <div class="min-w-0 flex-1">
                  <p class="font-bold text-gray-800 truncate">${d.question.question}</p>
                  <p class="text-gray-400 mt-0.5">Вы выбрали: ${d.userSelected.map(idx => d.question.options[idx]).join(', ') || 'ничего'}</p>
                </div>
                <span class="flex-shrink-0 px-2.5 py-1 bg-red-100 text-red-700 font-extrabold rounded-lg">ID ${d.question.id}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Кнопки действий -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button id="exam-restart-btn" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-100 hover:shadow-indigo-200">
          Пройти новый тест
        </button>
        <button id="exam-go-errors-btn" class="px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition">
          Перейти к работе над ошибками
        </button>
      </div>

    </div>
  `;

  // Вешаем обработчики на кнопки результатов
  document.getElementById('exam-restart-btn').addEventListener('click', () => {
    resetExamState();
    renderExamSetup();
  });

  document.getElementById('exam-go-errors-btn').addEventListener('click', () => {
    resetExamState();
    switchTab('errors');
  });
}

/* ==========================================
   РАБОТА НАД ОШИБКАМИ (ERRORS)
   ========================================== */

function renderErrorsPage() {
  const container = document.getElementById('errors-container');
  if (!container) return;

  container.innerHTML = '';

  const errorsCount = state.errors.length;

  if (errorsCount === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
        <div class="mx-auto w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Ошибок не найдено!</h3>
        <p class="text-gray-500 max-w-xs mx-auto text-sm">Поздравляем! Вы ответили на все вопросы верно или еще не проходили экзамен. Попробуйте сдать экзамен, чтобы проверить себя!</p>
        <button onclick="switchTab('exam')" class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition">
          Запустить экзамен
        </button>
      </div>
    `;
    return;
  }

  // Создаем панель управления ошибками в начале страницы
  const controlPanel = document.createElement('div');
  controlPanel.className = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4';
  controlPanel.innerHTML = `
    <div>
      <h3 class="text-base font-bold text-gray-800">Всего сохранено ошибок: <span class="text-red-600 font-black">${errorsCount}</span></h3>
      <p class="text-xs text-gray-400 mt-1">Эти вопросы были решены неверно в симуляторе экзамена. Ниже вы можете изучить их, убрать или пройти тест по ним.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <button id="start-errors-exam-directly" class="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
        </svg>
        Запустить тест по ошибкам
      </button>
      <button id="clear-all-errors-btn" class="flex-1 sm:flex-initial px-4 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:text-gray-700 transition">
        Очистить список
      </button>
    </div>
  `;
  container.appendChild(controlPanel);

  // Обработчики для кнопок панели управления
  document.getElementById('start-errors-exam-directly').addEventListener('click', () => {
    switchTab('exam');
    startExam(state.errors.length, true, 'errors');
  });

  document.getElementById('clear-all-errors-btn').addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите стереть всю историю ошибок?')) {
      state.errors = [];
      saveErrors();
      updateStats();
      renderErrorsPage();
      showToast('История ошибок очищена', 'info');
    }
  });

  // Рендерим список ошибок в виде сетки
  const listContainer = document.createElement('div');
  listContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
  container.appendChild(listContainer);

  state.errors.forEach((err) => {
    const q = err.question;
    const userSel = err.userSelected || [];
    const isMulti = q.correct.length > 1;

    const errorCard = document.createElement('div');
    errorCard.className = 'bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between';

    // Создаем варианты с выделением верных и того, что именно выбрал юзер тогда
    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
      const isCorrect = q.correct.includes(idx);
      const isSelectedByUs = userSel.includes(idx);

      let borderStyle = 'border-gray-100 bg-gray-50/50 text-gray-500';
      let badgeHtml = '';
      let iconHtml = `<span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-gray-200 bg-white text-transparent text-xs mt-0.5">${idx + 1}</span>`;

      if (isCorrect) {
        // Правильный вариант (всегда зеленый)
        borderStyle = 'border-green-300 bg-green-50/50 text-green-900 font-medium';
        iconHtml = `
          <span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white mt-0.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </span>
        `;
        if (isSelectedByUs) {
          badgeHtml = `<span class="ml-auto text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md">Вы выбрали верно</span>`;
        }
      } else if (isSelectedByUs && !isCorrect) {
        // Выбран пользователем неверно (выделен красным)
        borderStyle = 'border-red-300 bg-red-50/50 text-red-900 font-medium';
        iconHtml = `
          <span class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white mt-0.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </span>
        `;
        badgeHtml = `<span class="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">Ваш неверный выбор</span>`;
      }

      optionsHtml += `
        <div class="flex items-start gap-3 p-3 rounded-lg border text-sm ${borderStyle}">
          ${iconHtml}
          <span>${opt}</span>
          ${badgeHtml}
        </div>
      `;
    });

    errorCard.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3 gap-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Вопрос ID: ${q.id}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full ${isMulti ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}">
            ${isMulti ? 'Несколько ответов' : 'Один ответ'}
          </span>
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-4">${q.question}</h3>
        <div class="space-y-2 mb-4">
          ${optionsHtml}
        </div>
      </div>
      <div class="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center text-xs">
        <span class="text-gray-400 font-medium">Добавлено: ${new Date(err.timestamp).toLocaleDateString('ru-RU')}</span>
        <button class="delete-error-btn text-red-600 font-bold hover:text-red-700 hover:underline flex items-center gap-1 transition" data-id="${err.id}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Убрать из ошибок
        </button>
      </div>
    `;

    // Слушатель удаления этой ошибки
    errorCard.querySelector('.delete-error-btn').addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id, 10);
      removeSingleError(id);
    });

    listContainer.appendChild(errorCard);
  });
}

// Удалить конкретную ошибку
function removeSingleError(id) {
  const index = state.errors.findIndex(err => err.id === id);
  if (index !== -1) {
    state.errors.splice(index, 1);
    saveErrors();
    updateStats();
    renderErrorsPage();
    showToast('Вопрос успешно удален из списка ошибок', 'success');
  }
}

/* ==========================================
   БАЗА ТЕСТОВ И ИИ (TEST DATABASE & AI)
   ========================================== */

function setupDocsEvents() {
  // Кнопка экспорта
  const exportBtn = document.getElementById('export-tests-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportQuestionsToJSON();
    });
  }

  // Кнопка сброса к заводским
  const resetBtn = document.getElementById('reset-tests-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Вы действительно хотите стереть все кастомные изменения и вернуться к дефолтной базе вопросов?')) {
        localStorage.removeItem('custom_questions');
        state.allQuestions = [...DEFAULT_QUESTIONS];
        updateStats();
        showToast('База данных успешно сброшена к исходным тестам!', 'info');
      }
    });
  }

  // Кнопка загрузки текстового JSON
  const loadTextBtn = document.getElementById('load-json-text-btn');
  if (loadTextBtn) {
    loadTextBtn.addEventListener('click', () => {
      const textarea = document.getElementById('json-text-input');
      if (!textarea) return;

      const rawVal = textarea.value.trim();
      if (!rawVal) {
        showToast('Пожалуйста, вставьте JSON перед загрузкой', 'warning');
        return;
      }

      try {
        const parsed = JSON.parse(rawVal);
        const validated = validateAndFormatQuestions(parsed);
        if (validated && validated.length > 0) {
          state.allQuestions = validated;
          localStorage.setItem('custom_questions', JSON.stringify(validated));
          updateStats();
          textarea.value = '';
          showToast(`Успешно загружено ${validated.length} вопросов!`, 'success');
        } else {
          showToast('Предоставленный JSON не соответствует требуемой структуре', 'error');
        }
      } catch (err) {
        showToast(`Ошибка разбора JSON: ${err.message}`, 'error');
      }
    });
  }

  // Загрузка JSON файла через Input File
  const fileInput = document.getElementById('json-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const validated = validateAndFormatQuestions(parsed);
          if (validated && validated.length > 0) {
            state.allQuestions = validated;
            localStorage.setItem('custom_questions', JSON.stringify(validated));
            updateStats();
            showToast(`Успешно импортировано ${validated.length} вопросов из файла!`, 'success');
            fileInput.value = ''; // сброс выбора
          } else {
            showToast('JSON в файле не соответствует спецификации вопросов', 'error');
          }
        } catch (err) {
          showToast(`Ошибка чтения JSON-файла: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Кнопка Копирования Промта для ИИ
  const copyPromptBtn = document.getElementById('copy-ai-prompt-btn');
  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', () => {
      const promptText = document.getElementById('ai-prompt-text').innerText;
      navigator.clipboard.writeText(promptText).then(() => {
        showToast('Промт для ИИ успешно скопирован в буфер обмена!', 'success');
      }).catch(err => {
        console.error('Не удалось скопировать', err);
        showToast('Не удалось скопировать автоматически, выделите промт и скопируйте вручную', 'warning');
      });
    });
  }
}

// Проверка структуры вопросов
function validateAndFormatQuestions(arr) {
  if (!Array.isArray(arr)) return null;

  const validQuestions = [];
  arr.forEach((q, idx) => {
    if (typeof q === 'object' && q !== null) {
      // Подстраиваем id, если его нет
      const id = q.id !== undefined ? parseInt(q.id, 10) : (idx + 1);
      const questionText = q.question ? String(q.question).trim() : 'Вопрос без текста';
      
      let options = [];
      if (Array.isArray(q.options)) {
        options = q.options.map(o => String(o).trim());
      }

      let correct = [];
      if (Array.isArray(q.correct)) {
        correct = q.correct.map(c => parseInt(c, 10)).filter(c => !isNaN(c) && c >= 0 && c < options.length);
      } else if (typeof q.correct === 'number') {
        correct = [parseInt(q.correct, 10)].filter(c => c >= 0 && c < options.length);
      }

      if (options.length > 0 && correct.length > 0) {
        validQuestions.push({
          id: id,
          question: questionText,
          options: options,
          correct: correct
        });
      }
    }
  });

  return validQuestions;
}

// Экспорт текущей базы в JSON файл
function exportQuestionsToJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.allQuestions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "my_custom_tests.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Экспорт выполнен! Файл скачивается.', 'success');
}


/* ==========================================
   УТИЛИТЫ И ХЕЛПЕРЫ
   ========================================== */

// Сравнение двух массивов без учета порядка
function isArraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort((a, b) => a - b);
  const sorted2 = [...arr2].sort((a, b) => a - b);
  return sorted1.every((val, index) => val === sorted2[index]);
}

// Функция отображения уведомлений (Toast)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  let bgClass = 'bg-slate-800 text-white';
  let iconHtml = '';

  if (type === 'success') {
    bgClass = 'bg-emerald-600 text-white';
    iconHtml = `
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  } else if (type === 'error') {
    bgClass = 'bg-rose-600 text-white';
    iconHtml = `
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  } else if (type === 'warning') {
    bgClass = 'bg-amber-500 text-white';
    iconHtml = `
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    `;
  } else if (type === 'info') {
    bgClass = 'bg-indigo-600 text-white';
    iconHtml = `
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  }

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg transition duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `
    ${iconHtml}
    <span class="text-sm font-bold">${message}</span>
  `;

  container.appendChild(toast);

  // Плавное появление
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 10);

  // Плавное удаление через 4 секунды
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
