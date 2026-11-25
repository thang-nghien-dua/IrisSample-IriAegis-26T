/* global window, navigator, DOMException, Blob, document */
import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fixture, login } from './server-fixture.js'
import { fullCameraFixture, startFull, completeActive } from './liveness-fixture.js'
const real = { success: true, result: { is_real: true, real_score: .83, spoof_score: .12 } }
const fake = { success: true, result: { is_real: false, real_score: .01, spoof_score: .98 } }
async function attendance(page) {
  const state = await fixture(page); await login(page); await page.goto('/#/app/attendance?course=WEB301')
  await page.getByRole('button', { name: 'Điểm danh', exact: true }).first().click()
  await page.getByRole('button', { name: 'Chụp ảnh và kiểm tra liveness', exact: true }).click()
  return state
}
test('full: camera permission denied cannot call API or pass', async ({ page }) => {
  let requests = 0; await page.route('**/liveness-api/**', route => { requests++; return route.abort() })
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError') } } }) })
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('alert')).toContainText('Quyền camera đã bị từ chối'); expect(requests).toBe(0)
})
test('full: blink, turns, measured flash, group4 multipart, use image; no automatic checkin', async ({ page }, info) => {
  await fullCameraFixture(page); const requests = []
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', async route => { requests.push({ headers: route.request().headers(), body: route.request().postDataBuffer()?.toString('latin1') }); await route.fulfill({ json: real }) })
  const state = await attendance(page); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
  expect(await page.evaluate(() => window.flashSeen)).toEqual(['red', 'blue'])
  await expect(page.locator('[data-flash-phase]')).toHaveCount(0)
  expect(requests).toHaveLength(1); expect(requests[0].body).toContain('name="image"; filename="face.jpg"'); expect(requests[0].headers.authorization).toBeUndefined()
  expect(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended'))).toBe(true)
  expect(await page.evaluate(() => window.constraintWrites.some(row => row.advanced[0].exposureMode === 'continuous'))).toBe(true)
  await page.screenshot({ path: info.outputPath('full-liveness-completed.png'), fullPage: false })
  await page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true }).click()
  await expect(page.getByText('Ảnh đã qua kiểm tra người thật.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ghi nhận lên server', exact: true })).toBeDisabled()
  expect(state.writes.filter(row => row.path === '/attendance')).toHaveLength(0)
})
test('full: no measured reflection fails before API despite potential REAL', async ({ page }, info) => {
  await fullCameraFixture(page, { reflected: false }); let requests = 0
  await page.route('**/liveness-api/**', route => { requests++; return route.fulfill({ json: real }) })
  await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Phản xạ đỏ/xanh không đạt'); expect(requests).toBe(0)
  await expect(page.getByText('Flash: shift', { exact: false })).toContainText('Mẫu nền/đỏ/xanh:')
  await expect(page.getByRole('alert')).toContainText('phản xạ xanh')
  await expect(page.locator('[data-flash-phase]')).toHaveCount(0)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải số đo ánh sáng (.json)', exact: true }).click()
  const download = await downloading
  const report = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(report.kind).toBe('group4-web-flash-measurement-v1')
  expect(report.flash.failedChecks).toContain('normBlue')
  expect(report.flash.limits.normBlue).toBe(.002)
  expect(report.flash.trace.length).toBeGreaterThanOrEqual(9)
  expect(JSON.stringify(report)).not.toContain('data:image/')
  expect(requests).toBe(0)
  await page.screenshot({ path: info.outputPath('liveness-flash-failure-details.png'), fullPage: true })
})
test('full: MiniVision FAKE and errors never unlock image after active pass', async ({ page }) => {
  await fullCameraFixture(page); let fail = false
  await page.route('**/liveness-api/**', route => route.fulfill({ status: fail ? 503 : 200, json: fail ? { detail: 'Model đang khởi động' } : fake }))
  await attendance(page); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Ảnh chưa đạt kiểm tra người thật')
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toBeDisabled()
  fail = true; await page.getByRole('button', { name: 'Xác thực lại', exact: true }).click(); await completeActive(page, expect)
  await expect(page.getByRole('alert')).toContainText('Dịch vụ xác thực tạm thời chưa sẵn sàng')
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toBeDisabled()
})
test('full: cancel flash removes colors, releases camera and never calls API', async ({ page }) => {
  await fullCameraFixture(page); let requests = 0
  await page.route('**/liveness-api/**', route => { requests++; return route.fulfill({ json: real }) })
  await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect)
  await expect(page.locator('[data-flash-phase=red]')).toBeVisible()
  await page.getByRole('button', { name: 'Hủy xác thực', exact: true }).click()
  await expect(page.locator('[data-flash-phase]')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Đã hủy xác thực'); expect(requests).toBe(0)
  expect(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended'))).toBe(true)
})
test('full: missing hardware lock is reported and measured flash still required', async ({ page }, info) => {
  await fullCameraFixture(page, { locks: false }); await page.route('**/liveness-api/**', route => route.fulfill({ json: real }))
  await attendance(page); await startFull(page); await completeActive(page, expect)
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
  await page.getByText('Thông tin kiểm tra', { exact: true }).click()
  await expect(page.getByText('Camera không xác nhận khóa đủ', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('full-liveness-hardware-limits.png'), fullPage: true })
})
test('full: stale API REAL after cancellation cannot unlock an image', async ({ page }) => {
  await fullCameraFixture(page)
  let release, requests = 0; const pending = new Promise(resolve => { release = resolve })
  await page.route('**/liveness-api/**', async route => { requests++; await pending; await route.fulfill({ json: real }).catch(() => {}) })
  await attendance(page); await startFull(page); await completeActive(page, expect)
  await expect.poll(() => requests).toBe(1)
  await page.getByRole('button', { name: 'Hủy xác thực', exact: true }).click(); release()
  await expect(page.getByRole('status')).toContainText('Đã hủy xác thực')
  await expect(page.getByRole('button', { name: 'Sử dụng ảnh này', exact: true })).toHaveCount(0)
})
test('client: group4 HTTP contract remains identical on WebKit and Chrome', async ({ page }) => {
  let body; await page.route('**/liveness-api/api/v1/ai/anti-spoof', async route => { body = route.request().postDataBuffer()?.toString('latin1'); await route.fulfill({ json: real }) })
  await page.goto('/#/camera')
  const result = await page.evaluate(async () => { const { antiSpoof } = await import('/src/liveness/client.js'); return antiSpoof(new Blob(['fixture'], { type: 'image/jpeg' }), { x: .25, y: .2, w: .5, h: .6 }) })
  expect(result).toMatchObject({ result: 'REAL', is_real: true, real_score: real.result.real_score })
  expect(body).toContain('name="image"; filename="face.jpg"'); expect(body).toContain('name="bbox_w"')
})

test('full: Euler boundary does not cause a false splice; actual jump reports the failing frame', async ({ page }, info) => {
  await fullCameraFixture(page)
  await page.goto('/#/camera')
  await page.evaluate(() => { window.facePose = { roll: 179 } })
  await startFull(page); await expect(page.getByRole('status')).toContainText('1/3')
  await page.evaluate(() => { window.facePose = { roll: -179 } })
  await page.waitForTimeout(450)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate(() => { window.facePose = { roll: -140 } })
  await expect(page.getByRole('alert')).toContainText('Chuyển động nhảy khung')
  await page.getByText('Thông tin kiểm tra', { exact: true }).click()
  await expect(page.getByText('Chênh lệch frame:', { exact: false })).toContainText('39.0°')
  await page.screenshot({ path: info.outputPath('liveness-current-frame-diagnostics.png'), fullPage: true })
})

test('full: brief tracking loss resumes the blink instruction with a fresh pose reference', async ({ page }) => {
  await fullCameraFixture(page); let requests = 0
  await page.route('**/liveness-api/**', route => { requests++; return route.fulfill({ json: real }) })
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('status')).toContainText('1/3')
  await page.evaluate(() => { window.facePose = { count: 0 } })
  await expect(page.getByRole('status')).toContainText('Đưa khuôn mặt')
  await page.evaluate(() => { window.facePose = { pitch: 35 } })
  await expect(page.getByRole('status')).toContainText('1/3')
  await expect(page.getByRole('alert')).toHaveCount(0); expect(requests).toBe(0)
})

