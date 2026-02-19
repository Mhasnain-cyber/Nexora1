
export interface Transaction {
  transaction_id: string
  sender_id: string
  receiver_id: string
  amount: number
  timestamp: string
}

export interface SuspiciousAccount {
  account_id: string
  suspicion_score: number
  detected_patterns: string[]
  ring_id: string | null
  reason: string[]
  explanation?: string
}

export interface FraudRing {
  ring_id: string
  member_accounts: string[]
  pattern_type: string
  risk_score: number
}

export interface AnalysisReport {
  suspicious_accounts: SuspiciousAccount[]
  fraud_rings: FraudRing[]
  summary: {
    total_accounts_analyzed: number
    suspicious_accounts_flagged: number
    fraud_rings_detected: number
    fan_in_accounts: number
    fan_out_accounts: number
    processing_time_seconds: number
  }
}

export interface GraphNode {
  id: string
  inDegree: number
  outDegree: number
  totalAmount: number
  isSuspicious: boolean
  ringId: string | null
  patterns: string[]
  score: number
}

export interface GraphEdge {
  source: string
  target: string
  amount: number
  timestamp: string
  isRingEdge: boolean
  edge_type: string
}

export interface ColumnMapping {
  transaction_id: string
  sender_id: string
  receiver_id: string
  amount: string
  timestamp: string
}

export interface CSVParseResult {
  headers: string[]
  needsMapping: boolean
  autoMapping: ColumnMapping | null
  rowCount: number
  sampleRows: string[][]
}

// Keyword sets for fuzzy column auto-detection
const COLUMN_HINTS: Record<keyof ColumnMapping, string[]> = {
  transaction_id: ['transaction_id', 'txn_id', 'trans_id', 'tx_id', 'id', 'transaction', 'txn', 'trans_no', 'reference', 'ref'],
  sender_id: ['sender_id', 'sender', 'from', 'from_id', 'from_account', 'source', 'source_id', 'payer', 'payer_id', 'originator', 'debit_account', 'source_account'],
  receiver_id: ['receiver_id', 'receiver', 'to', 'to_id', 'to_account', 'target', 'target_id', 'payee', 'payee_id', 'beneficiary', 'credit_account', 'dest', 'destination', 'destination_id', 'dest_account'],
  amount: ['amount', 'value', 'sum', 'total', 'amt', 'price', 'payment', 'transfer_amount', 'txn_amount', 'transaction_amount'],
  timestamp: ['timestamp', 'date', 'time', 'datetime', 'created_at', 'created', 'txn_date', 'transaction_date', 'trans_date', 'occurred_at', 'ts', 'year'],
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function tryAutoMap(headers: string[]): ColumnMapping | null {
  const normalized = headers.map(normalizeHeader)
  const mapping: Partial<ColumnMapping> = {}
  const usedIndices = new Set<number>()

  // For each required field, find the best matching header
  const fields: (keyof ColumnMapping)[] = ['sender_id', 'receiver_id', 'amount', 'timestamp', 'transaction_id']

  for (const field of fields) {
    const hints = COLUMN_HINTS[field]
    let bestIdx = -1

    // Exact match first
    for (let i = 0; i < normalized.length; i++) {
      if (usedIndices.has(i)) continue
      if (hints.includes(normalized[i])) {
        bestIdx = i
        break
      }
    }

    // Partial match second
    if (bestIdx === -1) {
      for (let i = 0; i < normalized.length; i++) {
        if (usedIndices.has(i)) continue
        for (const hint of hints) {
          if (normalized[i].includes(hint) || hint.includes(normalized[i])) {
            bestIdx = i
            break
          }
        }
        if (bestIdx !== -1) break
      }
    }

    if (bestIdx !== -1) {
      mapping[field] = headers[bestIdx]
      usedIndices.add(bestIdx)
    }
  }

  // transaction_id is optional - we can generate it
  // sender_id, receiver_id, amount are strictly required
  if (!mapping.sender_id || !mapping.receiver_id || !mapping.amount) {
    return null
  }

  // If no timestamp found, we'll use a default
  if (!mapping.timestamp) {
    mapping.timestamp = '__generated_timestamp__'
  }

  // If no transaction_id found, we'll generate
  if (!mapping.transaction_id) {
    mapping.transaction_id = '__generated_tx_id__'
  }

  return mapping as ColumnMapping
}

// Parse CSV headers and preview - does NOT throw if columns don't match
export function previewCSV(text: string): CSVParseResult {
  const lines = text.trim().split('\n')
  if (lines.length < 2) {
    return { headers: [], needsMapping: true, autoMapping: null, rowCount: 0, sampleRows: [] }
  }

  const headerLine = lines[0].replace(/\ufeff/g, '').trim()
  const headers = parseCSVLine(headerLine)
  const autoMapping = tryAutoMap(headers)
  const sampleRows: string[][] = []

  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const line = lines[i].trim()
    if (!line) continue
    sampleRows.push(parseCSVLine(line))
  }

  return {
    headers,
    needsMapping: autoMapping === null,
    autoMapping,
    rowCount: lines.length - 1,
    sampleRows,
  }
}

