# Hướng dẫn tải code và chạy Web trên Windows

Dành cho thành viên Nhóm 5. Làm theo thứ tự. Phần lớn chỉ cần **bấm đúp file `.bat`** trong thư mục `scripts\windows`.

Repo nhóm: https://github.com/thang-nghien-dua/IrisSample-IriAegis-26T. Nhánh chính: **`HuyHoang`**.

## 1. Cài phần mềm (làm 1 lần)

| Phần mềm | Dùng để | Cài nhanh (PowerShell) |
| --- | --- | --- |
| **Git** | Tải code | `winget install Git.Git` |
| **Node.js LTS** (22 trở lên) | Chạy web | `winget install OpenJS.NodeJS.LTS` |
| **Docker Desktop** | Chạy server liveness Nhóm 4 | `winget install Docker.DockerDesktop` |

- Mở PowerShell: bấm phím Windows, gõ `powershell`, Enter.
- Nếu PowerShell hỏi `Do you agree` thì gõ `Y`. Nếu Windows hỏi quyền thì bấm **Yes**.
- Cài xong **đóng và mở lại** PowerShell / File Explorer. Docker Desktop có thể cần khởi động lại máy.
- Chỉ cần thử giao diện, không cần quét mặt thì có thể bỏ qua Docker.
- **Không cần cài Python.** Server Nhóm 4 viết bằng Python nhưng chạy trong Docker, Docker đã có sẵn Python bên trong.

## 2. Tải code (làm 1 lần)

Mở **Command Prompt**, chọn một thư mục bất kỳ (ví dụ ổ D) rồi chạy:

```
cd /d D:\
git clone https://github.com/thang-nghien-dua/IrisSample-IriAegis-26T.git
cd IrisSample-IriAegis-26T
git checkout HuyHoang
```

Code nằm trong `D:\IrisSample-IriAegis-26T`. Các lần sau không cần tải lại, file chạy web sẽ tự lấy code mới (`git pull`).

## 3. Chạy

Mở thư mục `scripts\windows` trong code vừa tải.

| Bước | Bấm đúp | Kết quả |
| --- | --- | --- |
| 1 | `CHAY-WEB.bat` | Lần đầu cài thư viện (vài phút). Trình duyệt tự mở `http://127.0.0.1:5173/#/camera`. |
| 2 | Mở **Docker Desktop**, đợi "Engine running", rồi bấm `CHAY-SERVER-NHOM-4.bat` | Lần đầu tải server Nhóm 4 và đóng gói Docker (vài phút). Xong khi thấy `Uvicorn running on http://0.0.0.0:8000`. |
| 3 (tùy chọn) | `MO-LINK-IPHONE.bat` | Tạo link HTTPS tạm để mở trên iPhone (xem mục 5). |

- **Giữ các cửa sổ đen mở** trong lúc dùng. Đóng cửa sổ nào thì phần đó tắt.
- Kiểm tra server Nhóm 4: mở http://127.0.0.1:8000/docs, thấy trang Swagger là được.
- Nếu Windows hiện "Windows protected your PC" thì bấm **More info → Run anyway**. Các file `.bat` chỉ chạy những lệnh ghi trong file, mở bằng Notepad để xem được.

## 4. Thử quét mặt

1. Vào http://127.0.0.1:5173/#/camera.
2. Tăng độ sáng màn hình, tick **"Tôi đồng ý…"**, bấm **Bắt đầu xác thực**, cho phép camera.
3. Làm theo hướng dẫn: nhìn thẳng → chớp mắt → quay đầu hai bên → giữ yên khi màn hình nháy đỏ/xanh.
4. Thành công: hiện **"Đã hoàn tất kiểm tra"** (server Nhóm 4 trả REAL). Bị từ chối: hiện ô lỗi đỏ.

Các màn quản lý (đăng nhập, môn học, sinh viên, điểm danh, báo cáo) ở http://127.0.0.1:5173/#/app. Đăng nhập thật cần server **Nhóm 1** đang chạy (mặc định `http://localhost:5000`). Chưa có server Nhóm 1 thì bấm **Mở dữ liệu mẫu** ở màn đăng nhập, đăng nhập `super@demo.test` / `Demo@123` để xem toàn bộ giao diện (dữ liệu chỉ lưu trên trình duyệt).

## 5. Thử trên iPhone

Safari chỉ cho mở camera khi trang có **HTTPS**, và iPhone không vào được địa chỉ `127.0.0.1` của laptop.

1. Giữ `CHAY-WEB.bat` và `CHAY-SERVER-NHOM-4.bat` đang chạy.
2. Bấm đúp `MO-LINK-IPHONE.bat` (lần đầu tự cài `cloudflared`).
3. Tìm dòng có link `https://xxxx.trycloudflare.com`, mở bằng **Safari trên iPhone** và thêm `#/camera` vào cuối.
4. Link này **ai có cũng vào được** trong lúc cửa sổ còn mở. Chỉ gửi cho người test, xong thì đóng cửa sổ.

## 6. Ảnh khuôn mặt có bị lưu không?

Không. Ảnh chỉ nằm tạm trong trang web đang mở. API `/api/v1/ai/anti-spoof` của Nhóm 4 chỉ đọc ảnh, trả REAL/FAKE, không ghi file hay database. Server chạy trong Docker trên chính máy bạn.

## 7. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `Khong tim thay Node.js` / `Git` / `Docker` | Cài theo mục 1, đóng và mở lại cửa sổ rồi chạy lại. |
| `Docker Desktop chua chay` | Mở Docker Desktop, đợi Engine running. |
| Web báo "Không kết nối được dịch vụ xác thực" ở bước cuối | Server Nhóm 4 chưa chạy. Bấm `CHAY-SERVER-NHOM-4.bat`. |
| `An Application Control policy has blocked this file` khi tự chạy server bằng Python | Windows (Smart App Control) chặn thư viện AI. **Dùng Docker** như mục 3, không tắt Smart App Control. |
| Docker thiếu RAM | Docker Desktop → Containers: bấm dừng (ô vuông) các dự án khác không dùng. |
| GitHub báo `400 Request Header Or Cookie Too Large` | Xóa cookie của github.com trong trình duyệt, hoặc mở cửa sổ ẩn danh. |
| Cửa sổ hiện `===== CO LOI =====` | Chụp màn hình cửa sổ, gửi nhóm trưởng. |

## 8. Muốn sửa code

Không sửa thẳng trên `HuyHoang`. Tạo nhánh riêng, đẩy lên rồi mở Pull Request vào `HuyHoang`:

```
git checkout HuyHoang
git pull
git checkout -b ten-github/ten-viec
rem ... sửa code ...
git add .
git commit -m "mo ta ngan"
git push -u origin ten-github/ten-viec
```

Quy tắc giao diện ở `AGENTS.md`, `DESIGN.md`, `UI-GUIDELINES.md`.
