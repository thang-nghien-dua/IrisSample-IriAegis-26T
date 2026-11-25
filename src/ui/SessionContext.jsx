import { useState } from 'react'
import { Button, Dialog } from './index.js'
import { ChevronRight } from './icons.js'

// Session selection is secondary while taking attendance. Native controls stay in a sheet.
export default function SessionContext({ title, subtitle, children, label = 'Đổi buổi học', onOpenChange }) {
  const [open, setOpen] = useState(false)
  function close() {
    setOpen(false)
    onOpenChange?.(false)
  }
  return <>
    <button type="button" className="session-context" aria-label={label} onClick={event => { event.currentTarget.focus({ preventScroll: true }); setOpen(true); onOpenChange?.(true) }}>
      <span><strong>{title || 'Chọn môn học'}</strong><small>{subtitle || 'Chọn môn và ngày để mở danh sách'}</small></span><span className="session-context-edit">Đổi<ChevronRight size={16} /></span>
    </button>
    {open && <Dialog open title="Chọn buổi học" onClose={close} footer={<Button onClick={close}>Xem danh sách lớp</Button>}><div className="session-picker">{children}</div></Dialog>}
  </>
}
