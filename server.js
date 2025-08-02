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
        return res.status(500).json({ error: 'Client ID không được cấu hình trên server.' });
    }
    res.json({ clientId: CLIENT_ID });
});

// Endpoint lấy danh sách blog
app.post('/api/blogs', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Thiếu Access Token.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/users/self/blogs?key=${API_KEY}`;
    try {
        const response = await fetch(bloggerApiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint lấy tất cả nhãn của một blog
app.post('/api/labels', async (req, res) => {
    const { accessToken, blogId } = req.body;
    if (!accessToken || !blogId) return res.status(400).json({ error: 'Thiếu Access Token hoặc Blog ID.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    let allLabels = new Set();
    let nextPageToken = null;
    try {
        do {
            let apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?fetchBodies=false&fields=nextPageToken,items/labels&maxResults=500&key=${API_KEY}`;
            if (nextPageToken) apiUrl += `&pageToken=${nextPageToken}`;
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message);
            if (data.items) data.items.forEach(post => post.labels?.forEach(label => allLabels.add(label)));
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);
        res.status(200).json({ labels: Array.from(allLabels).sort() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint để lấy danh sách bài viết (có phân trang)
app.post('/api/posts', async (req, res) => {
    const { accessToken, blogId, pageToken } = req.body;
    if (!accessToken || !blogId) return res.status(400).json({ error: 'Thiếu Access Token hoặc Blog ID.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    let apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${API_KEY}&fetchBodies=false&fields=nextPageToken,items(id,title,updated)&orderBy=updated`;
    if (pageToken) {
        apiUrl += `&pageToken=${pageToken}`;
    }

    try {
        const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Không thể lấy danh sách bài đăng.');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint để lấy nội dung một bài viết cụ thể
app.post('/api/post/get', async (req, res) => {
    const { accessToken, blogId, postId } = req.body;
    if (!accessToken || !blogId || !postId) return res.status(400).json({ error: 'Thiếu thông tin cần thiết.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?key=${API_KEY}&fetchImages=true&fields=id,title,content,labels`;

    try {
        const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Không thể lấy nội dung bài đăng.');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// API Endpoint để tạo bài viết mới
app.post('/api/post/create', async (req, res) => {
    const { blogId, title, content, accessToken, labels } = req.body;
    if (!blogId || !title || !content || !accessToken) return res.status(400).json({ error: 'Thiếu thông tin cần thiết.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${API_KEY}`;
    try {
        const postBody = { kind: 'blogger#post', title, content, labels: labels || [] };
        const response = await fetch(bloggerApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postBody)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint để cập nhật bài viết đã có
app.patch('/api/post/update', async (req, res) => {
    const { blogId, postId, title, content, accessToken, labels } = req.body;
    if (!blogId || !postId || !title || !content || !accessToken) return res.status(400).json({ error: 'Thiếu thông tin cần thiết.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?key=${API_KEY}`;
    try {
        const postBody = { title, content, labels: labels || [] };
        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postBody)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Không thể cập nhật bài đăng.');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// *** START: SỬA LỖI - Bổ sung Endpoint để XÓA bài viết ***
app.delete('/api/post/delete', async (req, res) => {
    const { blogId, postId, accessToken } = req.body;
    if (!blogId || !postId || !accessToken) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết để xóa.' });
    }
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key không được cấu hình.' });
    }

    const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?key=${API_KEY}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // Blogger API trả về 204 No Content khi thành công, không có body JSON
        if (response.status === 204) {
            return res.status(204).send();
        }

        // Nếu có lỗi, đọc và gửi lại lỗi đó
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Lỗi không xác định từ Blogger API: ${response.status}`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// *** END: SỬA LỖI ***

// *** START: TÌM BÀI VIẾT TRÙNG LẶP ***
app.post('/api/posts/find-duplicates', async (req, res) => {
    const { accessToken, blogId } = req.body;
    if (!accessToken || !blogId) return res.status(400).json({ error: 'Thiếu Access Token hoặc Blog ID.' });
    if (!API_KEY) return res.status(500).json({ error: 'API Key không được cấu hình.' });

    let allPosts = [];
    let nextPageToken = null;
    try {
        // Lấy tất cả bài viết, xử lý phân trang
        do {
            let apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${API_KEY}&fetchBodies=false&fields=nextPageToken,items(id,title,published)&maxResults=500&orderBy=published`;
            if (nextPageToken) apiUrl += `&pageToken=${nextPageToken}`;
            
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || 'Không thể lấy danh sách bài đăng.');
            if (data.items) allPosts.push(...data.items);
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        // Gom nhóm bài viết theo tiêu đề để tìm trùng lặp
        const postsByTitle = allPosts.reduce((acc, post) => {
            const title = post.title.trim();
            if (!acc[title]) {
                acc[title] = [];
            }
            acc[title].push(post);
            return acc;
        }, {});

        // Lọc ra các nhóm có nhiều hơn 1 bài viết (bài trùng lặp)
        const duplicates = Object.values(postsByTitle)
            .filter(group => group.length > 1)
            .map(group => {
                // Sắp xếp để giữ lại bài mới nhất, các bài cũ hơn sẽ bị coi là trùng lặp
                group.sort((a, b) => new Date(b.published) - new Date(a.published));
                return {
                    title: group[0].title,
                    posts: group // Trả về tất cả các bài, bao gồm cả bài gốc
                };
            });

        res.status(200).json({ duplicates });

    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi tìm bài trùng lặp: ' + error.message });
    }
});
// *** END: TÌM BÀI VIẾT TRÙNG LẶP ***

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
