const CACHE_NAME = 'blogger-app-v4'; // Thay đổi phiên bản cache để buộc cập nhật
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
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua các yêu cầu không phải GET
  if (request.method !== 'GET') {
    return;
  }

  // Chiến lược: Network First cho HTML (khi mở app) và các script của Google
  // Đây là giải pháp triệt để cho vấn đề đăng nhập.
  if (request.mode === 'navigate' || url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
      .catch(() => {
        // Nếu không có mạng, chỉ fallback cho trang chính để app vẫn mở được offline
        if (request.mode === 'navigate') {
            return caches.match('/');
        }
        // Các request khác tới Google nếu lỗi mạng sẽ bị fail, đây là hành vi đúng.
      })
    );
    return;
  }

  // Chiến lược: Stale-While-Revalidate cho các tài nguyên tĩnh khác (CSS, JS, Fonts)
  // Phục vụ từ cache ngay lập tức để app nhanh, sau đó cập nhật cache dưới nền.
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          // Nếu fetch thành công, cập nhật cache
          caches.open(CACHE_NAME).then(cache => {
            if (networkResponse) {
                cache.put(request, networkResponse.clone());
            }
          });
          return networkResponse;
        });

        // Trả về phiên bản cache ngay lập tức (nếu có), nếu không thì đợi fetch hoàn thành.
        return cachedResponse || fetchPromise;
      })
  );
});
