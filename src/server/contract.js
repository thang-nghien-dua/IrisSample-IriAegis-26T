// Follow the delivered Group 1 Python source unless YAML-only testing is requested.
export const API_PROFILE = import.meta.env?.VITE_API_PROFILE || 'legacy-source'
export const legacySource = API_PROFILE === 'legacy-source'
const pick = (values, keys) => Object.fromEntries(keys.filter(key => values[key] !== undefined).map(key => [key, values[key]]))
const nonempty = value => value !== '' && value !== undefined && value !== null

export function loginBody(identifier, password) {
  const value = identifier.trim()
  return { [value.includes('@') ? 'email' : 'username']: value, password }
}
export function resetBody(email, token, password, repeat, profile = API_PROFILE) {
  return profile === 'legacy-source' ? { email, token, new_password: password, confirm_password: repeat } : { email, reset_token: token, new_password: password }
}
export function changePasswordBody(current, password, repeat, profile = API_PROFILE) {
  return profile === 'legacy-source' ? { old_password: current, new_password: password, confirm_password: repeat } : { current_password: current, new_password: password }
}
export function entityBody(entity, values, { editing = false, role = 'ADMIN', subjectId, repeat, profile = API_PROFILE } = {}) {
  const keys = entity === 'courses'
    ? ['subject_id', 'subject_name', 'time_slot', 'instructor_id', 'subject_status', 'semester_start_date', 'semester_end_date']
    : entity === 'admins'
      ? ['email', 'password', 'full_name', 'admin_id', 'admin_code', 'phone', 'role']
      : ['student_id', 'full_name', 'email', 'phone', ...(editing ? [] : ['checkin_password', 'subject_id']), ...(editing ? ['photo_path'] : [])]
  const body = pick(values, keys)
  if (editing) delete body[entity === 'courses' ? 'subject_id' : 'student_id']
  for (const key of ['admin_id', 'admin_code', 'checkin_password', 'subject_id']) if (!nonempty(body[key])) delete body[key]
  if (entity === 'courses') {
    if (role !== 'SUPER_ADMIN') delete body.instructor_id
    else if (!editing && !nonempty(body.instructor_id)) delete body.instructor_id
  }
  if (entity === 'admins') {
    body.role ||= 'ADMIN'
    if (profile === 'legacy-source') { body.role = 'ADMIN'; body.confirm_password = repeat; delete body.admin_id }
  }
  if (entity === 'students' && subjectId && !editing) body.subject_id = subjectId
  return body
}
export function reportBody(from, to) { return Object.fromEntries(Object.entries({ date_from: from, date_to: to }).filter(([, value]) => nonempty(value))) }
export function attendanceBody(values) { return pick(values, ['student_id', 'subject_id', 'checkin_date', 'checkin_time', 'uuid']) }
export function sortValue(value, profile = API_PROFILE) {
  return profile === 'legacy-source' && value ? `${value.replace(/^-/, '')}:${value.startsWith('-') ? 'desc' : 'asc'}` : value
}
