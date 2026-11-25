# Đối chiếu Web với API nhóm 1

Ngày cập nhật: **17/11/2026**. Nguồn chính: `openapi.yml` trong repository. Phạm vi: chế độ **Server** của Web, không dùng các thao tác mock làm bằng chứng kết nối API.

## 1. Kết quả

- Có **38 operation dành cho Web**: một operation là một cặp HTTP method + URL, không phải một màn hình.
- Frontend đã có vị trí thực hiện cho **38/38 operation**. Bài kiểm tra trình duyệt thao tác qua UI đã gọi đủ cả 38, bao gồm refresh token.
- Không phát hiện lời gọi tới endpoint nghiệp vụ do frontend tự đặt trong luồng kiểm tra này.
- **3 operation `/sync/*`** được tách khỏi phạm vi Web theo phần mô tả API dành cho Android.
- Đã bổ sung các khả năng thiếu và sửa request bị lẫn trường của backend cũ. Các response có schema được kiểm tra kiểu dữ liệu và trường bắt buộc.
- **Chưa xác nhận backend thật:** kiểm tra hợp đồng dùng response giả lập theo YAML. Endpoint ghi `planned` vẫn phụ thuộc nhóm 1 triển khai.
- Tính theo định nghĩa đầu của mỗi operation Web: **6 implemented, 28 planned, 4 không ghi x-status**. Đây là nhãn trong file, không phải kết quả kiểm tra server đang triển khai thực tế.

**38/38 operation không đồng nghĩa đầy đủ chức năng Android.** Còn thiếu ở chế độ server: đối sánh danh tính/chống trùng mặt, sửa/xóa và ảnh Admin, cập nhật hồ sơ, bootstrap đầu tiên, kiosk mã/mật khẩu và backup tương đương Android. UI không tự tạo các quy tắc cảnh báo vắng hoặc công cụ sinh dữ liệu MockCheckin trên server. Thống kê cá nhân, xuất toàn bộ kết quả phân trang, chọn tất cả và CSV người nhận đã được bổ sung phía FE. Chi tiết bằng chứng và phân loại ở [DOI-CHIEU-ANDROID-WEB.md](DOI-CHIEU-ANDROID-WEB.md).

Không thể gọi toàn bộ YAML là một hợp đồng đã thống nhất hoàn toàn: file có path trùng và các định nghĩa khác nhau. Các điểm này được liệt kê ở mục 5; giữ nguyên file nhóm 1 gửi.

## 2. Các phần thiếu / chưa khớp đã sửa

