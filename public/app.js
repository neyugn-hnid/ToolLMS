// ===== CONSTANTS =====
const ANSWER_LABELS = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

// ===== TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// ===== TOKEN MODAL =====
const tokenBtn = document.getElementById('tokenBtn');
const tokenModal = document.getElementById('tokenModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');

tokenBtn.addEventListener('click', () => startOfficialLoginTokenFlow());
modalCloseBtn.addEventListener('click', () => tokenModal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === tokenModal) tokenModal.style.display = 'none'; });

document.getElementById('updateTokenForm').addEventListener('submit', async e => {
    e.preventDefault();
    let token = document.getElementById('tokenInput').value.trim().replace(/^Bearer\s+/i, '');
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = ' Đang cập nhật...';
    try {
        const res = await fetch('/api/update-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(' Token đã được cập nhật thành công!', 'success');
            tokenModal.style.display = 'none';
            e.target.reset();
        } else {
            showToast(' Cập nhật thất bại: ' + (data.error || 'Lỗi không xác định'), 'error');
        }
    } catch (err) {
        showToast(' Lỗi: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = orig;
    }
});

// ===== AUTO LOGIN =====
// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', function() {
    const pwInput = document.getElementById('loginPassword');
    if (pwInput.type === 'password') {
        pwInput.type = 'text';
        this.textContent = '🙈';
    } else {
        pwInput.type = 'password';
        this.textContent = '👁️';
    }
});

document.getElementById('officialLoginBtn').addEventListener('click', () => startOfficialLoginTokenFlow());

