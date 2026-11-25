# Nhóm 5 → Nhóm 1: Chốt thông tin tích hợp API thật

**Ngày:** 17/11/2026. **Nguồn đối chiếu:** `openapi.yml` hiện có trong repository Web.

## 1. Mục tiêu và tình trạng hiện tại

Nhóm Web cần kết nối frontend hiện tại với môi trường backend của Nhóm 1 để kiểm thử dữ liệu, phân quyền và các luồng nghiệp vụ thật. Nhóm 5 phụ trách FE/UIUX và client API; Nhóm 1 cung cấp môi trường server cùng hợp đồng API thống nhất.

FE đã có luồng gọi cho **38 operation dành cho Web**, được kiểm tra bằng request/response giả lập theo YAML. Kết quả này chưa xác nhận server thực tế đã triển khai đủ. Ba operation `/sync/*` thuộc luồng đồng bộ Android, không được dùng thay REST API của Web.

Trong lần rà soát ngày 17/11, địa chỉ mặc định `http://localhost:5000/api/v1/health` chưa phản hồi trong thời hạn kiểm tra. Đây là tình trạng môi trường local của nhóm Web, không phải kết luận server Nhóm 1 bị lỗi.

## 2. Những thông tin cần bàn giao để bắt đầu kết nối

| Nội dung | Nhóm 1 cần cung cấp hoặc xác nhận |
|---|---|
| Môi trường kiểm thử | Base URL đang truy cập được, có/không có tiền tố `/api/v1`, đường dẫn health và Swagger/OpenAPI tương ứng. Nếu chỉ chạy local, cung cấp hướng dẫn khởi động đã kiểm chứng. |
| Phiên bản | Nhánh/commit hoặc phiên bản backend triển khai; file OpenAPI ứng với đúng phiên bản đó. |
| Tình trạng endpoint | Danh sách đã chạy thật và còn `planned`, thứ tự dự kiến bàn giao; không chỉ dựa vào nhãn trong tài liệu cũ. |
| Tài khoản | Tài khoản test `SUPER_ADMIN` và ít nhất hai `ADMIN` phụ trách các môn khác nhau; thông tin đăng nhập gửi qua kênh riêng, không commit vào repo. |
| Dữ liệu | Sinh viên, môn, ghi danh, lượt điểm danh và người nhận email có quan hệ hợp lệ. Có môn có dữ liệu, môn rỗng và dữ liệu đủ nhiều để thử phân trang. |
| Đặc quyền test | Xác định dữ liệu nào được thêm/sửa/xóa, cách khôi phục dữ liệu và quy định gửi email thật trong môi trường kiểm thử. |
| Kết nối trình duyệt | Xác nhận origin được phép nếu gọi trực tiếp; hoặc thống nhất đường dẫn qua reverse proxy cùng origin với Web. |
| Xử lý lỗi | Đầu mối nhận lỗi và thông tin cần gửi: method/path, thời điểm, HTTP status, mã lỗi, request ID nếu có; không yêu cầu gửi token/mật khẩu. |

Có thể bắt đầu ngay với tập endpoint đã sẵn sàng. Endpoint chưa triển khai được ghi rõ là chờ; Web không tự dùng dữ liệu Demo để thay cho phản hồi server.

## 3. Các điểm cần thống nhất trong OpenAPI

### 3.1. Loại bỏ hai khai báo path trùng

| Path | Khác biệt đang có | Kết quả cần chốt |
|---|---|---|
| `/students` | Bản Web dùng `StudentPublic`/`StudentCreate`; bản sau dùng `StudentRecord`. Trường `checkin_password` khi tạo và mô tả sort không đồng nhất. `StudentRecord` có trường nhạy cảm không phù hợp trả cho Web. | Một định nghĩa duy nhất cho mỗi method; schema request/response Public; trường bắt buộc/tùy chọn và cú pháp sort chính thức. |
| `/attendance` | Một bản bắt `uuid`, cho bỏ ngày/giờ và có `device_id`; bản sau bắt ngày/giờ, không bắt UUID và có `status`. Một số response chỉ có mô tả, thiếu schema. | Một hợp đồng ghi nhận điểm danh; xác định trường nào server quyết định, schema response và chính sách chống trùng. |

FE hiện gửi phần chung của hai định nghĩa điểm danh: `student_id`, `subject_id`, `checkin_date`, `checkin_time`, `uuid`. Với sinh viên, FE ưu tiên hợp đồng Web/Public. Đây là cách xử lý tạm khi chờ bản YAML đã gộp, không khẳng định hai định nghĩa tương đương.

