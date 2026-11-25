# Rà soát UX và bản Web kết nối server

**Cập nhật sau đối chiếu đầy đủ:** xem [DOI-CHIEU-API-SERVER.md](DOI-CHIEU-API-SERVER.md). Bản Web hiện mặc định gửi đúng các trường auth và sort theo source ZIP Nhóm 1; dùng `VITE_API_PROFILE=openapi` riêng khi kiểm thử YAML. Phần dưới lưu lại kết quả đợt rà soát UX đầu tiên; những mô tả “tạm gửi cả hai tên trường” đã được thay thế.

Ngày rà soát: 15/11/2026. Nguồn: giao diện đang chạy, source Web, `openapi.yml` nhóm 1 và `../Project_HKDN/server/app/routes.py`. Không thay đổi source backend trong đợt này.

## 1. Kết luận về trải nghiệm trước khi sửa

Nhận xét “bấm điểm danh mà màn hình vẫn như cũ” là đúng. Ở viewport 390 × 844, sau khi bấm điểm danh ở hàng Phạm Quốc Huy, trình duyệt đang cuộn khoảng 767 px. Form mới được chèn phía trên danh sách; ô mật khẩu có tọa độ y khoảng -260 px, nằm ngoài vùng nhìn thấy. Người dùng không nhận được dấu hiệu rõ ràng rằng đã sang bước nhập thông tin. Đây là lỗi chuyển bước và quản lý focus, không giải quyết được chỉ bằng đổi màu hoặc icon.

Về hình thức, bộ token và các hàng danh sách hiện có đã hạn chế card lồng card, gradient và trang trí. Tuy nhiên, ứng dụng vẫn tạo cảm giác ghép nhiều component khi các bước camera, form, kết quả và bộ lọc cùng chen trên một trang. Đợt sửa này ưu tiên cấu trúc tác vụ, nhãn hành động, ngữ cảnh và phản hồi thực tế. Không bổ sung thư viện icon/font để trang trí.

## 2. Rà soát theo nhóm tác vụ

| Nhóm | Vấn đề / rủi ro quan sát được | Xử lý trong bản nâng cấp |
|---|---|---|
| Điểm danh | Form mới ở ngoài viewport, danh sách tiếp tục xuất hiện bên dưới, người dùng không biết bước hiện tại | Tách màn xác nhận / camera / kết quả. Focus tiêu đề sau chuyển bước; danh sách được ẩn trong chế độ server và hiện lại khi quay về. |
| Quay lại danh sách | Dễ mất vị trí sinh viên đang thao tác | Bản server giữ danh sách, bộ lọc và nút đã chọn; hỗ trợ Back/Forward của trình duyệt cho bước chọn sinh viên. |
| Gửi điểm danh | Mô phỏng thành công có thể bị hiểu thành đã ghi trên server | Chỉ báo thành công sau response hợp lệ. Xác nhận rõ điểm danh thủ công. Giữ payload và UUID khi thử lại; lưu yêu cầu chưa xác nhận trong sessionStorage khi có thể. |
| Camera / ảnh | Chụp ảnh, phát hiện mặt và xác thực danh tính dễ bị đánh đồng | Giữ camera oval dùng chung; ghi rõ ảnh điểm danh đang ở trình duyệt. Không gửi ảnh vào API chỉ nhận JSON hoặc tự tạo kết quả liveness. |
| Danh sách và chi tiết | Mất từ khóa / trang khi quay về | Bản server đưa từ khóa và offset vào URL danh sách; liên kết chi tiết mang đường dẫn quay lại. |
| Thêm / sửa | Dùng tên trường demo khác server; lỗi phía trên form có thể bị khuất | Form server dùng các trường API, không điền lại mật khẩu đã lưu; lỗi có vùng focus và được cuộn vào tầm nhìn. Dữ liệu nhập được giữ khi request lỗi. |
| Xóa | Nhầm xóa hồ sơ sinh viên với bỏ sinh viên khỏi môn | Có xác nhận riêng nêu đúng đối tượng và phạm vi. Xóa hồ sơ và hủy ghi danh dùng hai endpoint khác nhau. |
| Báo cáo | Biểu đồ cũ không theo bộ lọc; chuyển email làm mất khoảng ngày | Biểu đồ demo dùng các hàng đã lọc. Báo cáo server đọc dữ liệu API; truyền môn / khoảng ngày sang email. CSV ghi rõ chỉ xuất trang đang xem. |
| Email | Dễ hiểu nhận request là đã gửi email; nút bị vô hiệu mà khó biết điều kiện | Bản server có xem lại môn / ngày / người nhận trước gửi; sau 202 hiển thị mã và tiến độ job. Bắt buộc chọn môn, khoảng ngày hợp lệ và người nhận. |
| CSV | Nhập cục bộ và server xử lý nền có ý nghĩa khác nhau | Bản server gửi multipart, xem trước tối đa 5 dòng; chờ `/jobs/{id}`. Hiển thị số nhập / cập nhật / bỏ qua và lỗi từng dòng do server trả. |
| Tài khoản | Demo dùng tài khoản/mật khẩu cục bộ, không thể dùng làm xác thực server | Bản server dùng JWT, `/auth/me`, refresh, lỗi 401/403; đổi mật khẩu lần đầu theo `is_first_login`. |
| Phiên hết hạn / mất mạng | Nếu tự rơi về mock sẽ khiến người dùng tưởng dữ liệu thật đã lưu | Không chuyển sang demo khi API lỗi. Refresh token hết hạn yêu cầu đăng nhập lại; lỗi mạng giữ khả năng thử lại. |
| Hồ sơ / quản trị viên | YAML chưa có đủ endpoint sửa/xóa/ảnh | Có xem và tạo quản trị viên, đổi mật khẩu của mình; nêu rõ thao tác chưa có API. Không lấy `/sync` để ghi thay. |
| Backup / mống mắt | Trình duyệt không có khả năng tương đương Android và chưa có API | Giữ luồng mẫu trong chế độ demo; không hiển thị thành chức năng server đã hoàn tất. |
| Mobile / iOS | Menu dài, nhiều lớp khung, vùng thao tác không tập trung | Header gọn, tab dưới có safe area, màn tác vụ một cột; font hệ thống và input 16 px; không thêm khung trang trí. |

