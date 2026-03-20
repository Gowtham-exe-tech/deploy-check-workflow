// Production: VITE_API_URL is set to Render backend URL via Vercel env variable
// Development: falls back to localhost:8001
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || err.message || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Workflows
  listWorkflows: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/workflows${q ? '?' + q : ''}`)
  },
  getWorkflow:    (id)       => request('GET',    `/workflows/${id}`),
  createWorkflow: (data)     => request('POST',   '/workflows', data),
  updateWorkflow: (id, data) => request('PUT',    `/workflows/${id}`, data),
  deleteWorkflow: (id)       => request('DELETE', `/workflows/${id}`),

  // Steps
  listSteps:  (workflowId)       => request('GET',    `/workflows/${workflowId}/steps`),
  createStep: (workflowId, data) => request('POST',   `/workflows/${workflowId}/steps`, data),
  updateStep: (id, data)         => request('PUT',    `/steps/${id}`, data),
  deleteStep: (id)               => request('DELETE', `/steps/${id}`),

  // Rules
  listRules:  (stepId)       => request('GET',    `/steps/${stepId}/rules`),
  createRule: (stepId, data) => request('POST',   `/steps/${stepId}/rules`, data),
  updateRule: (id, data)     => request('PUT',    `/rules/${id}`, data),
  deleteRule: (id)           => request('DELETE', `/rules/${id}`),

  // Executions
  startExecution:   (workflowId, data) => request('POST', `/workflows/${workflowId}/execute`, data),
  getExecution:     (id)               => request('GET',  `/executions/${id}`),
  listExecutions:   (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/executions${q ? '?' + q : ''}`)
  },
  cancelExecution:  (id) => request('POST', `/executions/${id}/cancel`),
  retryExecution:   (id) => request('POST', `/executions/${id}/retry`),
  approveExecution: (id) => request('POST', `/executions/${id}/approve`),

  // Simulate (rule sandbox)
  simulate: (data) => request('POST', '/simulate', data),
}