// Handle quoted CSV fields properly
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSVWithMapping(text: string, mapping: ColumnMapping): Transaction[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headerLine = lines[0].replace(/\ufeff/g, '').trim()
  const headers = parseCSVLine(headerLine)

  const txIdIdx = mapping.transaction_id === '__generated_tx_id__' ? -1 : headers.indexOf(mapping.transaction_id)
  const senderIdx = headers.indexOf(mapping.sender_id)
  const receiverIdx = headers.indexOf(mapping.receiver_id)
  const amountIdx = headers.indexOf(mapping.amount)
  const timestampIdx = mapping.timestamp === '__generated_timestamp__' ? -1 : headers.indexOf(mapping.timestamp)

  if (senderIdx === -1 || receiverIdx === -1 || amountIdx === -1) {
    throw new Error(`Could not find mapped columns in CSV. Please verify your column mapping.`)
  }

  const transactions: Transaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = parseCSVLine(line)

    const amountRaw = parts[amountIdx]
    const amount = parseFloat(amountRaw?.replace(/[^0-9.\-]/g, '') || '')
    if (isNaN(amount)) continue

    const sender = parts[senderIdx]
    const receiver = parts[receiverIdx]
    if (!sender || !receiver) continue
    if (sender === receiver) continue // skip self-transfers

    transactions.push({
      transaction_id: txIdIdx !== -1 && parts[txIdIdx] ? parts[txIdIdx] : `TXN_${String(i).padStart(6, '0')}`,
      sender_id: sender,
      receiver_id: receiver,
      amount,
      timestamp: timestampIdx !== -1 && parts[timestampIdx] ? parts[timestampIdx] : `2026-01-${String((i % 28) + 1).padStart(2, '0')} 00:00:00`,
    })
  }
  return transactions
}

// Build adjacency list
function buildGraph(transactions: Transaction[]) {
  const adjacency: Map<string, Set<string>> = new Map()
  const allNodes = new Set<string>()
  const inDegree: Map<string, number> = new Map()
  const outDegree: Map<string, number> = new Map()
  const nodeAmounts: Map<string, number> = new Map()

  for (const tx of transactions) {
    allNodes.add(tx.sender_id)
    allNodes.add(tx.receiver_id)

    if (!adjacency.has(tx.sender_id)) adjacency.set(tx.sender_id, new Set())
    adjacency.get(tx.sender_id)!.add(tx.receiver_id)

    outDegree.set(tx.sender_id, (outDegree.get(tx.sender_id) || 0) + 1)
    inDegree.set(tx.receiver_id, (inDegree.get(tx.receiver_id) || 0) + 1)
    nodeAmounts.set(tx.receiver_id, (nodeAmounts.get(tx.receiver_id) || 0) + tx.amount)
    nodeAmounts.set(tx.sender_id, (nodeAmounts.get(tx.sender_id) || 0) + tx.amount)
  }

  return { adjacency, allNodes, inDegree, outDegree, nodeAmounts }
}

