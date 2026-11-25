import { useEffect, useState } from 'react'
import { Badge, Button, DataTable, Dialog, EmptyState, Field, PageHeader, SearchField } from '../ui'
import { Edit2, Plus, Trash2 } from '../ui/icons'
import CameraApp from '../App.jsx'
import { useTask } from './use-task.js'
import { useServer } from './Session.jsx'
import { queryString, unwrap } from './client.js'
import { useResource } from './hooks.js'
import { Pager, RequestError, ResourceState, ServerConfirm, Unavailable } from './common.jsx'
import { ImportJob } from './Jobs.jsx'
import { entityBody, legacySource, sortValue } from './contract.js'

export const entities = {
  courses: { path: '/subjects', key: 'subject_id', name: 'subject_name', label: 'Môn học', single: 'môn học', detail: 'subject' },
  students: { path: '/students', key: 'student_id', name: 'full_name', label: 'Sinh viên', single: 'sinh viên', detail: 'student' },
  admins: { path: '/admins', key: 'admin_id', name: 'full_name', label: 'Quản trị viên', single: 'quản trị viên', detail: 'admin' },
}
const fields = {
  students: [['student_id', 'Mã sinh viên', 'text', true], ['full_name', 'Họ tên', 'text', true], ['email', 'Email', 'email'], ['phone', 'Số điện thoại', 'tel'], ['checkin_password', 'Mật khẩu điểm danh mới', 'password']],
  courses: [['subject_id', 'Mã môn học', 'text', true], ['subject_name', 'Tên môn học', 'text', true], ['time_slot', 'Lịch học', 'text'], ['instructor_id', 'Mã giảng viên phụ trách', 'text'], ['subject_status', 'Trạng thái môn', 'text'], ['semester_start_date', 'Bắt đầu học kỳ', 'text'], ['semester_end_date', 'Kết thúc học kỳ', 'text']],
  admins: [['full_name', 'Họ tên', 'text', true], ['email', 'Email', 'email', true], ['admin_id', 'Mã tài khoản (tùy chọn)', 'text'], ['admin_code', 'Mã giảng viên', 'text', legacySource], ['phone', 'Số điện thoại', 'tel'], ['password', 'Mật khẩu ban đầu', 'password', true]],
}
export function ServerEntityForm({ entity, row, subjectId, onSaved, onClose }) {
  const { api, actor } = useServer(), task = useTask(), config = entities[entity]
  const [values, setValues] = useState(() => ({ ...Object.fromEntries(fields[entity].map(([key]) => [key, key.includes('password') ? '' : row?.[key] || (key === 'subject_status' ? 'ASSIGNED' : '')])), role: 'ADMIN' }))
  const [repeat, setRepeat] = useState('')
  const editing = !!row
  async function save(event) {
    event.preventDefault()
    task.run(async signal => {
      if (entity === 'admins' && values.password !== repeat) throw new Error('Hai mật khẩu không khớp.')
      const body = entityBody(entity, values, { editing, role: actor.role, subjectId, repeat })
      const result = await api.request(entity === 'admins' ? '/auth/register' : `${config.path}${editing ? `/${encodeURIComponent(row[config.key])}` : ''}`, { method: editing ? 'PUT' : 'POST', body, signal })
      onSaved(result)
    })
  }
  return <Dialog open title={`${editing ? 'Sửa' : 'Thêm'} ${config.single}`} onClose={() => { if (!task.busy) onClose() }} footer={<><Button variant="secondary" disabled={task.busy} onClick={onClose}>Hủy</Button><Button type="submit" form="server-entity" busy={task.busy}>Lưu {config.single}</Button></>}>
    <form id="server-entity" className="portal-form" onSubmit={save}>
      <RequestError error={task.error} />
      {fields[entity].filter(([key]) => !(entity === 'courses' && key === 'instructor_id' && actor.role !== 'SUPER_ADMIN') && !(editing && key === 'checkin_password') && !(legacySource && key === 'admin_id')).map(([key, label, type, required], index) => <Field key={key} label={label} type={type} required={required} disabled={editing && key === config.key} autoFocus={index === 0} autoComplete={type === 'password' ? 'new-password' : undefined} minLength={type === 'password' && entity === 'admins' ? 6 : undefined} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} hint={key.startsWith('semester_') ? 'DD/MM/YYYY, ví dụ 01/09/2026' : key === 'time_slot' ? 'Ví dụ: Thứ 2 (07:30 - 09:30)' : key === 'admin_id' ? 'Để trống để server tự sinh mã.' : key === 'subject_status' ? 'Mặc định ASSIGNED; dùng giá trị trạng thái được nhóm server thống nhất.' : undefined} />)}
      {entity === 'admins' && !legacySource && <Field label="Vai trò" as="select" value={values.role} onChange={e => setValues({ ...values, role: e.target.value })} options={[{ value: 'ADMIN', label: 'Giảng viên / Admin' }, { value: 'SUPER_ADMIN', label: 'Super Admin' }]} />}
      {entity === 'admins' && <Field label="Nhập lại mật khẩu" type="password" autoComplete="new-password" required value={repeat} onChange={e => setRepeat(e.target.value)} />}
      {entity === 'students' && editing && <details className="server-filters"><summary>Ảnh tham chiếu đã có</summary><Field label="Đường dẫn ảnh tham chiếu" value={values.photo_path ?? row.photo_path ?? ''} onChange={e => setValues({ ...values, photo_path: e.target.value })} hint="Chỉ sửa khi đã có đường dẫn ảnh do server quản lý. Để gửi file mới, dùng Xem / cập nhật ảnh ở trang chi tiết." /></details>}
    </form>
  </Dialog>
}

