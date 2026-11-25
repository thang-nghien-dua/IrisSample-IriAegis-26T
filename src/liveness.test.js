import test from 'node:test'
import assert from 'node:assert/strict'
import { antiSpoof, bboxFields, normalizeBox } from './liveness/client.js'
import { getLivenessCrop } from './liveness/face-crop.js'

// Response bodies copied from group 4 FastAPI @ bfdc35a run locally on 25/11/2026.
const real = { success: true, result: { is_real: true, real_score: 0.83, spoof_score: 0.12, raw_logits: [0, 0, 0], probs: [0, 0, 0] } }
const blob = new Blob(['jpeg-test-fixture'], { type: 'image/jpeg' })
const box = { x: 0.3, y: 0.08, w: 0.35, h: 0.45 }
const capture = () => { const calls = []; return { calls, fetcher: body => async (url, options) => { calls.push({ url, ...options }); return Response.json(body) } } }

test('group 4 v1.2: anti-spoof gửi multipart image + bbox, không JWT, không tự chọn ngưỡng', async () => {
  const { calls, fetcher } = capture()
  const result = await antiSpoof(blob, box, { baseURL: '/liveness-api', fetcher: fetcher(real) })
  assert.equal(calls[0].url, '/liveness-api/api/v1/ai/anti-spoof')
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(Object.keys(calls[0].headers), ['Accept'])
  assert.deepEqual([...calls[0].body.keys()], ['image', 'bbox_x', 'bbox_y', 'bbox_w', 'bbox_h'])
  assert.equal(calls[0].body.get('image').name, 'face.jpg')
  assert.equal(calls[0].body.get('bbox_w'), '0.3500')
  assert.deepEqual({ result: result.result, is_real: result.is_real, real_score: result.real_score }, { result: 'REAL', is_real: true, real_score: 0.83 })
})

test('group 4 v1.2: FAKE là kết luận server; dữ liệu sai kiểu không được công nhận', async () => {
  const fake = { success: true, result: { is_real: false, real_score: 0.262276, spoof_score: 0.492951 } }
  const result = await antiSpoof(blob, box, { fetcher: async () => Response.json(fake) })
  assert.equal(result.is_real, false); assert.equal(result.result, 'FAKE'); assert.equal(result.real_score, 0.262)
  for (const bad of [{}, { success: true }, { success: true, result: { is_real: 'true', real_score: 0.5, spoof_score: 0.1 } }, { success: true, result: { is_real: true, real_score: 1.2, spoof_score: 0 } }]) {
    await assert.rejects(antiSpoof(blob, box, { fetcher: async () => Response.json(bad) }), /không hợp lệ/)
  }
})

test('group 4 v1.2: bbox là tỉ lệ 0..1 của khung gốc', () => {
  assert.deepEqual(normalizeBox({ originX: 216, originY: 256, width: 288, height: 512 }, 720, 1280), { x: 0.3, y: 0.2, w: 0.4, h: 0.4 })
  assert.throws(() => bboxFields({ x: 0.9, y: 0, w: 0.5, h: 0.5 }), /ngoài ảnh/)
  assert.throws(() => bboxFields(null), /hợp lệ/)
})

test('group 4: lỗi HTTP, mạng, timeout và hủy không tạo kết quả đạt', async () => {
  const call = fetcher => antiSpoof(blob, box, { fetcher })
  await assert.rejects(call(async () => Response.json({ detail: 'Không kết nối được dịch vụ liveness.' }, { status: 502 })), /Kết nối đến dịch vụ xác thực bị gián đoạn/)
  await assert.rejects(call(async () => Response.json({ detail: 'Model unavailable' }, { status: 503 })), /tạm thời chưa sẵn sàng/)
  await assert.rejects(call(async () => Response.json({ detail: [{ type: 'missing' }] }, { status: 422 })), /thiếu dữ liệu/)
  await assert.rejects(call(async () => { throw new TypeError('Offline') }), /Không kết nối được/)
  const hanging = (_, { signal }) => new Promise((resolve, reject) => { if (signal.aborted) reject(signal.reason); else signal.addEventListener('abort', () => reject(signal.reason), { once: true }) })
  await assert.rejects(antiSpoof(blob, box, { fetcher: hanging, timeout: 5 }), /phản hồi quá lâu/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(antiSpoof(blob, box, { signal: controller.signal, fetcher: hanging }), { name: 'AbortError' })
  await assert.rejects(call(async () => Response.json({ detail: 'Lỗi xử lý hệ thống: private stack trace' }, { status: 500 })), failure => failure.status === 500 && !failure.message.includes('private'))
  await assert.rejects(call(async () => new Response('<html>no verdict</html>', { status: 200 })), /không hợp lệ/)
})

test('group 4: không gửi file rỗng/sai MIME; crop 2.7 theo notebook, không vượt ảnh', async () => {
  await assert.rejects(antiSpoof(new Blob([]), box), /JPEG\/PNG/)
  assert.deepEqual(getLivenessCrop({ originX: 100, originY: 50, width: 100, height: 100 }, 640, 480), { x: 15, y: 0, width: 271, height: 236 })
  const crop = getLivenessCrop({ originX: 0, originY: 0, width: 300, height: 450 }, 640, 480)
  assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= 640 && crop.y + crop.height <= 480)
  assert.throws(() => getLivenessCrop(null, 640, 480))
})