test('full: brief profile loss preserves completed blink and resumes turning without a restart', async ({ page }) => {
  await fullCameraFixture(page)
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('status')).toContainText('1/3'); await page.waitForTimeout(400)
  await page.evaluate(() => { window.facePose = { blink: .6 } }); await page.waitForTimeout(180)
  await page.evaluate(() => { window.facePose = {} }); await expect(page.getByRole('status')).toContainText('2/3')
  await page.evaluate(() => { window.facePose = { count: 0 } })
  await expect(page.getByRole('status')).toContainText('Đưa khuôn mặt')
  await page.evaluate(() => { window.facePose = { yaw: -18, nose: .44 } })
  await expect(page.getByRole('status')).toContainText('2/3')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('full: slow frame delivery and CPU fallback still measure all colors before API', async ({ page }) => {
  test.setTimeout(45000)
  await fullCameraFixture(page, { frameMs: 280, locks: false, gpuFailure: true })
  await page.route('**/liveness-api/**', route => route.fulfill({ json: real }))
  await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect, { frameMs: 280 })
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra', { timeout: 10000 })
  await page.getByText('Thông tin kiểm tra', { exact: true }).click()
  await expect(page.getByText('Xử lý: CPU', { exact: false })).toBeVisible()
  await expect(page.getByText('Flash: shift', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => window.flashSeen)).toEqual(['red', 'blue'])
})

