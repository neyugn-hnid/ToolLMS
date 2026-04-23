const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Token management
let authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1MDIzMjgyLCJpYXQiOjE3NzI2MzQ3NzYsImV4cCI6MTc3MjY2MzU3Nn0.cqqD8BApIVeT6hL7ZI--fvcWxhU_8QxjBfzsHQlfQ74';
const APP_ID = '08E29F70-C0D2-4EAF-938F-94A31FCEF77A';

// Function to get current token
function getAuthToken() {
    return authToken;
}

// Function to update token
function updateAuthToken(newToken) {
    authToken = newToken;
    console.log('Token updated successfully');
}

// Function to get headers
function getHeaders() {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'Referer': 'https://lms.tueba.edu.vn/',
        'Origin': 'https://lms.tueba.edu.vn',
        'Authorization': `Bearer ${getAuthToken()}`,
        'x-app-id': APP_ID,
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
    };
}

// Function to make authenticated request with auto-retry on 401
async function makeAuthenticatedRequest(requestFn, maxRetries = 1) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            if (error.response && error.response.status === 401 && i < maxRetries) {
                console.log('Token expired, please update token via POST /api/update-token');
                throw error;
            }
            throw error;
        }
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint to manually update token
app.post('/api/update-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    updateAuthToken(token);
    res.json({ success: true, message: 'Token updated successfully' });
});

// Endpoint to bypass video
app.post('/api/bypass-video', async (req, res) => {
    try {
        const { tracking_id, video_duration } = req.body;
        if (!tracking_id) {
            return res.status(400).json({ error: 'tracking_id is required' });
        }

        console.log(`Bypassing video for tracking_id: ${tracking_id}`);
        const agent = new (require('https').Agent)({ rejectUnauthorized: false });

        // Get current tracking data
        const getResponse = await makeAuthenticatedRequest(async () => {
            return await axios.get(`https://quantri.tueba.edu.vn:10091/lcms/api/class-student-tracking/${tracking_id}`, {
                httpsAgent: agent,
                headers: getHeaders()
            });
        });

        const currentData = getResponse.data.data;
        console.log('Current tracking data:', currentData);
        
        const duration = video_duration ? parseInt(video_duration) : currentData.video_duration;
        console.log(`Video duration: ${duration}s`);

        // Update tracking to mark as completed
        const updatePayload = {
            time_play_video: duration,
            video_duration: duration,
            max_stopped_time: duration,
            last_stopped: duration,
            completed: 1
        };

        const updateResponse = await makeAuthenticatedRequest(async () => {
            return await axios.put(
                `https://quantri.tueba.edu.vn:10091/lcms/api/class-student-tracking/${tracking_id}`,
                updatePayload,
                {
                    httpsAgent: agent,
                    headers: getHeaders()
                }
            );
        });

        console.log('Video bypassed successfully');
        
        // Get updated data to confirm
        const finalResponse = await makeAuthenticatedRequest(async () => {
            return await axios.get(`https://quantri.tueba.edu.vn:10091/lcms/api/class-student-tracking/${tracking_id}`, {
                httpsAgent: agent,
                headers: getHeaders()
            });
        });

        const finalData = finalResponse.data.data;

        res.json({
            success: true,
            message: 'Video marked as completed',
            tracking: {
                id: finalData.id,
                video_duration: finalData.video_duration,
                last_stopped: finalData.last_stopped,
                completed: finalData.completed,
                time_play_video: finalData.time_play_video,
                max_stopped_time: finalData.max_stopped_time
            },
            lesson: {
                lesson_name: finalData.lesson_name,
                lesson_id: finalData.lesson_id
            }
        });

    } catch (error) {
        console.error('Error bypassing video:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            res.status(error.response.status).json({ 
                error: 'Failed to bypass video', 
                details: error.response.data 
            });
        } else {
            res.status(500).json({ error: 'Failed to bypass video', details: error.message });
        }
    }
});

app.get('/api/questions', async (req, res) => {
    const lessonId = req.query.lesson_id || '2988';
    const API_URL = `https://quantri.tueba.edu.vn:10091/lcms/api/lesson-test-questions/?limit=1000&paged=1&select=id,lesson_id,test_id,question_number,question_direction,question_type,answer_option,group_id,part,media&condition%5B0%5D%5Bkey%5D=lesson_id&condition%5B0%5D%5Bvalue%5D=${lessonId}&condition%5B0%5D%5Bcompare%5D==`;
    try {
        console.log('Fetching data from external API...');
        const agent = new (require('https').Agent)({ rejectUnauthorized: false });

        const response = await makeAuthenticatedRequest(async () => {
            return await axios.get(API_URL, {
                httpsAgent: agent,
                headers: getHeaders()
            });
        });

        console.log('Data fetched successfully');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            res.status(error.response.status).json({ error: 'Failed to fetch data', details: error.response.data });
        } else {
            res.status(500).json({ error: 'Failed to fetch data from external API' });
        }
    }
});

