# IriAegis Web — Giao diện và prototype nghiệp vụ

**Thành viên mới chạy trên Windows:** [HUONG-DAN-CHAY-WINDOWS.md](HUONG-DAN-CHAY-WINDOWS.md): cài phần mềm, tải code, bấm đúp file trong `scripts/windows` để chạy web, server liveness Nhóm 4 (Docker) và link iPhone.

**Nhánh phát triển chính: `HuyHoang`.** Tiếp tục phát triển và kiểm thử tại đây; đợt cập nhật này không thay đổi nhánh `main`.

**Liveness nhóm 4:** [LIVENESS.md](LIVENESS.md). Đã cập nhật Android `a9be597`: chớp mắt → quay hai phía → kiểm tra khung mặt/flash vùng ngoài khung → API MiniVision. Đồng bộ ngưỡng mới do nhóm 4 cung cấp: `0,018 / 0,002 / 0,002`; API MiniVision không đổi. Thử tại `/#/camera` hoặc bước điểm danh; tăng sáng màn hình thủ công trước khi bắt đầu. Backend nhóm 4 chạy cổng 8000, proxy `/liveness-api`. Cần thử camera/iPhone thật để xác nhận chất lượng; chưa có đối sánh danh tính hoặc bằng chứng do server nhóm 1 xác minh.

**Tình huống iPhone người thật không đạt flash:** [báo cáo và hướng thu số đo](BAO-CAO-LIVENESS-IOS.md). Hiện chưa xác nhận bản mới khắc phục trên thiết bị thật. Sau lỗi ánh sáng, bấm **Lưu thông tin lỗi** để tải JSON, kể cả không bật debug. File chứa tối đa 5 lượt trong trang và profile nguồn nhóm 4, không chứa ảnh/video/tài khoản/token. Không tải lại trang giữa các lượt nếu cần đối chiếu. Kết quả cũ với flash toàn màn hình được giữ nguyên trong báo cáo lịch sử.

**Đối chiếu API mới nhất:** [DOI-CHIEU-API-SERVER.md](DOI-CHIEU-API-SERVER.md) — ma trận 38 operation Web, các phần thiếu đã bổ sung, giới hạn và mâu thuẫn trong YAML. Chạy `npm.cmd run audit:api` để xem ma trận.

**Gửi Nhóm 1 trước khi kết nối thật:** [TRAO-DOI-TICH-HOP-API-NHOM-1.md](TRAO-DOI-TICH-HOP-API-NHOM-1.md) — môi trường, tài khoản/dữ liệu test, hợp đồng cần chốt và thứ tự kiểm thử tích hợp.

Tham khảo [đối chiếu chức năng Android → Web](DOI-CHIEU-ANDROID-WEB.md) và quy chuẩn giao diện [DESIGN.md](DESIGN.md). Bảng đối chiếu được lập khi còn bản demo; cần xác nhận lại trạng thái từng chức năng với API hiện có.

## Bản nâng cấp kết nối API nhóm 1

Trang `/` hoặc `/#/app` mặc định mở đăng nhập server. Dùng tài khoản nhóm 1 cấp. Hướng dẫn cấu hình, kết quả rà soát UX, endpoint đã nối và các lệch giữa YAML/source: [DANH-GIA-UX-VA-TICH-HOP-SERVER.md](DANH-GIA-UX-VA-TICH-HOP-SERVER.md).

Trình duyệt gọi `/api/v1` qua proxy Vite; đích mặc định `http://localhost:5000` lấy từ YAML. Có thể tạo `.env.local` từ `.env.example`, đổi `API_PROXY_TARGET` rồi khởi động lại Vite. Trên điện thoại/tunnel nên giữ API cùng origin. Đặc tả nhóm 1 có endpoint planned, chưa có đối sánh mặt hoặc liên kết bằng chứng liveness vào check-in; liveness chạy qua API riêng nhóm 4. Web không tự chuyển thành kết quả giả lập khi server lỗi. Chưa xác nhận hoạt động với backend nhóm 1 thật đang chạy.

