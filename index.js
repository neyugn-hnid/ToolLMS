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
        const correctAnswers = {};

        // Find correct answer for each question
        for (const question of questions) {
            for (let answer = 1; answer <= 4; answer++) {
                const testAnswers = {};
                testAnswers[question.id] = answer.toString();

                const submitResponse = await makeAuthenticatedRequest(async () => {
                    return await axios.post('https://quantri.tueba.edu.vn:10091/lcms/api/lesson-test-questions/nopbai',
                        { answers: testAnswers },
                        {
                            httpsAgent: agent,
                            headers: getHeaders()
                        }
                    );
                });

                const correctIds = submitResponse.data.data || [];
                if (correctIds.includes(question.id)) {
                    correctAnswers[question.id] = answer.toString();
                    break;
                }
            }
        }

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
