# Đối chiếu chức năng Android và Web

Rà soát ngày 16/11/2026, cập nhật các luồng Server ngày 17/11/2026. Nguồn Android: `../IrisSample-IriAegis-26T/app/src/main/java/com/iritech/irissample/`. Nguồn Web: `src/portal` (demo cục bộ), `src/server` (client API) và `src/liveness` (camera/liveness).

## Bổ sung UI sau rà soát

Bản dữ liệu mẫu đã bổ sung các luồng UI còn thiếu có thể thực hiện cục bộ:

- Điểm danh thử theo `MockCheckinActivity`: từng người/cả lớp, giờ tùy chọn/ngẫu nhiên, xóa lượt hôm nay của môn; có xác nhận, giữ người đã ghi nhận để tránh trùng.
- Nhắc hoàn thiện hồ sơ ở lần đăng nhập đầu cho tài khoản mới; cập nhật ngay hoặc để sau, hoàn tất khi đã lưu ảnh.
- Sinh trắc học: xem tình trạng ảnh mặt, ghi danh mống mắt, đăng nhập/đặt lại bằng mống mắt. Nhánh mống mắt hiện đúng trạng thái thiếu thiết bị/SDK, không tạo kết quả quét giả.
- Báo cáo chuyển sang email giữ loại báo cáo, ngày/ca, khoảng ngày, từ khóa và trạng thái; CSV đính kèm được tạo từ cùng bộ lọc.
- Sao lưu có tùy chọn AES-GCM/PBKDF2 bằng mật khẩu file, nhập/giải mã và từ chối mật khẩu sai/file hỏng; vẫn đọc JSON cũ. Đây là định dạng Web, không giải mã backup Android.
- Sửa tràn nút tác vụ ở 768px và mở rộng ô chọn ca trên điện thoại.

Các luồng quản lý Admin/hồ sơ, sinh viên/ghi danh, CSV người nhận, chọn tất cả, biểu đồ/thống kê cá nhân và kiosk đã có trong demo. Xem qua **Mở dữ liệu mẫu** ở màn đăng nhập. Những phần thiếu trong **chế độ server** ở bảng dưới vẫn là giới hạn API/client, không được dùng dữ liệu local để giả thành phản hồi server.

## 1. Kết luận

**Chưa chuyển đầy đủ chức năng Android lên Web.** Demo có các màn nghiệp vụ chính, nhưng một số kết quả chỉ giả lập. Chế độ server có client cho đủ 38 operation REST dành cho Web trong YAML, song vẫn thiếu các nghiệp vụ Android chưa có API hoặc chưa được xây dựng trong giao diện server.

Không dùng “38/38 endpoint” để kết luận “100% chức năng Android”, “đối sánh danh tính hoàn tất” hoặc “backend đã tích hợp thật”.

## 2. Bảng đối chiếu theo chức năng

Đường dẫn Java trong bảng tính từ thư mục nguồn Android nêu trên. Đường dẫn Web tính từ `src/`.