// Find Strongly Connected Components (SCCs) using Tarjan's Algorithm
function findSCCs(adjacency: Map<string, Set<string>>): string[][] {
  let id = 0
  const ids = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Map<string, boolean>()
  const stack: string[] = []
  const sccs: string[][] = []

  function dfs(at: string) {
    stack.push(at)
    onStack.set(at, true)
    ids.set(at, id)
    low.set(at, id)
    id++

    const neighbors = adjacency.get(at)
    if (neighbors) {
      for (const to of neighbors) {
        if (!ids.has(to)) {
          dfs(to)
          low.set(at, Math.min(low.get(at)!, low.get(to)!))
        } else if (onStack.get(to)) {
          low.set(at, Math.min(low.get(at)!, ids.get(to)!))
        }
      }
    }

    if (ids.get(at) === low.get(at)) {
      const component: string[] = []
      let node: string
      do {
        node = stack.pop()!
        onStack.set(node, false)
        component.push(node)
      } while (node !== at)
      sccs.push(component)
    }
  }

  for (const node of adjacency.keys()) {
    if (!ids.has(node)) {
      dfs(node)
    }
  }

  return sccs
}

// Detect smurfing patterns (both fan-in and fan-out)
function detectSmurfing(transactions: Transaction[], fraudRingMembers: Set<string>): { fanIn: Map<string, string[]>; fanOut: Map<string, string[]> } {
  const SMALL_TX_THRESHOLD = 10000
  const TIME_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
  const MIN_SENDERS = 5
  const CONSOLIDATION_RATIO = 0.7

  const fanIn = new Map<string, string[]>()
  const fanOut = new Map<string, string[]>() 

  // Group transactions by receiver and sender
  const receiverGroups = new Map<string, Transaction[]>()
  const senderGroups = new Map<string, Transaction[]>()

  for (const tx of transactions) {
    if (!receiverGroups.has(tx.receiver_id)) receiverGroups.set(tx.receiver_id, [])
    receiverGroups.get(tx.receiver_id)!.push(tx)

    if (!senderGroups.has(tx.sender_id)) senderGroups.set(tx.sender_id, [])
    senderGroups.get(tx.sender_id)!.push(tx)
  }

  // Helper: Calculate median
  const getMedian = (values: number[]) => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  // Helper: Check for salary pattern (same sender repeating daily similar amount)
  const isSalaryPattern = (txs: Transaction[]) => {
    const bySender = new Map<string, Transaction[]>()
    for (const tx of txs) {
        if (!bySender.has(tx.sender_id)) bySender.set(tx.sender_id, [])
        bySender.get(tx.sender_id)!.push(tx)
    }

    for (const [sender, sTxs] of bySender) {
        if (sTxs.length < 3) continue 
        sTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        
        let dailyMatches = 0
        for (let i = 1; i < sTxs.length; i++) {
            const timeDiff = new Date(sTxs[i].timestamp).getTime() - new Date(sTxs[i-1].timestamp).getTime()
            const hoursDiff = timeDiff / (1000 * 60 * 60)
            
            // Check if ~24 hours (allow 20-28)
            if (hoursDiff >= 20 && hoursDiff <= 28) {
                // Check amount similarity (within 10%)
                const amtDiff = Math.abs(sTxs[i].amount - sTxs[i-1].amount)
                if (amtDiff / sTxs[i-1].amount < 0.1) {
                    dailyMatches++
                }
            }
        }
        
        if (dailyMatches >= (sTxs.length - 1) * 0.5) return true
    }
    return false
  }

  // Check each receiver for mule behavior
  for (const [account, incomingTxs] of receiverGroups) {
    // 5. Ignore accounts already part of fraud rings
    if (fraudRingMembers.has(account)) continue

    // Sort by timestamp
    incomingTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    let windowStart = 0
    
    // Sliding window approach
    for (let windowEnd = 0; windowEnd < incomingTxs.length; windowEnd++) {
        const endTime = new Date(incomingTxs[windowEnd].timestamp).getTime()
        
        while (endTime - new Date(incomingTxs[windowStart].timestamp).getTime() > TIME_WINDOW_MS) {
            windowStart++
        }

        // Check window validity
        const currentWindow = incomingTxs.slice(windowStart, windowEnd + 1)
        const uniqueSenders = new Set(currentWindow.map(t => t.sender_id))
        
        if (uniqueSenders.size >= MIN_SENDERS) {
            // 2. Median incoming amount < SMALL_TX_THRESHOLD
            const amounts = currentWindow.map(t => t.amount)
            const median = getMedian(amounts)
            if (median >= SMALL_TX_THRESHOLD) continue

            // 4. Account not part of salary pattern
            if (isSalaryPattern(currentWindow)) continue

            // 3. >= 70% of total balance exits within 24h
            const windowTotal = amounts.reduce((sum, t) => sum + t.amount, 0)
            
            // Look for outgoing transactions in the 24h window starting from first incoming
            const firstIncomingTime = new Date(currentWindow[0].timestamp).getTime()
            const checkEndTime = firstIncomingTime + TIME_WINDOW_MS
            
            const outgoingTxs = senderGroups.get(account) || []
            const relevantOutgoing = outgoingTxs.filter(tx => {
                const t = new Date(tx.timestamp).getTime()
                return t >= firstIncomingTime && t <= checkEndTime
            })
            
            const totalOutgoing = relevantOutgoing.reduce((sum, t) => sum + t.amount, 0)
            
            if (totalOutgoing >= windowTotal * CONSOLIDATION_RATIO) {
                // Found a valid smurfing pattern
                fanIn.set(account, Array.from(uniqueSenders))
                break 
            }
        }
    }
  }

  // Fan-Out Logic (Standardized thresholds with Fan-In)
  const FAN_OUT_THRESHOLD = 5 // Reduced from 10 to match Fan-In sensitivity
  const FAN_OUT_WINDOW = 24 * 60 * 60 * 1000 // Standardized to 24h window

  for (const [account, outgoingTxs] of senderGroups) {
      if (outgoingTxs.length < FAN_OUT_THRESHOLD) continue
      
      const uniqueReceivers = new Set(outgoingTxs.map(t => t.receiver_id))
      if (uniqueReceivers.size >= FAN_OUT_THRESHOLD) {
          outgoingTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          const duration = new Date(outgoingTxs[outgoingTxs.length-1].timestamp).getTime() - new Date(outgoingTxs[0].timestamp).getTime()
          
          if (duration <= FAN_OUT_WINDOW) {
              fanOut.set(account, Array.from(uniqueReceivers))
          }
      }
  }

  return { fanIn, fanOut }
}