export function ServerCatalog({ entity, params }) {
  const config = entities[entity], { api, actor } = useServer()
  const [query, setQuery] = useState(params.get('q') || ''), [search, setSearch] = useState(params.get('q') || ''), [offset, setOffset] = useState(Number(params.get('offset')) || 0)
  const [sort, setSort] = useState(params.get('sort') || ''), [status, setStatus] = useState(params.get('status') || ''), [instructor, setInstructor] = useState(params.get('instructor_id') || ''), [role, setRole] = useState(params.get('role') || '')
  const [form, setForm] = useState(null), [removing, setRemoving] = useState(null), [importing, setImporting] = useState(false), [message, setMessage] = useState('')
  const filters = { sort, ...(entity === 'courses' ? { status, instructor_id: instructor } : entity === 'admins' ? { role } : {}) }
  const resource = useResource(config.path + queryString({ q: search, limit: 25, offset, ...filters, sort: sortValue(sort) }))
  const returnPath = `#/app/${entity}${queryString({ q: search, offset, ...filters })}`
  const remember = (q, next) => { setSearch(q); setOffset(next); window.history.replaceState(null, '', `#/app/${entity}${queryString({ q, offset: next, ...filters })}`) }
  const mayCreate = entity !== 'admins' || actor.role === 'SUPER_ADMIN'
  const sortKeys = entity === 'courses' ? [['subject_id', 'Mã môn'], ['subject_name', 'Tên môn'], ['updated_at', 'Ngày cập nhật']] : [[config.key, 'Mã'], ['full_name', 'Họ tên'], ['updated_at', 'Ngày cập nhật']]
  return <><PageHeader title={config.label} actions={mayCreate && <><Button variant="secondary" onClick={() => setImporting(true)}>Nhập CSV</Button><Button icon={Plus} onClick={() => setForm({})}>Thêm {config.single}</Button></>} />
    {message && <p role="status" className="server-feedback">{message}</p>}
    <form className="server-search" onSubmit={event => { event.preventDefault(); remember(query, 0) }}><SearchField value={query} onChange={event => setQuery(event.target.value)} placeholder={`Tìm mã hoặc tên ${config.single}…`} /><Button variant="secondary" type="submit">Tìm kiếm</Button></form>
    <details className="server-filters"><summary>Lọc và sắp xếp</summary><div className="portal-form"><Field label="Sắp xếp" as="select" value={sort} onChange={e => { setSort(e.target.value); setOffset(0) }} options={[{ value: '', label: 'Mặc định của server' }, ...sortKeys.flatMap(([value, label]) => [{ value, label: `${label} tăng dần` }, { value: `-${value}`, label: `${label} giảm dần` }])]} />{entity === 'courses' && <><Field label="Trạng thái môn" value={status} onChange={e => { setStatus(e.target.value); setOffset(0) }} /><Field label="Mã giảng viên phụ trách" value={instructor} onChange={e => { setInstructor(e.target.value); setOffset(0) }} /></>}{entity === 'admins' && actor.role === 'SUPER_ADMIN' && <Field label="Lọc vai trò" as="select" value={role} onChange={e => { setRole(e.target.value); setOffset(0) }} options={[{ value: '', label: 'Tất cả vai trò' }, { value: 'ADMIN', label: 'Giảng viên / Admin' }, { value: 'SUPER_ADMIN', label: 'Super Admin' }]} />}</div></details>
    <ResourceState resource={resource}>{data => <><DataTable variant="server-directory" caption={config.label} rowKey={config.key} rows={data.items || []} columns={[
      { key: config.name, label: entity === 'courses' ? 'Môn học' : 'Họ tên', render: row => <span><a href={`#/app/${entity}/${encodeURIComponent(row[config.key])}?return=${encodeURIComponent(returnPath)}`}>{row[config.name] || row[config.key]}</a><small className="portal-block-muted">{row[config.key]}</small></span> },
      { key: entity === 'courses' ? 'time_slot' : 'email', label: entity === 'courses' ? 'Lịch học' : 'Email' },
      ...(entity === 'admins' ? [{ key: 'role', label: 'Vai trò', render: row => <Badge>{row.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Giảng viên'}</Badge> }] : [{ key: 'actions', label: 'Thao tác', render: row => <div className="ui-actions"><Button variant="quiet" icon={Edit2} aria-label={`Sửa ${row[config.key]}`} onClick={() => setForm(row)}>Sửa</Button><Button variant="quiet" icon={Trash2} aria-label={`Xóa ${row[config.key]}`} onClick={() => setRemoving(row)}>Xóa</Button></div> }]),
    ]} empty={<EmptyState title={search ? 'Không tìm thấy kết quả' : `Chưa có ${config.single}`} action={(mayCreate || search) && <Button variant="secondary" onClick={() => search ? (setQuery(''), remember('', 0)) : setForm({})}>{search ? 'Xóa tìm kiếm' : `Thêm ${config.single}`}</Button>} />} /><Pager total={data.total} offset={offset} onChange={value => remember(search, value)} /></>}</ResourceState>
    {form && <ServerEntityForm entity={entity} row={form[config.key] ? form : null} onClose={() => setForm(null)} onSaved={() => { const createdStudent = entity === 'students' && !form[config.key]; setForm(null); setMessage(createdStudent ? 'Đã tạo hồ sơ sinh viên. Vui lòng ghi danh vào môn học để sinh viên hiển thị trong danh sách giảng viên.' : 'Đã lưu lên server.'); resource.reload() }} />}
    {removing && <ServerConfirm title={`Xóa ${removing[config.name]}?`} description="Bản ghi sẽ được xóa mềm trên server. Thao tác này khác với bỏ sinh viên khỏi một môn học." onClose={() => setRemoving(null)} onConfirm={async signal => { await api.request(`${config.path}/${encodeURIComponent(removing[config.key])}`, { method: 'DELETE', signal }); setMessage('Đã xóa bản ghi.'); resource.reload() }} />}
    {importing && <ImportJob type={entity === 'courses' ? 'subjects' : entity === 'admins' ? 'admin' : 'students'} onClose={() => { setImporting(false); resource.reload() }} />}
  </>
}

export function ServerDetail({ entity, id, params }) {
  const config = entities[entity], { actor } = useServer()
  const forbidden = entity === 'admins' && actor.role !== 'SUPER_ADMIN' && actor.admin_id !== id
  const resource = useResource(forbidden ? null : `${config.path}/${encodeURIComponent(id)}`)
  const [editing, setEditing] = useState(false), [photo, setPhoto] = useState(false)
  const back = params.get('return')?.startsWith(`#/app/${entity}`) ? params.get('return') : `#/app/${entity}`
  if (forbidden) return <Unavailable title="Không có quyền">Bạn không có quyền xem hồ sơ quản trị viên này.</Unavailable>
  return <><a className="server-back" href={back}>← {config.label}</a><ResourceState resource={resource}>{data => {
    const row = unwrap(data, config.detail)
    return <><PageHeader title={row[config.name] || id} description={id} actions={entity !== 'admins' && <Button variant="secondary" onClick={() => setEditing(true)}>Sửa thông tin</Button>} />
      <dl className="server-details">{(entity === 'courses' ? [['time_slot', 'Lịch học'], ['subject_status', 'Trạng thái'], ['instructor_id', 'Giảng viên'], ['semester_start_date', 'Bắt đầu học kỳ'], ['semester_end_date', 'Kết thúc học kỳ']] : [['email', 'Email'], ['phone', 'Điện thoại'], ...(entity === 'admins' ? [['admin_code', 'Mã giảng viên'], ['role', 'Vai trò'], ['date_of_birth', 'Ngày sinh'], ['gender', 'Giới tính'], ['description', 'Mô tả']] : [])]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{row[key] || 'Chưa cập nhật'}</dd></div>)}</dl>
      {entity === 'courses' && <SubjectStudents id={id} />}
      {entity === 'students' && <section className="server-section"><h2>Ảnh khuôn mặt</h2><Button variant="secondary" onClick={() => setPhoto(true)}>Xem / cập nhật ảnh</Button></section>}
      {entity === 'admins' && <Unavailable title="Cập nhật hồ sơ">Đặc tả hiện chưa có API sửa/xóa quản trị viên hoặc ảnh quản trị viên.{actor.admin_id === id ? ' Bạn có thể đổi mật khẩu trong Hồ sơ của tôi.' : ''}</Unavailable>}
      {editing && <ServerEntityForm entity={entity} row={row} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); resource.reload() }} />}
      {photo && <StudentPhoto id={id} onClose={() => setPhoto(false)} />}
    </>
  }}</ResourceState></>
}

function SubjectStudents({ id }) {
  const { api } = useServer(), task = useTask()
  const [offset, setOffset] = useState(0), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [enrolling, setEnrolling] = useState(false), [studentId, setStudentId] = useState(''), [removing, setRemoving] = useState(null), [adding, setAdding] = useState(false), [sort, setSort] = useState(''), [status, setStatus] = useState('Enrolled'), [importing, setImporting] = useState(false)
  const path = `/subjects/${encodeURIComponent(id)}/students`, resource = useResource(path + queryString({ limit: 25, offset, q: search, sort: sortValue(sort) }))
  return <section className="server-section"><div className="portal-section-heading"><h2>Sinh viên trong môn</h2><Button onClick={() => { task.setError(''); setEnrolling(true) }}>Ghi danh sinh viên</Button></div>
    <div className="ui-actions server-context-actions"><a href={`#/app/attendance?course=${encodeURIComponent(id)}`}>Mở điểm danh →</a><a href={`#/app/reports?course=${encodeURIComponent(id)}`}>Lịch sử điểm danh</a><Button variant="quiet" onClick={() => setAdding(true)}>Tạo sinh viên mới</Button><Button variant="quiet" onClick={() => setImporting(true)}>Nhập CSV vào môn</Button></div>
    <form className="server-search" onSubmit={e => { e.preventDefault(); setSearch(query); setOffset(0) }}><SearchField value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm trong môn…" /><Button variant="secondary" type="submit">Tìm kiếm</Button></form>
    <details className="server-filters"><summary>Sắp xếp danh sách</summary><Field label="Thứ tự sinh viên" as="select" value={sort} onChange={e => { setSort(e.target.value); setOffset(0) }} options={[{ value: '', label: 'Mặc định của server' }, { value: 'full_name', label: 'Họ tên tăng dần' }, { value: '-full_name', label: 'Họ tên giảm dần' }, { value: 'student_id', label: 'Mã sinh viên tăng dần' }]} /></details>
    <ResourceState resource={resource}>{data => <><DataTable caption="Sinh viên trong môn" rowKey="student_id" rows={data.items || []} columns={[{ key: 'full_name', label: 'Sinh viên', render: row => <span>{row.full_name}<small className="portal-block-muted">{row.student_id}</small></span> }, { key: 'enrollment_status', label: 'Trạng thái ghi danh' }, { key: 'actions', label: 'Ghi danh', render: row => <Button variant="quiet" onClick={() => setRemoving(row)}>Bỏ khỏi môn</Button> }]} /><Pager total={data.total} offset={offset} onChange={setOffset} /></>}</ResourceState>
    {enrolling && <Dialog open title="Ghi danh vào môn" description={id} onClose={() => { if (!task.busy) setEnrolling(false) }} footer={<><Button variant="secondary" onClick={() => setEnrolling(false)} disabled={task.busy}>Hủy</Button><Button type="submit" form="enrollment" busy={task.busy}>Ghi danh</Button></>}><form id="enrollment" className="portal-form" onSubmit={e => { e.preventDefault(); task.run(async signal => { await api.request(path, { method: 'POST', body: { student_id: studentId.trim(), enrollment_status: status || null }, signal }); setEnrolling(false); setStudentId(''); resource.reload() }) }}><RequestError error={task.error} /><Field label="Mã sinh viên đã có" autoFocus required value={studentId} onChange={e => setStudentId(e.target.value)} /><Field label="Trạng thái ghi danh" value={status} onChange={e => setStatus(e.target.value)} hint="Mặc định Enrolled; dùng giá trị thống nhất với server." /></form></Dialog>}
    {adding && <ServerEntityForm entity="students" subjectId={id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); resource.reload() }} />}
    {importing && <ImportJob type="students" initialSubjectId={id} onClose={() => { setImporting(false); resource.reload() }} />}
    {removing && <ServerConfirm title={`Bỏ ${removing.full_name || removing.student_id} khỏi môn?`} description="Chỉ hủy ghi danh vào môn này. Hồ sơ sinh viên được giữ lại." actionLabel="Bỏ khỏi môn" onClose={() => setRemoving(null)} onConfirm={async signal => { await api.request(`${path}/${encodeURIComponent(removing.student_id)}`, { method: 'DELETE', signal }); resource.reload() }} />}
  </section>
}

