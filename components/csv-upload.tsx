"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, CheckCircle, X, Loader2, ArrowRight, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { previewCSV, type ColumnMapping, type CSVParseResult } from "@/lib/detection-engine"

const REQUIRED_FIELDS: { key: keyof ColumnMapping; label: string; description: string; required: boolean }[] = [
  { key: "sender_id", label: "Sender / From", description: "Column representing the sender or source account", required: true },
  { key: "receiver_id", label: "Receiver / To", description: "Column representing the receiver or destination account", required: true },
  { key: "amount", label: "Amount / Value", description: "Column with the transaction amount or value", required: true },
  { key: "transaction_id", label: "Transaction ID", description: "Unique identifier for each transaction (auto-generated if not mapped)", required: false },
  { key: "timestamp", label: "Date / Timestamp", description: "Column with date or time information (auto-generated if not mapped)", required: false },
]

interface CSVUploadProps {
  onFileProcessed: (csvText: string, mapping: ColumnMapping) => void
  isProcessing: boolean
}

export function CSVUpload({ onFileProcessed, isProcessing }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CSVParseResult | null>(null)
  const [manualMapping, setManualMapping] = useState<Partial<ColumnMapping>>({})
  const [step, setStep] = useState<"upload" | "mapping">("upload")

  const handleFile = useCallback((f: File) => {
    setError(null)
    setPreview(null)
    setStep("upload")
    setManualMapping({})
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setFile(f)

    // Read and preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
      const result = previewCSV(text)
      setPreview(result)

      if (result.autoMapping) {
        // Auto-mapped successfully - pre-fill and go to mapping to confirm
        setManualMapping(result.autoMapping)
      }
    }
    reader.readAsText(f)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleAnalyze = useCallback(() => {
    if (!csvText || !preview) return

    // If auto-mapped, go directly
    if (preview.autoMapping && step === "upload") {
      onFileProcessed(csvText, preview.autoMapping)
      return
    }

    // If in mapping step, validate required fields
    if (step === "mapping") {
      const mapping = manualMapping as ColumnMapping
      if (!mapping.sender_id || !mapping.receiver_id || !mapping.amount) {
        setError("Please map at least Sender, Receiver, and Amount columns.")
        return
      }
      // Fill optional fields with generated values
      const finalMapping: ColumnMapping = {
        transaction_id: mapping.transaction_id || '__generated_tx_id__',
        sender_id: mapping.sender_id,
        receiver_id: mapping.receiver_id,
        amount: mapping.amount,
        timestamp: mapping.timestamp || '__generated_timestamp__',
      }
      onFileProcessed(csvText, finalMapping)
    }
  }, [csvText, preview, step, manualMapping, onFileProcessed])

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setError(null)
    setManualMapping(prev => ({
      ...prev,
      [field]: value === "" ? undefined : value,
    }))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-foreground">Upload Transaction Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload any CSV file - we will auto-detect or let you map the columns
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: File Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            {!file ? (
              <>
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drop CSV file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any .csv file - Max 10MB
                </p>
                <label className="mt-4 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                  <span className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    Choose File
                  </span>
                </label>
              </>
            ) : (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-[var(--success)]" />
                    <span className="text-sm font-medium text-foreground">{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                    {preview ? ` - ${preview.rowCount} rows, ${preview.headers.length} columns` : ""}
                  </span>
                </div>
                <button
                  onClick={() => { setFile(null); setError(null); setPreview(null); setCsvText(""); setStep("upload"); setManualMapping({}) }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Auto-map badge */}
          {preview && file && step === "upload" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
              {preview.autoMapping ? (
                <>
                  <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                  <span className="flex-1 text-sm text-foreground">Columns auto-detected successfully</span>
                  <button
                    onClick={() => setStep("mapping")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Review Mapping
                  </button>
                </>
              ) : (
                <>
                  <Columns3 className="h-4 w-4 text-[var(--warning)]" />
                  <span className="flex-1 text-sm text-foreground">Columns not recognized - manual mapping needed</span>
                  <button
                    onClick={() => setStep("mapping")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Map Columns
                  </button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Column Mapping */}
      {step === "mapping" && preview && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Columns3 className="h-4 w-4" />
              Column Mapping
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Map your CSV columns to the required fields. Only Sender, Receiver, and Amount are mandatory.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {REQUIRED_FIELDS.map(field => (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-[var(--destructive)]">*</span>}
                </label>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                <select
                  value={manualMapping[field.key] || ""}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                >
                  <option value="">
                    {field.required ? "-- Select Column --" : "-- Skip (auto-generate) --"}
                  </option>
                  {preview.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}

            {/* Sample data preview */}
            {preview.sampleRows.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Data Preview (first {preview.sampleRows.length} rows)</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {preview.headers.map(h => (
                          <th key={h} className="whitespace-nowrap px-3 py-1.5 text-left font-medium text-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                              {cell.length > 30 ? cell.slice(0, 30) + "..." : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-[var(--destructive)]">{error}</p>
      )}

      {file && preview && (
        <div className="mt-4 flex gap-2">
          {step === "upload" && !preview.autoMapping && (
            <Button
              onClick={() => setStep("mapping")}
              className="flex-1"
            >
              <Columns3 className="mr-2 h-4 w-4" />
              Map Columns
            </Button>
          )}
          {(step === "upload" && preview.autoMapping) && (
            <Button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Transactions...
                </>
              ) : (
                <>
                  Analyze Transactions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {step === "mapping" && (
            <Button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Transactions...
                </>
              ) : (
                <>
                  Confirm & Analyze
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
