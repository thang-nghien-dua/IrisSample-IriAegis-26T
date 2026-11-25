/* global window, XMLSerializer, Image, document, URL, Blob */
import { test, expect } from '@playwright/test'
import { fullCameraFixture, startFull, completeActive } from './liveness-fixture.js'

const real = { success: true, result: { is_real: true, real_score: .9, spoof_score: .01 } }

test('group 4 update: a face too small for the guide cannot start challenges or send an image', async ({ page }) => {
  await fullCameraFixture(page, { diagnostics: false }); let requests = 0
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', route => { requests++; return route.fulfill({ json: real }) })
  await page.goto('/#/camera')
  await page.evaluate(() => { window.facePose = { faceScale: .15 } })
  await startFull(page)
  await expect(page.getByRole('status')).toContainText('Đưa khuôn mặt vào giữa khung')
  await expect(page.locator('.face-guide.detected')).toHaveCount(0)
  expect(requests).toBe(0)
  await page.evaluate(() => { window.facePose = {} })
  await completeActive(page, expect)
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
  expect(requests).toBe(1)
})

test('group 4 update: perimeter stimulus has a transparent face opening and same geometry as its position gate', async ({ page }, info) => {
  await fullCameraFixture(page, { diagnostics: false })
  await page.route('**/liveness-api/api/v1/ai/anti-spoof', route => route.fulfill({ json: real }))
  await page.goto('/#/camera'); await startFull(page); await completeActive(page, expect)
  const overlay = page.locator('.liveness-contour[data-flash-phase]')
  await expect(overlay).toBeVisible()
  const raster = await overlay.evaluate(async element => {
    const { width, height } = element.getBoundingClientRect()
    const clone = element.cloneNode(true); clone.setAttribute('width', width); clone.setAttribute('height', height)
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
    try {
      const image = new Image(); image.src = url; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height)
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
      return { center: [...ctx.getImageData(Math.floor(width * .5), Math.floor(height * .42), 1, 1).data],
        perimeter: [...ctx.getImageData(15, 15, 1, 1).data], color: element.getAttribute('data-flash-phase'), width, height }
    } finally { URL.revokeObjectURL(url) }
  })
  expect(raster.center[3]).toBe(0)
  expect(raster.perimeter).toEqual(raster.color === 'red' ? [255, 0, 0, 255] : [0, 0, 255, 255])
  const bounds = await page.locator('.viewport').boundingBox()
  expect(raster.width).toBeCloseTo(bounds.width); expect(raster.height).toBeCloseTo(bounds.height)
  await page.screenshot({ path: info.outputPath('perimeter-flash.png') })
  await expect(page.getByRole('status')).toContainText('Đã hoàn tất kiểm tra')
})
