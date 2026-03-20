import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'

const STATUS_OPTIONS = ['', 'completed', 'failed', 'pending', 'in_progress', 'canceled']

export default function AuditLog() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [executions, setExecutions] = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [status,     setStatus]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [workflows,  setWorkflows]  = useState({})  // id → name map

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (status) params.status = status
      const res = await api.listExecutions(params)
      setExecutions(res.items)
      setTotal(res.total)

      // build workflow name map for display
      const ids = [...new Set(res.items.map(e => e.workflow_id))]
      const map = { ...workflows }
      for (const wfId of ids) {
        if (!map[wfId]) {
          try {
            const wf = await api.getWorkflow(wfId)
            map[wfId] = wf.name
          } catch { map[wfId] = wfId.slice(0, 8) }
        }
      }
      setWorkflows(map)
    } catch {
      toast.error('Failed to load executions')
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / 20))

  function formatDuration(start, end) {
    if (!start || !end) return '—'
    const ms = new Date(end) - new Date(start)
    if (ms < 1000)  return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Audit Log</h2>
          <p className="page-subtitle">{total} execution{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-12 mb-16">
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <select
            className="form-control"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : executions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <h3>No executions found</h3>
          <p>Run a workflow to see execution history here</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Workflow</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Started By</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Steps Run</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr key={ex.id}>
                    <td className="td-mono">{ex.id.slice(0, 8)}…</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px' }}
                        onClick={() => navigate(`/workflows/${ex.workflow_id}`)}
                      >
                        {workflows[ex.workflow_id] || ex.workflow_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="td-mono">v{ex.workflow_version}</td>
                    <td><span className={`badge badge-${ex.status}`}>{ex.status}</span></td>
                    <td className="td-mono">{ex.triggered_by || 'user'}</td>
                    <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(ex.started_at).toLocaleString()}
                    </td>
                    <td className="td-mono">{formatDuration(ex.started_at, ex.ended_at)}</td>
                    <td className="td-mono">{ex.step_logs?.length ?? 0}</td>
                    <td className="td-actions">
                      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/executions/${ex.id}`)}
                        >
                          View Logs
                        </button>
                        {ex.status === 'failed' && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={async () => {
                              try { await api.retryExecution(ex.id); load(); toast.success('Retrying') }
                              catch (e) { toast.error(e.message) }
                            }}
                          >
                            ↻ Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
