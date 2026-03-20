import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'
import { ConfirmDialog } from '../common/ConfirmDialog'
import RuleSandbox from '../RuleSandbox'

export default function RuleBuilder() {
  const { stepId } = useParams()
  const navigate   = useNavigate()
  const toast      = useToast()

  const [step,      setStep]      = useState(null)
  const [workflow,  setWorkflow]  = useState(null)
  const [rules,     setRules]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(null)  // ruleId being saved
  const [deleteId,  setDeleteId]  = useState(null)
  const [showSandbox, setShowSandbox] = useState(false)

  // draft new rule form
  const [draft, setDraft] = useState({ condition: '', next_step_id: '', priority: 99 })
  const [allSteps, setAllSteps] = useState([])

  useEffect(() => { load() }, [stepId])

  async function load() {
    setLoading(true)
    try {
      const rulesData = await api.listRules(stepId)
      setRules(rulesData)

      // get step + workflow info for context
      if (rulesData.length > 0 || true) {
        // fetch workflows to find parent
        const wfList = await api.listWorkflows({ limit: 100 })
        for (const wf of wfList.items) {
          const full = await api.getWorkflow(wf.id)
          const found = full.steps?.find(s => s.id === stepId)
          if (found) {
            setStep(found)
            setWorkflow(full)
            setAllSteps(full.steps || [])
            break
          }
        }
      }
    } catch (e) {
      toast.error('Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!draft.condition.trim()) { toast.error('Condition is required'); return }
    setSaving('new')
    try {
      await api.createRule(stepId, {
        condition:    draft.condition,
        next_step_id: draft.next_step_id || null,
        priority:     parseInt(draft.priority) || 99,
      })
      toast.success('Rule added')
      setDraft({ condition: '', next_step_id: '', priority: rules.length + 1 })
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleUpdate(rule, changes) {
    setSaving(rule.id)
    try {
      await api.updateRule(rule.id, changes)
      toast.success('Rule updated')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete() {
    try {
      await api.deleteRule(deleteId)
      toast.success('Rule deleted')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => workflow ? navigate(`/workflows/${workflow.id}?tab=steps`) : navigate('/')}>
              ← Back
            </button>
            <div>
              <h2 className="page-title">Rule Editor</h2>
              {step && (
                <p className="page-subtitle">
                  Step: <strong style={{ color: 'var(--text)' }}>{step.name}</strong>
                  <span className={`badge badge-${step.step_type}`} style={{ marginLeft: 8 }}>{step.step_type}</span>
                </p>
              )}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowSandbox(s => !s)}>
          {showSandbox ? 'Hide' : '★ Test Rules'} Sandbox
        </button>
      </div>

      {/* Rule Sandbox */}
      {showSandbox && (
        <div className="card mb-16" style={{ marginBottom: 20 }}>
          <RuleSandbox rules={rules} inputSchema={workflow?.input_schema} />
        </div>
      )}

      {/* Condition syntax reference + BUG-006 case sensitivity warning */}
      <div className="card mb-16" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <p className="form-label" style={{ marginBottom: 6 }}>Condition Syntax</p>
        <p className="text-muted" style={{ marginBottom: 8 }}>
          Operators: <code className="text-mono">== != &gt; &lt; &gt;= &lt;=</code> &nbsp;|&nbsp;
          Logic: <code className="text-mono">&amp;&amp; ||</code> &nbsp;|&nbsp;
          Functions: <code className="text-mono">contains(field, "val") startsWith(field, "pre") endsWith(field, "suf") iequals(field, "val")</code> &nbsp;|&nbsp;
          Catch-all: <code className="text-mono">DEFAULT</code>
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--amber-dim)', borderRadius: 'var(--radius)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span style={{ color: 'var(--amber)', fontSize: 13, flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 12, margin: 0 }}>
            <span style={{ color: 'var(--amber)', fontWeight: 500 }}>String comparisons are case sensitive.</span>
            <span className="text-muted"> &nbsp;<code className="text-mono">priority == 'High'</code> will NOT match <code className="text-mono">'high'</code>.
            Use <code className="text-mono">iequals(priority, 'high')</code> for case-insensitive matching.</span>
          </p>
        </div>
      </div>

      {/* Existing rules */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 180px 100px 80px', gap: 8, padding: '6px 10px', marginBottom: 4 }}>
          <span className="form-label">Priority</span>
          <span className="form-label">Condition</span>
          <span className="form-label">Next Step</span>
          <span className="form-label">Status</span>
          <span className="form-label">Actions</span>
        </div>

        {rules.length === 0 && (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <p>No rules yet — add the first rule below</p>
          </div>
        )}

        {rules.map(rule => (
          <RuleRow
            key={rule.id}
            rule={rule}
            allSteps={allSteps}
            saving={saving === rule.id}
            onUpdate={(changes) => handleUpdate(rule, changes)}
            onDelete={() => setDeleteId(rule.id)}
          />
        ))}
      </div>

      {/* Add new rule */}
      <div className="card">
        <p className="form-label" style={{ marginBottom: 12 }}>Add New Rule</p>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px 80px', gap: 10, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Priority</label>
            <input
              type="number"
              className="form-control"
              value={draft.priority}
              onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
              min={1}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Condition *</label>
            <input
              className="form-control"
              placeholder="amount > 100 && country == 'US'  or  DEFAULT"
              value={draft.condition}
              onChange={e => setDraft(d => ({ ...d, condition: e.target.value }))}
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Next Step (blank = end)</label>
            <select
              className="form-control"
              value={draft.next_step_id}
              onChange={e => setDraft(d => ({ ...d, next_step_id: e.target.value }))}
            >
              <option value="">— End Workflow —</option>
              {allSteps.filter(s => s.id !== stepId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={saving === 'new'}
            style={{ height: 34 }}
          >
            {saving === 'new' ? '...' : 'Add Rule'}
          </button>
        </div>
      </div>

      {deleteId && (
        <ConfirmDialog
          title="Delete Rule"
          message="This rule will be permanently deleted."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}

// ── Inline editable rule row ──────────────────────────────────────────────────
function RuleRow({ rule, allSteps, saving, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    condition:    rule.condition,
    next_step_id: rule.next_step_id || '',
    priority:     rule.priority,
  })

  function handleSave() {
    onUpdate({ ...form, next_step_id: form.next_step_id || null, priority: parseInt(form.priority) || 99 })
    setEditing(false)
  }

  const nextStepName = allSteps.find(s => s.id === rule.next_step_id)?.name

  return (
    <div className="rule-row">
      {/* Priority */}
      <div>
        {editing ? (
          <input
            type="number"
            className="form-control"
            style={{ padding: '4px 8px', fontSize: 12 }}
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          />
        ) : (
          <div className="rule-priority-badge">{rule.priority}</div>
        )}
      </div>

      {/* Condition */}
      <div>
        {editing ? (
          <input
            className="form-control"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            value={form.condition}
            onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
          />
        ) : (
          <code className="text-mono" style={{ color: rule.condition === 'DEFAULT' ? 'var(--amber)' : 'var(--text)' }}>
            {rule.condition}
          </code>
        )}
      </div>

      {/* Next step */}
      <div>
        {editing ? (
          <select
            className="form-control"
            value={form.next_step_id}
            onChange={e => setForm(f => ({ ...f, next_step_id: e.target.value }))}
          >
            <option value="">— End Workflow —</option>
            {allSteps.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 12, color: nextStepName ? 'var(--text-2)' : 'var(--text-3)' }}>
            {nextStepName || '— End —'}
          </span>
        )}
      </div>

      {/* Status indicator placeholder */}
      <div />

      {/* Actions */}
      <div className="flex gap-8">
        {editing ? (
          <>
            <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>×</button>
          </>
        ) : (
          <>
            <button className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={onDelete}>Del</button>
          </>
        )}
      </div>
    </div>
  )
}
