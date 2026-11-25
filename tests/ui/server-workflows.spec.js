/* global document, window */
import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { fixture, login } from './server-fixture.js'

const day = '2026-11-17'
const receipt = (id, student = 'SV001') => ({ checkin_id: id, student_id: student, subject_id: 'WEB301', checkin_date: day, checkin_time: '07:30:00' })

test('server workflow: roster reads all receipts; successful recording returns to refreshed roster', async ({ page }, info) => {
  const state = await fixture(page)
  // More than one request page, with the visible student's receipt on page two.
  state.checkins = Array.from({ length: 101 }, (_, i) => receipt(i + 1, 'SV030'))
  state.checkins.push(receipt(102))
  await login(page); await page.goto('/#/app/attendance?course=WEB301')
  await page.getByRole('button', { name: 'Đổi buổi học', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Danh sách điểm danh' })).toHaveCount(0)
  await page.getByLabel('Ngày điểm danh', { exact: true }).fill(day)
  await page.getByRole('button', { name: 'Xem danh sách lớp', exact: true }).click()
  const roster = page.getByRole('table', { name: 'Danh sách điểm danh' })
  await expect(roster).toBeVisible()
  const recorded = roster.getByRole('row').filter({ hasText: 'Sinh viên kiểm thử 01' })
  await expect(recorded).toContainText('Đã ghi nhận')
  await expect(recorded.getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0)
  const next = roster.getByRole('row').filter({ hasText: 'Sinh viên kiểm thử 02' })
  await next.getByRole('button', { name: 'Điểm danh', exact: true }).click()
  await page.getByLabel('Tôi xác nhận sinh viên có mặt').check()
  await page.getByRole('button', { name: 'Ghi nhận lên server', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đã ghi nhận điểm danh', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Điểm danh sinh viên khác', exact: true }).click()
  await expect(next).toContainText('Đã ghi nhận')
  await expect(roster).toBeVisible()
  await page.screenshot({ path: info.outputPath('server-attendance.png'), fullPage: true })
  expect(state.violations).toEqual([])
})

test('server workflow: full CSV includes every page and student statistics use existing endpoints', async ({ page }, info) => {
  const state = await fixture(page)
  state.checkins = Array.from({ length: 128 }, (_, i) => receipt(i + 1))
  await login(page); await page.goto(`/#/app/reports?course=WEB301&date=${day}`)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất toàn bộ CSV', exact: true }).click()
  const file = await downloading
  const csv = await readFile(await file.path(), 'utf8')
  expect(csv.trim().split(/\r?\n/)).toHaveLength(129)
  expect(csv.match(/SV001/g)).toHaveLength(128)
  await page.getByRole('button', { name: 'Thống kê', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('table', { name: 'Lịch sử sinh viên' })).toContainText('07:30:00')
  await expect(dialog).toContainText('100%')
  await expect(dialog.getByText('1–25 / 128', { exact: false })).toBeVisible()
  await page.screenshot({ path: info.outputPath('server-student-statistics.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thống kê', exact: true }).first()).toBeFocused()
  expect(state.violations).toEqual([])
})

test('server workflow: CSV failure and cancellation never download partial data', async ({ page }) => {
  const state = await fixture(page); state.checkins = Array.from({ length: 125 }, (_, i) => receipt(i + 1))
  await login(page); await page.goto(`/#/app/reports?course=WEB301&date=${day}`)
  const downloads = []; page.on('download', file => downloads.push(file))
  await page.route('**/api/v1/attendance?**', route => {
    const query = new URL(route.request().url()).searchParams
    return query.get('offset') === '100' ? route.fulfill({ status: 503, json: { error: { code: 'TEMPORARY', message: 'Trang tiếp theo chưa tải được.' } } }) : route.fallback()
  })
  await page.getByRole('button', { name: 'Xuất toàn bộ CSV', exact: true }).click()
  await expect(page.getByText('Trang tiếp theo chưa tải được.', { exact: true })).toBeVisible()
  expect(downloads).toHaveLength(0)
  let release
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/api/v1/attendance?**', async route => {
    if (new URL(route.request().url()).searchParams.get('limit') !== '100') return route.fallback()
    await held; await route.fallback().catch(() => {})
  })
  await page.getByRole('button', { name: 'Xuất toàn bộ CSV', exact: true }).click()
  await page.getByRole('button', { name: 'Hủy xuất', exact: true }).click(); release()
  await expect(page.getByRole('button', { name: 'Hủy xuất', exact: true })).toHaveCount(0)
  expect(downloads).toHaveLength(0)
})

test('server workflow: report-email-back preserves filters and selection persists with partial failure', async ({ page }, info) => {
  const state = await fixture(page)
  state.recipients.push({ email_id: 2, subject_id: 'WEB301', email_address: 'teacher@test.local', recipient_name: 'Giảng viên', is_selected: true })
  await login(page)
  await page.goto(`/#/app/reports?course=WEB301&tab=history&date_from=2026-11-01&date_to=${day}&student_id=SV001&sort=checkin_time`)
  await page.getByRole('link', { name: 'Chuẩn bị email →' }).click()
  state.failRecipientEmail = 'teacher@test.local'
  await page.getByLabel('Chọn tất cả người nhận', { exact: true }).click()
  await expect(page.getByText(/Đã cập nhật 1\/2 người nhận/)).toBeVisible()
  await expect(page.getByLabel('Chọn daotao@test.local', { exact: true })).not.toBeChecked()
  await expect(page.getByLabel('Chọn teacher@test.local', { exact: true })).toBeChecked()
  await page.getByLabel('Chọn tất cả người nhận', { exact: true }).click()
  await expect(page.getByLabel('Chọn daotao@test.local', { exact: true })).toBeChecked()
  await page.getByLabel('Chọn tất cả người nhận', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Kiểm tra và gửi báo cáo', exact: true })).toBeDisabled()
  await page.getByLabel('Chọn teacher@test.local', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Kiểm tra và gửi báo cáo', exact: true })).toBeEnabled()
  await page.screenshot({ path: info.outputPath('server-email.png'), fullPage: true })
  await page.getByRole('link', { name: '← Quay lại báo cáo', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Lịch sử', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('Từ ngày', { exact: true })).toHaveValue('2026-11-01')
  await page.getByText('Lọc sinh viên và sắp xếp', { exact: true }).click()
  await expect(page.getByLabel('Mã sinh viên cần lọc', { exact: true })).toHaveValue('SV001')
  await expect(page.getByLabel('Sắp xếp lịch sử', { exact: true })).toHaveValue('checkin_time')
  expect(state.violations).toEqual([])
})

test('server workflow: recipient CSV validates, skips duplicates, keeps partial success and retries pending only', async ({ page }, info) => {
  const state = await fixture(page); await login(page); await page.goto('/#/app/email?course=WEB301')
  await page.getByRole('button', { name: 'Nhập CSV', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const upload = async text => dialog.getByLabel('File CSV người nhận', { exact: true }).setInputFiles({ name: 'recipients.csv', mimeType: 'text/csv', buffer: Buffer.from(text) })
  await upload('email_address\na@test.local\nbad-email')
  await expect(dialog).toContainText('email không hợp lệ')
  expect(state.writes.filter(row => row.method === 'POST' && row.path.endsWith('/email-recipients'))).toHaveLength(0)
  await upload('email_address,recipient_name,is_selected\ndaotao@test.local,Đã có,true\na@test.local,Người A,true\nA@test.local,Trùng,true\nb@test.local,Người B,false\nc@test.local,Người C,true')
  state.failRecipientEmail = 'b@test.local'
  await dialog.getByRole('button', { name: 'Nhập 3 người nhận', exact: true }).click()
  await expect(dialog).toContainText('Đã dừng nhập.')
  await expect(dialog).toContainText('1 đã thêm · 2 bỏ qua · 2 chưa nhập')
  await page.screenshot({ path: info.outputPath('server-recipient-import.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Thử lại các dòng chưa nhập', exact: true }).click()
  await expect(dialog).toContainText('3 đã thêm · 2 bỏ qua · 0 chưa nhập')
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Người nhận báo cáo' })).toContainText('c@test.local')
  const writes = state.writes.filter(row => row.method === 'POST' && row.path.endsWith('/email-recipients'))
  expect(writes.map(row => row.body.email_address)).toEqual(['a@test.local', 'b@test.local', 'b@test.local', 'c@test.local'])
  expect(state.recipients.find(row => row.email_address === 'b@test.local').is_selected).toBe(false)
  expect(state.violations).toEqual([])
})

test('server workflow: report date range and recipient import fit narrow screens', async ({ page }, info) => {
  await fixture(page); await login(page)
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/#/app/email?course=WEB301&date_from=2026-11-01&date_to=${day}`)
    await expect(page.getByRole('table', { name: 'Người nhận báo cáo' })).toBeVisible()
    const from = await page.getByLabel('Từ ngày', { exact: true }).boundingBox(), to = await page.getByLabel('Đến ngày', { exact: true }).boundingBox()
    expect(Math.abs(from.y - to.y)).toBeLessThan(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.screenshot({ path: info.outputPath(`server-email-${width}.png`), fullPage: true })
  }
})
