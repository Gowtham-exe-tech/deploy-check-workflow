import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'
import GraphView from '../GraphView'

export default function ExecutionView() {
  const { id }   = useParams()   // workflow id
  const navigate = useNavigate()
  const toast    = useToast()
  const pollRef  = useRef(null)

  const [workflow,   setWorkflow]   = useState(null)
  const [execution,  setExecution]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [running,    setRunning]    = useState(false)
  const [inputData,  setInputData]  = useState({})
  const [inputErrors, setInputErrors] = useState({})
  const [activeLog,  setActiveLog]  = useState(null)
  const [tab,        setTab]        = useState('form')

  useEffect(() => {
    loadWorkflow()
    return () => clearInterval(pollRef.current)
  }, [id])

  async function loadWorkflow() {
    try {
      const wf = await api.getWorkflow(id)
      setWorkflow(wf)
      // Pre-fill input form from schema
      const defaults = {}
      for (const [key, def] of Object.entries(wf.input_schema || {})) {
        defaults[key] = def.type === 'number' ? '' : (def.allowed_values?.[0] || '')
      }
      setInputData(defaults)
    } catch {
      toast.error('Failed to load workflow')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  function startPolling(execId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const ex = await api.getExecution(execId)
        setExecution(ex)
        if (['completed', 'failed', 'canceled'].includes(ex.status)) {
          clearInterval(pollRef.current)
          setRunning(false)
        }
      } catch {}
    }, 1500)
  }

  async function handleExecute() {
    // Validate required fields
    const errors = {}
    for (const [key, def] of Object.entries(workflow?.input_schema || {})) {
      if (def.required && (inputData[key] === '' || inputData[key] === undefined)) {
        errors[key] = 'Required'
      }
    }
    if (Object.keys(errors).length) {
      setInputErrors(errors)
      toast.error('Fill in required fields')
      return
    }
    setInputErrors({})

    // Cast numeric fields
    const castData = {}
    for (const [key, val] of Object.entries(inputData)) {
      const def = workflow?.input_schema?.[key]
      castData[key] = def?.type === 'number' ? Number(val) : val
    }

    setRunning(true)
    setExecution(null)
    try {
      const ex = await api.startExecution(id, { data: castData })
      setExecution(ex)
      setTab('progress')
      if (!['completed', 'failed', 'canceled'].includes(ex.status)) {
        startPolling(ex.id)
      } else {
        setRunning(false)
      }
      toast.info('Execution started')
    } catch (e) {
      toast.error(e.message)
      setRunning(false)
    }
  }

  async function handleCancel() {
    if (!execution) return
    try {
      await api.cancelExecution(execution.id)
      toast.info('Execution canceled')
      clearInterval(pollRef.current)
      setRunning(false)
      const ex = await api.getExecution(execution.id)
      setExecution(ex)
    } catch (e) { toast.error(e.message) }
  }

  async function handleRetry() {
    if (!execution) return
    setRunning(true)
    try {
      const ex = await api.retryExecution(execution.id)
      setExecution(ex)
      startPolling(ex.id)
      toast.info('Retrying...')
    } catch (e) { toast.error(e.message); setRunning(false) }
  }

  async function handleApprove() {
    if (!execution) return
    try {
      const ex = await api.approveExecution(execution.id)
      setExecution(ex)
      if (!['completed', 'failed', 'canceled'].includes(ex.status)) {
        startPolling(ex.id)
      }
      toast.success('Approved — workflow continuing')
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const schema  = workflow?.input_schema || {}
  const hasSchema = Object.keys(schema).length > 0
  const logs    = execution?.step_logs || []
  const statusColor = {
    completed:   'var(--green)',
    failed:      'var(--red)',
    in_progress: 'var(--blue)',
    pending:     'var(--amber)',
    canceled:    'var(--text-3)',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/workflows/${id}`)}>
              ← Back
            </button>
            <div>
              <h2 className="page-title">Execute: {workflow?.name}</h2>
              <p className="page-subtitle">v{workflow?.version}</p>
            </div>
          </div>
        </div>
        {execution && (
          <div className="flex gap-8 items-center">
            <span className={`badge badge-${execution.status}`}>{execution.status}</span>
            {execution.status === 'pending' && execution.step_logs?.length > 0 && (
              <button className="btn btn-secondary" onClick={handleApprove}>
                ✓ Approve Step
              </button>
            )}
            {['in_progress', 'pending'].includes(execution.status) && (
              <button className="btn btn-danger btn-sm" onClick={handleCancel}>Cancel</button>
            )}
            {execution.status === 'failed' && (
              <button className="btn btn-secondary btn-sm" onClick={handleRetry}>↻ Retry</button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'form' ? 'active' : ''}`} onClick={() => setTab('form')}>
          Input
        </button>
        <button className={`tab-btn ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')} disabled={!execution}>
          Progress {execution && `(${execution.status})`}
        </button>
        <button className={`tab-btn ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>
          Graph
        </button>
        <button className={`tab-btn ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')} disabled={!execution}>
          Logs {logs.length > 0 && `(${logs.length})`}
        </button>
      </div>

      {/* Tab: Input Form */}
      {tab === 'form' && (
        <div style={{ maxWidth: 520 }}>
          {!hasSchema ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="text-muted">This workflow has no input schema defined.</p>
            </div>
          ) : (
            Object.entries(schema).map(([key, def]) => (
              <div className="form-group" key={key}>
                <label className="form-label">
                  {key}
                  {def.required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
                  <span style={{ color: 'var(--text-3)', marginLeft: 6, fontWeight: 400 }}>({def.type})</span>
                </label>
                {def.allowed_values ? (
                  <select
                    className="form-control"
                    value={inputData[key] || ''}
                    onChange={e => setInputData(d => ({ ...d, [key]: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {def.allowed_values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    type={def.type === 'number' ? 'number' : 'text'}
                    placeholder={def.type === 'number' ? '0' : `Enter ${key}`}
                    value={inputData[key] || ''}
                    onChange={e => setInputData(d => ({ ...d, [key]: e.target.value }))}
                  />
                )}
                {inputErrors[key] && <p className="form-error">{inputErrors[key]}</p>}
              </div>
            ))
          )}

          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={running}
            style={{ marginTop: 8 }}
          >
            {running
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Starting...</>
              : '▶ Start Execution'
            }
          </button>
        </div>
      )}

      {/* Tab: Progress */}
      {tab === 'progress' && execution && (
        <div>
          {/* Status card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-16">
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>Execution ID</span>
                  <code className="text-mono">{execution.id.slice(0, 8)}...</code>
                </div>
                <div className="flex gap-16" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  <span>Started: {new Date(execution.started_at).toLocaleTimeString()}</span>
                  {execution.ended_at && <span>Ended: {new Date(execution.ended_at).toLocaleTimeString()}</span>}
                  {execution.retries > 0 && <span>Retries: {execution.retries}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: statusColor[execution.status] }}>
                  {execution.status.replace('_', ' ').toUpperCase()}
                </div>
                {running && <div className="spinner" style={{ margin: '4px auto 0' }} />}
              </div>
            </div>
          </div>

          {/* Step timeline */}
          <div>
            {logs.map((log, idx) => (
              <StepLogCard
                key={log.id}
                log={log}
                idx={idx}
                isExpanded={activeLog === log.id}
                onToggle={() => setActiveLog(activeLog === log.id ? null : log.id)}
                workflow={workflow}
              />
            ))}
            {running && logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p className="text-muted">Running...</p>
              </div>
            )}
          </div>

          {/* Waiting for approval */}
          {execution.status === 'pending' && logs.length > 0 && (
            <div className="approval-banner">
              <div className="approval-banner-text">
                <p className="approval-banner-title">⏳ Waiting for Approval</p>
                <p className="approval-banner-sub">An approval step is paused. Click approve to continue.</p>
              </div>
              <div className="approval-banner-action">
                <button className="btn btn-primary" onClick={handleApprove}>
                  ✓ Approve & Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Graph */}
      {tab === 'graph' && (
        <GraphView
          workflow={workflow}
          execution={execution}
        />
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && execution && (
        <div>
          <div className="flex justify-between items-center mb-16">
            <p className="text-muted">{logs.length} step log{logs.length !== 1 ? 's' : ''}</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ execution, logs }, null, 2)], { type: 'application/json' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `execution-${execution.id.slice(0, 8)}.json`; a.click()
              }}
            >
              ↓ Export JSON
            </button>
          </div>
          <pre className="code-block" style={{ maxHeight: 560, overflow: 'auto' }}>
            {JSON.stringify({ execution, logs }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function StepLogCard({ log, idx, isExpanded, onToggle, workflow }) {
  const evalRules = Array.isArray(log.evaluated_rules) ? log.evaluated_rules : []
  const nextStepName = workflow?.steps?.find(s => s.id === log.selected_next_step)?.name

  const duration = log.started_at && log.ended_at
    ? ((new Date(log.ended_at) - new Date(log.started_at)) / 1000).toFixed(2) + 's'
    : null

  return (
    <div className="log-step">
      <div className="log-step-header" onClick={onToggle}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: log.status === 'completed' ? 'var(--green-dim)' : 'var(--red-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: log.status === 'completed' ? 'var(--green)' : 'var(--red)',
        }}>
          {idx + 1}
        </span>
        <span className={`step-dot step-dot-${log.step_type}`} />
        <span className="log-step-name">{log.step_name}</span>
        <div className="log-step-meta">
          <span className={`badge badge-${log.step_type}`}>{log.step_type}</span>
          <span className={`badge badge-${log.status}`}>{log.status}</span>
          {duration && <span className="text-mono" style={{ fontSize: 11 }}>{duration}</span>}
          <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="log-step-body">
          <p className="form-label" style={{ marginBottom: 8 }}>Rule Evaluations</p>
          {evalRules.length === 0 && <p className="text-muted">No rules evaluated</p>}
          {evalRules.map((entry, i) => (
            <div key={i} className="rule-eval-row">
              <span style={{ width: 18, textAlign: 'right', color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>{entry.priority}</span>
              <span className={entry.result ? 'rule-result-true' : 'rule-result-false'}>
                {entry.result ? '✓' : '✗'}
              </span>
              <code className="rule-eval-condition">{entry.rule}</code>
              {entry.error && <span style={{ fontSize: 10, color: 'var(--red)', flexShrink: 0 }}>Syntax error</span>}
            </div>
          ))}

          <div style={{ marginTop: 12, display: 'flex', gap: 20, fontSize: 12 }}>
            {nextStepName && (
              <span>→ <strong style={{ color: 'var(--text)' }}>{nextStepName}</strong></span>
            )}
            {!log.selected_next_step && log.status === 'completed' && (
              <span style={{ color: 'var(--green)' }}>→ Workflow ended</span>
            )}
            {log.error_message && (
              <span style={{ color: 'var(--red)' }}>Error: {log.error_message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
