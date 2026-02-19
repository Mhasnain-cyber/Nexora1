"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react"
import type { GraphNode, GraphEdge } from "@/lib/detection-engine"

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  highlightRing?: string | null
}

interface Position {
  x: number
  y: number
  vx: number
  vy: number
}

export function GraphVisualization({ nodes, edges, highlightRing }: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<Map<string, Position>>(new Map())
  const frameRef = useRef<number>(0)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  const initPositions = useCallback(() => {
    const positions = new Map<string, Position>()
    const w = 800
    const h = 600
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length
      const radius = Math.min(w, h) * 0.35
      positions.set(node.id, {
        x: w / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: h / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      })
    })
    positionsRef.current = positions
  }, [nodes])

  const simulate = useCallback(() => {
    const positions = positionsRef.current
    const REPULSION = 2000
    const ATTRACTION = 0.005
    const DAMPING = 0.85
    const CENTER_PULL = 0.001

    const nodesArr = Array.from(positions.entries())
    const cx = 400
    const cy = 300

    // Repulsion
    for (let i = 0; i < nodesArr.length; i++) {
      const [, a] = nodesArr[i]
      for (let j = i + 1; j < nodesArr.length; j++) {
        const [, b] = nodesArr[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
      // Center pull
      a.vx += (cx - a.x) * CENTER_PULL
      a.vy += (cy - a.y) * CENTER_PULL
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = positions.get(edge.source)
      const b = positions.get(edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const force = dist * ATTRACTION
      const fx = (dx / Math.max(dist, 1)) * force
      const fy = (dy / Math.max(dist, 1)) * force
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    // Update positions
    for (const [, pos] of positions) {
      pos.vx *= DAMPING
      pos.vy *= DAMPING
      pos.x += pos.vx
      pos.y += pos.vy
      pos.x = Math.max(30, Math.min(770, pos.x))
      pos.y = Math.max(30, Math.min(570, pos.y))
    }
  }, [edges])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    const positions = positionsRef.current
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Draw edges
    for (const edge of edges) {
      const from = positions.get(edge.source)
      const to = positions.get(edge.target)
      if (!from || !to) continue

      const isHighlighted = highlightRing
        ? nodeMap.get(edge.source)?.ringId === highlightRing && nodeMap.get(edge.target)?.ringId === highlightRing
        : edge.isRingEdge

      let strokeColor = "rgba(107, 113, 148, 0.15)" // normal (grey)
      let lineWidth = 0.5

      if (isHighlighted || edge.edge_type === 'ring_transfer') {
          strokeColor = "#E53E3E" // red
          lineWidth = 2
      } else if (edge.edge_type === 'fan_in') {
          strokeColor = "#3182CE" // blue
          lineWidth = 1.5
      } else if (edge.edge_type === 'fan_out') {
          strokeColor = "#DD6B20" // orange
          lineWidth = 1.5
      } else if (edge.edge_type === 'pass_through') {
          strokeColor = "#D69E2E" // yellow
          lineWidth = 1.5
      }

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.stroke()

      // Arrow
      const angle = Math.atan2(to.y - from.y, to.x - from.x)
      const nodeRadius = 6
      const arrowX = to.x - nodeRadius * 1.5 * Math.cos(angle)
      const arrowY = to.y - nodeRadius * 1.5 * Math.sin(angle)
      const arrowLen = (isHighlighted || edge.edge_type && edge.edge_type !== 'normal') ? 8 : 5
      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(arrowX - arrowLen * Math.cos(angle - 0.4), arrowY - arrowLen * Math.sin(angle - 0.4))
      ctx.lineTo(arrowX - arrowLen * Math.cos(angle + 0.4), arrowY - arrowLen * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fillStyle = strokeColor.replace('0.15', '0.25') // Slight opacity increase for arrow
      ctx.fill()
    }

    // Draw nodes
    for (const node of nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue

      const isHighlighted = highlightRing ? node.ringId === highlightRing : false
      const size = node.isSuspicious ? 8 : 5
      const dimmed = highlightRing && !isHighlighted && !node.isSuspicious

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2)

      if (node.isSuspicious) {
        ctx.fillStyle = dimmed ? "rgba(229, 62, 62, 0.15)" : isHighlighted ? "#E53E3E" : "#ED8936"
        ctx.fill()
        ctx.strokeStyle = dimmed ? "rgba(229, 62, 62, 0.2)" : isHighlighted ? "#C53030" : "#DD6B20"
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        ctx.fillStyle = dimmed ? "rgba(59, 61, 191, 0.08)" : "rgba(59, 61, 191, 0.5)"
        ctx.fill()
        ctx.strokeStyle = dimmed ? "rgba(59, 61, 191, 0.1)" : "rgba(59, 61, 191, 0.7)"
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Labels for suspicious or highlighted
      if ((node.isSuspicious || isHighlighted) && zoom > 0.6) {
        ctx.fillStyle = dimmed ? "rgba(107, 113, 148, 0.3)" : "var(--foreground, #1B1F3B)"
        ctx.font = "9px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(node.id, pos.x, pos.y + size + 12)
      }
    }

    ctx.restore()
  }, [nodes, edges, zoom, offset, highlightRing])

  useEffect(() => {
    initPositions()
    let iterations = 0
    const maxIterations = 150

    const tick = () => {
      if (iterations < maxIterations) {
        simulate()
        iterations++
      }
      draw()
      frameRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frameRef.current)
  }, [initPositions, simulate, draw])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left - offset.x) / zoom
      const y = (e.clientY - rect.top - offset.y) / zoom

      for (const node of nodes) {
        const pos = positionsRef.current.get(node.id)
        if (!pos) continue
        const dx = pos.x - x
        const dy = pos.y - y
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
          setSelectedNode(node)
          return
        }
      }
      setSelectedNode(null)
    },
    [nodes, zoom, offset]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Network Graph</CardTitle>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent" aria-label="Reset view">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="h-[400px] w-full cursor-grab rounded-lg border border-border active:cursor-grabbing"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "rgba(59, 61, 191, 0.5)" }} />
            <span className="text-muted-foreground">Normal Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#ED8936" }} />
            <span className="text-muted-foreground">Suspicious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#E53E3E" }} />
            <span className="text-muted-foreground">Ring Member</span>
          </div>
          <div className="h-4 w-px bg-border mx-2" />
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-3" style={{ backgroundColor: "#3182CE" }} />
            <span className="text-muted-foreground">Fan-In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-3" style={{ backgroundColor: "#DD6B20" }} />
            <span className="text-muted-foreground">Fan-Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-3" style={{ backgroundColor: "#D69E2E" }} />
            <span className="text-muted-foreground">Pass-Through</span>
          </div>
        </div>

        {/* Node detail panel */}
        {selectedNode && (
          <div className="absolute right-2 top-2 z-10 w-64 rounded-xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">{selectedNode.id}</span>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close details">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suspicion Score</span>
                <span className={`font-mono font-bold ${selectedNode.score >= 70 ? "text-[var(--destructive)]" : selectedNode.score >= 30 ? "text-[var(--warning)]" : "text-foreground"}`}>
                  {selectedNode.score}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">In-Degree</span>
                <span className="font-mono text-foreground">{selectedNode.inDegree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Out-Degree</span>
                <span className="font-mono text-foreground">{selectedNode.outDegree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-mono text-foreground">${selectedNode.totalAmount.toLocaleString()}</span>
              </div>
              {selectedNode.ringId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ring</span>
                  <span className="font-mono font-medium text-[var(--destructive)]">{selectedNode.ringId}</span>
                </div>
              )}
              {selectedNode.patterns.length > 0 && (
                <div className="mt-1">
                  <span className="text-muted-foreground">Patterns:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedNode.patterns.map((p) => (
                      <span key={p} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