| Chức năng Android và bằng chứng | Demo cục bộ | Chế độ server / trạng thái thực tế |
| --- | --- | --- |
| Khởi tạo Super Admin khi chưa có tài khoản — `LoginActivity.onCreate`, `RegisterAdminActivity` | Có bootstrap khi bộ dữ liệu rỗng: `portal/Auth.jsx`, `domain.js`. | Chưa có bootstrap công khai. `POST /auth/register` yêu cầu Super Admin đã đăng nhập; tài khoản đầu tiên cần server seed. |
| Đăng nhập/đăng xuất — `LoginActivity.attemptLogin`, `MainActivity` | Có tài khoản/mật khẩu local. | Có login, me, refresh, logout: `server/Session.jsx`, `client.js`. |
| Xác thực mặt sau mật khẩu — `LoginActivity` mở `FaceCaptureActivity` khi đã có ảnh | Có nhánh camera khi tài khoản có ảnh; đối sánh danh tính giả lập. | Chưa có bước xác thực danh tính bằng mặt trong đăng nhập. Login thành công mở phiên từ token. API chưa có hợp đồng cho bước xác thực mặt. |
| Quên/đặt lại mật khẩu — `ForgotPasswordActivity`, `ResetPasswordActivity` | Có mã mô phỏng; không gửi email. | Có form yêu cầu email/mã/reset: `server/Auth.jsx`. Chưa xác nhận email thật; link `irissample://` của Android không phải link reset của Web. |
| Hồ sơ cá nhân: tên, email, điện thoại, ngày sinh, giới tính, mô tả, ảnh — `ProfileActivity` | Có xem/sửa local qua `portal/Catalog.jsx`. | Xem tên/email/vai trò và đổi mật khẩu; chưa có cập nhật hồ sơ/ảnh Admin: `server/Operations.jsx`. Thiếu API tương ứng. |
| Nhắc cập nhật hồ sơ/ảnh lần đầu — `MainActivity.checkFirstLoginAndShowDialog` | Đã có nhắc hồ sơ lần đầu cho tài khoản mới trong demo, dẫn tới hồ sơ và cho để sau. | Có bắt đổi mật khẩu khi `is_first_login === 1`, nhưng chưa phải luồng hoàn thiện ảnh/hồ sơ như Android. |
| Quản lý Admin: danh sách/chi tiết/thêm/sửa/xóa/CSV — `AdminListActivity`, `AdminDetailActivity`, `RegisterAdminActivity` | Có CRUD, CSV, ảnh. | Có danh sách/chi tiết, tạo qua register và CSV; chưa sửa/xóa Admin, chưa upload ảnh Admin. YAML chưa có các operation đó. |
| Khóa thiết bị trước thao tác nhạy cảm — `BiometricAuthHelper`, `AdminDetailActivity`, `ProfileActivity` | Thay bằng nhập lại mật khẩu demo. | Có hộp thoại xác nhận, chưa có cơ chế tương đương khóa thiết bị/WebAuthn hoặc xác thực tăng cường được server kiểm chứng. |
| Môn học: danh sách/tìm/chi tiết/thêm/sửa/xóa/gán giảng viên — `SubjectListActivity`, `AddSubjectActivity` | Có UI đầy đủ nhóm thao tác. | Có CRUD, lọc, sort, phân trang, gán instructor: `server/Catalog.jsx`. |
| Lịch và học kỳ — `AddSubjectActivity`, `AttendanceManagementActivity` | Dùng mảng ca có ID riêng, trường phòng/học kỳ riêng. | Dùng `time_slot`, `semester_start_date`, `semester_end_date` theo YAML. Mô hình nhiều ca local không phải schema API chính thức. |
| Sinh viên: quản lý toàn hệ thống/trong môn, thêm/sửa/xóa/tìm/CSV — `StudentManagementActivity`, `StudentListActivity`, `AddStudentActivity`, `ImportCsvActivity` | Có UI và lưu local. | Có CRUD, lọc/sort/phân trang/CSV: `server/Catalog.jsx`, `Jobs.jsx`. |
| Ghi danh/bỏ sinh viên khỏi môn — `StudentListActivity`, `DatabaseHelper` | Có; giữ hồ sơ và lịch sử khi bỏ môn. | Có list/enroll/unenroll theo API. Rule giữ/xóa lịch sử thực tế do backend quyết định. |
| Chụp/chọn/xem/lưu ảnh sinh viên — `AddStudentActivity`, `FaceCaptureActivity` | Có camera/file/preview/lưu local. | Có tải và upload ảnh qua `/students/{student_id}/photo`; camera có liveness. Chọn ảnh từ file không tạo bằng chứng liveness. |
| Kiểm tra trùng mặt, kiểm tra ảnh mới là cùng người, vector/cosine — `FaceMatchHelper.compareFaces`, `AddStudentActivity`, `AdminDetailActivity`, `ProfileActivity` | Có lựa chọn kết quả giả lập. | **Chưa triển khai đối sánh danh tính/chống trùng thật.** Liveness REAL không thay thế bước này. API nhóm 1 chưa có endpoint đối sánh/kiểm tra trùng. |
| Điểm danh chọn sinh viên → mật khẩu → xác thực mặt — `StudentListActivity` | Có luồng UI; mật khẩu local và kết quả match giả lập. | Chọn sinh viên → xác nhận thủ công → POST attendance; camera/liveness là bước có thể mở thêm. Không có API kiểm tra mật khẩu điểm danh hoặc ràng buộc kết quả face/liveness. |
| Điểm danh bằng nhập mã SV + mật khẩu — `StudentManagementActivity.showCheckinByPasswordDialog` | Có tab nhập mã trong `portal/Attendance.jsx`. | Có tìm/chọn sinh viên trong môn; chưa có luồng kiosk nhập mã + mật khẩu tương đương Android. Không dùng mật khẩu lưu ở client để thay xác thực server. |
| Công cụ tạo điểm danh thử hàng loạt/ngẫu nhiên/xóa hôm nay, giờ tùy chọn — `MockCheckinActivity` | Đã có trang `mock-attendance`: tạo từng lượt/cả lớp, giờ tùy chọn/ngẫu nhiên, xóa hôm nay theo môn. | Chưa có UI tương đương. Đây là tiện ích thử dữ liệu, không phải nhận diện hàng loạt bằng camera. |
| Đúng giờ/muộn/vắng; lọc theo trạng thái — `AttendanceManagementActivity.classifyCheckinStatus`, `filterAttendanceList` | Có, mốc 15 phút đã có test; vẫn còn khác biệt khi nhiều ca cùng ngày. | Báo cáo hiện hiển thị ngày/giờ và tổng có mặt/vắng; chưa có đúng giờ/muộn và bộ lọc trạng thái tương đương Android. Không cần tự tạo nhãn từ chuỗi lịch chưa được chuẩn hóa. |
| Báo cáo ngày/lịch sử/học kỳ — `loadAttendanceRecords`, `loadSemesterAggregateRecords` | Có UI và tổng hợp local. | Có ba tab, khoảng ngày, lọc mã SV, sort, phân trang, xóa lượt; summary theo response server: `server/Reports.jsx`. |
| Biểu đồ, thống kê từng sinh viên và cảnh báo vắng — `calculateAndShowChart`, `showStudentStatsDialog`, `AttendanceRecordAdapter` | Có tổng hợp/dialog/cảnh báo local; giao diện hiện dùng nhãn/số theo quy chuẩn, không có bar màu. | Có tổng số từ summary và dialog thống kê cá nhân với lịch sử phân trang, theo môn/khoảng ngày. Chưa có cảnh báo theo ngưỡng vắng tương đương; không tự đặt ngưỡng ở FE. |
| Xuất CSV báo cáo ngày/học kỳ — `showExportModeDialog`, `writeDayModeCsv`, `writeSemesterModeCsv` | Có xuất dữ liệu đang lọc. | Có xuất trang hiện tại, toàn bộ kết quả lọc qua phân trang và toàn bộ summary server trả. Có tiến độ/hủy, chặn file thiếu khi lỗi/trùng trang. Chỉ xuất các trường API cung cấp, chưa đủ cột nghiệp vụ Android nếu API chưa có. |
| Quản lý/chọn người nhận báo cáo — `setupEmailComponent` | Có CRUD, chọn từng người/chọn tất cả. | Có CRUD, checkbox từng người và chọn tất cả, lưu `is_selected` bằng PUT; tải lại kết quả khi thành công một phần. |
| Nhập CSV người nhận — `importEmailsFromCsv` | Có. | Đã có xem trước CSV, kiểm tra cột/email/giá trị chọn, bỏ qua email đã có/trùng trong file. FE gọi POST recipient từng dòng; phản hồi 409 bỏ qua, lỗi mạng/5xx dừng và cho thử lại phần chưa xác nhận. Không thêm loại CSV mới vào `/import/csv`. |
| Gửi báo cáo theo phạm vi đã chọn — `AttendanceManagementActivity`, `EmailService` | Gửi giả lập; nhận bộ lọc và loại báo cáo từ Reports, cùng hàm xuất CSV cho bản đính kèm. | Có giữ khoảng ngày từ Reports sang Email, POST send-report và theo dõi job. Nội dung/file báo cáo thật do server tạo, chưa kiểm chứng email nhận thực tế. |
| Email thông báo tạo/sửa/xóa tài khoản — `EmailService` và các Activity quản trị | Chưa có gửi thật. | Không có API gửi từng loại thông báo này; cần kiểm tra side effect backend. Có form CRUD không đồng nghĩa email đã gửi. |
| Backup/restore database + ảnh mã hóa — `BackupRestoreActivity`, `BackupRestoreHelper`, `EncryptionHelper` | Có JSON cũ và tùy chọn mã hóa file Web bằng mật khẩu, backup trong phiên, tải/nhập/xóa/restore. Không đọc định dạng backup Android. | Chưa có API/UI vận hành backup server. Android xem tất cả backup cũng còn TODO; không tính TODO là chức năng Android đã chạy. |
| Mống mắt, USB, license — `LicenseCheckHelper`, các đoạn gọi SDK | Có màn trạng thái, ghi danh và các điểm vào đăng nhập/đặt lại mống mắt; chặn quét khi thiếu SDK/thiết bị. | Chưa có tích hợp. SDK/module ở Android gốc đang comment/thiếu; không phải chức năng hoạt động đã bỏ sót khỏi Web. |

