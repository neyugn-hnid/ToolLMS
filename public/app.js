// Tab switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Remove active class from all tabs and contents
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        btn.classList.add('active');
        document.getElementById(targetTab + 'Tab').classList.add('active');
    });
});

// Answer form elements
const form = document.getElementById('searchForm');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');

// Video form elements
const videoForm = document.getElementById('videoForm');
const videoLoading = document.getElementById('videoLoading');
const videoResults = document.getElementById('videoResults');
const videoSubmitBtn = document.getElementById('videoSubmitBtn');
const videoBtnText = videoSubmitBtn.querySelector('.btn-text');
const videoBtnLoader = videoSubmitBtn.querySelector('.btn-loader');

// Token modal elements
const tokenBtn = document.getElementById('tokenBtn');
const tokenModal = document.getElementById('tokenModal');
const closeModal = tokenModal.querySelector('.close');
const updateTokenForm = document.getElementById('updateTokenForm');

// Show modal
tokenBtn.addEventListener('click', () => {
    tokenModal.style.display = 'flex';
});

// Close modal
closeModal.addEventListener('click', () => {
    tokenModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === tokenModal) {
        tokenModal.style.display = 'none';
    }
});

// Handle update token form
updateTokenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let token = document.getElementById('tokenInput').value.trim();
    // Remove 'Bearer ' if user included it
    token = token.replace(/^Bearer\s+/i, '');
    
    const submitBtn = updateTokenForm.querySelector('button');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang cập nhật...';

    try {
        const response = await fetch('/api/update-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Token đã được cập nhật thành công!');
            tokenModal.style.display = 'none';
            updateTokenForm.reset();
        } else {
            alert('Cập nhật thất bại: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Lỗi: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const lessonId = document.getElementById('lessonId').value.trim();

    if (!lessonId) {
        alert('Vui lòng nhập Lesson ID');
        return;
    }

    // Show loading state
    loading.style.display = 'block';
    results.innerHTML = '';
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';

    try {
        const response = await fetch('/api/find-answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lesson_id: lessonId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra');
        }

        displayResults(data);

    } catch (error) {
        let errorMessage = error.message;
        let isTokenError = false;

        // Check if it's a 401 error (token expired)
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Token đã hết hạn. Vui lòng cập nhật token mới!';
            isTokenError = true;
        }

        results.innerHTML = `
            <div class="question-card" style="border-left-color: #e74c3c;">
                <p style="color: #e74c3c; font-weight: 600;">Lỗi: ${errorMessage}</p>
                ${isTokenError ? `
                    <button onclick="document.getElementById('tokenBtn').click()" 
                            style="margin-top: 15px; padding: 10px 20px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cập nhật Token ngay
                    </button>
                ` : ''}
                <p style="color: #666; margin-top: 10px;">Vui lòng kiểm tra lại Lesson ID${isTokenError ? ' và token' : ''}.</p>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});

function displayResults(data) {
    const { questions, correctAnswers } = data;

    if (!questions || questions.length === 0) {
        results.innerHTML = `
            <div class="question-card">
                <p>Không tìm thấy câu hỏi nào cho Lesson ID này.</p>
            </div>
        `;
        return;
    }

    let html = `<h2 style="margin-bottom: 20px; color: #333;">📝 Tìm thấy ${questions.length} câu hỏi</h2>`;

    questions.forEach(question => {
        const questionText = stripHtml(question.question_direction);
        const correctAnswer = correctAnswers[question.id];

        html += `
            <div class="question-card">
                <div class="question-header">
                    Câu ${question.question_number} (ID: ${question.id})
                </div>
                <div class="question-text">
                    ${questionText}
                </div>
                <div class="answers">
        `;

        if (question.answer_option && Array.isArray(question.answer_option)) {
            question.answer_option.forEach(option => {
                const optionText = stripHtml(option.value);
                const isCorrect = correctAnswer === option.id;
                const correctClass = isCorrect ? 'correct' : '';

                html += `
                    <div class="answer-option ${correctClass}">
                        ${option.id}. ${optionText}
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
    });

    results.innerHTML = html;
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Video Bypass Handler
videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trackingId = document.getElementById('trackingId').value.trim();
    const videoDuration = document.getElementById('videoDuration').value.trim();

    if (!trackingId) {
        alert('Vui lòng nhập Tracking ID');
        return;
    }

    // Show loading state
    videoLoading.style.display = 'block';
    videoResults.innerHTML = '';
    videoSubmitBtn.disabled = true;
    videoBtnText.style.display = 'none';
    videoBtnLoader.style.display = 'inline';

    try {
        const response = await fetch('/api/bypass-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                tracking_id: trackingId,
                video_duration: videoDuration || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra');
        }

        displayVideoResults(data);

    } catch (error) {
        let errorMessage = error.message;
        let isTokenError = false;

        // Check if it's a 401 error (token expired)
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Token đã hết hạn. Vui lòng cập nhật token mới!';
            isTokenError = true;
        }

        videoResults.innerHTML = `
            <div class="question-card" style="border-left-color: #e74c3c;">
                <p style="color: #e74c3c; font-weight: 600;">Lỗi: ${errorMessage}</p>
                ${isTokenError ? `
                    <button onclick="document.getElementById('tokenBtn').click()" 
                            style="margin-top: 15px; padding: 10px 20px; background: #f39c12; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cập nhật Token ngay
                    </button>
                ` : ''}
                <p style="color: #666; margin-top: 10px;">Vui lòng kiểm tra lại Tracking ID${isTokenError ? ' và token' : ''}.</p>
            </div>
        `;
    } finally {
        videoLoading.style.display = 'none';
        videoSubmitBtn.disabled = false;
        videoBtnText.style.display = 'inline';
        videoBtnLoader.style.display = 'none';
    }
});

function displayVideoResults(data) {
    const { tracking, lesson } = data;

    let html = `
        <div class="question-card" style="border-left-color: #28a745;">
            <h3 style="color: #28a745; margin-bottom: 15px;">Bypass thành công!</h3>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>Bài học:</strong> ${lesson?.lesson_name || 'N/A'}<br>
                <strong>Lesson ID:</strong> ${lesson?.lesson_id || 'N/A'}<br>
                <strong>Tracking ID:</strong> ${tracking?.id || 'N/A'}<br>
                <strong>Video Duration:</strong> ${tracking?.video_duration || 0}s<br>
                <strong>Time Played:</strong> ${tracking?.time_play_video || 0}s<br>
                <strong>Last Stopped:</strong> ${tracking?.last_stopped || 0}s<br>
                <strong>Max Stopped:</strong> ${tracking?.max_stopped_time || 0}s<br>
                <strong>Completed:</strong> <span style="color: ${tracking?.completed ? '#28a745' : '#e74c3c'}; font-weight: bold;">
                    ${tracking?.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                </span>
            </div>

            ${tracking?.completed ? `
                <p style="color: #28a745; font-weight: 600;">
                    Video đã được đánh dấu hoàn thành thành công!
                </p>
            ` : `
                <p style="color: #e74c3c; font-weight: 600;">
                    Có vấn đề khi cập nhật. Vui lòng thử lại.
                </p>
            `}
        </div>
    `;

    videoResults.innerHTML = html;
}