function StudentPhoto({ id, onClose }) {
  const { api } = useServer(), task = useTask()
  const [source, setSource] = useState(''), [capturing, setCapturing] = useState(false), [file, setFile] = useState(null), [saved, setSaved] = useState(false)
  useEffect(() => { if (source.startsWith('blob:')) return () => URL.revokeObjectURL(source) }, [source])
  const path = `/students/${encodeURIComponent(id)}/photo`
  return <Dialog open title="Ảnh khuôn mặt sinh viên" onClose={() => { if (!task.busy) onClose() }} footer={<><Button variant="secondary" onClick={onClose} disabled={task.busy}>Đóng</Button><Button disabled={!file || capturing} busy={task.busy} onClick={() => task.run(async signal => { const body = new FormData(); body.set('file', file, file.type === 'image/png' ? 'face.png' : 'face.jpg'); await api.request(path, { method: 'POST', body, signal }); setSaved(true); setFile(null) })}>Lưu ảnh lên server</Button></>}>
    <RequestError error={task.error} />{saved && <p role="status">Đã lưu ảnh lên server.</p>}
    {capturing ? <><CameraApp embedded livenessRequired onCapture={async image => { const blob = await (await fetch(image)).blob(); setFile(blob); setSource(image); setCapturing(false); setSaved(false) }} /><Button variant="quiet" onClick={() => setCapturing(false)}>Hủy chụp</Button></> : <div className="portal-form">{source && <img className="server-photo" src={source} alt="Ảnh khuôn mặt sinh viên" />}<div className="ui-actions"><Button variant="secondary" busy={task.busy} onClick={() => task.run(async signal => { const blob = await api.request(path, { blob: true, signal }); setSource(URL.createObjectURL(blob)); setFile(null) })}>Tải ảnh hiện tại</Button><Button onClick={() => setCapturing(true)}>Chụp ảnh mới</Button></div><Field label="Hoặc chọn ảnh JPEG / PNG" type="file" accept="image/jpeg,image/png" onChange={e => { const next = e.target.files?.[0]; if (!next) return; if (!['image/jpeg', 'image/png'].includes(next.type) || next.size > 5 * 1024 * 1024) { task.setError('Chọn ảnh JPEG/PNG tối đa 5 MB.'); return }; task.setError(''); setFile(next); setSource(URL.createObjectURL(next)); setSaved(false) }} /><p className="ui-hint">Camera kiểm tra liveness qua dịch vụ liveness; ảnh chọn từ máy chỉ cập nhật hồ sơ, chưa có bằng chứng liveness hoặc xác minh danh tính.</p></div>}
  </Dialog>
}