## 3. Liveness hiện tại

`src/liveness/FullLivenessCamera.jsx` đã triển khai chớp mắt, quay đầu hai phía, chính diện, đo phản xạ đỏ/xanh rồi gọi MiniVision. `src/liveness/client.js` gửi khung hình gốc và vùng mặt đến `POST /api/v1/ai/anti-spoof` (API nhóm 4 bản 1.2) qua proxy riêng. Đây là phần nhận từ nhóm 4, được chuyển nền tảng sang Web, không phải tính năng có sẵn trong Android gốc nêu trên.

REAL cho phép sử dụng ảnh sau khi đủ luồng; FAKE/lỗi không cho sử dụng. Chưa có hợp đồng phía nhóm 1 để chứng minh kết quả này thuộc đúng danh tính/đúng lượt điểm danh. Xem [LIVENESS.md](LIVENESS.md).

## 4. Sai khác nghiệp vụ phải chốt

- Android gốc kiểm tra trùng lượt theo sinh viên/môn/ngày; demo Web có thêm ID ca. Một môn nhiều ca cùng ngày có thể cho kết quả tổng hợp khác.
- Demo có lịch dự kiến và suy ra vắng sau giờ kết thúc; báo cáo server lấy từ API, không dùng engine local để thay kết quả.
- Demo xóa thực thể và dữ liệu liên quan theo command local; đặc tả server dùng xóa mềm. Hai cách không đồng nhất.
- Demo có phòng học, lớp hành chính, audit local, kịch bản lỗi/chậm và chọn ngày/ca. Đây không phải bằng chứng Android hoặc mọi API CRUD có sẵn các trường/chức năng đó; riêng `class_name` có xuất hiện trong mô tả CSV server.
- Đổi mật khẩu lần đầu theo YAML và nhắc hoàn thiện ảnh/hồ sơ của Android là hai yêu cầu khác nhau.
- Web chưa có tài khoản sinh viên tự đăng nhập/tự điểm danh bằng thiết bị riêng; không tự thêm luồng này vào phạm vi đã chuyển từ Android.