// Detect shell networks: chains of 3+ hops through low-activity intermediaries
function detectShellNetworks(adjacency: Map<string, Set<string>>, inDegree: Map<string, number>, outDegree: Map<string, number>): string[] {
  const shellAccounts: Set<string> = new Set()
  const MAX_TOTAL_DEGREE = 3 // Requirement: 2-3 total transactions
  
  // Find potential shell nodes (low degree nodes)
  const potentialShells = new Set<string>()
  for (const node of adjacency.keys()) {
    const totalDegree = (inDegree.get(node) || 0) + (outDegree.get(node) || 0)
    if (totalDegree <= MAX_TOTAL_DEGREE && totalDegree > 0) {
      potentialShells.add(node)
    }
  }

  // Find chains: Start -> Shell -> Shell -> ... -> End
  // We look for paths of length >= 3 where intermediate nodes are potential shells
  
  for (const startNode of adjacency.keys()) {
    // We only start exploring if the start node is NOT a shell (to find the full chain from a source)
    // Or we can just explore all. Let's explore all paths of length 3+
    
    const stack: { node: string; path: string[] }[] = [{ node: startNode, path: [startNode] }]
    
    while (stack.length > 0) {
      const { node, path } = stack.pop()!
      
      if (path.length > 6) continue // Limit chain length to avoid infinite loops
      
      const neighbors = adjacency.get(node)
      if (!neighbors) continue

      for (const neighbor of neighbors) {
        if (path.includes(neighbor)) continue // Avoid cycles in shell detection (handled by cycle detection)
        
        // If we found a path of length >= 3 (Start -> Mid -> End), check if Mid is a shell
        // Actually, we want chains where *intermediate* nodes are shells.
        
        const newPath = [...path, neighbor]
        
        // Check if this path constitutes a shell chain
        if (newPath.length >= 3) {
          // Check intermediates
          let isShellChain = true
          for (let i = 1; i < newPath.length - 1; i++) {
            if (!potentialShells.has(newPath[i])) {
              isShellChain = false
              break
            }
          }
          
          if (isShellChain) {
            // Mark intermediates as shell accounts
            for (let i = 1; i < newPath.length - 1; i++) {
              shellAccounts.add(newPath[i])
            }
          }
        }
        
        // Continue if the current neighbor is a potential shell
        if (potentialShells.has(neighbor)) {
           stack.push({ node: neighbor, path: newPath })
        }
      }
    }
  }

  return Array.from(shellAccounts)
}