async function startOfficialLoginTokenFlow() {
    const btn = tokenBtn;
    const modalBtn = document.getElementById('officialLoginBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const msgEl = document.getElementById('autoLoginMsg');

    btn.disabled = true;
    if (modalBtn) modalBtn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Đang chờ đăng nhập...';

    if (btnText && btnLoader) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    }
    if (msgEl && tokenModal.style.display !== 'none') {
        msgEl.style.display = 'block';
        msgEl.style.background = 'rgba(255,255,255,0.06)';
        msgEl.style.border = '1px solid var(--border)';
        msgEl.style.color = 'var(--text-sub)';
        msgEl.textContent = 'Đã mở trang LMS chính thức. Hãy đăng nhập trong cửa sổ vừa mở, tool sẽ tự bắt token...';
    }

    try {
        const res = await fetch('/api/official-login-token', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Không lấy được token');

        handleCapturedClasses(data.classes || []);
        if (msgEl && tokenModal.style.display !== 'none') {
            msgEl.style.background = 'rgba(0,200,150,0.1)';
            msgEl.style.border = '1px solid rgba(0,200,150,0.3)';
            msgEl.style.color = 'var(--green)';
            msgEl.innerHTML = renderOfficialLoginMessage(data);
        }
        showToast(` Đã lấy token${data.total_classes ? ` và bắt được ${data.total_classes} môn` : ''}!`, 'success');
    } catch (err) {
        if (msgEl && tokenModal.style.display !== 'none') {
            msgEl.style.background = 'rgba(255,76,106,0.08)';
            msgEl.style.border = '1px solid rgba(255,76,106,0.25)';
            msgEl.style.color = 'var(--red)';
            msgEl.textContent = '❌ ' + err.message;
        }
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        if (modalBtn) modalBtn.disabled = false;
        btn.textContent = originalText;
        if (btnText && btnLoader) {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }
}

document.addEventListener('click', e => {
    const btn = e.target.closest('.captured-class-btn');
    if (!btn) return;
    const classId = btn.dataset.classId || '';
    if (!classId) return;
    fillClassIdEverywhere(classId);
    showToast(`Đã điền Class ID: ${classId}`, 'success');
});

document.addEventListener('click', async e => {
    const btn = e.target.closest('.captured-lessons-btn');
    if (!btn) return;
    e.stopPropagation();

    const classId = btn.dataset.classId || '';
    const classStudentId = btn.dataset.classStudentId || '';
    if (!classId) return;
    fillClassIdEverywhere(classId);
    await loadCapturedClassLessons(classId, classStudentId, btn);
});

document.addEventListener('click', async e => {
    const btn = e.target.closest('.captured-questions-btn');
    if (!btn) return;
    e.stopPropagation();

    const classId = btn.dataset.classId || '';
    if (!classId) return;
    fillClassIdEverywhere(classId);
    await loadCapturedClassQuestions(classId, btn);
});

function handleCapturedClasses(classes) {
    const classList = normalizeCapturedClasses(classes);
    window._capturedClasses = classList;
    renderCapturedClassesPanel(classList);
    if (!classList.length) return;
    fillClassIdEverywhere(classList[0].class_id);
}

function renderCapturedClassesPanel(classes) {
    const panel = document.getElementById('capturedClassesPanel');
    if (!panel) return;

    const list = normalizeCapturedClasses(classes);
    panel.style.display = 'block';

    if (!list.length) {
        panel.innerHTML = `
            <div class="captured-panel-header">
                <h3>Môn học đã bắt được</h3>
                <span class="badge" style="background:rgba(255,76,106,0.14);color:var(--red)">0 môn</span>
            </div>
            <p class="captured-panel-empty">Đã lấy token, nhưng chưa thấy response danh sách môn từ LMS.</p>`;
        return;
    }

    panel.innerHTML = `
        <div class="captured-panel-header">
            <h3>Môn học đã bắt được</h3>
            <span class="badge badge-green">${list.length} môn</span>
        </div>
        <div class="captured-class-grid captured-class-list-main">
            ${list.map(item => `
                <div class="captured-class-card">
                    <button type="button" class="captured-class-main captured-class-btn" data-class-id="${escapeAttribute(item.class_id)}">
                        <span>${escapeHtml(item.class_name || `Class ${item.class_id}`)}</span>
                        <strong>Class ID ${escapeHtml(item.class_id)}</strong>
                    </button>
                    <div class="captured-card-actions">
                        <button type="button" class="captured-lessons-btn" data-class-id="${escapeAttribute(item.class_id)}" data-class-student-id="${escapeAttribute(item.class_student_id || '')}">
                            Lấy bài học
                        </button>
                        <button type="button" class="captured-questions-btn" data-class-id="${escapeAttribute(item.class_id)}">
                            Lấy câu hỏi
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function normalizeCapturedClasses(classes) {
    if (!Array.isArray(classes)) return [];
    const classMap = new Map();
    classes
        .filter(item => item && item.class_id && Number(item.class_id) > 0)
        .forEach(item => {
            const id = String(item.class_id);
            const existing = classMap.get(id) || {};
            classMap.set(id, {
                ...existing,
                ...item,
                class_student_id: item.class_student_id || existing.class_student_id || ''
            });
        });
    return Array.from(classMap.values());
}

function fillClassIdEverywhere(classId) {
    document.querySelectorAll('.lesson-catalog-input').forEach(input => {
        input.value = classId;
    });
    const courseClassInput = document.getElementById('classId');
    const autoClassInput = document.getElementById('autoClassId');
    if (courseClassInput) courseClassInput.value = classId;
    if (autoClassInput) autoClassInput.value = classId;
}

async function loadCapturedClassLessons(classId, classStudentId, btn) {
    const results = document.getElementById('lessonListPanel') || document.getElementById('mainResults');
    const answerPanel = document.getElementById('answerResultsPanel');
    if (!results) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang lấy...';
    results.innerHTML = `<div class="loading-wrap captured-inline-loading"><div class="spinner"></div><p>Đang lấy danh sách bài học...</p></div>`;
    if (answerPanel) {
        answerPanel.innerHTML = `<p class="workspace-empty">Danh sách bài đã đổi. Bấm biểu tượng tìm đáp án ở từng bài để xem kết quả.</p>`;
    }

    try {
        const params = new URLSearchParams({ class_id: classId });
        if (classStudentId) params.set('class_student_id', classStudentId);
        const res = await fetch(`/api/class-lessons?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');

        lessonCatalogState.classId = classId;
        lessonCatalogState.data = data;
        renderLessonCatalogState();
        displayLessonCatalog(data, results);
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        showError(results, err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function loadCapturedClassQuestions(classId, btn) {
    const results = document.getElementById('answerResultsPanel') || document.getElementById('mainResults');
    if (!results) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang lấy...';
    results.innerHTML = `<div class="loading-wrap captured-inline-loading"><div class="spinner"></div><p>Đang lấy câu hỏi toàn môn...</p></div>`;

    try {
        const res = await fetch(`/api/class-questions?class_id=${encodeURIComponent(classId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
        displayCourseQuestions(data, results);
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        showError(results, err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function renderOfficialLoginMessage(data) {
    const classes = Array.isArray(data.classes) ? data.classes : [];
    if (!classes.length) {
        return `✅ ${escapeHtml(data.message)}<p class="auto-login-note">Chưa bắt được danh sách môn từ trang LMS.</p>`;
    }

    return `
        <div>✅ ${escapeHtml(data.message)}</div>
        <div class="captured-class-list">
            ${classes.map(item => `
                <button type="button" class="captured-class-btn" data-class-id="${escapeAttribute(item.class_id)}">
                    <span>${escapeHtml(item.class_name || `Class ${item.class_id}`)}</span>
                    <strong>${escapeHtml(item.class_id)}</strong>
                </button>
            `).join('')}
        </div>`;
}

document.getElementById('autoLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) return;

    const btn = document.getElementById('autoLoginBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const msgEl = document.getElementById('autoLoginMsg');
    const orig = btnText.textContent;
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    msgEl.style.display = 'none';

    try {
        const res = await fetch('/api/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(0,200,150,0.1)';
            msgEl.style.border = '1px solid rgba(0,200,150,0.3)';
            msgEl.style.color = 'var(--green)';
            msgEl.innerHTML = '✅ ' + escapeHtml(data.message);
            showToast(' Đăng nhập tự động thành công!', 'success');
            e.target.reset();
            document.getElementById('togglePassword').textContent = '👁️';
        } else {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(255,76,106,0.08)';
            msgEl.style.border = '1px solid rgba(255,76,106,0.25)';
            msgEl.style.color = 'var(--red)';
            msgEl.textContent = '❌ ' + (data.error || 'Đăng nhập thất bại');
        }
    } catch (err) {
        msgEl.style.display = 'block';
        msgEl.style.background = 'rgba(255,76,106,0.08)';
        msgEl.style.border = '1px solid rgba(255,76,106,0.25)';
        msgEl.style.color = 'var(--red)';
        msgEl.textContent = '❌ Lỗi: ' + err.message;
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});

// ===== FIND ANSWERS (lesson_id) =====
const searchForm = document.getElementById('searchForm');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const submitBtn = document.getElementById('submitBtn');

if (searchForm) {
    searchForm.addEventListener('submit', async e => {
        e.preventDefault();
        const lessonId = document.getElementById('lessonId').value.trim();
        if (!lessonId) return showToast('Vui lòng nhập Lesson ID', 'error');

        setLoading(submitBtn, loading, results, true);

        try {
            const res = await fetch('/api/find-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lesson_id: lessonId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
            displayAnswers(data, results);
        } catch (err) {
            showError(results, err.message);
        } finally {
            setLoading(submitBtn, loading, results, false);
        }
    });
}

function displayAnswers(data, container) {
    const { questions, correctAnswers, lesson_id } = data;
    const validQs = questions ? questions.filter(q => q.question_number) : [];
    if (!validQs.length) {
        container.innerHTML = `<div class="question-card"><p>Không tìm thấy câu hỏi nào cho Lesson ID này.</p></div>`;
        return;
    }
    window._lastAnswerData = data;

    let html = `
        <div class="summary-bar">
            <h3> Kết quả tìm kiếm</h3>
            <span class="badge badge-blue"> ${validQs.length} câu hỏi</span>
            <div style="margin-left:auto; display:flex; gap: 8px;">
                <button class="btn-primary" style="background:#3b82f6; padding:8px 18px;font-size:0.85rem;"
                    onclick='startPracticeMode(window._lastAnswerData.questions, window._lastAnswerData.correctAnswers, "Luyện tập: Đáp án")'>
                     Luyện Tập
                </button>
                <button class="btn-primary" style="background:var(--green); padding:8px 18px;font-size:0.85rem;"
                    id="submitFoundAnswersBtn" onclick="submitFoundAnswers()">
                     Nộp bài ngay
                </button>
                <button class="btn-primary" style="padding:8px 18px;font-size:0.85rem;"
                    onclick="downloadAsWord(window._lastAnswerData.questions, window._lastAnswerData.correctAnswers, 'dap-an.doc')">
                     Tải Word
                </button>
            </div>
        </div>`;

    validQs.forEach((q, i) => {
        const num = i + 1;
        const correctAnswer = correctAnswers ? String(correctAnswers[q.id] || '') : '';
        const correctLabel = ANSWER_LABELS[correctAnswer] || correctAnswer || 'Chưa có';
        html += `
        <div class="question-card ${correctAnswer ? 'success-card' : ''}">
            <div class="question-meta">Câu ${num}</div>
            ${correctAnswer ? `<div class="badge badge-green" style="margin-bottom:12px;">Đáp án đúng: ${correctLabel}</div>` : ''}
            <div class="question-text">${stripHtml(q.question_direction)}</div>
            <div class="answers">`;
        if (q.answer_option && Array.isArray(q.answer_option)) {
            q.answer_option.forEach(opt => {
                const label = ANSWER_LABELS[opt.id] || opt.id;
                const isCorrect = correctAnswer === String(opt.id);
                html += `<div class="answer-option ${isCorrect ? 'correct' : ''}">${label}. ${stripHtml(opt.value)}</div>`;
            });
        }
        html += `</div></div>`;
    });
    html += renderCorrectAnswerSummary(validQs, correctAnswers);
    container.innerHTML = html;
}

async function submitFoundAnswers() {
    const answerData = window._lastAnswerData;
    const answers = answerData?.correctAnswers || {};
    const lessonId = answerData?.lesson_id;
    const testId = answerData?.questions?.find(question => question.test_id)?.test_id;
    const answerCount = Object.keys(answers).length;

    if (!lessonId || !testId || !answerCount) {
        return showToast('Chưa có Lesson ID, Test ID hoặc đáp án để nộp bài', 'error');
    }

    const confirmed = window.confirm(`Nộp ${answerCount} đáp án của Lesson ID ${lessonId}?`);
    if (!confirmed) return;

    const submitButton = document.getElementById('submitFoundAnswersBtn');
    if (submitButton) submitButton.disabled = true;

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lesson_id: lessonId, test_id: testId, answers })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nộp bài thất bại');
        showToast(`Đã nộp ${answerCount} đáp án thành công!`, 'success');
    } catch (error) {
        showToast('Nộp bài thất bại: ' + error.message, 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

// ===== COURSE QUESTIONS (class_id) =====
const courseForm = document.getElementById('courseForm');
const courseLoading = document.getElementById('courseLoading');
const courseResults = document.getElementById('courseResults');
const courseSubmitBtn = document.getElementById('courseSubmitBtn');
const courseLoadingMsg = document.getElementById('courseLoadingMsg');

const lessonCatalogState = { classId: '', data: null };
const lessonCatalogForms = document.querySelectorAll('.lesson-catalog-form');
const lessonCatalogButtons = document.querySelectorAll('.lesson-catalog-btn');
const lessonCatalogLoadings = document.querySelectorAll('.lesson-catalog-loading');
const lessonCatalogResultsEls = document.querySelectorAll('.lesson-catalog-results');

function syncLessonCatalogInputs(classValue) {
    document.querySelectorAll('.lesson-catalog-input').forEach(input => {
        input.value = classValue;
    });
}

function renderLessonCatalogState() {
    lessonCatalogResultsEls.forEach(container => {
        if (!lessonCatalogState.data) {
            container.innerHTML = '';
            return;
        }
        displayLessonCatalog(lessonCatalogState.data, container);
    });
}

if (courseForm) {
    courseForm.addEventListener('submit', async e => {
        e.preventDefault();
        const classId = document.getElementById('classId').value.trim();
        if (!classId) return showToast('Vui lòng nhập Class ID', 'error');

        setLoading(courseSubmitBtn, courseLoading, courseResults, true);
        courseLoadingMsg.textContent = 'Đang lấy thông tin môn học...';

        try {
            const res = await fetch(`/api/class-questions?class_id=${encodeURIComponent(classId)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
            displayCourseQuestions(data, courseResults);
        } catch (err) {
            showError(courseResults, err.message);
        } finally {
            setLoading(courseSubmitBtn, courseLoading, courseResults, false);
        }
    });
}

lessonCatalogForms.forEach(form => {
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const classId = form.querySelector('.lesson-catalog-input').value.trim();
        if (!classId) return showToast('Vui lòng nhập Class ID', 'error');

        lessonCatalogState.classId = classId;
        syncLessonCatalogInputs(classId);

        const widget = form.closest('.lesson-catalog-widget');
        const button = form.querySelector('.lesson-catalog-btn');
        const loading = widget.querySelector('.lesson-catalog-loading');
        const results = widget.querySelector('.lesson-catalog-results');

        setLoading(button, loading, results, true);

        try {
            const matchedClass = (window._capturedClasses || []).find(item => String(item.class_id) === String(classId));
            const params = new URLSearchParams({ class_id: classId });
            if (matchedClass?.class_student_id) {
                params.set('class_student_id', matchedClass.class_student_id);
            }
            const res = await fetch(`/api/class-lessons?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
            lessonCatalogState.data = data;
            renderLessonCatalogState();
        } catch (err) {
            lessonCatalogState.data = null;
            showError(results, err.message);
        } finally {
            setLoading(button, loading, results, false);
        }
    });
});

function displayCourseQuestions(data, container) {
    const { class_name, total_questions, lesson_summary, questions, correctAnswers } = data;
    const validQs = questions ? questions.filter(q => q.question_number) : [];

    if (!validQs.length) {
        container.innerHTML = `<div class="question-card"><p>Không tìm thấy câu hỏi nào cho môn này.</p></div>`;
        return;
    }
    window._lastCourseData = data;

    const summaryCount = lesson_summary ? lesson_summary.length : '?';
    let html = `
        <div class="summary-bar">
            <h3> ${class_name}</h3>
        </div>
        <div class="summary-bar" style="margin-bottom:24px;">
            <span class="badge badge-blue"> ${summaryCount} bài quiz</span>
            <span class="badge badge-green">️ ${validQs.length} câu hỏi</span>
            <div style="margin-left:auto; display:flex; gap: 8px;">
                <button class="btn-primary" style="background:#3b82f6; padding:8px 18px;font-size:0.85rem;"
                    onclick='startPracticeMode(window._lastCourseData.questions, window._lastCourseData.correctAnswers, window._lastCourseData.class_name)'>
                     Luyện Tập Toàn Môn
                </button>
                <button class="btn-primary" style="padding:8px 18px;font-size:0.85rem;"
                    onclick="downloadAsWord(window._lastCourseData.questions, window._lastCourseData.correctAnswers, 'cau-hoi-mon-hoc.doc')">
                     Tải Word
                </button>
            </div>
        </div>`;

    // Flat list, đánh số từ 1
    validQs.forEach((q, i) => {
        const num = i + 1;
        const correctAnswer = correctAnswers ? correctAnswers[q.id] : null;
        html += `
        <div class="question-card">
            <div class="question-meta">Câu ${num}</div>
            <div class="question-text">${stripHtml(q.question_direction)}</div>
            <div class="answers">`;
        if (q.answer_option && Array.isArray(q.answer_option)) {
            q.answer_option.forEach(opt => {
                const label = ANSWER_LABELS[opt.id] || opt.id;
                const isCorrect = correctAnswer === opt.id;
                html += `<div class="answer-option ${isCorrect ? 'correct' : ''}">${label}. ${stripHtml(opt.value)}</div>`;
            });
        }
        html += `</div></div>`;
    });

    html += renderCorrectAnswerSummary(validQs, correctAnswers);
    container.innerHTML = html;
}

function renderCorrectAnswerSummary(questions, correctAnswers) {
    const items = (questions || []).map((q, index) => {
        const rawAnswer = correctAnswers ? String(correctAnswers[q.id] || '') : '';
        const label = ANSWER_LABELS[rawAnswer] || rawAnswer || 'Chưa có';
        const correctOption = (q.answer_option || []).find(option => String(option.id) === rawAnswer);
        const answerTitle = correctOption ? stripHtml(correctOption.value || '').trim() : '';
        return `
            <div class="answer-summary-item">
                <div>
                    <span>Câu ${index + 1}</span>
                    <strong>${escapeHtml(answerTitle || label)}</strong>
                </div>
            </div>`;
    });

    if (!items.length) return '';

    return `
        <div class="question-card answer-summary-card">
            <div class="summary-bar">
                <h3>Đáp án đúng</h3>
                <span class="badge badge-green">${items.length} câu</span>
            </div>
            <div class="answer-summary-grid">
                ${items.join('')}
            </div>
        </div>`;
}

function displayLessonCatalog(data, container) {
    const { class_name, total_lessons, lessons = [] } = data;

    if (!lessons.length) {
        container.innerHTML = `<div class="question-card"><p>Không tìm thấy bài học nào cho môn này.</p></div>`;
        return;
    }

    let html = `
        <div class="summary-bar">
            <h3> ${class_name || 'Danh sách môn/bài học'}</h3>
            <span class="badge badge-blue"> ${total_lessons} bài</span>
        </div>
        <div class="question-card catalog-card">
            <div class="catalog-table-wrap">
            <table class="catalog-table">
                <colgroup>
                    <col class="col-index">
                    <col class="col-title">
                    <col class="col-id">
                    <col class="col-lesson-id">
                </colgroup>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>ID</th>
                    <th>Lesson ID</th>
                </tr>`;

    lessons.forEach((lesson, index) => {
        const title = lesson.title || lesson.lesson_name || `Bài ${index + 1}`;
        const trackingId = lesson.tracking_id || lesson.id || '';
        const lessonId = lesson.lesson_id || '';
        const isVideo = Number(lesson.video_duration || 0) > 0 || Boolean(lesson.video_id);
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(stripHtml(title))}</td>
                <td>
                    <div class="catalog-cell-action">
                        <span>${escapeHtml(trackingId || 'N/A')}</span>
                        ${trackingId ? `<button type="button" class="catalog-action-btn catalog-active-btn" data-id="${escapeAttribute(trackingId)}" title="Active" aria-label="Active">${iconPlay()}</button>` : ''}
                    </div>
                </td>
                <td>
                    <div class="catalog-cell-action">
                        <span>${escapeHtml(lessonId || 'N/A')}</span>
                        ${lessonId && !isVideo ? `<button type="button" class="catalog-action-btn catalog-answer-btn" data-lesson-id="${escapeAttribute(lessonId)}" title="Tìm đáp án" aria-label="Tìm đáp án">${iconSearch()}</button>` : ''}
                    </div>
                </td>
            </tr>`;
    });

    html += `</table></div></div>`;
    container.innerHTML = html;
}

function iconPlay() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
}

function iconSearch() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8 7.5 7.5 0 0 1-5.3 12.8z"></path><path d="m16 16 4 4"></path></svg>';
}

function iconLoader() {
    return '<span class="catalog-loader" aria-hidden="true"></span>';
}

document.addEventListener('click', async e => {
    const activeBtn = e.target.closest('.catalog-active-btn');
    const answerBtn = e.target.closest('.catalog-answer-btn');
    if (!activeBtn && !answerBtn) return;

    const btn = activeBtn || answerBtn;
    const output = findCatalogActionOutput(btn);
    if (!output) return;

    if (activeBtn) {
        await runCatalogActive(activeBtn, output);
        return;
    }

    await runCatalogFindAnswers(answerBtn, output);
});

function findCatalogActionOutput(btn) {
    const answerPanel = document.getElementById('answerResultsPanel');
    if (answerPanel) return answerPanel;

    const scopedRoot = btn.closest('.lesson-catalog-results, .captured-lessons-results, #capturedActionResults, #mainResults');
    if (scopedRoot) {
        const output = scopedRoot.querySelector('.catalog-action-results');
        if (output) return output;
    }

    const tableCard = btn.closest('.catalog-card');
    if (tableCard?.nextElementSibling?.classList.contains('catalog-action-results')) {
        return tableCard.nextElementSibling;
    }

    return document.querySelector('.catalog-action-results');
}

async function runCatalogActive(btn, output) {
    const trackingId = btn.dataset.id;
    if (!trackingId) return showToast('Không có ID để active', 'error');

    setCatalogButtonLoading(btn, true, 'Đang active...');
    output.innerHTML = '';

    try {
        const res = await fetch('/api/bypass-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: trackingId, video_duration: null })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
        displayVideoResults(data, output);
        showToast('Active video thành công!', 'success');
    } catch (err) {
        showError(output, err.message);
    } finally {
        setCatalogButtonLoading(btn, false);
    }
}

async function runCatalogFindAnswers(btn, output) {
    const lessonId = btn.dataset.lessonId;
    if (!lessonId) return showToast('Không có Lesson ID để tìm đáp án', 'error');

    setCatalogButtonLoading(btn, true, 'Đang tìm...');
    output.innerHTML = '';

    try {
        const res = await fetch('/api/find-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lesson_id: lessonId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
        displayAnswers(data, output);
        output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        showError(output, err.message);
    } finally {
        setCatalogButtonLoading(btn, false);
    }
}

function setCatalogButtonLoading(btn, on) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = on;
    btn.innerHTML = on ? iconLoader() : btn.dataset.originalHtml;
}

function downloadAsWord(questions, correctAnswers, filename) {
    const styles = `
        body { font-family: Times New Roman, serif; font-size: 13pt; margin: 2cm; }
        p { margin: 4pt 0; line-height: 1.5; }
        .q-header { font-weight: bold; margin-top: 14pt; }
        .opt { margin-left: 20pt; }
        .correct { font-weight: bold; }
    `;

    const validQs = (questions || []).filter(q => q.question_number);
    let body = '';
    validQs.forEach((q, i) => {
        const num = i + 1;
        const qText = stripHtml(q.question_direction);
        body += `<p class="q-header">Câu ${num}. ${qText}</p>`;
        if (q.answer_option && Array.isArray(q.answer_option)) {
            q.answer_option.forEach(opt => {
                const label = ANSWER_LABELS[opt.id] || opt.id;
                const optText = stripHtml(opt.value);
                const isCorrect = correctAnswers && correctAnswers[q.id] === opt.id;
                
                if (isCorrect) {
                    body += `<p class="opt"><b>${label}. ${optText}</b></p>`;
                } else {
                    body += `<p class="opt">${label}. ${optText}</p>`;
                }
            });
        }
        body += `<p> </p>`;
    });

    const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><style>${styles}</style></head>
        <body>${body}</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(' Đã tải file Word!', 'success');
}

// ===== PRACTICE MODE =====
let practiceState = { questions: [], correctAnswers: {}, userAnswers: {} };

function startPracticeMode(questions, correctAnswers, title) {
    const validQs = (questions || []).filter(q => q.question_number);
    if (!validQs.length) return showToast('Không có câu hỏi để luyện tập!', 'error');

    practiceState.questions = validQs;
    practiceState.correctAnswers = correctAnswers || {};
    practiceState.userAnswers = {};

    renderPracticeMode(title);
}

function renderPracticeMode(title) {
    const mainContainer = document.querySelector('main');
    mainContainer.classList.add('practice-active');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    let html = `
        <div class="practice-container">
            <div class="practice-header">
                <div>
                    <span class="practice-eyebrow">CHẾ ĐỘ LUYỆN TẬP</span>
                    <h2>${escapeHtml(title || 'Bài luyện tập')}</h2>
                </div>
                <div class="practice-header-actions">
                    <span class="practice-progress-chip"><strong id="practiceAnsweredCount">0</strong> / ${practiceState.questions.length} đã làm</span>
                    <button class="btn-primary btn-outline" onclick="exitPracticeMode()">Thoát</button>
                </div>
            </div>
            
            <div class="practice-layout">
                <div class="practice-main">
                    ${practiceState.questions.map((q, i) => `
                        <div class="question-card practice-question" id="q-card-${q.id}">
                            <div class="practice-question-head">
                                <div class="question-meta" id="q-meta-${q.id}">Câu ${i + 1}</div>
                                <span class="practice-question-status" id="q-status-${q.id}">Chưa làm</span>
                            </div>
                            <div class="question-text">${stripHtml(q.question_direction)}</div>
                            <div class="answers">
                                ${(q.answer_option || []).map(opt => `
                                    <div class="answer-option practice-opt" id="opt-${q.id}-${opt.id}" 
                                        onclick="selectPracticeAnswer(${q.id}, ${opt.id})">
                                        ${ANSWER_LABELS[opt.id] || opt.id}. ${stripHtml(opt.value)}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="practice-sidebar">
                    <div class="practice-sidebar-heading">
                        <div>
                            <span class="practice-eyebrow">TIẾN ĐỘ</span>
                            <h3>Bảng câu hỏi</h3>
                        </div>
                        <strong id="practiceSidebarCount">0/${practiceState.questions.length}</strong>
                    </div>
                    <div class="practice-progress-track"><span id="practiceProgressBar"></span></div>
                    <div class="nav-grid">
                        ${practiceState.questions.map((q, i) => `
                            <a href="#q-card-${q.id}" class="nav-box" id="nav-${q.id}" title="Câu ${i + 1}">${i + 1}</a>
                        `).join('')}
                    </div>
                    <div class="practice-legend">
                        <span><i class="legend-dot"></i> Chưa làm</span>
                        <span><i class="legend-dot legend-correct"></i> Đúng</span>
                        <span><i class="legend-dot legend-wrong"></i> Sai</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    let practiceWrap = document.getElementById('practiceWrap');
    if (!practiceWrap) {
        practiceWrap = document.createElement('div');
        practiceWrap.id = 'practiceWrap';
        mainContainer.appendChild(practiceWrap);
    }
    practiceWrap.innerHTML = html;
    practiceWrap.style.display = 'block';
}

function selectPracticeAnswer(qId, optId) {
    if (practiceState.userAnswers[qId]) return; // đã trả lời rồi thì không cho đổi

    practiceState.userAnswers[qId] = optId;
    
    // Khóa không cho click tiếp câu này
    document.querySelectorAll(`#q-card-${qId} .practice-opt`).forEach(el => el.style.pointerEvents = 'none');
    
    const correctOpt = practiceState.correctAnswers[qId];
    const userEl = document.getElementById(`opt-${qId}-${optId}`);
    const nav = document.getElementById(`nav-${qId}`);
    const status = document.getElementById(`q-status-${qId}`);
    const answeredCount = Object.keys(practiceState.userAnswers).length;
    const totalQuestions = practiceState.questions.length;

    document.getElementById('practiceAnsweredCount').textContent = answeredCount;
    document.getElementById('practiceSidebarCount').textContent = `${answeredCount}/${totalQuestions}`;
    document.getElementById('practiceProgressBar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    if (status) status.textContent = optId == correctOpt ? 'Chính xác' : 'Đã trả lời';
    
    if (optId == correctOpt) {
        if (userEl) userEl.classList.add('review-correct');
        if (nav) nav.classList.add('review-correct-nav');
    } else {
        if (userEl) userEl.classList.add('review-wrong');
        if (nav) nav.classList.add('review-wrong-nav');
        
        // Bật sáng đáp án đúng cho user biết
        const correctEl = document.getElementById(`opt-${qId}-${correctOpt}`);
        if (correctEl) correctEl.classList.add('review-correct');
    }
}

function exitPracticeMode() {
    const practiceWrap = document.getElementById('practiceWrap');
    const mainContainer = document.querySelector('main');
    practiceWrap.style.display = 'none';
    mainContainer.classList.remove('practice-active');
    
    // Show active tab
    const activeTabObj = document.querySelector('.tab-btn.active');
    if (activeTabObj) {
        document.getElementById(activeTabObj.dataset.tab + 'Tab').classList.add('active');
    }
}

// ===== HELPERS =====

const videoForm = document.getElementById('videoForm');
const videoLoading = document.getElementById('videoLoading');
const videoResults = document.getElementById('videoResults');
const videoSubmitBtn = document.getElementById('videoSubmitBtn');

if (videoForm) {
    videoForm.addEventListener('submit', async e => {
        e.preventDefault();
        const trackingId = document.getElementById('trackingId').value.trim();
        const videoDuration = document.getElementById('videoDuration').value.trim();
        if (!trackingId) return showToast('Vui lòng nhập Video ID', 'error');

        setLoading(videoSubmitBtn, videoLoading, videoResults, true);

        try {
            const res = await fetch('/api/bypass-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracking_id: trackingId, video_duration: videoDuration || null })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
            displayVideoResults(data, videoResults);
        } catch (err) {
            showError(videoResults, err.message);
        } finally {
            setLoading(videoSubmitBtn, videoLoading, videoResults, false);
        }
    });
}

function displayVideoResults(data, container) {
    const { tracking, lesson } = data;
    const ok = tracking?.completed;
    container.innerHTML = `
        <div class="question-card ${ok ? 'success-card' : 'error-card'}">
            <div class="question-meta" style="color:${ok ? 'var(--green)' : 'var(--red)'}">
                ${ok ? ' Bypass thành công!' : ' Có vấn đề khi cập nhật'}
            </div>
            <table class="info-table">
                <tr><td>Bài học</td><td>${lesson?.lesson_name || 'N/A'}</td></tr>
                <tr><td>Lesson ID</td><td>${lesson?.lesson_id || 'N/A'}</td></tr>
                <tr><td>Video ID</td><td>${tracking?.id || 'N/A'}</td></tr>
                <tr><td>Video Duration</td><td>${tracking?.video_duration || 0}s</td></tr>
                <tr><td>Time Played</td><td>${tracking?.time_play_video || 0}s</td></tr>
                <tr><td>Completed</td><td style="color:${ok ? 'var(--green)' : 'var(--red)'}; font-weight:700">
                    ${ok ? 'Đã hoàn thành ' : 'Chưa hoàn thành '}
                </td></tr>
            </table>
        </div>`;
}

// ===== AUTO BYPASS ALL VIDEOS =====
const autoBypassForm = document.getElementById('autoBypassForm');
const autoBypassLoading = document.getElementById('autoBypassLoading');
const autoBypassResults = document.getElementById('autoBypassResults');
const autoBypassBtn = document.getElementById('autoBypassBtn');
const autoBypassMsg = document.getElementById('autoBypassMsg');

if (autoBypassForm) {
    autoBypassForm.addEventListener('submit', async e => {
        e.preventDefault();
        const classId = document.getElementById('autoClassId').value.trim();
        if (!classId) return showToast('Vui lòng nhập Class ID', 'error');

        setLoading(autoBypassBtn, autoBypassLoading, autoBypassResults, true);
        autoBypassMsg.textContent = 'Đang lấy danh sách video...';

        try {
            const res = await fetch('/api/auto-bypass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_id: classId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
            displayAutoBypassResults(data, autoBypassResults);
        } catch (err) {
            showError(autoBypassResults, err.message);
        } finally {
            setLoading(autoBypassBtn, autoBypassLoading, autoBypassResults, false);
        }
    });
}

function displayAutoBypassResults(data, container) {
    const { total_videos, bypassed, failed, results, message } = data;

    if (message) {
        container.innerHTML = `
            <div class="question-card success-card">
                <div class="question-meta" style="color:var(--green)"> Hoàn tất</div>
                <p style="color:var(--text-sub)">${message}</p>
            </div>`;
        return;
    }

    let html = `
        <div class="summary-bar">
            <h3> Kết quả Auto Bypass</h3>
            <span class="badge badge-blue"> ${total_videos} video</span>
            <span class="badge badge-green"> ${bypassed} thành công</span>
            ${failed > 0 ? `<span class="badge" style="background:rgba(255,76,106,0.2);color:var(--red)"> ${failed} thất bại</span>` : ''}
        </div>`;

    (results || []).forEach(r => {
        const ok = r.status === 'success';
        html += `
        <div class="question-card ${ok ? 'success-card' : 'error-card'}">
            <div class="question-meta" style="color:${ok ? 'var(--green)' : 'var(--red)'}">
                ${ok ? ' Đã bypass' : ' Lỗi'}
            </div>
            <table class="info-table">
                <tr><td>Bài học</td><td>${r.lesson_name || 'N/A'}</td></tr>
                <tr><td>Video ID</td><td>${r.tracking_id}</td></tr>
                <tr><td>Trạng thái</td><td style="color:${ok ? 'var(--green)' : 'var(--red)'}; font-weight:700">
                    ${ok ? `Thành công (${r.duration}s)` : r.error || 'Lỗi không xác định'}
                </td></tr>
            </table>
        </div>`;
    });

    container.innerHTML = html;
}

// ===== HELPERS =====
function setLoading(btn, loadingEl, resultsEl, on) {
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = on;
    if (text) text.style.display = on ? 'none' : 'inline';
    if (loader) loader.style.display = on ? 'inline' : 'none';
    loadingEl.style.display = on ? 'block' : 'none';
    if (on) resultsEl.innerHTML = '';
}

function showError(container, message) {
    const isToken = message.includes('401') || message.toLowerCase().includes('unauthorized');
    container.innerHTML = `
        <div class="question-card error-card">
            <div class="question-meta" style="color:var(--red)"> Lỗi</div>
            <p style="color:var(--text-sub);margin-bottom:12px;">${isToken ? 'Token đã hết hạn. Vui lòng đăng nhập lại!' : message}</p>
            ${isToken ? `<button onclick="document.getElementById('tokenBtn').click()" class="btn-primary" style="width:auto;padding:10px 20px;font-size:0.9rem;">Đăng nhập</button>` : ''}
        </div>`;
}

function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '30px', right: '24px', zIndex: '9999',
        padding: '14px 22px', borderRadius: '12px', fontWeight: '600',
        fontSize: '0.9rem', maxWidth: '360px', lineHeight: '1.5',
        background: type === 'success' ? 'rgba(0,200,150,0.15)' : type === 'error' ? 'rgba(255,76,106,0.15)' : 'rgba(108,99,255,0.15)',
        border: `1px solid ${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--primary)'}`,
        color: '#fff', backdropFilter: 'blur(12px)',
        transition: 'opacity 0.4s ease', opacity: '0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}