app.post('/api/submit', async (req, res) => {
    try {
        console.log('Submitting data to external API...');
        const agent = new (require('https').Agent)({ rejectUnauthorized: false });

        const response = await makeAuthenticatedRequest(async () => {
            return await axios.post('https://quantri.tueba.edu.vn:10091/lcms/api/lesson-test-questions/nopbai', 
                req.body, 
                {
                    httpsAgent: agent,
                    headers: getHeaders()
                }
            );
        });

        console.log('Data submitted successfully');
        res.json(response.data);
    } catch (error) {
        console.error('Error submitting data:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            res.status(error.response.status).json({ error: 'Failed to submit data', details: error.response.data });
        } else {
            res.status(500).json({ error: 'Failed to submit data to external API' });
        }
    }
});

async function batchFindAnswers(questions, agent) {
    const validQs = questions.filter(q => q.question_number);
    const correctAnswers = {};
    if (validQs.length === 0) return correctAnswers;

    for (let option = 1; option <= 4; option++) {
        const testAnswers = {};
        validQs.forEach(q => testAnswers[q.id] = option.toString());
        try {
            const submitResponse = await makeAuthenticatedRequest(async () => {
                return await axios.post('https://quantri.tueba.edu.vn:10091/lcms/api/lesson-test-questions/nopbai',
                    { answers: testAnswers },
                    { httpsAgent: agent, headers: getHeaders() }
                );
            });
            const correctIds = submitResponse.data.data || [];
            correctIds.forEach(id => {
                correctAnswers[id] = option.toString();
            });
        } catch (error) {
            console.error(`Error in batch find for option ${option}:`, error.message);
        }
    }
    return correctAnswers;
}

app.post('/api/find-answers', async (req, res) => {
    try {
        const { lesson_id } = req.body;
        if (!lesson_id) {
            return res.status(400).json({ error: 'lesson_id is required' });
        }

        console.log(`Finding answers for lesson_id: ${lesson_id}`);

        const questionsUrl = `https://quantri.tueba.edu.vn:10091/lcms/api/lesson-test-questions/?limit=1000&paged=1&select=id,lesson_id,test_id,question_number,question_direction,question_type,answer_option,group_id,part,media&condition%5B0%5D%5Bkey%5D=lesson_id&condition%5B0%5D%5Bvalue%5D=${lesson_id}&condition%5B0%5D%5Bcompare%5D==`;
        const agent = new (require('https').Agent)({ rejectUnauthorized: false });

        const questionsResponse = await makeAuthenticatedRequest(async () => {
            return await axios.get(questionsUrl, {
                httpsAgent: agent,
                headers: getHeaders()
            });
        });

        const questions = questionsResponse.data.data.filter(q => q.question_number);

        // Fetch answers efficiently (4 requests total instead of N*4)
        const correctAnswers = await batchFindAnswers(questions, agent);

        res.json({
            success: true,
            questions: questions,
            correctAnswers: correctAnswers
        });

    } catch (error) {
        console.error('Error finding answers:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            res.status(error.response.status).json({ error: 'Failed to find answers', details: error.response.data });
        } else {
            res.status(500).json({ error: 'Failed to find answers', details: error.message });
        }
    }
});