Không cần cài/chạy backend để phát triển UI và chạy kiểm thử trình duyệt với fixture theo YAML. Để tự thao tác **chế độ Server với dữ liệu thật**, cần backend đang chạy (trên máy này hoặc một URL do Nhóm 1 cung cấp), tài khoản hợp lệ và các endpoint tương ứng đã triển khai. Các thao tác camera/liveness vẫn cần dịch vụ liveness riêng; không cần dịch vụ đó để kiểm thử CRUD bằng fixture.

### Bổ sung giao diện Server ngày 17/11/2026

- Danh sách điểm danh đọc đủ các trang lượt đã ghi nhận theo môn/ngày, hiển thị giờ và tải lại sau thao tác; quay lại giữ vị trí/focus. API check-in vẫn là ghi nhận thủ công, chưa xác thực danh tính bằng mặt.
- Báo cáo có thống kê từng sinh viên, lịch sử phân trang, xuất trang hiện tại hoặc toàn bộ kết quả lọc. Xuất toàn bộ có thể hủy; lỗi giữa các trang không tạo file thiếu dữ liệu.
- Email có chọn từng người/chọn tất cả, nhập CSV với xem trước, bỏ qua email trùng và thử lại các dòng chưa nhập. CSV được FE xử lý rồi gọi API người nhận từng dòng; không thêm endpoint nhập hàng loạt.
- Đi từ báo cáo sang email và quay lại giữ bộ lọc. Ngày hiển thị dạng `dd/mm/yyyy`; request/CSV giữ định dạng ISO theo hợp đồng.

Demo đã được kiểm tra và lưu tại commit `3b429f9`. Bản Server tiếp tục tách dữ liệu, xác thực và kết quả khỏi Demo. Các giới hạn chưa có API được ghi ở [bảng đối chiếu](DOI-CHIEU-ANDROID-WEB.md).

## Dữ liệu nghiệp vụ

Ứng dụng có chế độ kết nối server và chế độ dữ liệu mẫu để kiểm thử giao diện. Tại màn đăng nhập chọn **Mở dữ liệu mẫu**, sau đó đăng nhập `super@demo.test` hoặc `lan@demo.test` với mật khẩu `Demo@123`. Mật khẩu điểm danh mẫu là `123456`. Dữ liệu mẫu lưu trên trình duyệt, tách biệt với server.

### Bố cục trên điện thoại

Giao diện giữ màu mint/teal từ Android. Trên điện thoại, nút **Menu** mở điều hướng bên trái với các nhóm có thể thu/mở; không có thanh tab cố định dưới. Chạm ngoài menu hoặc nút X để đóng.

Màn điểm danh ưu tiên danh sách lớp. Chạm vùng tên môn hoặc **Đổi** để chọn môn/ngày/ca trong bảng chọn; **Xem danh sách lớp** đóng bảng và quay về danh sách theo lựa chọn mới. Các nút **Chưa ghi nhận** và **Đã ghi nhận** lọc danh sách; sinh viên đã ghi nhận hiển thị giờ thay cho nút bị vô hiệu hóa. **Nhập mã sinh viên** vẫn mở luồng nhập mã.

Ngày hiển thị `dd/mm/yyyy`, vẫn dùng bộ chọn ngày của trình duyệt. Quy chuẩn triển khai nằm trong [DESIGN.md](DESIGN.md) và [UI-GUIDELINES.md](UI-GUIDELINES.md). Khi thử trên Safari iPhone thật, kiểm tra thêm bộ chọn ngày, thanh trình duyệt co/giãn và bàn phím; ảnh chụp WebKit tự động không thay thế các thao tác này.

### Kiểm thử UI bằng dữ liệu mẫu

#### Bản UI theo Android trước khi nối API

Chọn **Mở dữ liệu mẫu** tại màn đăng nhập để thử các luồng cục bộ. Ngoài quản lý tài khoản, môn, sinh viên, camera/điểm danh, báo cáo/email và backup đã có, menu **Thêm** cung cấp:

