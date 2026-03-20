import { useState, useCallback } from 'react'

// BUG-001 FIX: rows stored as array with stable _id keys — no focus loss on typing
// BUG-002 FIX: allowedRaw stores raw string while typing, split only on blur/add

const TYPES = ['string', 'number', 'boolean']

function toRows(schema) {
  return Object.entries(schema || {}).map(([name, def], idx) => ({
    _id:        idx,
    name,
    type:       def.type           || 'string',
    required:   def.required       || false,
    allowedRaw: (def.allowed_values || []).join(', '),
  }))
}

function toSchema(rows) {
  const result = {}
  for (const row of rows) {
    const entry = { type: row.type, required: row.required }
    const vals  = row.allowedRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (vals.length) entry.allowed_values = vals
    result[row.name] = entry
  }
  return result
}

export default function SchemaEditor({ schema = {}, onChange }) {
  const [rows,     setRows]     = useState(() => toRows(schema))
  const [newField, setNewField] = useState({ name: '', type: 'string', required: false, allowedRaw: '' })

  const commit = useCallback((updatedRows) => {
    onChange(toSchema(updatedRows))
  }, [onChange])

  function updateRow(id, key, value) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [key]: value } : r))
  }

  function removeRow(id) {
    const next = rows.filter(r => r._id !== id)
    setRows(next)
    commit(next)
  }

  function addField() {
    const name = newField.name.trim()
    if (!name) return
    const next = [...rows, { _id: Date.now(), name, type: newField.type, required: newField.required, allowedRaw: newField.allowedRaw }]
    setRows(next)
    commit(next)
    setNewField({ name: '', type: 'string', required: false, allowedRaw: '' })
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <p className="text-muted" style={{ marginBottom: 16 }}>
        Define the fields that must be provided when executing this workflow.
      </p>

      {rows.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 20px', marginBottom: 16 }}>
          <p>No fields defined yet — add a field below</p>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Allowed Values (comma separated)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row._id}>
                  <td>
                    <input
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={row.name}
                      onChange={e => updateRow(row._id, 'name', e.target.value)}
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <select
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={row.type}
                      onChange={e => {
                        const next = rows.map(r => r._id === row._id ? { ...r, type: e.target.value } : r)
                        setRows(next); commit(next)
                      }}
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.required}
                      style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      onChange={e => {
                        const next = rows.map(r => r._id === row._id ? { ...r, required: e.target.checked } : r)
                        setRows(next); commit(next)
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      placeholder="High, Medium, Low"
                      value={row.allowedRaw}
                      onChange={e => updateRow(row._id, 'allowedRaw', e.target.value)}
                      onBlur={() => commit(rows)}
                    />
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => removeRow(row._id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="form-label" style={{ marginBottom: 10 }}>Add Field</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 70px 1fr 80px', gap: 8, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Name *</label>
            <input
              className="form-control"
              placeholder="e.g. amount"
              value={newField.name}
              onChange={e => setNewField(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addField()}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Type</label>
            <select className="form-control" value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Required</label>
            <div style={{ height: 34, display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={newField.required} style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))} />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Allowed Values</label>
            <input className="form-control" placeholder="High, Medium, Low" value={newField.allowedRaw}
              onChange={e => setNewField(f => ({ ...f, allowedRaw: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addField()} />
          </div>
          <button className="btn btn-primary" style={{ height: 34 }} onClick={addField}>Add</button>
        </div>
      </div>

      {rows.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary className="text-muted" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 12 }}>View raw JSON schema</summary>
          <pre className="code-block" style={{ marginTop: 8 }}>{JSON.stringify(toSchema(rows), null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