// Endpoint debug: thử nhiều URL pattern để tìm endpoint đúng
app.get('/api/debug-class', async (req, res) => {
    const classId = req.query.class_id;
    if (!classId) return res.status(400).json({ error: 'class_id is required' });

    const agent = new (require('https').Agent)({ rejectUnauthorized: false });
    const BASE = 'https://quantri.tueba.edu.vn:10091/lcms/api';
    const results = {};

    // Lấy thông tin class trước
    let courseId = null;
    try {
        const r = await makeAuthenticatedRequest(() =>
            axios.get(`${BASE}/class/${classId}?select=id,course_id,name`, { httpsAgent: agent, headers: getHeaders() })
        );
        courseId = r.data.data.course_id;
        results['class_info'] = { ok: true, data: r.data.data };
    } catch (e) {
        results['class_info'] = { 
            ok: false, 
            status: e.response?.status,
            error: e.response?.data?.message || e.message,
            hint: e.response?.status === 401 ? '⚠️ TOKEN HẾT HẠN - Hãy cập nhật token trước!' : null
        };
    }

    if (!courseId) {
        return res.json({
            ...results,
            _note: '⚠️ Không lấy được course_id. Token có thể hết hạn, cập nhật token rồi thử lại!'
        });
    }

    // Danh sách các URL pattern cần thử
    const patterns = [
        { key: 'lesson (class_id)',        url: `${BASE}/lesson/?limit=5&paged=1&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'lesson (course_id)',       url: `${BASE}/lesson/?limit=5&paged=1&condition%5B0%5D%5Bkey%5D=course_id&condition%5B0%5D%5Bvalue%5D=${courseId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'lesson-test (class_id)',   url: `${BASE}/lesson-test/?limit=5&paged=1&select=id,title,lesson_id,class_id&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'class-lesson (class_id)',  url: `${BASE}/class-lesson/?limit=5&paged=1&select=id,lesson_id,class_id&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'class-lesson (course_id)', url: `${BASE}/class-lesson/?limit=5&paged=1&select=id,lesson_id,course_id&condition%5B0%5D%5Bkey%5D=course_id&condition%5B0%5D%5Bvalue%5D=${courseId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'class-content (class_id)', url: `${BASE}/class-content/?limit=5&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'course-content (course)',  url: `${BASE}/course-content/?limit=5&condition%5B0%5D%5Bkey%5D=course_id&condition%5B0%5D%5Bvalue%5D=${courseId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'q by course_id',           url: `${BASE}/lesson-test-questions/?limit=3&paged=1&select=id,lesson_id,test_id&condition%5B0%5D%5Bkey%5D=course_id&condition%5B0%5D%5Bvalue%5D=${courseId}&condition%5B0%5D%5Bcompare%5D==` },
        { key: 'q by class_id',            url: `${BASE}/lesson-test-questions/?limit=3&paged=1&select=id,lesson_id,test_id&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==` },
    ];

    for (const { key, url } of patterns) {
        try {
            const r = await makeAuthenticatedRequest(() => axios.get(url, { httpsAgent: agent, headers: getHeaders() }));
            const d = r.data.data;
            results[key] = {
                ok: true,
                count: Array.isArray(d) ? d.length : (d ? 'object' : 'null'),
                sample: Array.isArray(d) ? d[0] : d
            };
        } catch (e) {
            results[key] = { 
                ok: false, 
                status: e.response?.status, 
                code: e.response?.data?.code,
                error: e.response?.data?.message || e.message 
            };
        }
    }

    res.json(results);
});

// Endpoint lấy toàn bộ câu hỏi của 1 môn học theo class_id
app.get('/api/class-questions', async (req, res) => {
    const classId = req.query.class_id;
    if (!classId) {
        return res.status(400).json({ error: 'class_id is required' });
    }

    try {
        const agent = new (require('https').Agent)({ rejectUnauthorized: false });
        const BASE = 'https://quantri.tueba.edu.vn:10091/lcms/api';
        console.log(`[class-questions] Bắt đầu lấy câu hỏi cho class_id: ${classId}`);

        // Bước 1: Lấy thông tin class (tên môn + course_id)
        const classResponse = await makeAuthenticatedRequest(() =>
            axios.get(`${BASE}/class/${classId}?select=id,course_id,name`, { httpsAgent: agent, headers: getHeaders() })
        );
        const classData = classResponse.data.data;
        const courseId = classData.course_id;
        const className = classData.name;
        console.log(`[class-questions] Môn: "${className}", course_id: ${courseId}`);

        const QSELECT = 'select=id,lesson_id,test_id,question_number,question_direction,question_type,answer_option,group_id,part,media';
        const LIMIT = 1000;

        // Helper: lấy questions từ một lesson_id
        async function fetchQuestionsForLesson(lessonId) {
            const url = `${BASE}/lesson-test-questions/?limit=${LIMIT}&paged=1&${QSELECT}` +
                `&condition%5B0%5D%5Bkey%5D=lesson_id&condition%5B0%5D%5Bvalue%5D=${lessonId}&condition%5B0%5D%5Bcompare%5D==`;
            const r = await makeAuthenticatedRequest(() => axios.get(url, { httpsAgent: agent, headers: getHeaders() }));
            return r.data.data || [];
        }

        // Bước 2: Lấy tracking của cả lớp → tìm các lesson quiz (có test_results)
        console.log(`[class-questions] Đang lấy tracking class_id=${classId}...`);
        const trackingUrl = `${BASE}/class-student-tracking/?order=ASC&orderby=id&limit=1000&paged=1` +
            `&select=lesson_id,lesson_name,test_results` +
            `&condition%5B0%5D%5Bkey%5D=class_id&condition%5B0%5D%5Bvalue%5D=${classId}&condition%5B0%5D%5Bcompare%5D==`;

        const trackingResponse = await makeAuthenticatedRequest(() =>
            axios.get(trackingUrl, { httpsAgent: agent, headers: getHeaders() })
        );
        const trackingData = trackingResponse.data.data || [];
        console.log(`[class-questions] Tracking records: ${trackingData.length}`);

        // Tìm unique lesson_id có test_results (bài quiz)
        const quizLessonMap = {}; // lesson_id → lesson_name
        trackingData.forEach(t => {
            if (t.test_results !== null && t.lesson_id && !quizLessonMap[t.lesson_id]) {
                quizLessonMap[t.lesson_id] = t.lesson_name || `Bài quiz ${t.lesson_id}`;
            }
        });
        const quizLessonIds = Object.keys(quizLessonMap);
        console.log(`[class-questions] Quiz lessons: ${quizLessonIds.length} → IDs: [${quizLessonIds.join(', ')}]`);

        // Bước 3: Lấy câu hỏi từng lesson quiz
        let allQuestions = [];
        let allCorrectAnswers = {};
        const lessonSummary = [];

        for (const lessonId of quizLessonIds) {
            try {
                const qs = await fetchQuestionsForLesson(lessonId);
                console.log(`  lesson_id ${lessonId} "${quizLessonMap[lessonId]}": ${qs.length} câu hỏi`);
                const quizTitle = quizLessonMap[lessonId];
                qs.forEach(q => { q._lesson_name = quizTitle; q._lesson_id_src = lessonId; });
                lessonSummary.push({ lesson_id: lessonId, lesson_name: quizTitle, question_count: qs.length });
                allQuestions.push(...qs);

                // Fetch correct answers efficiently
                const lessonAnswers = await batchFindAnswers(qs, agent);
                Object.assign(allCorrectAnswers, lessonAnswers);
            } catch (err) {
                console.error(`  lesson_id ${lessonId}: lỗi ${err.response?.status || err.message}`);
                lessonSummary.push({ lesson_id: lessonId, lesson_name: quizLessonMap[lessonId], question_count: 0, error: err.message });
            }
        }

        // Nếu tracking không có quiz nào, thử lấy toàn bộ lesson_id unique và check từng cái
        if (allQuestions.length === 0 && quizLessonIds.length === 0) {
            console.log('[class-questions] Không tìm thấy quiz qua test_results, thử lấy tất cả lesson_id...');
            const allLessonMap = {};
            trackingData.forEach(t => {
                if (t.lesson_id && !allLessonMap[t.lesson_id]) {
                    allLessonMap[t.lesson_id] = t.lesson_name || `Lesson ${t.lesson_id}`;
                }
            });
            for (const [lid, name] of Object.entries(allLessonMap)) {
                try {
                    const qs = await fetchQuestionsForLesson(lid);
                    if (qs.length > 0) {
                        qs.forEach(q => { q._lesson_name = name; });
                        lessonSummary.push({ lesson_id: lid, lesson_name: name, question_count: qs.length });
                        allQuestions.push(...qs);

                        const lessonAnswers = await batchFindAnswers(qs, agent);
                        Object.assign(allCorrectAnswers, lessonAnswers);
                    }
                } catch (_) {}
            }
        }

        let successStrategy = 'class-student-tracking';



        // Nếu không tìm được → gợi ý dùng debug endpoint
        if (allQuestions.length === 0) {
            return res.status(404).json({
                error: 'Không tìm thấy câu hỏi',
                message: 'Không thể lấy câu hỏi tự động. Hãy dùng /api/debug-class?class_id=' + classId + ' để xem thêm thông tin.',
                class_id: parseInt(classId),
                class_name: className,
                course_id: courseId
            });
        }

        console.log(`[class-questions] Tổng câu hỏi: ${allQuestions.length} (via ${successStrategy})`);
        res.json({
            success: true,
            class_id: parseInt(classId),
            class_name: className,
            course_id: courseId,
            strategy_used: successStrategy,
            total_questions: allQuestions.length,
            questions: allQuestions,
            correctAnswers: allCorrectAnswers
        });

    } catch (error) {
        console.error('[class-questions] Lỗi:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
            res.status(error.response.status).json({ error: 'Lỗi khi lấy dữ liệu', details: error.response.data });
        } else {
            res.status(500).json({ error: 'Lỗi server', details: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