## 5. Việc còn lại khi chuyển bản UI cục bộ sang vận hành thật

1. Đã bổ sung thống kê cá nhân, xuất toàn bộ kết quả lọc, chọn tất cả và CSV người nhận trong Server. Giữ trình bày nhãn/số, không thêm biểu đồ thanh màu theo quy chuẩn UI. Cảnh báo vắng theo ngưỡng và công cụ tạo dữ liệu thử Server chưa được bổ sung.
2. Chốt UI/phần chờ cho kiosk mã/mật khẩu và hoàn thiện hồ sơ lần đầu; không dùng dữ liệu Demo thay phản hồi Server.
3. Nhóm 1 bổ sung/chốt hợp đồng quản trị Admin/hồ sơ/ảnh, face verification/chống trùng, kiểm tra mật khẩu điểm danh và ràng buộc liveness.
4. Chốt định nghĩa lịch/ca, trạng thái điểm danh, trùng lượt, xóa mềm và side effect email.
5. Xác định phương án backup/restore, xác thực thao tác nhạy cảm; ghi rõ Iris bị hoãn nếu thiếu SDK/thiết bị.
6. Manual test đầy đủ các nhánh trên thiết bị thật; test giả lập không xác nhận model chính xác hay backend đã thực thi phân quyền.