- **Điểm danh thử** (`/#/app/mock-attendance`): chọn môn/ca hôm nay, tạo lượt từng người hoặc cả lớp với giờ tùy chọn/ngẫu nhiên, xóa lượt hôm nay có xác nhận. Không chạy xác thực khuôn mặt.
- **Sinh trắc học** (`/#/app/biometrics`): cập nhật ảnh qua hồ sơ, xem điều kiện ghi danh mống mắt. Luồng mống mắt dừng ở trạng thái thiếu SDK/thiết bị. Các nút đăng nhập/đặt lại bằng mống mắt trên màn tài khoản cũng hiển thị giới hạn này.
- **Sao lưu**: có thể bật mã hóa trước khi tải, nhập mật khẩu file khi khôi phục. Mật khẩu file có thể khác mật khẩu tài khoản. File Web không tương thích backup Android.

Tài khoản mới được nhắc bổ sung ảnh/hồ sơ lần đầu. Từ báo cáo, chọn bộ lọc rồi **Chuẩn bị email** sẽ giữ cùng dữ liệu cho CSV đính kèm. Các kết quả danh tính và gửi email trong chế độ này vẫn là giả lập. API nhóm 1 dùng chế độ server riêng; không dùng thao tác demo làm bằng chứng đã tích hợp backend.

#### Tài khoản và lớp mẫu

| Tài khoản | Vai trò và dữ liệu có thể kiểm tra |
| --- | --- |
| `super@demo.test` | Super Admin: cả ba môn, danh sách quản trị viên, sinh viên và phần cài đặt demo. |
| `lan@demo.test` | Admin phụ trách WEB301: 8 sinh viên, 3 lượt điểm danh mẫu và người nhận báo cáo. |
| `nam@demo.test` | Admin phụ trách CSDL201: 4 sinh viên, chưa có lượt điểm danh mẫu và có người nhận báo cáo. |

Ba tài khoản dùng mật khẩu `Demo@123`. Sinh viên mẫu có mã `SV001`–`SV008` và mật khẩu điểm danh `123456`. Môn JAVA202 chưa được gán giảng viên và chưa có sinh viên để kiểm tra trạng thái rỗng. Ở WEB301, `SV001` và `SV002` có lượt đúng giờ, `SV003` có lượt muộn; chọn một sinh viên còn lại để thử điểm danh. Trạng thái chưa điểm danh hoặc vắng phụ thuộc thời điểm hiện tại so với giờ kết thúc ca.

Lịch WEB301 và CSDL201 được tạo vào thứ của **ngày nạp dữ liệu mẫu**, còn JAVA202 vào ngày kế tiếp. Dữ liệu đã lưu trong trình duyệt không tự thay đổi theo ngày; có thể chọn ngày tương ứng trên màn điểm danh/báo cáo. Nếu muốn khôi phục bộ mẫu theo ngày hiện tại, đăng nhập Super Admin, vào **Cài đặt → Nạp lại dữ liệu mẫu** và xác nhận. Thao tác này thay dữ liệu demo trên trình duyệt và đăng xuất; hãy xuất sao lưu trước nếu cần giữ thay đổi.

Các sinh viên và quản trị viên mẫu chưa có ảnh khuôn mặt; có thể tự thêm ảnh khi thử luồng tương ứng. Tài khoản, điểm danh và email ở chế độ này là giả lập, không chứng minh đã xác thực danh tính hay gửi dữ liệu tới server.

Đối chiếu `openapi.yml`: bộ mẫu có các thực thể quản trị viên, môn học, sinh viên, đăng ký môn, lịch sử điểm danh và người nhận email. Đây là mô hình cục bộ phục vụ UI, **không phải response mock tuân thủ API**: ví dụ `id`/`name` trong bộ mẫu khác `student_id`/`full_name` trong API. Lớp hành chính, phòng học và lịch chi tiết ở demo cần đối chiếu lại với backend; không coi là trường API đã được cam kết. Các kiểm thử chế độ server dùng fixture riêng để kiểm tra request/response theo YAML, không kết nối server thật.

## Bộ nền giao diện cho nhóm — tuần 2