function detectHighVelocity(transactions: Transaction[]): Set<string> {
  const highVelocityAccounts = new Set<string>()
  const WINDOW_MS = 60 * 60 * 1000 // 1 hour
  const THRESHOLD = 10 // > 10 transactions in 1 hour

  // Group by sender
  const senderTx = new Map<string, number[]>()
  for (const tx of transactions) {
    if (!senderTx.has(tx.sender_id)) senderTx.set(tx.sender_id, [])
    senderTx.get(tx.sender_id)!.push(new Date(tx.timestamp).getTime())
  }

  for (const [sender, times] of senderTx) {
    times.sort((a, b) => a - b)
    for (let i = 0; i < times.length; i++) {
      let count = 0
      for (let j = i; j < times.length; j++) {
        if (times[j] - times[i] <= WINDOW_MS) {
          count++
        } else {
          break
        }
      }
      if (count > THRESHOLD) {
        highVelocityAccounts.add(sender)
        break
      }
    }
  }
  
  return highVelocityAccounts
}

// Explanation Generation Layer
function generateForensicExplanation(
  accountId: string,
  incoming: Transaction[],
  outgoing: Transaction[],
  isRingMember: boolean
): { reason: string[], explanation: string, tags: Set<string> } {
  const tags = new Set<string>()
  const reasons: string[] = []
  
  // 1. FAN_IN
  const uniqueSenders = new Set(incoming.map(t => t.sender_id))
  if (uniqueSenders.size >= 5) {
      // Check 24h window
      incoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      let maxSenders = 0
      let windowStart = 0
      for (let i = 0; i < incoming.length; i++) {
          const end = new Date(incoming[i].timestamp).getTime()
          while (end - new Date(incoming[windowStart].timestamp).getTime() > 24 * 3600 * 1000) {
              windowStart++
          }
          const unique = new Set(incoming.slice(windowStart, i + 1).map(t => t.sender_id))
          if (unique.size >= 5) {
              tags.add('FAN_IN')
              maxSenders = Math.max(maxSenders, unique.size)
          }
      }
      if (tags.has('FAN_IN')) {
          reasons.push(`Fan-In aggregation from ${maxSenders} unique accounts`)
      }
  }

  // 2. FAN_OUT
  const uniqueReceivers = new Set(outgoing.map(t => t.receiver_id))
  if (uniqueReceivers.size >= 5) {
      outgoing.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      let maxReceivers = 0
      let windowStart = 0
      for (let i = 0; i < outgoing.length; i++) {
          const end = new Date(outgoing[i].timestamp).getTime()
          while (end - new Date(outgoing[windowStart].timestamp).getTime() > 24 * 3600 * 1000) {
              windowStart++
          }
          const unique = new Set(outgoing.slice(windowStart, i + 1).map(t => t.receiver_id))
          if (unique.size >= 5) {
              tags.add('FAN_OUT')
              maxReceivers = Math.max(maxReceivers, unique.size)
          }
      }
      if (tags.has('FAN_OUT')) {
          reasons.push(`Fan-Out dispersion to ${maxReceivers} unique accounts`)
      }
  }

  // 3. PASS_THROUGH: >= 80% incoming amount leaves within 2 hours
  if (incoming.length > 0 && outgoing.length > 0) {
      const totalIn = incoming.reduce((s, t) => s + t.amount, 0)
      let rapidExitAmount = 0
      
      // Check for rapid exit
      // For each outgoing transaction, check if it occurs within 2h of recent incoming
      // Simplified: Calculate total outgoing that happens within (LastIn + 2h) window relative to (FirstIn)
      
      const firstInTime = new Date(incoming[0].timestamp).getTime()
      const lastInTime = new Date(incoming[incoming.length - 1].timestamp).getTime()
      const checkEndTime = lastInTime + 2 * 3600 * 1000
      
      const relevantOutgoing = outgoing.filter(t => {
          const time = new Date(t.timestamp).getTime()
          return time >= firstInTime && time <= checkEndTime
      })
      
      const totalOutRapid = relevantOutgoing.reduce((s, t) => s + t.amount, 0)
      
      if (totalOutRapid >= 0.8 * totalIn) {
           tags.add('PASS_THROUGH')
           reasons.push(`${Math.round((totalOutRapid/totalIn)*100)}% funds transferred within rapid window`)
      }
  }

  // 4. DORMANT_ACTIVATION
  const allTxs = [...incoming, ...outgoing].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (allTxs.length > 0) {
      let maxGap = 0
      for (let i = 1; i < allTxs.length; i++) {
          const gap = new Date(allTxs[i].timestamp).getTime() - new Date(allTxs[i-1].timestamp).getTime()
          maxGap = Math.max(maxGap, gap)
      }
      if (maxGap > 7 * 24 * 3600 * 1000) {
           tags.add('DORMANT_ACTIVATION')
           reasons.push('Sudden activation after dormant period (>7 days)')
      }
  }

  if (isRingMember) {
      tags.add('RING_MEMBER')
      reasons.push('Connected to fraud ring')
  }

  // Generate Explanation Text
  const parts: string[] = []
  
  if (tags.has('RING_MEMBER')) {
      parts.push("This account is a confirmed member of a fraud ring (SCC).")
  } 
  
  if (tags.has('FAN_IN') && tags.has('FAN_OUT')) {
      parts.push("This account acts as a high-velocity hub, aggregating and dispersing funds simultaneously.")
  } else if (tags.has('FAN_IN')) {
      parts.push("This account behaves like a mule/collection account, aggregating funds from multiple sources.")
  } else if (tags.has('FAN_OUT')) {
      parts.push("This account functions as a distributor, dispersing funds to multiple targets.")
  } 
  
  if (tags.has('PASS_THROUGH')) {
      parts.push("The transaction velocity and concentration indicate layering activity with rapid fund pass-through.")
  }

  if (tags.has('DORMANT_ACTIVATION')) {
      parts.push("It shows sudden activation after a long dormant period.")
  }
  
  if (parts.length === 0) {
      parts.push("This account shows suspicious activity patterns warranting further investigation.")
  }

  return { reason: reasons, explanation: parts.join(" "), tags }
}

