import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'
import { ConfirmDialog } from '../common/ConfirmDialog'
import StepModal from './StepModal'
import SchemaEditor from './SchemaEditor'

export default function WorkflowEditor() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()
  const isNew    = !id || id === 'new'

  const [loading,     setLoading]     = useState(!isNew)
  const [saving,      setSaving]      = useState(false)
  const [workflow,    setWorkflow]    = useState(null)
  const [steps,       setSteps]       = useState([])
  const [form,        setForm]        = useState({ name: '', description: '', input_schema: {} })
  const [stepModal,   setStepModal]   = useState(null)   // null | 'new' | step object
  const [deleteStepId, setDeleteStepId] = useState(null)
  const [searchParams]                = useSearchParams()
  const [tab,         setTab]         = useState(searchParams.get('tab') || 'details')

  useEffect(() => {
    if (!isNew) loadWorkflow()
  }, [id])

  async function loadWorkflow() {
    setLoading(true)
    try {
      const wf = await api.getWorkflow(id)
      setWorkflow(wf)
      setSteps(wf.steps || [])
      setForm({
        name:         wf.name,
        description:  wf.description || '',
        input_schema: wf.input_schema || {},
      })
    } catch (e) {
      toast.error('Failed to load workflow')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const wf = await api.createWorkflow(form)
        toast.success('Workflow created')
        navigate(`/workflows/${wf.id}`)
      } else {
        await api.updateWorkflow(id, form)
        toast.success('Workflow saved')
        loadWorkflow()
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSetStartStep(stepId) {
    try {
      await api.updateWorkflow(id, { ...form, start_step_id: stepId })
      toast.success('Start step updated')
      loadWorkflow()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDeleteStep() {
    try {
      await api.deleteStep(deleteStepId)
      toast.success('Step deleted')
      setDeleteStepId(null)
      loadWorkflow()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleStepSaved() {
    setStepModal(null)
    if (!isNew) loadWorkflow()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
              ← Back
            </button>
            <h2 className="page-title">
              {isNew ? 'New Workflow' : form.name || 'Edit Workflow'}
            </h2>
            {workflow && (
              <span className="badge badge-active">v{workflow.version}</span>
            )}
          </div>
        </div>
        <div className="flex gap-8">
          {!isNew && (
            <button className="btn btn-secondary" onClick={() => navigate(`/workflows/${id}/execute`)}>
              ▶ Execute
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{width:14,height:14}}/>Saving...</> : 'Save Workflow'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
        <button className={`tab-btn ${tab === 'schema'  ? 'active' : ''}`} onClick={() => setTab('schema')}>Input Schema</button>
        {!isNew && <button className={`tab-btn ${tab === 'steps' ? 'active' : ''}`} onClick={() => setTab('steps')}>Steps ({steps.length})</button>}
      </div>

      {/* Tab: Details */}
      {tab === 'details' && (
        <div style={{ maxWidth: 560 }}>
          <div className="form-group">
            <label className="form-label">Workflow Name *</label>
            <input
              className="form-control"
              placeholder="e.g. Expense Approval"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              placeholder="What does this workflow do?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Tab: Input Schema */}
      {tab === 'schema' && (
        <SchemaEditor
          schema={form.input_schema}
          onChange={schema => setForm(f => ({ ...f, input_schema: schema }))}
        />
      )}

      {/* Tab: Steps */}
      {tab === 'steps' && !isNew && (
        <div>
          <div className="flex justify-between items-center mb-16">
            <p className="text-muted">Define the steps in this workflow. Set a start step and configure rules for each step.</p>
            <button className="btn btn-primary" onClick={() => setStepModal('new')}>
              + Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <div className="empty-state">
              <h3>No steps yet</h3>
              <p>Add the first step to this workflow</p>
            </div>
          ) : (
            <div className="flex-col gap-8">
              {steps.map((step, idx) => (
                <div key={step.id} className={`step-card step-card-${step.step_type}`}>
                  <div className="flex items-center justify-between" style={{ gap: 12 }}>
                    <div className="flex items-center gap-12">
                      <span className="text-mono" style={{ color: 'var(--text-3)', minWidth: 24 }}>{idx + 1}</span>
                      <span className={`step-dot step-dot-${step.step_type}`} />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{step.name}</div>
                        <div className="text-muted">{step.step_type}</div>
                      </div>
                      <span className={`badge badge-${step.step_type}`}>{step.step_type}</span>
                      {workflow?.start_step_id === step.id && (
                        <span className="badge badge-active">Start</span>
                      )}
                    </div>
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/steps/${step.id}/rules`)}>
                        Rules ({step.rules?.length ?? 0})
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleSetStartStep(step.id)}>
                        Set Start
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setStepModal(step)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteStepId(step.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step modal */}
      {stepModal && (
        <StepModal
          workflowId={id}
          step={stepModal === 'new' ? null : stepModal}
          allSteps={steps}
          onSaved={handleStepSaved}
          onClose={() => setStepModal(null)}
        />
      )}

      {deleteStepId && (
        <ConfirmDialog
          title="Delete Step"
          message="This will delete the step and all its rules."
          danger
          onConfirm={handleDeleteStep}
          onCancel={() => setDeleteStepId(null)}
        />
      )}
    </div>
  )
}
