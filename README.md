# Execution API

Backend mẫu để `dsa-mastery.html` gọi qua `fetch()` khi frontend được host trên GitHub Pages.

## Endpoints

- `GET /health`
- `POST /execute`

## Hỗ trợ ngôn ngữ

- `go`
- `php`

## Chạy local

```bash
cd execution-api
node server.js
```

Server mặc định chạy ở `http://localhost:8787`.

## Request mẫu

```bash
curl -X POST http://localhost:8787/execute \
  -H 'Content-Type: application/json' \
  -d '{"language":"php","code":"<?php echo \"hi\\n\";"}'
```

```bash
curl -X POST http://localhost:8787/execute \
  -H 'Content-Type: application/json' \
  -d '{"language":"go","code":"package main\nimport \"fmt\"\nfunc main(){fmt.Println(\"hi\")}\n"}'
```

## Cách dùng với GitHub Pages

1. Deploy thư mục `execution-api/` lên host free như Render/Railway/Fly.io.
2. Đảm bảo server có cài `go` và `php`.
3. Mở `dsa-mastery.html`.
4. Trong tab `Practice`, dán URL backend vào ô `Execution API`.
5. Bấm `Lưu API`.
6. Chọn `Go` hoặc `PHP`, rồi bấm `Chạy`.

## Lưu ý

Đây là backend tối thiểu để demo. Trước khi public rộng, bạn nên bổ sung:

- rate limit
- auth/token
- sandbox/container isolation
- cpu/memory limits
- logging và giám sát
