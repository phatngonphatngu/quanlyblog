// Sử dụng các thư viện cần thiết
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config(); // Để đọc biến môi trường khi chạy local

const app = express();
const PORT = process.env.PORT || 3000;

// Lấy API Key và Client ID từ biến môi trường của Render
const API_KEY = process.env.BLOGGER_API_KEY;
const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;

// Cấu hình để nhận dữ liệu JSON và cho phép frontend gọi tới
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Phục vụ file index.html

// Endpoint cung cấp cấu hình cho frontend
app.get('/api/config', (req, res) => {
    if (!CLIENT_ID) {
        console.error("LỖI: Biến môi trường BLOGGER_CLIENT_ID chưa được thiết lập trên server.");
        return res.status(500).json({ error: 'Client ID không được cấu hình trên server.' });
    }
    res.json({ clientId: CLIENT_ID });
});

// Endpoint lấy danh sách blog
app.post('/api/blogs', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Thiếu Access Token.' });
    }
    if (!API_KEY) {
        console.error("LỖI: Biến môi trường BLOGGER_API_KEY chưa được thiết lập trên server.");
        return res.status(500).json({ error: 'API Key không được cấu hình trên server.' });
    }

    const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/users/self/blogs?key=${API_KEY}`;

    try {
        const response = await fetch(bloggerApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Lỗi từ Google API khi lấy blogs:', data);
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);

    } catch (error) {
        console.error('Lỗi server nội bộ khi lấy blogs:', error);
        res.status(500).json({ error: 'Đã có lỗi xảy ra trên server khi lấy blogs.' });
    }
});

// === ENDPOINT MỚI: Lấy tất cả nhãn của một blog ===
app.post('/api/labels', async (req, res) => {
    const { accessToken, blogId } = req.body;

    if (!accessToken || !blogId) {
        return res.status(400).json({ error: 'Thiếu Access Token hoặc Blog ID.' });
    }
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key không được cấu hình trên server.' });
    }

    let allLabels = new Set();
    let nextPageToken = null;

    try {
        do {
            let apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?fetchBodies=false&fields=nextPageToken,items/labels&maxResults=500&key=${API_KEY}`;
            if (nextPageToken) {
                apiUrl += `&pageToken=${nextPageToken}`;
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Lỗi từ Google API khi lấy labels:', data);
                throw new Error(data.error?.message || 'Không thể lấy danh sách bài đăng.');
            }

            if (data.items) {
                data.items.forEach(post => {
                    if (post.labels) {
                        post.labels.forEach(label => allLabels.add(label));
                    }
                });
            }
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        res.status(200).json({ labels: Array.from(allLabels).sort() });

    } catch (error) {
        console.error('Lỗi server nội bộ khi lấy labels:', error);
        res.status(500).json({ error: error.message });
    }
});


// API Endpoint để đăng bài
app.post('/api/publish', async (req, res) => {
    const { blogId, title, content, accessToken, labels } = req.body;

    if (!blogId || !title || !content || !accessToken) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết.' });
    }
    if (!API_KEY) {
         console.error("LỖI: Biến môi trường BLOGGER_API_KEY chưa được thiết lập trên server.");
         return res.status(500).json({ error: 'API Key không được cấu hình trên server.' });
    }

    const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${API_KEY}`;

    try {
        const postBody = {
            kind: 'blogger#post',
            title: title,
            content: content,
            labels: labels || []
        };

        const response = await fetch(bloggerApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Lỗi từ Google API khi đăng bài:', data);
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);

    } catch (error) {
        console.error('Lỗi server nội bộ khi đăng bài:', error);
        res.status(500).json({ error: 'Đã có lỗi xảy ra trên server.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