### 3.2. Giữ nhất quán với hợp đồng Web hiện có

- Đổi mật khẩu: `current_password`, `new_password`.
- Đặt lại mật khẩu: `email`, `reset_token`, `new_password`.
- Đăng nhập: `email` hoặc `username`, kèm `password`; phản hồi token và người dùng theo schema đã công bố.
- Sort giảm dần theo dạng `-full_name`; danh sách trả `items`, `total`, `limit`, `offset`.
- Xóa mềm trả `204`, không yêu cầu JSON body; bản ghi đã xóa không còn trong danh sách.
- Lỗi dùng cấu trúc `error.code`, `error.message`; bổ sung schema cho response còn thiếu, đặc biệt upload ảnh, GET/POST attendance và tác vụ nền.

Source backend cũ từng có tên trường auth và cú pháp sort khác YAML. FE mặc định dùng `openapi`; chỉ bật lớp tương thích cũ khi hai nhóm thống nhất phiên bản cụ thể. Không gửi cả hai bộ tên trường trong cùng request.

## 4. Các quy tắc nghiệp vụ cần xác nhận khi chạy thật

| Chủ đề | Nội dung cần chốt |
|---|---|
| Khởi tạo tài khoản | Ai tạo/seed Super Admin đầu tiên? `/auth/register` hiện yêu cầu Super Admin đã đăng nhập, nên không dùng endpoint này để bootstrap công khai. |
| JWT và đăng xuất | Thời hạn access/refresh token; refresh có xoay refresh token không; logout vô hiệu hóa token nào; hành vi khi token hết hạn hoặc bị thu hồi. |
| Lần đăng nhập đầu | Kiểu và ý nghĩa của `is_first_login`; điều kiện bắt đổi mật khẩu; hành vi sau đổi thành công và việc dùng lại token cũ. |
| Phân quyền | Xác nhận phạm vi ADMIN đối với môn, sinh viên, ghi danh, ảnh, điểm danh và email; truy cập trực tiếp ngoài quyền phải bị backend từ chối, không chỉ ẩn nút trên FE. |
| Ngày giờ | ISO timestamp theo UTC; xác định múi giờ diễn giải `checkin_date`/`checkin_time`, nguồn giờ và chính sách gửi giờ từ client. |
| Ca/lịch học | `time_slot` biểu diễn một hay nhiều ca; một môn có hai ca cùng ngày được lưu và tổng hợp thế nào. Demo có ID ca riêng, API hiện chưa thể hiện tương đương rõ ràng. |
| Trạng thái điểm danh | Ai xác định đúng giờ/muộn/vắng, trường và giá trị trả về; mẫu số tính tỷ lệ, thời điểm tính vắng. FE không tự áp dụng quy tắc Demo vào báo cáo Server. |
| Chống trùng | Gửi lại cùng UUID trả bản ghi cũ; cùng UUID nhưng payload khác xử lý thế nào; cùng sinh viên/môn/ngày nhưng UUID khác có tạo thêm lượt không. |
| Xóa/bỏ ghi danh | Ảnh hưởng tới lượt điểm danh, thống kê và dữ liệu đã có; phân biệt bỏ sinh viên khỏi môn với xóa mềm hồ sơ sinh viên. |

## 5. Camera, ảnh và liveness: phần cần phối hợp thêm

Web đã có chớp mắt, quay đầu, phản xạ ánh sáng và gọi MiniVision Nhóm 4. **Liveness REAL xác định kết quả chống giả mạo của dịch vụ, chưa xác nhận người đó là sinh viên nào.**

Hợp đồng Nhóm 1 hiện có `POST /attendance` cho điểm danh thủ công. Chưa có mô tả đầy đủ cho đối sánh danh tính và ràng buộc kết quả liveness vào lượt điểm danh. Cần tách hai phạm vi:

- **Có thể tích hợp ngay theo API hiện tại:** giảng viên xác nhận thủ công, FE gửi attendance; chụp/upload ảnh sinh viên theo endpoint ảnh.
- **Cần hợp đồng bổ sung trước khi gọi là điểm danh bằng mặt:** nơi xử lý đối sánh, đầu vào/đầu ra, kết quả kiểm tra trùng mặt, cách xác minh bằng chứng liveness và gắn nó với đúng ảnh/người/phiên điểm danh.

