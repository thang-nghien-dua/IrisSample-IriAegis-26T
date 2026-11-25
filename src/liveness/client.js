// Group 4 FastAPI v1.2: Long965/IrisSample-IriAegis-26T @ bfdc35a
// (branch task1.2_API_Liveness_detection, liveness_backend/main.py).
// Agreed with group 4 (25/11/2026): the Web only asks REAL/FAKE. Blink, turn and
// red/blue flash run in the browser; students, face samples and check-ins belong
// to group 1. No group 1 JWT is sent; the verdict is always the server's.
export const LIVENESS_BASE_URL = import.meta.env?.VITE_LIVENESS_BASE_URL || '/liveness-api'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png']
const aborted = () => new DOMException('Đã hủy kiểm tra', 'AbortError')

/** Face box as fractions (0..1) of the unmirrored camera frame, as group 4 expects. */
export function bboxFields(bbox) {
  const keys = ['x', 'y', 'w', 'h']
  if (!bbox || !keys.every(key => Number.isFinite(bbox[key]))) throw new Error('Chưa có vùng khuôn mặt hợp lệ để gửi xác thực.')
  const { x, y, w, h } = bbox
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) throw new Error('Vùng khuôn mặt nằm ngoài ảnh camera.')
  return Object.fromEntries(keys.map(key => [`bbox_${key}`, bbox[key].toFixed(4)]))
}

/** Video-pixel MediaPipe box → fractions of the same frame. */
export function normalizeBox(box, width, height) {
  if (!box || !(width > 0) || !(height > 0)) throw new Error('Chưa có vùng khuôn mặt hợp lệ để gửi xác thực.')
  const x = Math.max(0, box.originX / width), y = Math.max(0, box.originY / height)
  return { x, y, w: Math.min(1 - x, box.width / width), h: Math.min(1 - y, box.height / height) }
}

function checkImage(blob, label = 'Ảnh') {
  if (!(blob instanceof Blob) || !IMAGE_TYPES.includes(blob.type) || !blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error(`${label} gửi xác thực phải là JPEG/PNG, tối đa 5 MB.`)
  return blob
}

function errorMessage(status, data) {
  const gateway = [502, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530].includes(status)
  if (gateway) return 'Kết nối đến dịch vụ xác thực bị gián đoạn. Hãy thử lại.'
  if (status === 503) return 'Dịch vụ xác thực tạm thời chưa sẵn sàng. Hãy thử lại sau.'
  if (status >= 500) return 'Dịch vụ xác thực đang gặp lỗi. Hãy thử lại sau.'
  if (status === 422) return 'Yêu cầu gửi dịch vụ xác thực thiếu dữ liệu. Hãy thử lại.'
  return typeof data?.detail === 'string' ? data.detail : 'Không gửi được ảnh để xác thực. Hãy thử lại.'
}

export async function group4Request(path, { method = 'GET', form, signal, fetcher = globalThis.fetch, baseURL = LIVENESS_BASE_URL, timeout = 20000 } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeout)
  try {
    const response = await fetcher(baseURL.replace(/\/$/, '') + path, {
      method, headers: { Accept: 'application/json' }, ...(form ? { body: form } : {}), signal: controller.signal,
    })
    if (signal?.aborted) throw aborted()
    const data = await response.json().catch(() => null)
    if (signal?.aborted) throw aborted()
    if (!response.ok) { const failure = new Error(errorMessage(response.status, data)); failure.status = response.status; throw failure }
    if (!data || typeof data !== 'object') throw new Error('Dịch vụ xác thực trả kết quả không hợp lệ.')
    return data
  } catch (error) {
    if (signal?.aborted) throw aborted()
    if (timedOut) throw new Error('Dịch vụ xác thực phản hồi quá lâu. Hãy thử lại.', { cause: error })
    if (error instanceof TypeError) throw new Error('Không kết nối được dịch vụ xác thực. Hãy thử lại.', { cause: error })
    throw error
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}

const score = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const round = value => score(value) ? Math.round(value * 1000) / 1000 : null

/**
 * POST /api/v1/ai/anti-spoof: MiniVision on the server, 2.7x crop around bbox.
 * Returns the shape older Web code reads: { result, is_real, real_score, spoof_score }.
 */
export async function antiSpoof(image, bbox, options) {
  const form = new FormData()
  form.append('image', checkImage(image), image.type === 'image/png' ? 'face.png' : 'face.jpg')
  for (const [key, value] of Object.entries(bboxFields(bbox))) form.append(key, value)
  const data = await group4Request('/api/v1/ai/anti-spoof', { ...options, method: 'POST', form })
  const result = data?.result
  if (data?.success !== true || typeof result?.is_real !== 'boolean' || !score(result.real_score) || !score(result.spoof_score)) throw new Error('API liveness trả kết quả không hợp lệ. Chưa thể xác nhận liveness.')
  return Object.freeze({ kind: 'anti-spoof', status: 'success', result: result.is_real ? 'REAL' : 'FAKE', is_real: result.is_real,
    real_score: round(result.real_score), spoof_score: round(result.spoof_score), threshold_used: null,
    message: result.is_real ? '' : 'Ảnh chưa đạt kiểm tra người thật. Hãy dùng khuôn mặt trực tiếp và thử lại.' })
}