export function analyzeTransactions(csvText: string, mapping?: ColumnMapping): { report: AnalysisReport; nodes: GraphNode[]; edges: GraphEdge[] } {
  const startTime = performance.now()

  // If no mapping provided, try auto-detection
  let finalMapping = mapping
  if (!finalMapping) {
    const preview = previewCSV(csvText)
    if (preview.autoMapping) {
      finalMapping = preview.autoMapping
    } else {
      throw new Error('NEEDS_MAPPING')
    }
  }

  const transactions = parseCSVWithMapping(csvText, finalMapping)

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in the CSV file.')
  }

  const { adjacency, allNodes, inDegree, outDegree, nodeAmounts } = buildGraph(transactions)

  // 1. SCC detection (Fraud Rings) - Replaces simple cycle detection
  const sccs = findSCCs(adjacency)
  const fraudRings: FraudRing[] = []
  const accountRingMap: Map<string, string> = new Map()
  const accountPatterns: Map<string, Set<string>> = new Map()
  const accountScores: Map<string, number> = new Map()

  // Filter SCCs with size >= 3
  const validRings = sccs.filter(scc => scc.length >= 3)

  validRings.forEach((ringMembers, idx) => {
    const ringId = `RING_${String(idx + 1).padStart(3, '0')}`
    const sortedMembers = [...ringMembers].sort()
    
    fraudRings.push({
      ring_id: ringId,
      member_accounts: sortedMembers,
      pattern_type: 'cycle', // Kept as 'cycle' for frontend compatibility, but represents an SCC
      risk_score: Math.min(100, 85 + ringMembers.length * 2),
    })

    for (const acc of ringMembers) {
      accountRingMap.set(acc, ringId)
      if (!accountPatterns.has(acc)) accountPatterns.set(acc, new Set())
      accountPatterns.get(acc)!.add(`scc_size_${ringMembers.length}`)
      accountScores.set(acc, (accountScores.get(acc) || 0) + 60) // Increased weight for SCC rings
    }
  })

  // 2. Smurfing detection
  const fraudRingMembers = new Set<string>()
  fraudRings.forEach(ring => ring.member_accounts.forEach(acc => fraudRingMembers.add(acc)))

  const { fanIn, fanOut } = detectSmurfing(transactions, fraudRingMembers)
  let smurfRingIdx = fraudRings.length + 1

  for (const [acc, senders] of fanIn) {
    if (!accountPatterns.has(acc)) accountPatterns.set(acc, new Set())
    accountPatterns.get(acc)!.add('fan_in_smurfing')
    accountScores.set(acc, (accountScores.get(acc) || 0) + 40)
    
    // Create a ring for the smurfing group
    const ringId = `RING_${String(smurfRingIdx++).padStart(3, '0')}`
    // Only set ring ID for the central account if it doesn't have one
    if (!accountRingMap.has(acc)) {
      accountRingMap.set(acc, ringId)
    }
    
    fraudRings.push({
      ring_id: ringId,
      member_accounts: [acc, ...senders], // Include all members
      pattern_type: 'smurfing_fan_in',
      risk_score: 80,
    })
    
    // Mark senders as involved in smurfing
    for(const sender of senders) {
        if (!accountPatterns.has(sender)) accountPatterns.set(sender, new Set())
        accountPatterns.get(sender)!.add('smurfing_source')
        accountScores.set(sender, (accountScores.get(sender) || 0) + 20)
    }
  }

  for (const [acc, receivers] of fanOut) {
    if (!accountPatterns.has(acc)) accountPatterns.set(acc, new Set())
    accountPatterns.get(acc)!.add('fan_out_smurfing')
    accountScores.set(acc, (accountScores.get(acc) || 0) + 40)
    
    const ringId = `RING_${String(smurfRingIdx++).padStart(3, '0')}`
    if (!accountRingMap.has(acc)) {
      accountRingMap.set(acc, ringId)
    }
    
    fraudRings.push({
      ring_id: ringId,
      member_accounts: [acc, ...receivers],
      pattern_type: 'smurfing_fan_out',
      risk_score: 78,
    })
    
    // Mark receivers
    for(const receiver of receivers) {
        if (!accountPatterns.has(receiver)) accountPatterns.set(receiver, new Set())
        accountPatterns.get(receiver)!.add('smurfing_destination')
        accountScores.set(receiver, (accountScores.get(receiver) || 0) + 20)
    }
  }

  // 3. Shell network detection
  const shellAccounts = detectShellNetworks(adjacency, inDegree, outDegree)
  for (const acc of shellAccounts) {
    if (!accountPatterns.has(acc)) accountPatterns.set(acc, new Set())
    accountPatterns.get(acc)!.add('shell_network')
    accountScores.set(acc, (accountScores.get(acc) || 0) + 30)
  }

  // 4. High-velocity detection
  const highVelocityAccounts = detectHighVelocity(transactions)
  for (const acc of highVelocityAccounts) {
      if (!accountPatterns.has(acc)) accountPatterns.set(acc, new Set())
      accountPatterns.get(acc)!.add('high_velocity')
      accountScores.set(acc, (accountScores.get(acc) || 0) + 25)
  }
  
  // 5. Legitimate Account Protection (Whitelist Logic)
  // Heuristic: High degree (> 20) AND High volume but NO cycle/shell patterns
  // We reduce the score significantly if they appear to be legitimate hubs
  for (const node of allNodes) {
      const patterns = accountPatterns.get(node)
      const hasSevereFraud = patterns && (
          Array.from(patterns).some(p => p.startsWith('cycle') || p === 'shell_network')
      )
      
      const degree = (inDegree.get(node) || 0) + (outDegree.get(node) || 0)
      
      if (!hasSevereFraud && degree > 20) {
          // This looks like a legitimate hub (merchant, exchange)
          // Reduce score
          const currentScore = accountScores.get(node) || 0
          if (currentScore > 0) {
              accountScores.set(node, Math.max(0, currentScore - 75))
          }
      }
  }

  // Build suspicious accounts
  const suspiciousAccounts: SuspiciousAccount[] = []
  
  // Pre-calculate groups for explanation generation (O(N))
  const receiverGroups = new Map<string, Transaction[]>()
  const senderGroups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
      if (!receiverGroups.has(tx.receiver_id)) receiverGroups.set(tx.receiver_id, [])
      receiverGroups.get(tx.receiver_id)!.push(tx)

      if (!senderGroups.has(tx.sender_id)) senderGroups.set(tx.sender_id, [])
      senderGroups.get(tx.sender_id)!.push(tx)
  }

  const accountBehaviorTags = new Map<string, Set<string>>()

  for (const [acc, rawScore] of accountScores) {
    if (rawScore > 0) {
      // Generate explanation
      const { reason, explanation, tags } = generateForensicExplanation(
          acc,
          receiverGroups.get(acc) || [],
          senderGroups.get(acc) || [],
          accountRingMap.has(acc)
      )
      
      accountBehaviorTags.set(acc, tags)

      suspiciousAccounts.push({
        account_id: acc,
        suspicion_score: Math.min(100, parseFloat(rawScore.toFixed(1))),
        detected_patterns: Array.from(accountPatterns.get(acc) || []),
        ring_id: accountRingMap.get(acc) || null,
        reason,
        explanation
      })
    }
  }
  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score)

  const suspiciousSet = new Set(suspiciousAccounts.map(a => a.account_id))
  const ringEdgeSet = new Set<string>()
  for (const ring of fraudRings) {
    if (ring.pattern_type === 'cycle') {
      for (let i = 0; i < ring.member_accounts.length; i++) {
        for (let j = 0; j < ring.member_accounts.length; j++) {
          if (i !== j) {
            ringEdgeSet.add(`${ring.member_accounts[i]}->${ring.member_accounts[j]}`)
          }
        }
      }
    }
  }

  // Build graph data
  const nodes: GraphNode[] = []
  for (const nodeId of allNodes) {
    nodes.push({
      id: nodeId,
      inDegree: inDegree.get(nodeId) || 0,
      outDegree: outDegree.get(nodeId) || 0,
      totalAmount: Math.round((nodeAmounts.get(nodeId) || 0) * 100) / 100,
      isSuspicious: suspiciousSet.has(nodeId),
      ringId: accountRingMap.get(nodeId) || null,
      patterns: Array.from(accountPatterns.get(nodeId) || []),
      score: accountScores.get(nodeId) || 0,
    })
  }

  const edges: GraphEdge[] = transactions.map(tx => {
    const isRing = ringEdgeSet.has(`${tx.sender_id}->${tx.receiver_id}`)
    let type: 'normal' | 'fan_in' | 'fan_out' | 'pass_through' | 'ring_transfer' = 'normal'
    
    if (isRing) {
        type = 'ring_transfer'
    } else {
        const sourceTags = accountBehaviorTags.get(tx.sender_id)
        const targetTags = accountBehaviorTags.get(tx.receiver_id)
        
        if (sourceTags?.has('PASS_THROUGH')) {
            type = 'pass_through'
        } else if (sourceTags?.has('FAN_OUT')) {
            type = 'fan_out'
        } else if (targetTags?.has('FAN_IN')) {
            type = 'fan_in'
        }
    }

    return {
      source: tx.sender_id,
      target: tx.receiver_id,
      amount: tx.amount,
      timestamp: tx.timestamp,
      isRingEdge: isRing,
      edge_type: type
    }
  })

  const endTime = performance.now()

  return {
    report: {
      suspicious_accounts: suspiciousAccounts,
      fraud_rings: fraudRings,
      summary: {
        total_accounts_analyzed: allNodes.size,
        suspicious_accounts_flagged: suspiciousAccounts.length,
        fraud_rings_detected: fraudRings.length,
        fan_in_accounts: fanIn.size,
        fan_out_accounts: fanOut.size,
        processing_time_seconds: parseFloat(((endTime - startTime) / 1000).toFixed(4)),
      },
    },
    nodes,
    edges,
  }
}
