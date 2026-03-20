import { useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../common/Toast'

export default function RuleSandbox({ rules = [], inputSchema = {} }) {
  const toast = useToast()
  const [inputJson, setInputJson] = useState(
    JSON.stringify(buildSampleInput(inputSchema), null, 2)
  )
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [jsonErr, setJsonErr] = useState(null)

  function buildSampleInput(schema) {
    const sample = {}
    for (const [key, def] of Object.entries(schema || {})) {
      if (def.type === 'number')  sample[key] = 100
      else if (def.type === 'boolean') sample[key] = true
      else if (def.allowed_values?.length) sample[key] = def.allowed_values[0]
      else sample[key] = ''
    }
    return sample
  }

  function handleInputChange(val) {
    setInputJson(val)
    try { JSON.parse(val); setJsonErr(null) }
    catch { setJsonErr('Invalid JSON') }
  }

  async function handleRun() {
    setJsonErr(null)
    let parsed
    try { parsed = JSON.parse(inputJson) }
    catch { setJsonErr('Invalid JSON — fix before running'); return }

    if (rules.length === 0) { toast.info('No rules to test'); return }

    setLoading(true)
    try {
      const res = await api.simulate({ rules, input_data: parsed })
      setResult(res)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div>
          <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>★ Rule Sandbox</p>
          <p className="text-muted">Test your rules against sample input before saving</p>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={loading || !!jsonErr}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Running...</> : '▶ Run Test'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Input */}
        <div>
          <p className="form-label" style={{ marginBottom: 6 }}>Input Data (JSON)</p>
          <textarea
            className="form-control"
            style={{ height: 180, fontFamily: 'var(--mono)', fontSize: 12 }}
            value={inputJson}
            onChange={e => handleInputChange(e.target.value)}
            spellCheck={false}
          />
          {jsonErr && <p className="form-error" style={{ marginTop: 4 }}>{jsonErr}</p>}
        </div>

        {/* Result */}
        <div>
          <p className="form-label" style={{ marginBottom: 6 }}>Result</p>
          {!result ? (
            <div style={{
              height: 180, border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <p className="text-muted">Run the test to see results</p>
            </div>
          ) : (
            <div style={{ height: 180, overflowY: 'auto' }}>
              {/* Match indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                padding: '8px 10px', borderRadius: 'var(--radius)',
                background: result.has_match ? 'var(--green-dim)' : 'var(--red-dim)',
                border: `1px solid ${result.has_match ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
              }}>
                <span style={{ fontSize: 16 }}>{result.has_match ? '✓' : '✗'}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: result.has_match ? 'var(--green)' : 'var(--red)' }}>
                    {result.has_match ? 'Rule matched' : 'No rule matched'}
                  </div>
                  {result.has_match && result.matched_rule && (
                    <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {result.matched_rule.condition}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-rule evaluation log */}
              {result.evaluation_log?.map((entry, i) => (
                <div key={i} className="rule-eval-row">
                  <span style={{ fontSize: 10, width: 16, textAlign: 'right', color: 'var(--text-3)' }}>
                    {entry.priority}
                  </span>
                  <span className={entry.result ? 'rule-result-true' : 'rule-result-false'}>
                    {entry.result ? '✓' : '✗'}
                  </span>
                  <code className="text-mono truncate" style={{ flex: 1, fontSize: 11 }}>
                    {entry.rule}
                  </code>
                  {entry.error && (
                    <span style={{ fontSize: 10, color: 'var(--red)' }}>ERR</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
