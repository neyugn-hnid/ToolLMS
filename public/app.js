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

tokenBtn.addEventListener('click', () => tokenModal.style.display = 'flex');
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
            msgEl.innerHTML = '✅ ' + data.message;
            showToast(' Đăng nhập tự động thành công!', 'success');
            e.target.reset();
            document.getElementById('togglePassword').textContent = '👁️';
            setTimeout(() => { tokenModal.style.display = 'none'; msgEl.style.display = 'none'; }, 2000);
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

function displayAnswers(data, container) {
    const { questions, correctAnswers } = data;
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
                     Luyện Tập (Azota)
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
    container.innerHTML = html;
}

// ===== COURSE QUESTIONS (class_id) =====
const courseForm = document.getElementById('courseForm');
const courseLoading = document.getElementById('courseLoading');
const courseResults = document.getElementById('courseResults');
const courseSubmitBtn = document.getElementById('courseSubmitBtn');
const courseLoadingMsg = document.getElementById('courseLoadingMsg');

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

    container.innerHTML = html;
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
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    let html = `
        <div class="practice-container">
            <div class="practice-header">
                <h2> Luyện Tập: ${title}</h2>
                <button class="btn-primary btn-outline" onclick="exitPracticeMode()"> Thoát</button>
            </div>
            
            <div class="practice-layout">
                <div class="practice-main">
                    ${practiceState.questions.map((q, i) => `
                        <div class="question-card" id="q-card-${q.id}">
                            <div class="question-meta" id="q-meta-${q.id}">Câu ${i + 1}</div>
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
                    <h3>Bảng câu hỏi</h3>
                    <div class="nav-grid">
                        ${practiceState.questions.map((q, i) => `
                            <a href="#q-card-${q.id}" class="nav-box" id="nav-${q.id}">${i + 1}</a>
                        `).join('')}
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
    document.getElementById('practiceWrap').style.display = 'none';
    
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

videoForm.addEventListener('submit', async e => {
    e.preventDefault();
    const trackingId = document.getElementById('trackingId').value.trim();
    const videoDuration = document.getElementById('videoDuration').value.trim();
    if (!trackingId) return showToast('Vui lòng nhập Tracking ID', 'error');

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
                <tr><td>Tracking ID</td><td>${tracking?.id || 'N/A'}</td></tr>
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
                <tr><td>Tracking ID</td><td>${r.tracking_id}</td></tr>
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
            <p style="color:var(--text-sub);margin-bottom:12px;">${isToken ? 'Token đã hết hạn. Vui lòng cập nhật token mới!' : message}</p>
            ${isToken ? `<button onclick="document.getElementById('tokenBtn').click()" class="btn-primary" style="width:auto;padding:10px 20px;font-size:0.9rem;"> Cập nhật Token</button>` : ''}
        </div>`;
}

function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