Giao diện hiện được rà soát bằng dữ liệu kiểm thử. Danh sách lớn, tên dài, thiết bị có bàn phím thật và camera thật vẫn cần kiểm thử thực địa. Không dùng kết quả Playwright WebKit để khẳng định đã đạt trên iPhone vật lý.

## 3. Hai chế độ dữ liệu

**Server — chế độ mặc định mới:** `/#/app` mở đăng nhập server. Không dùng tài khoản demo cục bộ. Token giữ trong phiên trình duyệt; dữ liệu nghiệp vụ đọc và ghi qua REST. Chức năng được mô tả là planned vẫn gọi đúng endpoint khi người dùng chọn thao tác; nếu server chưa triển khai, hiển thị lỗi và không giả vờ thành công.

**Dữ liệu mẫu:** mở từ cuối màn đăng nhập hoặc trang Kết nối. Đây là bản mock các nghiệp vụ Android, có nhãn Demo. Chuyển qua lại không chuyển dữ liệu mẫu thành dữ liệu server. Ở màn đăng nhập demo có nút Kết nối server nhóm 1.

Mục tiêu đầy đủ chức năng Android vẫn được giữ trong `DOI-CHIEU-ANDROID-WEB.md`; việc một endpoint chưa có không có nghĩa đã loại chức năng đó khỏi phạm vi. Bản server chưa đạt tương đương hoàn toàn với Android.

## 4. Các API đã có phía frontend

| Phần | Endpoint |
|---|---|
| Phiên đăng nhập | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout` |
| Khôi phục / đổi mật khẩu | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password` |
| Tạo quản trị viên | `POST /auth/register`; API/source hiện chỉ cho Super Admin tạo tài khoản |
| Quản trị viên | `GET /admins`, `GET /admins/{admin_id}` |
| Sinh viên | `GET/POST /students`, `GET/PUT/DELETE /students/{id}` |
| Ảnh sinh viên | `GET/POST /students/{student_id}/photo`; POST multipart với trường `file` |
| Môn học | `GET/POST /subjects`, `GET/PUT/DELETE /subjects/{subject_id}` |
| Ghi danh | `GET/POST /subjects/{subject_id}/students`, `DELETE /subjects/{subject_id}/students/{student_id}` |
| Điểm danh / lịch sử | `POST/GET /attendance`, `DELETE /checkins/{checkin_id}` |
| Tổng hợp | `GET /subjects/{subject_id}/attendance-summary` |
| Người nhận | `GET/POST /subjects/{subject_id}/email-recipients`, `PUT/DELETE /subjects/{subject_id}/email-recipients/{email_id}` |
| Gửi báo cáo | `POST /subjects/{subject_id}/send-report`, theo dõi `GET /jobs/{id}` |
| CSV | `POST /import/csv`, theo dõi `GET /jobs/{id}` |

Ảnh sinh viên dùng request có Bearer token và object URL khi xem; không đưa `photo_path` của Android vào `<img>` như một URL truy cập được. Không đọc vector khuôn mặt hoặc mật khẩu điểm danh để tự xác minh trên Web.

