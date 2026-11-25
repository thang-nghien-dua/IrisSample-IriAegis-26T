import { cameraDiagnosticsEnabled } from '../ui/development.js'
import { attendanceBody } from './contract.js'
import { SubjectPicker } from './SubjectPicker.jsx'
import { useEffect, useRef, useState } from 'react'
import { Badge, Button, DataTable, EmptyState, Field, PageHeader, SearchField } from '../ui'
import CameraApp from '../App.jsx'
import { useTask } from './use-task.js'
import { today } from './date.js'

import { useServer } from './Session.jsx'
import { useAllPages, useResource, useStepFocus } from './hooks.js'
import { queryString, unwrap } from './client.js'
import { Pager, RequestError, ResourceState } from './common.jsx'
import SessionContext from '../ui/SessionContext.jsx'

export function ServerAttendance({ params }) {
  const [course, setCourse] = useState(params.get('course') || ''), [date, setDate] = useState(today()), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null), [sessionOpen, setSessionOpen] = useState(false)
  const opener = useRef(null), workflowHash = useRef(''), restoreFocus = useRef(false), listHeading = useRef(null)
  const students = useResource(course && !sessionOpen ? `/subjects/${encodeURIComponent(course)}/students` + queryString({ q: search, limit: 25, offset }) : null)
  const subject = useResource(course ? `/subjects/${encodeURIComponent(course)}` : null)
  const receipts = useAllPages(course && date && !sessionOpen ? '/attendance' + queryString({ subject_id: course, date }) : null, 'checkin_id')
  const subjectName = subject.data ? unwrap(subject.data, 'subject')?.subject_name : ''
  const checked = new Map((receipts.data?.items || []).map(row => [row.student_id, row]))
  function restoreList() { restoreFocus.current = 'waiting'; setSelected(null); receipts.reload() }
  useEffect(() => {
    if (!restoreFocus.current || selected) return
    if (receipts.loading) { restoreFocus.current = 'ready'; return }
    if (restoreFocus.current !== 'ready') return
    // Wait for WebKit to commit visibility/history restoration before focusing.
    const frame = requestAnimationFrame(() => {
      restoreFocus.current = false
      const target = opener.current?.isConnected && !opener.current.disabled ? opener.current : listHeading.current
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, receipts.loading])
  useEffect(() => {
    const onPop = () => {
      if (window.location.hash !== workflowHash.current) return
      const entry = window.history.state?.aegisAttendance
      if (entry) setSelected(entry)
      else restoreList()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function choose(row, event) {
    opener.current = event.currentTarget; workflowHash.current = window.location.hash
    window.history.pushState({ aegisAttendance: { student_id: row.student_id, full_name: row.full_name } }, '', window.location.href)
    setSelected(row)
  }
  function leave() { if (window.history.state?.aegisAttendance) window.history.back(); else restoreList() }
  return <>
    <div className="attendance-workspace" hidden={!!selected}>
      <div ref={listHeading} tabIndex={-1}><PageHeader title="Điểm danh" /></div>
      <SessionContext
        title={subjectName || course || 'Chọn môn học'}
        subtitle={course ? `${course} · ${date.split('-').reverse().join('/')}` : ''}
        onOpenChange={setSessionOpen}
      >
        <SubjectPicker value={course} onChange={value => { setCourse(value); setOffset(0); setSearch(''); setQuery('') }} />
        <Field type="date" label="Ngày điểm danh" value={date} onChange={e => setDate(e.target.value)} />
      </SessionContext>
      {!sessionOpen && course
        ? <>
            <form className="server-search" onSubmit={e => { e.preventDefault(); setSearch(query); setOffset(0) }}>
              <SearchField placeholder="Tìm sinh viên trong môn…" value={query} onChange={e => setQuery(e.target.value)} />
              <Button type="submit" variant="secondary">Tìm kiếm</Button>
            </form>
            <RequestError error={receipts.error} />
            {receipts.error && <Button variant="quiet" onClick={receipts.reload}>Tải lại lượt đã ghi nhận</Button>}
            <ResourceState resource={students}>{data => <>
              <p className="attendance-count">
                {data.total ?? data.items?.length ?? 0} sinh viên trong môn
                {receipts.loading ? ' · Đang tải lượt đã ghi nhận…' : receipts.data ? ` · ${checked.size} đã ghi nhận` : ''}
              </p>
              <DataTable
                rowKey="student_id"
                caption="Danh sách điểm danh"
                variant="attendance-list attendance-roster"
                rows={data.items || []}
                columns={[
                  { key: 'full_name', label: 'Sinh viên', render: row => <span><strong>{row.full_name || row.student_id}</strong><small className="portal-block-muted">{row.student_id}</small></span> },
                  { key: 'actions', label: 'Thao tác', render: row => checked.has(row.student_id)
                    ? <span className="attendance-receipt"><span>Đã ghi nhận<time>{checked.get(row.student_id).checkin_time || '—'}</time></span></span>
                    : <Button variant="secondary" disabled={!date || receipts.loading || !!receipts.error} onClick={event => choose(row, event)}>Điểm danh</Button> },
                ]}
                empty={<EmptyState title="Chưa có sinh viên phù hợp" action={<a href={`#/app/courses/${encodeURIComponent(course)}`}>Mở danh sách ghi danh</a>} />}
              />
              <Pager total={data.total} offset={offset} onChange={setOffset} />
            </>}</ResourceState>
          </>
        : !sessionOpen ? <EmptyState title="Chọn môn để điểm danh" /> : null}
    </div>
    {selected && <AttendanceStep student={selected} course={course} date={date} onBack={leave} />}
  </>
}
function AttendanceStep({ student, course, date, onBack }) {
  const diagnostics = cameraDiagnosticsEnabled()
  const { api, actor } = useServer(), task = useTask()
  const [step, setStep] = useState('review'), [result, setResult] = useState(null), [photo, setPhoto] = useState(null), [confirmed, setConfirmed] = useState(false)
  const [livenessEvidence, setLivenessEvidence] = useState(null)
  const focus = useStepFocus(step), attempt = useRef(null)
  const attemptKey = `aegis.pending-checkin:${api.baseURL}:${actor.admin_id}:${course}:${student.student_id}:${date}`
  function record() {
    task.run(async signal => {
      // Freeze the payload as well as UUID. Timeout/retry must not create another check-in.
      if (!attempt.current) {
        try { const pending = JSON.parse(sessionStorage.getItem(attemptKey) || 'null'); if (pending?.uuid && pending.student_id === student.student_id && pending.subject_id === course && pending.checkin_date === date) attempt.current = pending } catch { /* No resumable request. */ }
        attempt.current ||= { student_id: student.student_id, subject_id: course, checkin_date: date, checkin_time: new Date().toTimeString().slice(0, 8), uuid: crypto.randomUUID() }
        try { sessionStorage.setItem(attemptKey, JSON.stringify(attempt.current)) } catch { /* Retry remains stable while the screen is mounted. */ }
      }
      const response = await api.request('/attendance', { method: 'POST', body: attendanceBody(attempt.current), signal })
      const checkin = unwrap(response, 'checkin')
      if (checkin.student_id !== student.student_id || checkin.subject_id !== course) throw new Error('Server chưa trả bản ghi điểm danh. Giữ nguyên mã yêu cầu khi thử lại.')
      try { sessionStorage.removeItem(attemptKey) } catch { /* Server receipt is authoritative. */ }
      setResult(checkin); setStep('done')
    })
  }
  return <section className={'server-workflow' + (step === 'camera' ? ' camera-step' : '')}><Button variant="quiet" disabled={task.busy} onClick={onBack}>← Danh sách lớp</Button>
    <h1 ref={focus} tabIndex={-1}>{step === 'done' ? 'Đã ghi nhận điểm danh' : step === 'camera' ? 'Chụp ảnh khuôn mặt' : 'Xác nhận điểm danh'}</h1>
    <div className="server-person-context"><strong>{student.full_name || student.student_id}</strong><span>{student.student_id} · {course} · {date.split('-').reverse().join('/')}</span></div>
    {step === 'camera' ? <><CameraApp embedded livenessRequired onCapture={(image, evidence) => { setPhoto(image); setLivenessEvidence(evidence); setConfirmed(false); setStep('review') }} /><Button variant="quiet" onClick={() => setStep('review')}>Hủy chụp</Button></> : step === 'done' ? <><Badge tone="success">Server đã xác nhận</Badge><dl className="server-details"><div><dt>Ngày</dt><dd>{result.checkin_date || date}</dd></div><div><dt>Giờ ghi nhận</dt><dd>{result.checkin_time || '—'}</dd></div></dl><div className="ui-actions"><Button onClick={onBack}>Điểm danh sinh viên khác</Button><a href={`#/app/reports?course=${encodeURIComponent(course)}&date=${date}`}>Xem lịch sử</a></div></> : <>
      <RequestError error={task.error} />
      <p className="ui-hint">Giảng viên kiểm tra danh tính trước khi ghi nhận.</p>
      {photo && <img className="server-photo" src={photo} alt="Ảnh vừa chụp, đang giữ trên thiết bị" />}
      <Button variant="secondary" disabled={task.busy} onClick={() => setStep('camera')}>{photo ? 'Chụp lại và kiểm tra liveness' : 'Chụp ảnh và kiểm tra liveness'}</Button>

      {livenessEvidence?.is_real && <p className="ui-hint">Ảnh đã qua kiểm tra người thật.</p>}
      {diagnostics && livenessEvidence && <details className="portal-camera-tools"><summary>Thông tin tích hợp</summary><p>Liveness: {livenessEvidence.result} · Điểm {livenessEvidence.real_score}. Chưa đối sánh danh tính hoặc ràng buộc vào API điểm danh.</p><p>Ảnh đang ở trình duyệt; API điểm danh chưa nhận file ảnh.</p></details>}
      <label className="portal-check server-consent"><input type="checkbox" checked={confirmed} disabled={task.busy} onChange={e => setConfirmed(e.target.checked)} />Tôi xác nhận sinh viên có mặt và ghi nhận thủ công.</label>
      <Button disabled={!confirmed} busy={task.busy} onClick={record}>{task.error ? 'Thử gửi lại cùng yêu cầu' : 'Ghi nhận lên server'}</Button>
      {diagnostics && attempt.current && <p className="ui-hint">Mã yêu cầu: {attempt.current.uuid}</p>}
    </>}
  </section>
}

export { ServerReports } from './Reports.jsx'