## 6. Kiểm tra đã chạy trong lần rà soát

- `npm.cmd run audit:api`: có mapping cho 38 operation Web; 3 operation sync được loại trừ đúng phạm vi Android.
- `npm.cmd test`: 57/57 đạt sau khi bổ sung các luồng cục bộ.
- Playwright `portal.spec.js` và `android-completion.spec.js`: 32/32 đạt trên Chrome desktop/mobile. Năm bài mới còn chạy trên WebKit mô phỏng iPhone và đều đạt. Đã chụp và xem màn mới ở 390/768/1440px, kiểm tra thêm 360px; WebKit không thay thế Safari iPhone thật.
- Playwright `server.spec.js` và `server-contract.spec.js`: 16/16 đạt trên desktop Chrome và mobile Chrome mô phỏng. Bài contract phát sinh đủ 38 operation từ UI, kiểm tra payload/response có schema bằng YAML.
- Chưa dùng đợt kiểm tra này để xác nhận backend nhóm 1 thật, email/Redis thật, tính đúng của model hay Safari iPhone thật.

### Kiểm tra bổ sung ngày 17/11/2026

- Chốt Demo tại `3b429f9`: 64 ca Chrome desktop/mobile và 32 ca WebKit cho điều hướng, nghiệp vụ cục bộ, mobile, motion và giữ ngữ cảnh; lint, 60 kiểm thử Node và build đạt tại mốc đó.
- Sau bổ sung Server: lint, 65 kiểm thử Node và build đạt; 28/28 ca Chrome desktop/mobile, 14/14 ca WebKit trong `server.spec.js`, `server-contract.spec.js`, `server-workflows.spec.js` đạt. Bài contract vẫn chạm đủ 38 operation và không phát hiện payload/response có schema sai.
- Các ca mới kiểm tra receipt vượt một trang, quay lại danh sách sau ghi nhận, CSV 128 bản ghi, lỗi/hủy xuất không tải file thiếu, thống kê cá nhân, giữ bộ lọc báo cáo/email, cập nhật người nhận lỗi một phần và CSV thử lại không nhập lại dòng đã thành công.
- Kiểm tra thêm 21 ca camera/liveness trên WebKit đạt trong lượt hồi quy; dùng frame/phản hồi kiểm thử, không đánh giá phần cứng/model thật. Lỗi focus sau tải lại danh sách trên WebKit đã sửa và kiểm tra lặp lại 3 lần.
- Đã xem ảnh email, CSV và thống kê ở 390px; kiểm tra bố cục thêm 360/768/1440px. Backend thật, email thật và độ ổn định liveness trên iPhone vật lý chưa được xác nhận ở đợt này.

Ma trận endpoint chi tiết: [DOI-CHIEU-API-SERVER.md](DOI-CHIEU-API-SERVER.md).
