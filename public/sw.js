const CACHE_NAME = 'blogger-app-v2'; // Thay đổi phiên bản cache
// Danh sách các file cần thiết để ứng dụng chạy offline
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192x192.png', // Thêm các icon vào cache
  '/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.js'
];

// Sự kiện install: Lưu các file vào cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache đã được mở');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Buộc service worker mới được activate ngay lập tức
});

// Sự kiện fetch: Phục vụ file từ cache hoặc mạng
self.addEventListener('fetch', event => {
  // Chỉ xử lý các yêu cầu GET
  if (event.request.method !== 'GET') {
    return;
  }

  // *** START: SỬA LỖI XÁC THỰC ***
  // Chiến lược: Network First cho trang chính để đảm bảo phiên đăng nhập luôn mới.
  // Điều này áp dụng khi người dùng điều hướng đến trang (mở app)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Nếu không có mạng, lấy trang chính từ cache
          return caches.match('/');
        })
    );
    return;
  }

  // Chiến lược: Cache First cho các tài nguyên tĩnh (CSS, JS, Fonts, Images) để tăng tốc độ.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu có trong cache, trả về luôn
        if (response) {
          return response;
        }

        // Nếu không, tải từ mạng và lưu vào cache để dùng lần sau
        return fetch(event.request).then(
          (response) => {
            // Kiểm tra response hợp lệ
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
  // *** END: SỬA LỖI XÁC THỰC ***
});

// Sự kiện activate: Dọn dẹp các cache cũ không còn dùng
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Kích hoạt service worker mới cho tất cả các tab
  );
});