Chạy `npm.cmd run dev`, sau đó mở `/#/ui-kit` trên địa chỉ Vite để xem màn hình mẫu, component, token và hướng dẫn. Bộ mẫu chỉ có trong chế độ phát triển, không nằm trong build production. Hướng dẫn cho thành viên: [UI-GUIDELINES.md](UI-GUIDELINES.md). Đường dẫn `/#/camera` mở camera độc lập.

Bộ mẫu dùng dữ liệu giả trong bộ nhớ; không phải bản ứng dụng nghiệp vụ hoàn chỉnh. Các component chung nằm tại `src/ui`, được tách khỏi CSS camera. Test UI: `npm.cmd run test:ui` (cần Chrome cài trên máy).

## Prototype camera

`/#/camera` mở luồng liveness đầy đủ được chuyển từ nhóm 4; `/#/camera/passive` thử riêng API phân loại một ảnh. Phát hiện mặt và kết quả liveness không phải xác minh danh tính.

Camera đã dùng `navigator.mediaDevices.getUserMedia()` để lấy `MediaStream`, theo phần truy cập thiết bị của bộ công nghệ WebRTC. Luồng được gắn vào `<video playsInline>` và chụp qua `canvas`; MediaPipe là thành phần riêng để phát hiện khuôn mặt. Xem [hướng dẫn WebRTC về media devices](https://webrtc.org/getting-started/media-devices).

## Chạy trên máy tính

Cả nhóm sử dụng Node.js 22, sau đó mở PowerShell trong thư mục này:

```powershell
npm.cmd install
npm.cmd run dev
```

Chạy `npm.cmd test` để kiểm tra logic vùng cắt ảnh, hợp đồng API và luồng liveness.

Mở địa chỉ localhost được in trong terminal. Tại `/#/camera`, đọc và chọn đồng ý đo ánh sáng/gửi ảnh, bấm **Bắt đầu xác thực**, rồi cho phép trình duyệt sử dụng webcam. Giữ mắt mở để hiệu chuẩn, chớp mắt, quay chậm hai phía và nhìn thẳng để đo đỏ/xanh. `npm.cmd run build` tạo bản build. Dùng `npm.cmd` trong PowerShell để tránh lỗi chặn `npm.ps1` theo execution policy. Lần đầu mở camera cần mạng để tải WASM MediaPipe; model landmark nằm trong `public/models/face-landmarker`. Với luồng liveness phải phát hiện đúng một mặt và dịch vụ nhóm 4 phải hoạt động; lỗi hoặc FAKE không cho sử dụng ảnh. Hướng dẫn khởi chạy backend và kiểm thử nằm trong [tài liệu tích hợp](LIVENESS.md).

## Kiểm thử trên điện thoại

### Safari iPhone và WebKit tự động

Để thử **Safari iPhone thật**, chạy bản build tại cổng 4180 và mở Cloudflare Tunnel theo hai terminal bên dưới. Trên iPhone mở link HTTPS bằng Safari trực tiếp; kiểm tra camera độc lập hoặc đăng nhập server để kiểm tra màn nghiệp vụ. Không cần chạy WebKit trên Windows để thực hiện việc này.

Để chạy **WebKit tự động** trên máy hỗ trợ:

```powershell
npx.cmd playwright install webkit
npm.cmd run test:webkit
```

Cấu hình riêng `playwright.webkit.config.js` dùng thiết bị mô phỏng iPhone 13; các test Chrome mặc định vẫn ở `npm.cmd run test:ui`. Test WebKit không xác nhận thay cho thiết bị iPhone thật.

Máy hiện tại đã chạy được WebKit với cấu hình iPhone 13. Lần kiểm tra liveness ngày 15/11/2026 sau sửa watchdog/nguồn frame đạt 17/17 bài trên WebKit; kết quả và phạm vi mô phỏng được ghi trong [tài liệu tích hợp](LIVENESS.md). Trước đó Smart App Control/Code Integrity chặn `WebKit2.dll` (sự kiện 3077 và 3118); sau khi người dùng thay đổi thiết lập Windows, lỗi khởi động không còn. Có sửa quản lý focus của Button/Dialog để đóng hộp thoại trả focus đúng trên WebKit.

Muốn nhìn cửa sổ WebKit trong lúc test:

```powershell
npm.cmd run test:webkit -- --headed --workers=1
```

Muốn mở giao diện Playwright để chọn và chạy từng bài test:

```powershell
npm.cmd run test:webkit -- --ui
```

Không chạy đồng thời hai bộ test vì cùng dùng cổng 5187. Test camera hiện xác nhận giao diện và luồng giả lập; camera phần cứng, quyền thực tế và bàn phím Safari vẫn cần kiểm thử trên iPhone thật.

Camera cần secure context: HTTPS hoặc localhost. `localhost` trên máy tính không phải localhost của điện thoại; HTTP qua IP mạng LAN thường không mở được camera. Dùng một môi trường HTTPS đáng tin cậy để thử trên điện thoại, trong đó có Safari iOS thật. Video dùng `playsInline`, `autoPlay` và `muted`; ảnh được lật như preview và chỉ lưu trong bộ nhớ trang.

### Tự tạo link HTTPS bằng Cloudflare Tunnel trên Windows

Cloudflare Tunnel đã được cài trên máy hiện tại tại `C:\Program Files (x86)\cloudflared\cloudflared.exe`. Với máy khác, cài `cloudflared` theo [hướng dẫn chính thức](https://developers.cloudflare.com/tunnel/downloads/).

**Terminal 1 — build và chạy bản Web:** mở PowerShell trong thư mục `iris-aegis-web`, rồi chạy:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4180 --strictPort
```

Giữ terminal này mở. Nếu cổng `4180` đã được dùng, chọn cổng khác và dùng đúng cổng đó ở lệnh tiếp theo. Mỗi lần sửa code cần chạy lại `npm.cmd run build` để cập nhật bản thử. Dùng Vite preview để có proxy `/api/v1`; `http-server dist` chỉ phục vụ file tĩnh, không chuyển request API tới Flask. Backend phải chạy để sử dụng chức năng nghiệp vụ.

**Terminal 2 — mở tunnel:** mở một cửa sổ PowerShell khác và chạy:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:4180
```

Giữ terminal mở; sao chép đường dẫn `https://...trycloudflare.com` mà lệnh in ra và mở bằng **Safari trực tiếp** trên iPhone. Không cần mở link qua trình duyệt tích hợp Zalo: lần thử trước camera bị toàn màn hình và đơ trong Zalo. Camera cần có mạng để tải model phát hiện khuôn mặt.

Đây là link công khai tạm thời: bất kỳ ai có link có thể truy cập bản Web. Chỉ chia sẻ link cho người kiểm thử. Để ngừng, nhấn `Ctrl+C` tại terminal tunnel; nhấn `Ctrl+C` ở terminal 1 để ngừng server. Mỗi lần tạo tunnel sẽ có thể nhận link khác. Hướng dẫn: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Phong cách

Các màu mint, nền và màu chữ lấy từ `app/src/main/res/values/colors.xml` của ứng dụng Android; bố cục Web được thiết kế lại cho màn hình lớn và điện thoại.

Danh sách token đã trích xuất và lưu ý chuyển đổi Android → Web: [DESIGN-TOKENS.md](DESIGN-TOKENS.md).

## Công cụ kiểm thử camera trên máy phát triển

Màn camera mặc định không hiển thị số đo kỹ thuật hoặc nút bỏ qua camera. Khi cần chẩn đoán tại Vite dev, đặt VITE_CAMERA_DIAGNOSTICS=true trong .env.local rồi khởi động lại, hoặc chạy trong Console và tải lại trang:

```js
localStorage.setItem('aegis.camera-diagnostics', 'true')
location.reload()
```

Tắt bằng localStorage.removeItem('aegis.camera-diagnostics') rồi tải lại. Công cụ chỉ dành cho development; npm.cmd run build không bật chúng, kể cả cờ còn trong localStorage. Không dùng kịch bản giả lập làm bằng chứng đã xác thực người thật/danh tính.
