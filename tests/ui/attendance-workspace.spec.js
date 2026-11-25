/* global localStorage, getComputedStyle, document, window */
import { test, expect } from '@playwright/test'
import { fixture, login as serverLogin } from './server-fixture.js'
test.use({ locale: 'vi-VN' })

async function login(page) {
  await page.addInitScript(() => localStorage.setItem('aegis.data-mode', 'demo'))
  await page.goto('/#/app/login'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hôm nay', exact: true })).toBeVisible()
  await page.goto('/#/app/attendance?course=WEB301')
  await expect(page.getByRole('heading', { name: 'Điểm danh', exact: true })).toBeVisible()
}

test('iPhone: danh sách xuất hiện sớm, dòng gọn, filter thật và ngày không xuống hàng', async ({ page }, info) => {
  await page.setViewportSize({ width: 393, height: 680 })
  await login(page)
  const table = page.getByRole('table', { name: 'Danh sách điểm danh' })
  await expect(table).toBeVisible()
  const first = table.getByRole('row').nth(1)
  const bounds = await first.boundingBox()
  expect(bounds.y).toBeLessThan(365)
  expect(bounds.height).toBeLessThan(100)
  await expect(page.getByLabel('Ngày học', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('iphone-attendance-393.png') })
  await page.getByRole('button', { name: 'Chưa ghi nhận (5)', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(6)
  await expect(table).not.toContainText('Nguyễn An Bình')
  await page.getByRole('button', { name: 'Đã ghi nhận (3)', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(4)
  await expect(table.getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0)
  const change = page.getByRole('button', { name: 'Đổi buổi học' })
  await change.click()
  const date = page.getByLabel('Ngày học', { exact: true })
  await expect(date).toHaveAttribute('type', 'date')
  expect(await date.locator('..').evaluate(e => e.getBoundingClientRect().height)).toBe(44)
  expect((await page.getByLabel('Ca học', { exact: true }).boundingBox()).height).toBe(44)
  expect(await date.locator('..').locator('span').evaluate(e => getComputedStyle(e).whiteSpace)).toBe('nowrap')
  await page.getByLabel('Môn học', { exact: true }).selectOption('CSDL201')
  await page.screenshot({ path: info.outputPath('iphone-session-picker.png') })
  await page.getByRole('button', { name: 'Xem danh sách lớp' }).click()
  await expect(change).toContainText('Cơ sở dữ liệu')
  await expect(change).toBeFocused()
  await page.getByRole('button', { name: 'Tất cả (4)', exact: true }).click()
  await expect(table).toContainText('Phạm Quốc Huy')
})

test('API: đổi môn/ngày trong sheet vẫn tải đúng danh sách', async ({ page }, info) => {
  const state = await fixture(page); await serverLogin(page)
  await page.setViewportSize({ width: 393, height: 680 })
  await page.goto('/#/app/attendance?course=WEB301')
  const change = page.getByRole('button', { name: 'Đổi buổi học' })
  await expect(change).toContainText('Phát triển ứng dụng Web')
  await expect(page.getByRole('row').filter({ hasText: 'SV001' })).toBeVisible()
  await change.click()
  await expect(page.getByRole('table', { name: 'Danh sách điểm danh' })).toHaveCount(0)
  await page.getByLabel('Ngày điểm danh', { exact: true }).fill('2026-11-01')
  await page.getByRole('button', { name: 'Xem danh sách lớp' }).click()
  await expect(change).toContainText('01/11/2026')
  await page.screenshot({ path: info.outputPath('iphone-api-attendance.png') })
  expect(state.violations).toEqual([])
})

test('Server: roster waits for confirmation while choosing the subject and date', async ({ page }, info) => {
  const state = await fixture(page); await serverLogin(page)
  const roster = page.getByRole('table', { name: 'Danh sách điểm danh' })
  for (const width of [390, 360, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
    await page.goto('/#/app/attendance?course=WEB301')
    const change = page.getByRole('button', { name: 'Đổi buổi học' })
    await expect(roster).toBeVisible()
    await change.click()
    await expect(roster).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.screenshot({ path: info.outputPath(`server-attendance-session-${width}.png`) })
    await page.getByRole('button', { name: 'Xem danh sách lớp' }).click()
    await expect(roster).toBeVisible()
  }
  expect(state.violations).toEqual([])
})

test('workspace: bố cục home, lớp, điểm danh và form không tràn từ 360px tới desktop', async ({ page }, info) => {
  await login(page)
  for (const width of [360, 393, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 680 })
    for (const [route, heading] of [['home', 'Hôm nay'], ['courses', 'Môn học'], ['attendance?course=WEB301', 'Điểm danh']]) {
      await page.goto(`/#/app/${route}`)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      await page.screenshot({ path: info.outputPath(`${route.split('?')[0]}-${width}.png`) })
    }
  }
  await page.setViewportSize({ width: 393, height: 680 })
  await page.goto('/#/app/students')
  await page.getByRole('button', { name: 'Thêm sinh viên', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({ path: info.outputPath('iphone-student-form.png') })
})
