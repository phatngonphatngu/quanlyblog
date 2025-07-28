const CACHE_NAME = 'blogger-app-v1';
// Danh sách các file cần thiết để ứng dụng chạy offline
const urlsToCache = [
  '/',
  '/index.html',
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
});

// Sự kiện fetch: Phục vụ file từ cache nếu có, nếu không thì tải từ mạng
self.addEventListener('fetch', event => {
  // Bỏ qua các yêu cầu không phải GET, vì chúng ta không thể cache chúng
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy trong cache, trả về luôn
        if (response) {
          return response;
        }

        // Nếu không, tải từ mạng
        return fetch(event.request).then(
          (response) => {
            // Nếu không phải lỗi, clone và lưu vào cache
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
});

// Sự kiện activate: Dọn dẹp các cache cũ không còn dùng
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