Với luồng điểm danh, `POST /attendance` hiện là **ghi nhận thủ công**, không có đầu vào ảnh, chứng cứ liveness hoặc response đối sánh. Vì vậy không có cơ sở biến “đã phát hiện mặt” thành “đã xác thực”. Camera trong bước này cho thử chụp ảnh; ảnh không tự gửi vào endpoint ảnh hồ sơ sinh viên vì việc đó sẽ thay đổi ảnh tham chiếu.

## 5. Chạy và thay địa chỉ server

Mặc định proxy chuyển `/api/v1` tới `http://localhost:5000`, đúng địa chỉ Flask trong YAML. Trình duyệt gọi cùng origin với Web, thuận tiện cho HTTPS tunnel trên iPhone.

```powershell
cd D:\Study\Project_HKDN\iris-aegis-web
npm.cmd ci
# Chỉ tạo .env.local khi chưa có file cấu hình riêng:
Copy-Item .env.example .env.local
npm.cmd run dev
```

Khi nhóm 1 đổi host, sửa `.env.local` rồi khởi động lại Vite:

```dotenv
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://DIA_CHI_SERVER:5000
VITE_DATA_MODE=server
```

Hoặc tại màn đăng nhập → Kết nối server, nhập URL API tuyệt đối. Địa chỉ lưu trong trình duyệt sẽ được ưu tiên hơn biến môi trường. Đổi địa chỉ sẽ xóa phiên đang dùng để tránh gửi token sang server mới. URL trực tiếp từ một origin khác cần CORS và HTTPS phù hợp.

Không dùng `localhost:5000` làm API trực tiếp trên iPhone: nó trỏ tới điện thoại. Không gọi API HTTP trực tiếp từ Web HTTPS. Với tunnel, giữ URL API cùng origin, dùng Vite proxy ở trên:

```powershell
# Terminal 1
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4180 --strictPort

# Terminal 2 — tự chạy khi cần thử trên iPhone
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:4180
```

Không dùng `http-server dist` cho bản server nếu trông đợi proxy Vite: công cụ đó chỉ phục vụ file tĩnh. Khi triển khai thật, hosting/reverse proxy phải chuyển `/api/v1` tới backend tương tự; `vite preview` chỉ phục vụ kiểm thử bản build.

## 6. Các điểm nhóm 1 cần chuẩn hóa

Giữ nguyên file nhóm 1 gửi, không âm thầm sửa hợp đồng để làm test đạt.

1. **Path trùng:** YAML có hai `/students` và hai `/attendance`. Parser có thể báo lỗi hoặc bỏ mất định nghĩa trước. Cần gộp thành một path cho mỗi URL, mỗi phương thức một định nghĩa.
2. **Đổi mật khẩu:** YAML dùng `current_password`; source server dùng `old_password` và bắt `confirm_password`. Frontend tạm gửi cả hai tên mật khẩu cũ và xác nhận để tương thích hai bản. Cần chọn tên chính thức.
3. **Đặt lại mật khẩu:** YAML dùng `reset_token`; source dùng `token` và `confirm_password`. Frontend tạm gửi cả hai tên token. Không tự tạo token hoặc hiển thị token từ dữ liệu đồng bộ.
4. **Đăng ký quản trị:** YAML không bắt `admin_code` / `confirm_password` và cho enum vai trò rộng hơn; source bắt hai trường này, luôn tạo `ADMIN`. UI hiện tạo giảng viên với mã và xác nhận mật khẩu, không hứa tạo Super Admin qua endpoint này.
5. **Envelope response:** YAML một số chỗ trả bản ghi trực tiếp; source có `{student: ...}`, `{subject: ...}`, `{checkin: ...}`. Lớp Web chấp nhận các dạng đã quan sát này, vẫn kiểm tra trường nhận diện của kết quả điểm danh.
6. **Giờ/ngày điểm danh:** một định nghĩa YAML cho phép bỏ để server tự lấy; source bắt buộc. Frontend gửi cả ngày/giờ và UUID. Cần thống nhất timezone và chính sách ngày giờ do client gửi.
7. **Lịch sử:** source có `GET /attendance`; hợp đồng còn có `GET /checkins` nhưng source đang đọc không khai báo route này. Web dùng `GET /attendance` theo phần định nghĩa cuối của YAML và source.
8. **Cờ planned:** nhiều route sinh viên/môn/ghi danh đã có trong source nhưng YAML vẫn planned. Ngược lại summary/email/photo/checkin-delete chưa xuất hiện trong `routes.py` đã đọc. Cần cập nhật tình trạng theo bản server được triển khai.
9. **Mật khẩu/vector sinh viên:** một số route trong source dùng `Student.to_dict()` chứa trường nhạy cảm; model cũng có hàm public bỏ các trường đó. Cần trả public DTO đúng YAML cho toàn bộ Web REST. Frontend không hiển thị hoặc gửi lại các trường nhạy cảm có thể vô tình nhận được.
10. **Chống trùng:** cùng UUID được coi là cùng yêu cầu. UUID khác cho cùng sinh viên/môn/ngày có bị xem là trùng nghiệp vụ hay không cần backend xác định; frontend chưa thể coi idempotency là quy tắc một lần/ngày.
11. **Các phần chưa có hợp đồng:** đối sánh ảnh điểm danh, liveness nhóm 4, sửa/xóa/ảnh Admin, sửa hồ sơ, backup/restore và mống mắt. Không dùng `/sync/push` để lách các API Web còn thiếu.