| Trước đợt kiểm tra | Sau khi sửa |
|---|---|
| Chỉ có lịch sử theo ngày qua `/attendance` | Thêm tab Lịch sử dùng `/checkins`, lọc môn hoặc tất cả môn được phép, mã sinh viên, từ/đến ngày, sort và phân trang. |
| Chưa có các bộ lọc REST đầy đủ | Môn có `status`, `instructor_id`, sort; quản trị viên có `role`, sort; sinh viên và danh sách ghi danh có sort. Giữ `q`, limit/offset. |
| Form môn chưa có `subject_status` | Có nhập/sửa trạng thái. Dùng chuỗi theo hợp đồng, không tự đặt enum nghiệp vụ mà API chưa quy định. |
| Form tạo Admin ép vai trò `ADMIN`, bắt mã giảng viên dù YAML không bắt | Mặc định theo YAML: cho Super Admin chọn `ADMIN`/`SUPER_ADMIN`; `admin_id` và `admin_code` tùy chọn. Xác nhận mật khẩu được kiểm tra trên UI, không gửi trường thừa. |
| ADMIN bị chặn toàn bộ trang tài khoản | Cho phép xem danh sách/chi tiết tài khoản của chính mình theo quyền API; không có nút tạo/nhập quản trị viên. Backend vẫn phải thực thi RBAC. |
| Đăng nhập chỉ nhập email | Chấp nhận email hoặc mã tài khoản; gửi `email` hoặc `username` tương ứng. |
| Reset/đổi mật khẩu gửi cả alias của hai phiên bản | Mặc định chỉ gửi `reset_token` hoặc `current_password` đúng YAML. Tương thích source cũ được bật riêng bằng cấu hình. |
| Form sửa sinh viên gửi khả năng đổi mật khẩu chưa có trong operation PUT | Không gửi `checkin_password` khi sửa. Hỗ trợ `photo_path` trong phần ảnh tham chiếu nâng cao; upload ảnh mới vẫn dùng endpoint ảnh. |
| CSV chưa có trường form `subject_id` | Cho nhập môn ghi danh khi gửi CSV sinh viên; có thể mở nhập từ chi tiết môn. Mẫu CSV bao gồm các cột tùy chọn mô tả trong API. |
| Trạng thái ghi danh bị cố định | Có thể gửi `enrollment_status` khi ghi danh, mặc định `Enrolled`. Không giả lập một API cập nhật ghi danh chưa được mô tả. |
| Gửi báo cáo bắt buộc cả hai ngày | Cho phép bỏ trống theo schema, chỉ gửi ngày đã nhập; vẫn từ chối khoảng ngày đảo ngược khi có cả hai. |
| Upload PNG luôn mang tên `.jpg` | Tên file theo đúng MIME JPEG/PNG; GET ảnh kiểm tra MIME trước khi hiển thị. |
| Điểm danh gửi metadata ngoài phần chung của hai định nghĩa; đòi response có ID dù schema không bắt | Payload giữ sinh viên/môn/ngày/giờ/UUID; xác nhận response đúng sinh viên/môn. Không đòi trường tùy chọn phải luôn có. |
| FE tự chặn ngày tương lai trong chế độ server dù YAML chưa có quy tắc này | Bỏ quy tắc riêng đó; gửi ngày hợp lệ về server để backend quyết định chính sách nghiệp vụ. |

### Bổ sung luồng FE ngày 17/11/2026

| Luồng | Cách dùng hợp đồng hiện có |
|---|---|
| Lượt đã điểm danh trên danh sách lớp | Đọc `GET /attendance` theo môn/ngày qua `limit=100` và `offset`, không chỉ lấy trang đầu. Sau ghi nhận đọc lại; lỗi tải không giả thành danh sách chưa ai điểm danh. |
| Xuất toàn bộ báo cáo | Đọc đủ trang `/attendance` hoặc `/checkins`, giữ bộ lọc và sort. Từ chối file khi trang lỗi, tổng thay đổi hoặc trả lặp ID; cho phép hủy. Đây không phải snapshot giao dịch của server. |
| Thống kê từng sinh viên | Dialog đọc `/checkins` với mã SV/môn/khoảng ngày và `/subjects/{subject_id}/attendance-summary`. Tỷ lệ là số server trả trong khoảng 0–1, UI đổi sang phần trăm. Không tự tính ngưỡng cảnh báo hoặc vắng từ lịch local. |
| Chọn người nhận email | Gọi PUT người nhận với `is_selected`; chọn tất cả chỉ cập nhật những dòng thay đổi. Khi lỗi một phần, tải lại dữ liệu server và hiển thị số đã xử lý. |
| Nhập CSV người nhận | CSV tối đa 1 MB/500 dòng, kiểm tra toàn file trước khi gửi. Chỉ lấy `email_address`, `recipient_name`, `is_selected`, xem trước và gọi POST từng email mới. Email đã có/trùng trong file được bỏ qua; 409 do trùng trên server cũng được ghi nhận. Lỗi mạng/5xx dừng nhập, giữ kết quả từng dòng để thử lại, không rollback hoặc báo tất cả thành công. |
| Quay về báo cáo từ email | Giữ môn, ngày, tab, khoảng ngày, mã sinh viên và sort trong đường dẫn nội bộ. Không thêm query vào request API ngoài đặc tả. |

Không bổ sung hoặc sửa endpoint, schema, model hoặc source backend trong đợt này. Các request mới đều dùng các operation đã có; `openapi.yml` vẫn giữ nguyên các điểm cần Nhóm 1 xác nhận.

## 3. Ma trận toàn bộ operation Web

