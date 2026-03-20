import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'

// BUG-003 FIX: order stored as string while editing so backspace works correctly,
//              parsed to integer only on save
// BUG-004 FIX: notification step now has recipient field (email/slack/webhook)

const STEP_TYPES = ['task', 'approval', 'notification']

export default function StepModal({ workflowId, step, onSaved, onClose }) {
  const toast = useToast()
  const isNew = !step

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:           '',
    step_type:      'task',
    orderRaw:       '0',   // BUG-003: store as string so backspace works
    max_iterations: 10,
    metadata:       {},
  })

  useEffect(() => {
    if (step) {
      setForm({
        name:           step.name,
        step_type:      step.step_type,
        orderRaw:       String(step.order ?? 0),
        max_iterations: step.max_iterations ?? 10,
        metadata:       step.metadata || {},
      })
    }
  }, [step])

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Step name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name:           form.name,
        step_type:      form.step_type,
        order:          parseInt(form.orderRaw) || 0,  // parse only on save
        max_iterations: form.max_iterations,
        metadata:       form.metadata,
      }
      if (isNew) {
        await api.createStep(workflowId, payload)
        toast.success('Step created')
      } else {
        await api.updateStep(step.id, payload)
        toast.success('Step updated')
      }
      onSaved()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const meta = form.metadata || {}
  function setMeta(key, val) {
    setForm(f => ({ ...f, metadata: { ...f.metadata, [key]: val } }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'Add Step' : 'Edit Step'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Step Name *</label>
            <input
              className="form-control"
              placeholder="e.g. Manager Approval"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Step Type *</label>
            <select
              className="form-control"
              value={form.step_type}
              onChange={e => setForm(f => ({ ...f, step_type: e.target.value, metadata: {} }))}
            >
              {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* BUG-003 FIX: text input instead of number — allows clean backspace */}
            <div className="form-group">
              <label className="form-label">Order</label>
              <input
                className="form-control"
                placeholder="1"
                value={form.orderRaw}
                onChange={e => {
                  const val = e.target.value
                  if (val === '' || /^\d+$/.test(val)) {
                    setForm(f => ({ ...f, orderRaw: val }))
                  }
                }}
              />
              <span className="form-hint">Sequence position of this step</span>
            </div>
            <div className="form-group">
              <label className="form-label">Max Iterations (loop guard)</label>
              <input
                type="number"
                className="form-control"
                value={form.max_iterations}
                min={1}
                max={100}
                onChange={e => setForm(f => ({ ...f, max_iterations: parseInt(e.target.value) || 10 }))}
              />
              <span className="form-hint">Prevents infinite loops (default: 10)</span>
            </div>
          </div>

          <hr className="divider" />
          <p className="form-label" style={{ marginBottom: 12 }}>Metadata</p>

          {/* Approval step */}
          {form.step_type === 'approval' && (
            <div className="form-group">
              <label className="form-label">Assignee Email</label>
              <input
                className="form-control"
                placeholder="approver@example.com"
                value={meta.assignee_email || ''}
                onChange={e => setMeta('assignee_email', e.target.value)}
              />
              <span className="form-hint">Person responsible for approving this step</span>
            </div>
          )}

          {/* Notification step — BUG-004 FIX: added recipient field */}
          {form.step_type === 'notification' && (
            <>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select
                  className="form-control"
                  value={meta.channel || 'email'}
                  onChange={e => setMeta('channel', e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="slack">Slack</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>

              {/* BUG-004: recipient field adapts label to channel type */}
              <div className="form-group">
                <label className="form-label">
                  {meta.channel === 'slack'   ? 'Slack Channel / Username' :
                   meta.channel === 'webhook' ? 'Webhook URL'              :
                                                'Recipient Email *'}
                </label>
                <input
                  className="form-control"
                  placeholder={
                    meta.channel === 'slack'   ? '#general or @username' :
                    meta.channel === 'webhook' ? 'https://hooks.example.com/...' :
                                                 'recipient@example.com'
                  }
                  value={meta.recipient || ''}
                  onChange={e => setMeta('recipient', e.target.value)}
                />
                <span className="form-hint">
                  {meta.channel === 'slack'   ? 'Slack channel or user to notify' :
                   meta.channel === 'webhook' ? 'URL that will receive a POST request' :
                                                'Email address that will receive the notification'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Template</label>
                <input
                  className="form-control"
                  placeholder="e.g. finance_alert, welcome_message"
                  value={meta.template || ''}
                  onChange={e => setMeta('template', e.target.value)}
                />
                <span className="form-hint">Template name used to render the message</span>
              </div>
            </>
          )}

          {/* Task step */}
          {form.step_type === 'task' && (
            <div className="form-group">
              <label className="form-label">Action</label>
              <input
                className="form-control"
                placeholder="e.g. update_database, generate_report"
                value={meta.action || ''}
                onChange={e => setMeta('action', e.target.value)}
              />
              <span className="form-hint">Identifier for the automated action this step performs</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add Step' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
