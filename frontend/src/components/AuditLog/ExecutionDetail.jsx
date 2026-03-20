import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'
import GraphView from '../GraphView'

export default function ExecutionDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()

  const [execution, setExecution] = useState(null)
  const [workflow,  setWorkflow]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('steps')
  const [activeLog, setActiveLog] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const ex = await api.getExecution(id)
      setExecution(ex)
      const wf = await api.getWorkflow(ex.workflow_id)
      setWorkflow(wf)
    } catch {
      toast.error('Execution not found')
      navigate('/audit')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    try {
      const ex = await api.approveExecution(execution.id)
      setExecution(ex)
      toast.success('Approved — workflow continuing')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleRetry() {
    try {
      const ex = await api.retryExecution(execution.id)
      setExecution(ex)
      toast.success('Retrying from failed step...')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )
  if (!execution) return null

  const logs = execution.step_logs || []

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
              ← Audit Log
            </button>
            <div>
              <h2 className="page-title">Execution Detail</h2>
              <p className="page-subtitle">{workflow?.name} · v{execution.workflow_version}</p>
            </div>
          </div>
        </div>

        {/* Action buttons — depend on execution status */}
        <div className="page-header-actions">
          <span className={`badge badge-${execution.status}`}>{execution.status}</span>

          {/* PENDING — waiting for approval */}
          {execution.status === 'pending' && (
            <button className="btn btn-primary" onClick={handleApprove}>
              ✓ Approve & Continue
            </button>
          )}

          {/* FAILED — show all three options */}
          {execution.status === 'failed' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleRetry}
                title="Re-runs from the failed step with the same input data"
              >
                ↻ Retry Same Data
              </button>

              {execution.current_step_id && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/steps/${execution.current_step_id}/rules`)}
                  title="Go fix the rules on the step that failed"
                >
                  ✎ Fix Rules on Failed Step
                </button>
              )}

              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/workflows/${execution.workflow_id}/execute`)}
                title="Start a fresh execution with new input data"
              >
                ▶ Re-run with New Input
              </button>
            </>
          )}

          {/* CANCELED or COMPLETED — offer to run again */}
          {(execution.status === 'canceled' || execution.status === 'completed') && (
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/workflows/${execution.workflow_id}/execute`)}
            >
              ▶ Run Again
            </button>
          )}
        </div>
      </div>

      {/* ── Approval waiting banner ──────────────────────────────────────── */}
      {execution.status === 'pending' && (
        <div className="approval-banner">
          <div className="approval-banner-text">
            <p className="approval-banner-title">⏳ Waiting for Approval</p>
            <p className="approval-banner-sub">
              This execution is paused at an approval step. Click Approve to continue the workflow.
            </p>
          </div>
          <div className="approval-banner-action">
            <button className="btn btn-primary" onClick={handleApprove}>
              ✓ Approve & Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Failed execution help banner ─────────────────────────────────── */}
      {execution.status === 'failed' && (() => {
        const failedStep = workflow?.steps?.find(s => s.id === execution.current_step_id)
        return (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '14px 16px', borderRadius: 'var(--radius-lg)',
            background: 'var(--red-dim)', border: '1px solid rgba(240,100,100,0.25)',
            marginBottom: 20
          }}>
            <span style={{ color: 'var(--red)', fontSize: 16, flexShrink: 0, marginTop: 1 }}>✗</span>
            <div style={{ fontSize: 13, flex: 1 }}>
              <p style={{ color: 'var(--red)', fontWeight: 500, marginBottom: 6 }}>
                Execution failed
                {failedStep && (
                  <span style={{ color: 'var(--text-2)', fontWeight: 400, marginLeft: 8 }}>
                    at step: <strong style={{ color: 'var(--text)' }}>{failedStep.name}</strong>
                    <span className={`badge badge-${failedStep.step_type}`} style={{ marginLeft: 6 }}>
                      {failedStep.step_type}
                    </span>
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="text-muted">What would you like to do?</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-secondary" onClick={handleRetry}>
                  ↻ Retry Same Data
                </button>
                {execution.current_step_id && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/steps/${execution.current_step_id}/rules`)}
                  >
                    ✎ Fix Rules on Failed Step
                  </button>
                )}
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => navigate(`/workflows/${execution.workflow_id}/execute`)}
                >
                  ▶ Re-run with New Input
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Meta info card ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['Execution ID', <code className="text-mono" key="id">{execution.id.slice(0, 12)}…</code>],
            ['Started By',   execution.triggered_by || 'user'],
            ['Status',       <span key="st" className={`badge badge-${execution.status}`}>{execution.status}</span>],
            ['Start Time',   new Date(execution.started_at).toLocaleString()],
            ['End Time',     execution.ended_at ? new Date(execution.ended_at).toLocaleString() : '—'],
            ['Retries',      execution.retries],
            ['Steps Run',    logs.length],
            ['Version',      `v${execution.workflow_version}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="form-label" style={{ marginBottom: 3 }}>{label}</div>
              <div style={{ color: 'var(--text)', fontSize: 13 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          className={`tab-btn ${tab === 'steps' ? 'active' : ''}`}
          onClick={() => setTab('steps')}
        >
          Steps ({logs.length})
        </button>
        <button
          className={`tab-btn ${tab === 'graph' ? 'active' : ''}`}
          onClick={() => setTab('graph')}
        >
          Graph
        </button>
        <button
          className={`tab-btn ${tab === 'input' ? 'active' : ''}`}
          onClick={() => setTab('input')}
        >
          Input Data
        </button>
        <button
          className={`tab-btn ${tab === 'raw' ? 'active' : ''}`}
          onClick={() => setTab('raw')}
        >
          Raw JSON
        </button>
      </div>

      {/* ── Steps tab ────────────────────────────────────────────────────── */}
      {tab === 'steps' && (
        <div>
          {logs.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3>No steps ran</h3>
              <p>The execution did not reach any steps</p>
            </div>
          )}

          {logs.map((log, idx) => {
            const evalRules = Array.isArray(log.evaluated_rules) ? log.evaluated_rules : []
            const nextStep  = workflow?.steps?.find(s => s.id === log.selected_next_step)
            const duration  = log.started_at && log.ended_at
              ? ((new Date(log.ended_at) - new Date(log.started_at)) / 1000).toFixed(2) + 's'
              : null

            return (
              <div key={log.id} className="log-step" style={{ marginBottom: 8 }}>
                {/* Step header — clickable to expand */}
                <div
                  className="log-step-header"
                  onClick={() => setActiveLog(activeLog === log.id ? null : log.id)}
                >
                  {/* Step number circle */}
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: log.status === 'completed' ? 'var(--green-dim)' : 'var(--red-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: log.status === 'completed' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {idx + 1}
                  </span>

                  <span className={`step-dot step-dot-${log.step_type}`} />

                  {/* Step name — truncates to avoid pushing badges off */}
                  <span className="log-step-name">{log.step_name}</span>

                  {/* Badges and meta — never wrap */}
                  <div className="log-step-meta">
                    <span className={`badge badge-${log.step_type}`}>{log.step_type}</span>
                    <span className={`badge badge-${log.status}`}>{log.status}</span>
                    {duration && (
                      <span className="text-mono" style={{ fontSize: 11 }}>{duration}</span>
                    )}
                    <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 4 }}>
                      {activeLog === log.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded body */}
                {activeLog === log.id && (
                  <div className="log-step-body">
                    <p className="form-label" style={{ marginBottom: 8 }}>Rule Evaluations</p>

                    {evalRules.length === 0 && (
                      <p className="text-muted">No rules were evaluated</p>
                    )}

                    {evalRules.map((e, i) => (
                      <div key={i} className="rule-eval-row">
                        <span style={{
                          width: 18, textAlign: 'right',
                          color: 'var(--text-3)', fontSize: 11, flexShrink: 0
                        }}>
                          {e.priority}
                        </span>
                        <span className={e.result ? 'rule-result-true' : 'rule-result-false'}>
                          {e.result ? '✓' : '✗'}
                        </span>
                        <code className="rule-eval-condition">{e.rule}</code>
                        {e.error && (
                          <span style={{ fontSize: 10, color: 'var(--red)', flexShrink: 0 }}>
                            Syntax error
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Next step / outcome */}
                    <div style={{ marginTop: 12, fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {nextStep && (
                        <span>
                          → <strong style={{ color: 'var(--text)' }}>{nextStep.name}</strong>
                        </span>
                      )}
                      {!log.selected_next_step && log.status === 'completed' && (
                        <span style={{ color: 'var(--green)' }}>→ Workflow ended here</span>
                      )}
                      {log.error_message && (
                        <span style={{ color: 'var(--red)' }}>
                          Error: {log.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Graph tab ────────────────────────────────────────────────────── */}
      {tab === 'graph' && (
        <GraphView workflow={workflow} execution={execution} />
      )}

      {/* ── Input Data tab ───────────────────────────────────────────────── */}
      {tab === 'input' && (
        <pre className="code-block">
          {JSON.stringify(execution.data, null, 2)}
        </pre>
      )}

      {/* ── Raw JSON tab ─────────────────────────────────────────────────── */}
      {tab === 'raw' && (
        <div>
          <div className="flex justify-between items-center mb-16" style={{ marginBottom: 12 }}>
            <p className="text-muted">Full execution record including all step logs</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ execution, logs }, null, 2)],
                  { type: 'application/json' }
                )
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `execution-${execution.id.slice(0, 8)}.json`
                a.click()
              }}
            >
              ↓ Export JSON
            </button>
          </div>
          <pre className="code-block" style={{ maxHeight: 560, overflow: 'auto' }}>
            {JSON.stringify(execution, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