**Frontend** bên dưới nghĩa là đã có luồng gọi và được chạm tới qua test UI; không có nghĩa endpoint planned đã hoạt động trên một server triển khai thật. Limit danh sách thông thường cố định 25 bản ghi/trang, offset qua nút phân trang; không cần một control cho mọi con số limit.

Với path trùng, công cụ giữ cả hai định nghĩa để kiểm tra. Cột mô tả chính dùng bản xuất hiện trước, có schema Web/Public và `x-status`; các khác biệt không được âm thầm bỏ qua.

| Method + endpoint | API mô tả | Tham số / trường gửi | Frontend |
|---|---|---|---|
| `GET /health` | implemented | Không có body/query riêng | Kết nối → Kiểm tra kết nối — [source](src/server/Auth.jsx) |
| `POST /auth/login` | implemented | `email`, `username`, `password` | Đăng nhập bằng email hoặc mã — [source](src/server/Session.jsx) |
| `POST /auth/refresh` | implemented | `refresh_token` | Tự làm mới token sau 401 — [source](src/server/client.js) |
| `GET /auth/me` | implemented | Không có body/query riêng | Khôi phục phiên — [source](src/server/Session.jsx) |
| `POST /auth/logout` | planned | `refresh_token` | Đăng xuất — [source](src/server/Session.jsx) |
| `POST /auth/forgot-password` | planned | `email` | Yêu cầu mã qua email — [source](src/server/Auth.jsx) |
| `POST /auth/reset-password` | planned | `email`, `reset_token`, `new_password` | Đặt lại mật khẩu — [source](src/server/Auth.jsx) |
| `POST /auth/change-password` | planned | `current_password`, `new_password` | Hồ sơ / lần đăng nhập đầu — [source](src/server/Operations.jsx) |
| `POST /auth/register` | planned | `email`, `password`, `full_name`, `admin_id`, `admin_code`, `phone`, `role` | Super Admin → tạo tài khoản, chọn vai trò — [source](src/server/Catalog.jsx) |
| `GET /students` | Có định nghĩa trùng | `limit`, `offset`, `q`, `sort` | Danh sách, tìm kiếm, sắp xếp, phân trang — [source](src/server/Catalog.jsx) |
| `POST /students` | Có định nghĩa trùng | `student_id`, `full_name`, `email`, `phone`, `checkin_password`, `subject_id` | Thêm sinh viên, có thể ghi danh ngay — [source](src/server/Catalog.jsx) |
| `GET /students/{student_id}/photo` | planned | Không có body/query riêng | Tải ảnh qua Bearer token — [source](src/server/Catalog.jsx) |
| `POST /students/{student_id}/photo` | planned | `file` | Chụp/chọn và upload JPEG/PNG — [source](src/server/Catalog.jsx) |
| `GET /subjects` | planned | `limit`, `offset`, `q`, `sort`, `status`, `instructor_id` | Tìm, lọc status/instructor_id, sắp xếp, phân trang — [source](src/server/Catalog.jsx) |
| `POST /subjects` | planned | `subject_id`, `subject_name`, `time_slot`, `instructor_id`, `subject_status`, `semester_start_date`, `semester_end_date` | Tạo môn có trạng thái và thông tin học kỳ — [source](src/server/Catalog.jsx) |
| `GET /subjects/{subject_id}` | planned | Không có body/query riêng | Chi tiết môn — [source](src/server/Catalog.jsx) |
| `PUT /subjects/{subject_id}` | planned | `subject_name`, `time_slot`, `instructor_id`, `subject_status`, `semester_start_date`, `semester_end_date` | Sửa môn — [source](src/server/Catalog.jsx) |
| `DELETE /subjects/{subject_id}` | planned | Không có body/query riêng | Xóa mềm môn — [source](src/server/Catalog.jsx) |
| `GET /subjects/{subject_id}/students` | planned | `limit`, `offset`, `q`, `sort` | Danh sách ghi danh, q/sort/phân trang — [source](src/server/Catalog.jsx) |
| `POST /subjects/{subject_id}/students` | planned | `student_id`, `enrollment_status` | Ghi danh, enrollment_status — [source](src/server/Catalog.jsx) |
| `DELETE /subjects/{subject_id}/students/{student_id}` | planned | Không có body/query riêng | Bỏ khỏi môn — [source](src/server/Catalog.jsx) |
| `GET /checkins` | planned | `subject_id`, `student_id`, `date_from`, `date_to`, `limit`, `offset`, `sort` | Lịch sử theo môn/mã SV/khoảng ngày/sort/phân trang — [source](src/server/Reports.jsx) |
| `DELETE /checkins/{checkin_id}` | planned | Không có body/query riêng | Xóa mềm lượt điểm danh — [source](src/server/Reports.jsx) |
| `POST /attendance` | Có định nghĩa trùng | `student_id`, `subject_id`, `checkin_date`, `checkin_time`, `uuid`, `device_id` | Điểm danh thủ công, UUID ổn định khi retry — [source](src/server/Attendance.jsx) |
| `GET /subjects/{subject_id}/attendance-summary` | planned | `date_from`, `date_to` | Tổng hợp theo khoảng ngày — [source](src/server/Reports.jsx) |
| `GET /admins` | planned | `limit`, `offset`, `q`, `sort`, `role` | Danh sách tài khoản; ADMIN chỉ xem chính mình theo API — [source](src/server/Catalog.jsx) |
| `GET /admins/{admin_id}` | planned | Không có body/query riêng | Chi tiết tài khoản theo quyền — [source](src/server/Catalog.jsx) |
| `GET /subjects/{subject_id}/email-recipients` | planned | Không có body/query riêng | Danh sách người nhận — [source](src/server/Operations.jsx) |
| `POST /subjects/{subject_id}/email-recipients` | planned | `email_address`, `recipient_name`, `is_selected` | Thêm người nhận — [source](src/server/Operations.jsx) |
| `PUT /subjects/{subject_id}/email-recipients/{email_id}` | planned | `email_address`, `recipient_name`, `is_selected` | Sửa người nhận, is_selected — [source](src/server/Operations.jsx) |
| `DELETE /subjects/{subject_id}/email-recipients/{email_id}` | planned | Không có body/query riêng | Xóa người nhận — [source](src/server/Operations.jsx) |
| `POST /subjects/{subject_id}/send-report` | planned | `date_from`, `date_to` | Gửi với khoảng ngày tùy chọn, chờ job — [source](src/server/Operations.jsx) |
| `POST /import/csv` | implemented | `file`, `type`, `subject_id` | Ba loại CSV, subject_id tùy chọn, xem trước và gửi — [source](src/server/Jobs.jsx) |
| `GET /jobs/{id}` | implemented | Không có body/query riêng | Polling/tra cứu trạng thái tác vụ — [source](src/server/Jobs.jsx) |
| `GET /students/{id}` | Không ghi x-status | Không có body/query riêng | Chi tiết sinh viên — [source](src/server/Catalog.jsx) |
| `PUT /students/{id}` | Không ghi x-status | `full_name`, `email`, `phone`, `photo_path` | Sửa sinh viên; ảnh qua endpoint ảnh — [source](src/server/Catalog.jsx) |
| `DELETE /students/{id}` | Không ghi x-status | Không có body/query riêng | Xóa mềm hồ sơ — [source](src/server/Catalog.jsx) |
| `GET /attendance` | Không ghi x-status | `subject_id`, `date`, `limit`, `offset` | Lượt điểm danh theo môn/ngày — [source](src/server/Reports.jsx) |

