import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'
import { ConfirmDialog } from '../common/ConfirmDialog'

export default function WorkflowList() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [workflows, setWorkflows] = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [deleteId,  setDeleteId]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      const res = await api.listWorkflows(params)
      setWorkflows(res.items)
      setTotal(res.total)
    } catch (e) {
      toast.error('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 350)
    return () => clearTimeout(t)
  }, [search])

  async function handleDelete() {
    try {
      await api.deleteWorkflow(deleteId)
      toast.success('Workflow deleted')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Workflows</h2>
          <p className="page-subtitle">{total} workflow{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Workflow
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-12 mb-16">
        <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : workflows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
          <h3>No workflows found</h3>
          <p>{search ? 'Try a different search term' : 'Create your first workflow to get started'}</p>
          {!search && (
            <button className="btn btn-primary mt-16" onClick={() => navigate('/workflows/new')}>
              + New Workflow
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Steps</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{wf.name}</div>
                      {wf.description && (
                        <div className="text-muted truncate" style={{ maxWidth: 280 }}>{wf.description}</div>
                      )}
                    </td>
                    <td>
                      <span className="text-mono">v{wf.version}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${wf.is_active ? 'active' : 'canceled'}`}>
                        {wf.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-mono">{wf.steps?.length ?? '—'}</span>
                    </td>
                    <td className="td-mono">
                      {new Date(wf.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/workflows/${wf.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/workflows/${wf.id}/execute`)}
                        >
                          Execute
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteId(wf.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Workflow"
          message="This will permanently delete the workflow and all its steps, rules, and execution history."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
