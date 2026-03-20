import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

export default function GraphView({ workflow, execution }) {
  const steps = workflow?.steps || []
  const logs  = execution?.step_logs || []

  // Determine status for each step from execution logs
  const stepStatus = useMemo(() => {
    const map = {}
    for (const log of logs) {
      map[log.step_id] = log.status
    }
    return map
  }, [logs])

  const currentStepId = execution?.current_step_id

  const initialNodes = useMemo(() => {
    if (steps.length === 0) return []

    // Auto-layout: arrange steps in a vertical chain
    // Detect branches by next_step_id connections
    const allRuleTargets = {}
    for (const step of steps) {
      for (const rule of step.rules || []) {
        if (rule.next_step_id) {
          allRuleTargets[rule.next_step_id] = (allRuleTargets[rule.next_step_id] || 0) + 1
        }
      }
    }

    return steps.map((step, idx) => {
      const status = stepStatus[step.id]
      const isActive = step.id === currentStepId

      let nodeClass = ''
      if (isActive) nodeClass = 'node-active'
      else if (status === 'completed') nodeClass = 'node-completed'
      else if (status === 'failed')    nodeClass = 'node-failed'

      const typeColors = {
        task:         '#3b82f6',
        approval:     '#f59e0b',
        notification: '#6c63ff',
      }

      return {
        id:       step.id,
        type:     'default',
        position: { x: 260, y: idx * 120 + 40 },
        className: nodeClass,
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: typeColors[step.step_type] || '#888',
                marginRight: 6, marginBottom: 2, verticalAlign: 'middle'
              }} />
              <strong style={{ fontSize: 12 }}>{step.name}</strong>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase' }}>
                {step.step_type}
              </div>
              {workflow?.start_step_id === step.id && (
                <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>START</div>
              )}
            </div>
          )
        },
        style: { minWidth: 160 }
      }
    })
  }, [steps, stepStatus, currentStepId, workflow])

  const initialEdges = useMemo(() => {
    const edges = []
    for (const step of steps) {
      for (const rule of step.rules || []) {
        if (!rule.next_step_id) continue
        const label = rule.condition === 'DEFAULT'
          ? 'default'
          : rule.condition.length > 28
            ? rule.condition.slice(0, 28) + '…'
            : rule.condition

        edges.push({
          id:     rule.id,
          source: step.id,
          target: rule.next_step_id,
          label,
          labelStyle: { fontSize: 10, fill: '#6b6f85' },
          labelBgStyle: { fill: '#161820', fillOpacity: 0.85 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3a3d52' },
          style: { stroke: '#3a3d52' },
          animated: step.id === currentStepId,
        })
      }
    }
    return edges
  }, [steps, currentStepId])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  if (steps.length === 0) {
    return (
      <div className="graph-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No steps defined — add steps to see the workflow graph</p>
      </div>
    )
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-16 items-center" style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green-dim)', border: '1px solid var(--green)', display: 'inline-block' }} />
          Completed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'inline-block' }} />
          Active
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red-dim)', border: '1px solid var(--red)', display: 'inline-block' }} />
          Failed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} /> Task
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Approval
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c63ff', display: 'inline-block' }} /> Notification
        </span>
      </div>

      <div className="graph-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-right"
        >
          <Background color="#2e3040" gap={24} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.className?.includes('node-completed')) return '#22c55e'
              if (node.className?.includes('node-active'))    return '#6c63ff'
              if (node.className?.includes('node-failed'))    return '#ef4444'
              return '#252730'
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