## 4. Có chức năng nào thừa không?

Trong chế độ Server không thêm API đăng nhập sinh viên, API đối sánh khuôn mặt, API liveness, API sao lưu/khôi phục hoặc API sửa/xóa Admin khi YAML chưa mô tả chúng.

| Phần ngoài operation server | Cách xử lý |
|---|---|
| Camera, MediaPipe phát hiện mặt và ảnh xem trước | Là xử lý trên trình duyệt. Không gửi `liveness: true`, ảnh hoặc kết quả nhận diện tự tạo vào `/attendance`. Ảnh hồ sơ sinh viên gửi đúng endpoint `/photo` khi người dùng chọn lưu. |
| Xuất CSV trang báo cáo | Là chuyển các hàng server đã trả thành file tải xuống tại trình duyệt; không tạo endpoint export không có trong YAML. Nhãn ghi đúng chỉ trang đang xem. |
| Bộ giao diện, điều hướng, xác nhận xóa, thông báo / thử lại | Thành phần UX phục vụ các operation có thật, không phải nghiệp vụ backend mới. |
| Khởi tạo Super Admin, backup JSON, mống mắt, đối sánh danh tính giả lập, các luồng Android chờ API | Chỉ ở chế độ Demo hoặc được ghi chưa khả dụng. Không tính vào số chức năng server đã tích hợp. Liveness thật qua dịch vụ nhóm 4 được kiểm tra riêng. |
| UUID/seq/updated_at/deleted_at, vector và đường dẫn nội bộ Android | Metadata / dữ liệu hệ thống; không biến mỗi trường thành một form chỉnh sửa. Không dùng `/sync` để lách API Web còn thiếu. |

