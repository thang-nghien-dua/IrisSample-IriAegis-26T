/* global localStorage, window, document */
import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

import { actor, fixture, login } from './server-fixture.js'

test('server: login/restore, CRUD đúng payload, 204, giữ tìm kiếm khi quay lại', async ({ page }, info) => {
  const state = await fixture(page); await login(page)
  await page.goto('/#/app/students')
  await page.getByRole('button', { name: 'Thêm sinh viên', exact: true }).click()
  await page.screenshot({ path: info.outputPath('student-form.png'), fullPage: false })
  await page.getByLabel('Mã sinh viên', { exact: false }).fill('SV999'); await page.getByLabel('Họ tên', { exact: false }).fill('Nguyễn Minh Anh')
  await page.getByRole('button', { name: 'Lưu sinh viên' }).click()
  await expect(page.getByText('Đã tạo hồ sơ sinh viên. Vui lòng ghi danh vào môn học để sinh viên hiển thị trong danh sách giảng viên.')).toBeVisible()
  const create = state.writes.find(row => row.path === '/students'); expect(create.body.student_id).toBe('SV999'); expect(create.body).not.toHaveProperty('id'); expect(create.body).not.toHaveProperty('photo')
  await page.getByRole('searchbox').fill('Minh Anh'); await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Nguyễn Minh Anh', exact: true })).toHaveAttribute('href', /return=.*q%3DMinh/);
  await page.getByRole('link', { name: 'Nguyễn Minh Anh', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Nguyễn Minh Anh', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '← Sinh viên' }).click(); await expect(page.getByRole('searchbox')).toHaveValue('Minh Anh')
  await page.reload(); await expect(page.getByRole('searchbox')).toHaveValue('Minh Anh')
  await page.getByRole('button', { name: 'Xóa SV999', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Xóa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Không tìm thấy kết quả' })).toBeVisible()
})

test('server: bấm điểm danh cuối trang mở bước trong viewport, quay lại giữ danh sách, retry giữ UUID', async ({ page }, info) => {
  const state = await fixture(page); await login(page); await page.goto('/#/app/attendance?course=WEB301')
  const row = page.getByRole('row').filter({ hasText: 'Sinh viên kiểm thử 20' })
  await row.getByRole('button', { name: 'Điểm danh', exact: true }).click()
  const heading = page.getByRole('heading', { name: 'Xác nhận điểm danh', exact: true }); await expect(heading).toBeFocused()
  const box = await heading.boundingBox(); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y).toBeLessThan(200)
  await expect(page.getByRole('table', { name: 'Danh sách điểm danh' })).not.toBeVisible()
  await page.screenshot({ path: info.outputPath('attendance-step.png'), fullPage: true })
  await page.getByRole('button', { name: '← Danh sách lớp', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Điểm danh', exact: true })).toBeFocused()
  await page.goForward(); await expect(heading).toBeFocused()
  await page.goBack(); await expect(row.getByRole('button', { name: 'Điểm danh', exact: true })).toBeFocused()
  await row.getByRole('button', { name: 'Điểm danh', exact: true }).click()
  await page.getByLabel('Tôi xác nhận sinh viên có mặt').check(); state.failAttendance = true
  await page.getByRole('button', { name: 'Ghi nhận lên server' }).click(); await expect(page.getByText('Server đang bận. Vui lòng thử lại.')).toBeVisible()
  await page.getByRole('button', { name: 'Thử gửi lại cùng yêu cầu' }).click(); await expect(page.getByRole('heading', { name: 'Đã ghi nhận điểm danh', exact: true })).toBeFocused()
  const writes = state.writes.filter(row => row.path === '/attendance'); expect(writes).toHaveLength(2); expect(writes[0].body).toEqual(writes[1].body)
  expect(writes[0].body).not.toHaveProperty('photo'); expect(writes[0].body).not.toHaveProperty('liveness')
  await page.getByRole('link', { name: 'Xem lịch sử', exact: true }).click(); await expect(page.getByRole('table', { name: 'Báo cáo server' })).toContainText('SV020')
})

test('server: CSV multipart, 202 vẫn chờ job, xem kết quả thật từ phản hồi', async ({ page }) => {
  const state = await fixture(page); await login(page); await page.goto('/#/app/students')
  state.finishJobs = false
  await page.getByRole('button', { name: 'Nhập CSV', exact: true }).click()
  await page.getByLabel('File CSV UTF-8').setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from('student_id,full_name\nSV101,Nguyen A\nSV102,Tran B') })
  await page.getByRole('button', { name: 'Gửi file để xử lý' }).click()
  await expect(page.getByRole('heading', { name: 'Đang chờ xử lý', exact: true })).toBeVisible()
  state.finishJobs = true
  await expect(page.getByText('2 đã nhập · 0 cập nhật · 0 bỏ qua', { exact: true })).toBeVisible()
  expect(state.writes.find(row => row.path === '/import/csv').body).toContain('name="type"')
})

test('server: báo cáo giữ khoảng ngày sang email, planned endpoint báo đúng lỗi', async ({ page }) => {
  const state = await fixture(page); state.checkins.push({ checkin_id: 1, student_id: 'SV001', subject_id: 'WEB301', checkin_date: '2026-11-14', checkin_time: '07:30:00' })
  await login(page); await page.goto('/#/app/reports?course=WEB301&date=2026-11-14')
  await page.getByRole('link', { name: 'Chuẩn bị email →' }).click()
  await expect(page.getByLabel('Từ ngày', { exact: true })).toHaveValue('2026-11-14'); await expect(page.getByLabel('Đến ngày', { exact: true })).toHaveValue('2026-11-14')
  await page.getByRole('button', { name: 'Kiểm tra và gửi báo cáo' }).click(); await page.getByRole('button', { name: 'Gửi cho 1 người nhận' }).click()
  await expect(page.getByRole('heading', { name: 'Đã xử lý', exact: true })).toBeVisible()
  expect(state.writes.find(row => row.path.endsWith('/send-report')).body).toEqual({ date_from: '2026-11-14', date_to: '2026-11-14' })
  await page.route('**/api/v1/subjects/WEB301/attendance-summary*', route => route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Chức năng chưa triển khai trên server.' } } })); await page.goto('/#/app/reports?course=WEB301'); await page.getByRole('tab', { name: 'Tổng hợp học kỳ' }).click()
  await expect(page.getByText('Chức năng chưa triển khai trên server.', { exact: true })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Báo cáo server' })).toHaveCount(0)
})

test('server: màn hình mobile/desktop không tràn, không lỗi runtime và ảnh kiểm tra UX', async ({ page }, info) => {
  await fixture(page); await login(page); const errors = []; page.on('pageerror', error => errors.push(error.message))
  for (const path of ['home', 'courses', 'courses/WEB301', 'students', 'students/SV001', 'attendance?course=WEB301', 'reports?course=WEB301', 'email?course=WEB301', 'admins', 'profile', 'settings']) {
    await page.goto(`/#/app/${path}`); await expect(page.locator('main h1')).toBeVisible(); await expect(page.getByText('Đang tải dữ liệu…', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    if (['home', 'attendance?course=WEB301', 'email?course=WEB301'].includes(path)) await page.screenshot({ path: info.outputPath(`${path.split('?')[0]}-screen.png`), fullPage: true })
  }
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await page.goto('/#/app/courses')
    await expect(page.getByRole('link', { name: 'Phát triển ứng dụng Web', exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`courses-${width}.png`), fullPage: true })
  }
  expect(errors).toEqual([])
})

test('server: đăng nhập lỗi không dùng dữ liệu mẫu, ADMIN chỉ có thao tác đọc tài khoản', async ({ page }) => {
  const state = await fixture(page)
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: 401, json: { error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không chính xác.' } } }))
  await page.goto('/#/app/login'); await page.getByLabel('Email', { exact: false }).fill('sai@test.local'); await page.getByLabel('Mật khẩu', { exact: false }).fill('wrong')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByText('Email hoặc mật khẩu không chính xác.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lịch dạy hôm nay' })).toHaveCount(0)
  await page.unroute('**/api/v1/auth/login')
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: { access_token: 'teacher', refresh_token: 'refresh', admin: { ...actor, role: 'ADMIN' } } }))
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Môn học phụ trách' })).toBeVisible()
  state.actor.role = 'ADMIN'; await page.goto('/#/app/admins'); await expect(page.getByRole('heading', { name: 'Quản trị viên', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Thêm quản trị viên', exact: true })).toHaveCount(0)
  expect(state.writes.some(row => row.path === '/auth/refresh')).toBe(false)
})

test('cấu hình demo mở màn đăng nhập mẫu và không xóa dữ liệu đã lưu', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aegis.data-mode', 'demo')
  })
  await page.goto('/#/app/login')
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('aegis.data-mode'))).toBe('demo')
})
