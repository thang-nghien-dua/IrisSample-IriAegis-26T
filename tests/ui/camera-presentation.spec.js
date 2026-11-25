/* global localStorage, window */
import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fullCameraFixture, startFull, completeActive } from './liveness-fixture.js'

test.use({ viewport: { width: 393, height: 844 } })
async function openAttendanceCamera(page) {
  await page.addInitScript(() => localStorage.setItem('aegis.data-mode', 'demo'))
  await page.goto('/#/app/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hôm nay', exact: true })).toBeVisible()
  await page.goto('/#/app/attendance?course=WEB301')
  await page.getByRole('row').filter({ hasText: 'Phạm Quốc Huy' }).getByRole('button', { name: 'Điểm danh', exact: true }).click()
  await page.getByLabel('Mật khẩu điểm danh', { exact: false }).fill('123456')
  await page.getByRole('button', { name: 'Tiếp tục đến camera', exact: true }).click()
}

test('normal camera hides diagnostic/bypass UI, keeps consent and fits the main action', async ({ page }, info) => {
  await openAttendanceCamera(page)
  await expect(page.getByRole('heading', { name: 'Xác thực khuôn mặt', exact: true })).toBeVisible()
  await expect(page.locator('.portal-steps, .liveness-steps, .liveness-details, .portal-camera-tools')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Dùng kịch bản không camera (giả lập)' })).toHaveCount(0)
  await expect(page.locator('.face-guide')).toBeVisible()
  const start = page.getByRole('button', { name: 'Bắt đầu xác thực', exact: true })
  await expect(start).toBeDisabled()
  await page.getByLabel('Tôi đồng ý dùng ánh sáng đỏ/xanh', { exact: false }).check()
  await expect(start).toBeEnabled()
  const bounds = await start.boundingBox()
  expect(bounds.y + bounds.height).toBeLessThan(844)
  await page.screenshot({ path: info.outputPath('camera-normal-iphone.png') })
})

test('diagnostics are explicitly enabled in local dev; test bypass remains labelled', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aegis.camera-diagnostics', 'true'))
  await openAttendanceCamera(page)
  await expect(page.getByText('Thông tin kiểm tra', { exact: true })).toBeVisible()
  await page.getByText('Kiểm thử giao diện', { exact: true }).click()
  await page.getByRole('button', { name: 'Dùng kịch bản không camera (giả lập)' }).click()
  await expect(page.getByLabel('Kịch bản liveness / đối sánh')).toBeVisible()
  await expect(page.getByText('Đối sánh danh tính trong chế độ Demo.', { exact: true })).toBeVisible()
})

test('normal mode still rejects FAKE and allows REAL only after every active challenge', async ({ page }, info) => {
  await fullCameraFixture(page, { diagnostics: false, locks: false })
  let isReal = false, requests = 0
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', route => {
    requests++
    return route.fulfill({ json: { success: true, result: { is_real: isReal, real_score: isReal ? .9 : .01, spoof_score: isReal ? .01 : .9 } } })
  })
  await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Ảnh chưa đạt kiểm tra người thật')
  await expect(page.locator('.liveness-details, .liveness-disclosure, .passive-test-link')).toHaveCount(0)
  expect(await page.evaluate(() => window.flashSeen)).toEqual(['red', 'blue'])
  isReal = true
  await page.getByRole('button', { name: 'Xác thực lại', exact: true }).click()
  await completeActive(page, expect)
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
  expect(requests).toBe(2)
  expect(await page.evaluate(() => window.testTracks.every(t => t.readyState === 'ended'))).toBe(true)
  await page.screenshot({ path: info.outputPath('camera-clean-result.png') })
})

test('iPhone-sized attendance reports rejected reflection without exposing the debug panel or calling MiniVision', async ({ page }, info) => {
  await fullCameraFixture(page, { reflected: false, diagnostics: false, locks: false })
  let requests = 0
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', route => { requests++; return route.abort() })
  await openAttendanceCamera(page)
  await startFull(page); await completeActive(page, expect)
  const overlay = page.locator('[data-flash-phase]')
  await expect(overlay).toBeVisible()
  const display = await overlay.boundingBox()
  const viewport = await page.locator('.viewport').boundingBox()
  expect(display.x).toBeCloseTo(viewport.x); expect(display.y).toBeCloseTo(viewport.y)
  expect(display.width).toBeCloseTo(viewport.width); expect(display.height).toBeCloseTo(viewport.height)
  await expect(page.getByRole('alert')).toContainText('Chưa đo được phản xạ ánh sáng')
  await expect(page.locator('.liveness-details')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('camera-reflection-support.png'), fullPage: true })
  await page.getByRole('button', { name: 'Xác thực lại', exact: true }).click()
  await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Chưa đo được phản xạ ánh sáng')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Lưu thông tin lỗi', exact: true }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('iriaegis-camera-support.json')
  const report = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(report.kind).toBe('iris-aegis-flash-support-v1')
  expect(report.checks).toHaveLength(2)
  for (const check of report.checks) {
    expect(check.flash.passed).toBe(false)
    expect(check.flash.failedChecks).toEqual(['shift', 'normRed', 'normBlue', 'colorOrder'])
    expect(check.flash.limits).toEqual({ shift: .018, normRed: .002, normBlue: .002 })
    expect(check.flash.profile.sourceRevision).toBe('a9be597ba66f99d9f117871ef17d9da234780c81')
    expect(check.flash.presentations.map(row => row.color)).toEqual(['red', 'blue', 'off'])
    expect(check.flash.presentations[0].display.width).toBeCloseTo(viewport.width)
    expect(check.flash.presentations[0].display.shape).toBe('face-contour-perimeter')
    expect(check.flash.trace.length).toBeGreaterThanOrEqual(9)
    expect(check.cameraLock).toEqual({ exposure: false, whiteBalance: false })
    expect(check).not.toHaveProperty('photo')
    expect(check).not.toHaveProperty('account')
  }
  expect(JSON.stringify(report)).not.toContain('Phạm Quốc Huy')
  expect(JSON.stringify(report)).not.toContain('data:image')
  expect(requests).toBe(0)
})

test('gateway failure after flash stays unverified, shows Vietnamese guidance and permits a fresh attempt', async ({ page }, info) => {
  await fullCameraFixture(page, { diagnostics: false })
  let recovered = false, requests = 0
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', route => {
    requests++
    return recovered ? route.fulfill({ json: { success: true, result: { is_real: true, real_score: .9, spoof_score: .01 } } })
      : route.fulfill({ status: 520, json: { detail: 'The origin web server returned an invalid or incomplete response to Cloudflare.' } })
  })
  await openAttendanceCamera(page); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Kết nối đến dịch vụ xác thực bị gián đoạn. Hãy thử lại.')
  await expect(page.getByText('The origin web server', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toBeDisabled()
  expect(requests).toBe(1)
  await page.screenshot({ path: info.outputPath('camera-gateway-error.png') })
  recovered = true
  await page.getByRole('button', { name: 'Xác thực lại', exact: true }).click()
  await completeActive(page, expect)
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toBeEnabled()
  expect(requests).toBe(2)
})