Ba operation không dùng trên Web là `POST /sync/push`, `GET /sync/pull`, `GET /sync/status`. Đây là loại trừ đúng phạm vi, không phải thiếu chức năng.

## 5. Phần nhóm 1 cần chốt

### 5.1. Hai path bị khai báo trùng

**`/students`:** một định nghĩa dùng `StudentPublic`/`StudentCreate`, có `checkin_password` khi thêm; định nghĩa sau dùng `StudentRecord` và không nêu trường mật khẩu trong request thêm. Cách mô tả sort cũng khác. `StudentRecord` còn chứa dữ liệu không phù hợp để trả cho Web, trong khi mô tả Public yêu cầu bỏ chúng.

**`/attendance`:** định nghĩa trước bắt `uuid`, cho bỏ ngày/giờ, có `device_id`; định nghĩa sau bắt ngày/giờ, không bắt UUID và có `status`. Response trước có schema bản ghi trực tiếp, phần sau chỉ có mô tả.

Frontend hiện gửi **phần chung** cho lượt điểm danh: `student_id`, `subject_id`, `checkin_date`, `checkin_time`, `uuid`. Với sinh viên, mặc định ưu tiên bản Web/Public khi thêm. Unit test chứng minh `checkin_password` hợp lệ ở định nghĩa đầu nhưng không thuộc danh sách field của định nghĩa sau, nên không khẳng định hai bản là tương đương.

Nhóm 1 cần gộp mỗi URL thành một path, mỗi method một operation. Không sửa file gốc chỉ để công cụ im cảnh báo.

### 5.2. YAML và source backend cũ

| Nội dung | Theo source ZIP Nhóm 1 — mặc định Web | Theo YAML của Web |
|---|---|---|
| Đổi mật khẩu | `old_password`, `new_password`, `confirm_password` | `current_password`, `new_password` |
| Reset mật khẩu | `email`, `token`, `new_password`, `confirm_password` | `email`, `reset_token`, `new_password` |
| Tạo tài khoản | Bắt mã/xác nhận; luôn tạo ADMIN | Cho chọn hai role; mã giảng viên tùy chọn |
| Sort giảm dần | Dạng `full_name:desc` | Dạng `-full_name` theo mô tả Web chung |
| Các route planned | ZIP có `/checkins` và summary; chưa thấy 7 operation ảnh sinh viên và email | YAML mô tả các operation này nhưng trạng thái là planned |

Mặc định Web hiện theo source ZIP Nhóm 1:

```dotenv
VITE_API_PROFILE=legacy-source
```

Chỉ bật profile YAML khi cần kiểm thử hợp đồng OpenAPI của Web, bằng cách đổi `.env.local` rồi khởi động lại Vite:

```dotenv
VITE_API_PROFILE=openapi
```

Profile source đổi tên trường auth, giới hạn tạo tài khoản ADMIN và chuyển cú pháp sort theo source. **Nó không làm xuất hiện các endpoint ZIP chưa có**, không thay route thiếu bằng dữ liệu giả. Lớp ánh xạ nằm trong `src/server/contract.js`.

