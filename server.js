// Sử dụng các thư viện cần thiết
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config(); // Để đọc biến môi trường khi chạy local

const app = express();
const PORT = process.env.PORT || 3000;

// Lấy API Key từ biến môi trường của Render (hoặc file .env khi chạy local)
const API_KEY = process.env.BLOGGER_API_KEY;

// Cấu hình để nhận dữ liệu JSON và cho phép frontend gọi tới
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Phục vụ file index.html

// API Endpoint để đăng bài
app.post('/api/publish', async (req, res) => {
    // Lấy dữ liệu từ frontend gửi lên
    const { blogId, title, content, accessToken } = req.body;

    if (!blogId || !title || !content || !accessToken) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết.' });
    }

    if (!API_KEY) {
         return res.status(500).json({ error: 'API Key không được cấu hình trên server.' });
    }

    const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${API_KEY}`;

    try {
        const response = await fetch(bloggerApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                kind: 'blogger#post',
                title: title,
                content: content
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Nếu có lỗi từ Google, gửi lại cho frontend
            console.error('Lỗi từ Google API:', data);
            return res.status(response.status).json(data);
        }

        // Gửi lại kết quả thành công cho frontend
        res.status(200).json(data);

    } catch (error) {
        console.error('Lỗi server nội bộ:', error);
        res.status(500).json({ error: 'Đã có lỗi xảy ra trên server.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