test('full: cold GPU warmup earns no challenge progress and does not trigger the frame watchdog', async ({ page }) => {
  await fullCameraFixture(page, { warmupMs: 2100 })
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('status')).toContainText('1/3', { timeout: 10000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => window.flashSeen)).toEqual([])
})

for (const kind of ['missing callback', 'stale metadata']) {
  test(`full: ${kind} uses advancing-video fallback and still requires all liveness stages`, async ({ page }) => {
    await fullCameraFixture(page, { dropCallbacks: kind === 'missing callback', staleMetadata: kind === 'stale metadata' })
    await page.route('**/liveness-api/**', route => route.fulfill({ json: real }))
    await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect)
    await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
    await page.getByText('Thông tin kiểm tra', { exact: true }).click()
    await expect(page.getByText('Nguồn frame: timer', { exact: false })).toBeVisible()
    expect(await page.evaluate(() => window.cameraCalls)).toBe(1)
    expect(await page.evaluate(() => window.flashSeen)).toEqual(['red', 'blue'])
  })
}

test('full: slow live inference does not falsely trip the camera watchdog', async ({ page }) => {
  await fullCameraFixture(page, { inferenceStallMs: 2100 })
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('status')).toContainText('1/3', { timeout: 10000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('full: actual frozen video still fails and exposes frame diagnostics without an API call', async ({ page }, info) => {
  await fullCameraFixture(page, { freezeVideo: true, dropCallbacks: true })
  let requests = 0; await page.route('**/liveness-api/**', route => { requests++; return route.abort() })
  await page.goto('/#/camera'); await startFull(page)
  await expect(page.getByRole('alert')).toContainText('Video bị gián đoạn')
  await expect(page.getByText('Camera: readyState=', { exact: false })).toBeVisible()
  await expect(page.getByText('Camera: readyState=', { exact: false })).toContainText('paused=false; track=live')
  expect(requests).toBe(0)
  expect(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended'))).toBe(true)
  await page.screenshot({ path: info.outputPath('camera-stall-diagnostics.png'), fullPage: true })
})