### 5.3. Các phần chưa có API

Đối sánh ảnh điểm danh, mống mắt, backup/restore, cập nhật hồ sơ và sửa/xóa/ảnh Admin vẫn chưa có operation Web trong file. Liveness nhóm 4 đã được nối riêng qua dịch vụ MiniVision và luồng chủ động trên Web; nhóm 1 chưa mô tả cách ràng buộc kết quả đó vào danh tính/lượt điểm danh. Vì vậy không gọi liveness REAL là đã xác thực đúng sinh viên. Xem [LIVENESS.md](LIVENESS.md).

## 6. Bằng chứng kiểm tra

- `scripts/openapi-contract.mjs` đọc trực tiếp YAML, giữ nguyên các biến thể path trùng và dùng AJV để kiểm tra schema.
- `src/api-contract.test.js` kiểm tra mapper, trường thừa/thiếu, endpoint ngoài đặc tả, enum/type, phản hồi thiếu và các mâu thuẫn thật giữa hai định nghĩa.
- `tests/ui/server-fixture.js` kiểm tra request sinh từ UI với schema/query; response mẫu thành công có schema cũng được kiểm tra. Trường hợp không có schema được ghi nhận, không tự suy ra schema từ fixture.
- `tests/ui/server-contract.spec.js` đi qua đủ **38/38** operation bằng thao tác giao diện, gồm đăng nhập bằng mã, refresh, quyền tạo Admin, CRUD/ghi danh, ảnh, lịch sử/tổng hợp, email, ba loại CSV và đăng xuất. Kết quả đính kèm `api-coverage.json` có `missing: []`, `violations: []`.
- Kiểm tra lại ngày 16/11/2026: **54/54 kiểm thử Node**, **16/16 bài `server.spec.js` và `server-contract.spec.js` trên Chrome desktop/mobile** đạt. Bài contract phát sinh đủ 38 operation. Những kết quả WebKit của đợt trước không được tính là lần kiểm tra lại này.
- Đã xem ảnh form tài khoản và tab lịch sử ở 390 px. WebKit là mô phỏng, không phải xác nhận Safari trên iPhone thật.

Cập nhật ngày 17/11/2026: lint, 65 kiểm thử Node và build đạt; bộ Server gồm `server.spec.js`, `server-contract.spec.js`, `server-workflows.spec.js` đạt **28/28 trên Chrome desktop/mobile** và **14/14 trên WebKit**. Kiểm tra mới bao gồm tải receipt nhiều trang, xuất đủ 128 bản ghi, lỗi/hủy xuất không tạo file, thống kê cá nhân, bộ lọc quay lại, chọn email lỗi một phần và nhập CSV thử lại. Đã xem ảnh ở 390px, kiểm tra bố cục 360/768/1440px. Đây vẫn là kiểm thử FE với fixture, không đổi trạng thái xác nhận backend thật ở trên.

Các kiểm tra trên xác nhận cấu trúc và luồng phía frontend theo phần đặc tả được chọn; chưa kiểm tra HTTP/DB/Redis/email thật của nhóm 1 trong đợt này. Phân quyền thực tế vẫn do backend thực thi, không chỉ dựa vào việc ẩn nút trên UI.

## 7. Chạy lại khi API thay đổi

```powershell
npm.cmd run audit:api
npm.cmd test
npm.cmd run test:ui -- tests/ui/server-contract.spec.js
npm.cmd run test:webkit -- tests/ui/server-contract.spec.js
```

`audit:api` kiểm tra ma trận tĩnh; bài Playwright kiểm tra request thực sự phát sinh từ UI với backend giả lập. Khi thêm operation vào YAML, ma trận thiếu sẽ làm kiểm thử báo lỗi. Khi nhóm 1 sửa path trùng, cập nhật phần kiểm tra xung đột và chốt schema mới trước khi sửa fixture.

Bản trước thay đổi: `../iris-aegis-backups/truoc-doi-chieu-api-20261115/`. Ảnh và kết quả kiểm thử: `../iris-aegis-backups/doi-chieu-api-20261115/`.
