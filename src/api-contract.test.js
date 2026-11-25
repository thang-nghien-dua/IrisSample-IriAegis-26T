import test from 'node:test'
import assert from 'node:assert/strict'
import { requestErrors, responseErrors } from '../scripts/openapi-contract.mjs'
import { audit } from '../scripts/audit-api.mjs'
import { API_PROFILE, attendanceBody, changePasswordBody, entityBody, loginBody, reportBody, resetBody, sortValue } from './server/contract.js'

test('mọi operation Web có vị trí triển khai; không có mapping endpoint tự tạo', () => {
  const result = audit(); assert.deepEqual(result.missing, []); assert.deepEqual(result.extra, []); assert.equal(result.excluded.length, 3)
})
test('payload theo YAML khi profile openapi được chọn tường minh', () => {
  const cases = [
    ['/auth/login', loginBody('GV001', 'secret')], ['/auth/login', loginBody('a@school.test', 'secret')],
    ['/auth/reset-password', resetBody('a@school.test', 'token', 'new-password', 'new-password', 'openapi')],
    ['/auth/change-password', changePasswordBody('old-pass', 'new-password', 'new-password', 'openapi')],
    ['/auth/register', entityBody('admins', { full_name: 'Nguyễn An', email: 'a@school.test', password: 'new-password', role: 'SUPER_ADMIN', admin_code: '' }, { role: 'SUPER_ADMIN', repeat: 'new-password', profile: 'openapi' })],
    ['/subjects', entityBody('courses', { subject_id: 'IT01', subject_name: 'Cơ sở dữ liệu', subject_status: 'ASSIGNED', instructor_id: 'ADM1', uuid: 'must-not-send' }, { role: 'SUPER_ADMIN' })],
    ['/students', entityBody('students', { student_id: 'SV01', full_name: 'Nguyễn An', role: 'SUPER_ADMIN', face_embedding: [1] }, { subjectId: 'IT01' })],
    ['/attendance', attendanceBody({ student_id: 'SV01', subject_id: 'IT01', checkin_date: '2026-11-15', checkin_time: '07:30:00', uuid: '00000000-0000-4000-8000-000000000001', device_id: 'old-field', liveness: true })],
    ['/subjects/IT01/send-report', reportBody('', '')],
  ]
  for (const [path, body] of cases) assert.deepEqual(requestErrors('POST', path, { body }), [], path)
  assert.deepEqual(requestErrors('PUT', '/students/SV01', { body: entityBody('students', { student_id: 'SV01', full_name: 'An', checkin_password: 'must-not-send' }, { editing: true }) }), [])
})
test('validator bắt endpoint lạ, trường thừa, thiếu required, sai enum/type và response thiếu', () => {
  assert.ok(requestErrors('POST', '/face/match', { body: {} }).length)
  assert.ok(requestErrors('POST', '/auth/change-password', { body: { current_password: 'a', new_password: '123456', old_password: 'a' } }).length)
  assert.ok(requestErrors('POST', '/auth/register', { body: { email: 'bad', password: '123', full_name: 'A', role: 'STUDENT' } }).length)
  assert.ok(requestErrors('GET', '/checkins', { query: new URLSearchParams({ date: '2026-11-15' }) }).length)
  assert.ok(responseErrors('GET', '/students', 200, { items: [] }).length)
})
test('profile mặc định theo source Nhóm 1 và YAML chỉ bật tường minh', () => {
  assert.equal(API_PROFILE, 'legacy-source')
  assert.deepEqual(changePasswordBody('old', 'new-password', 'new-password'), { old_password: 'old', new_password: 'new-password', confirm_password: 'new-password' })
  assert.deepEqual(resetBody('a@b.test', '123', 'new-password', 'new-password'), { email: 'a@b.test', token: '123', new_password: 'new-password', confirm_password: 'new-password' })
  assert.deepEqual(entityBody('admins', { full_name: 'Nguyễn An', email: 'a@b.test', password: 'new-password', admin_code: 'GV01', admin_id: 'ignored', role: 'SUPER_ADMIN' }, { role: 'SUPER_ADMIN', repeat: 'new-password' }), {
    full_name: 'Nguyễn An', email: 'a@b.test', password: 'new-password', admin_code: 'GV01', role: 'ADMIN', confirm_password: 'new-password',
  })
  assert.equal(sortValue('-full_name'), 'full_name:desc')
  assert.equal(sortValue('-full_name', 'openapi'), '-full_name')
  assert.deepEqual(reportBody('', '2026-11-15'), { date_to: '2026-11-15' })
})
test('ghi nhận mâu thuẫn thật trong YAML thay vì giả định hai định nghĩa giống nhau', () => {
  const body = { student_id: 'SV01', full_name: 'Nguyễn An', checkin_password: '123456' }
  assert.deepEqual(requestErrors('POST', '/students', { body, variant: 0 }), [])
  assert.ok(requestErrors('POST', '/students', { body, variant: 1 }).some(error => error.includes('checkin_password')))
  const checkin = { student_id: 'SV01', subject_id: 'IT01', uuid: '00000000-0000-4000-8000-000000000001' }
  assert.deepEqual(requestErrors('POST', '/attendance', { body: checkin, variant: 0 }), [])
  assert.ok(requestErrors('POST', '/attendance', { body: checkin, variant: 1 }).some(error => error.includes('required')))
})