Đề nghị Nhóm 1 phối hợp Nhóm 3/4 xác định bên chịu trách nhiệm kiểm chứng kết quả, thời hạn và khả năng dùng lại bằng chứng. Đây là nội dung cần thiết kế và công bố thêm; tài liệu này không tự đặt endpoint, payload hay coi cờ `passed` do trình duyệt gửi là bằng chứng đủ tin cậy.

Với API ảnh hiện có, cần xác nhận giới hạn dung lượng/kích thước, JPEG/PNG được hỗ trợ, response upload, lỗi file không hợp lệ và quyền đọc ảnh. `photo_path` là đường dẫn trên Android không thể mặc định dùng trực tiếp trong `<img>` của Web. FE đang lấy ảnh qua endpoint có Bearer token.

## 6. Những chức năng Android chưa có hợp đồng Web tương ứng

Các mục dưới đây cần Nhóm 1 xác nhận đưa vào API đợt sau hay tạm hoãn; không phải điều kiện bắt buộc để bắt đầu thử các endpoint hiện có:

- Sửa hồ sơ cá nhân, sửa/xóa Admin và ảnh khuôn mặt Admin.
- Xác thực danh tính bằng mặt sau đăng nhập, kiểm tra trùng mặt và xác minh ảnh cập nhật là cùng người.
- Kiểm tra mật khẩu điểm danh/kiosk mã sinh viên theo luồng Android; Web không được tải mật khẩu sinh viên về để tự so sánh.
- Backup/restore server và xác thực tăng cường cho thao tác nhạy cảm.
- Mống mắt phụ thuộc SDK/thiết bị; cần quyết định phạm vi riêng, không coi là một endpoint ảnh thông thường.

Danh sách thao tác hiện có và khoảng trống chi tiết nằm trong `DOI-CHIEU-API-SERVER.md` và `DOI-CHIEU-ANDROID-WEB.md` của source Web.

## 7. Cách nối môi trường và thứ tự kiểm thử

FE đang dùng cấu hình sau trong `.env.local` của project Web:

```dotenv
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://localhost:5000
VITE_API_PROFILE=legacy-source
```

Trình duyệt gọi `/api/v1`; Vite chuyển request tới backend. Khi Nhóm 1 cung cấp server, đổi `API_PROXY_TARGET` thành **origin backend, không thêm `/api/v1` lần nữa**, rồi khởi động lại Vite. Mô hình này dùng được khi thử Web qua tunnel trên iPhone, không để điện thoại gọi `localhost` của chính nó. Với bản deploy, cần reverse proxy tương ứng; proxy của Vite không tự tồn tại trong các file build tĩnh.

Dịch vụ liveness có proxy riêng `/liveness-api`, không thay base URL của Nhóm 1 và không nhận JWT của Nhóm 1.

Thứ tự kiểm thử đề xuất:

1. Health, đăng nhập, lấy người dùng hiện tại, refresh và hết phiên.
2. Môn, sinh viên, ghi danh; tìm/lọc/sort/phân trang và đối chiếu quyền hai Admin.
3. Ghi nhận thủ công, thử lại cùng UUID, đọc lại lịch sử và tổng hợp; kiểm tra đổi ngữ cảnh môn/ngày.
4. Upload/xem ảnh khi endpoint đã chạy; kiểm tra MIME, quyền và lỗi.
5. CSV, job, email, đổi/reset mật khẩu khi các dịch vụ tương ứng đã sẵn sàng. Xác nhận ý nghĩa `202`, trạng thái kết thúc/lỗi và giới hạn polling; ghi rõ gửi email đồng bộ hay qua job.
6. Luồng đối sánh mặt + liveness + attendance sau khi các nhóm chốt hợp đồng bổ sung.

Chỉ đánh dấu từng luồng “tích hợp thật” khi thao tác từ UI nhận phản hồi của server đang triển khai và dữ liệu được đọc lại đúng. Lỗi mạng/401/403/422/5xx phải giữ trạng thái rõ ràng; không thay bằng thành công giả lập.

## 8. Kết quả cần nhận sau trao đổi

- Base URL/môi trường, phiên bản triển khai và đầu mối hỗ trợ.
- OpenAPI đã xử lý path trùng, kèm tình trạng endpoint thực tế và response mẫu thành công/lỗi.
- Tài khoản và bộ dữ liệu kiểm thử có phân quyền, quan hệ và hướng dẫn khôi phục.
- Danh sách quy tắc đã chốt, mục chờ và bên phụ trách, đặc biệt ca học/chống trùng và bằng chứng face/liveness.
- Mốc thử chung cho nhóm Web với tập endpoint đầu tiên; các mục còn lại bàn giao theo đợt.
