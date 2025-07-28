const CACHE_NAME = 'blogger-app-v3'; // Thay đổi phiên bản cache để buộc cập nhật
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.js'
];

// Sự kiện install: Lưu các tài sản tĩnh vào cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache đã được mở');
        return cache.addAll(STATIC_ASSETS);
      })
  );
  self.skipWaiting(); // Buộc service worker mới được activate ngay lập tức
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

// Sự kiện fetch: Quyết định lấy tài nguyên từ mạng hay cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // *** START: SỬA LỖI XÁC THỰC (TRIỆT ĐỂ HƠN) ***

  // Chiến lược 1: LUÔN LẤY TỪ MẠNG cho các yêu cầu API và script xác thực của Google.
  // Đây là thay đổi quan trọng nhất để tránh lỗi "đang khởi tạo".
  if (url.pathname.startsWith('/api/') || url.hostname.includes('google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Chiến lược 2: LẤY TỪ MẠNG TRƯỚC cho trang chính (khi người dùng mở app).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
      .catch(() => {
        // Nếu không có mạng, mới dùng đến cache.
        return caches.match('/');
      })
    );
    return;
  }
  
  // Chiến lược 3: LẤY TỪ CACHE TRƯỚC cho các tài nguyên tĩnh khác (CSS, JS, Fonts) để tăng tốc độ.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu có trong cache, trả về luôn.
        if (response) {
          return response;
        }
        // Nếu không, tải từ mạng và lưu vào cache cho lần sau.
        return fetch(event.request);
      })
  );
  // *** END: SỬA LỖI XÁC THỰC ***
});