## 7. Bản đồ code

```text
src/server/
  client.js          Fetch, timeout, AbortSignal, JWT refresh, lỗi chuẩn, multipart
  config.js          Chế độ dữ liệu và URL; thay mode có chủ đích
  Session.jsx        Đăng nhập, khôi phục phiên, đăng xuất, đổi server
  hooks.js           Tải dữ liệu có hủy request; focus khi chuyển bước
  common.jsx         Loading/error/retry, phân trang, xác nhận thao tác
  Auth.jsx           Đăng nhập/reset và cấu hình kết nối
  Catalog.jsx        CRUD, chi tiết, ghi danh, ảnh sinh viên
  Attendance.jsx     Các bước điểm danh, lịch sử, tổng hợp và xuất CSV
  Jobs.jsx           Upload CSV và theo dõi tác vụ nền
  Operations.jsx     Người nhận/email, hồ sơ, kết nối, danh sách môn đầu trang
  ServerPortal.jsx   Điều hướng và khung dùng chung với demo
  server.css         Bố cục tác vụ theo token, không thêm theme riêng
```

Các luồng demo cũ nằm trong `src/portal`; phần camera chung ở `src/App.jsx`. Token/component chung tiếp tục ở `src/ui`. Không copy API call vào từng nút hoặc tự mở thêm MediaStream khi tích hợp liveness.

## 8. Kiểm thử và giới hạn xác nhận

`src/server-client.test.js` kiểm tra refresh đồng thời, token hết hạn/lỗi mạng, timeout/hủy, multipart, 204, lỗi chuẩn và đối chiếu endpoint với YAML. `tests/ui/server.spec.js` dùng response chặn bằng Playwright để kiểm tra UI, payload, phân trang/ngữ cảnh, chuyển bước/focus, UUID retry, CSV/job và báo cáo → email. Đây là kiểm thử hợp đồng giả lập, không phải kiểm thử server thật.

Đã thử kết nối `http://127.0.0.1:5000/api/v1/health` trong phiên làm việc này nhưng không có server phản hồi. Vì vậy chưa xác nhận đăng nhập, CRUD, upload hay gửi email với PostgreSQL/Redis/backend thật. Kết quả chạy Chrome/WebKit được ghi ở phần bàn giao sau khi hoàn tất kiểm thử. Camera vật lý, bàn phím và Safari iPhone thật cần thử lại trên thiết bị.

Kết quả kiểm tra trong phiên này:

- Lint và build đạt; 20 kiểm thử Node đạt.
- Toàn bộ bộ test Chrome đạt 44/44 ở vòng hồi quy; sau bổ sung kiểm tra đăng nhập lỗi/quyền và tinh chỉnh bố cục, chạy lại toàn bộ test server trên desktop/mobile đạt 14/14.
- Toàn bộ WebKit iPhone 13 mô phỏng đạt 23/23; sau tinh chỉnh bộ chọn môn, hàng danh sách và hai ô ngày, chạy lại 7/7 test server đạt.
- Đã mở ảnh Chrome/WebKit để xem form, danh sách, màn điểm danh, bước xác nhận và email; bỏ phân trang vô ích khi chỉ có một trang, thu gọn hàng danh sách mobile, căn lại hai ô ngày.
- Đã kiểm tra Vite preview chuyển `/api/v1/health` tới một HTTP fixture cục bộ và giữ đúng path. Đây là kiểm tra proxy, không phải Flask thật. Fixture và preview kiểm tra đã dừng sau khi thử.
- Ảnh kiểm tra lưu ngoài Git tại `../iris-aegis-backups/api-ux-review-20261115/`.

Bản sao trước thay đổi nằm ngoài repository: `../iris-aegis-backups/truoc-api-ux-20261115/`. Ảnh `attendance-before.png` là bằng chứng lỗi form nằm ngoài viewport.
