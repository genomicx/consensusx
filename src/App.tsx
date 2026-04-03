import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { NavBar, AppFooter, LogConsole } from '@genomicx/ui'
import { FileDropZone } from './components/FileDropZone'
import { Settings } from './components/Settings'
import { Results } from './components/Results'
import { About } from './pages/About'
import { runConsensusx } from './consensusx/pipeline'
import { DEFAULT_OPTIONS } from './consensusx/types'
import type { ConsensusxOptions, ConsensusxResult } from './consensusx/types'
import './App.css'

function AnalysisPage() {
  const [r1File, setR1File] = useState<File | null>(null)
  const [r2File, setR2File] = useState<File | null>(null)
  const [refFile, setRefFile] = useState<File | null>(null)
  const [options, setOptions] = useState<ConsensusxOptions>(DEFAULT_OPTIONS)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<ConsensusxResult | null>(null)

  const handleRun = useCallback(async () => {
    if (!r1File || !r2File || !refFile) return

    setRunning(true)
    setError('')
    setResult(null)
    setLogLines([])
    setProgress('Starting...')
    setProgressPct(0)

    try {
      const res = await runConsensusx(
        { r1: r1File, r2: r2File, reference: refFile },
        options,
        (msg, pct) => {
          setProgress(msg)
          setProgressPct(pct)
        },
        (msg) => {
          setLogLines((prev) => [...prev, msg])
        },
      )
      setResult(res)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [r1File, r2File, refFile, options])

  const canRun = r1File !== null && r2File !== null && refFile !== null && !running

  return (
    <>
      <div className="input-section">
        <h2 className="section-title">Input Files</h2>
        <div className="file-grid">
          <FileDropZone
            label="R1 — Forward Reads"
            hint=".fastq, .fq, .fastq.gz"
            accept=".fastq,.fq,.fastq.gz,.fq.gz,.gz"
            file={r1File}
            onFileChange={setR1File}
            disabled={running}
          />
          <FileDropZone
            label="R2 — Reverse Reads"
            hint=".fastq, .fq, .fastq.gz"
            accept=".fastq,.fq,.fastq.gz,.fq.gz,.gz"
            file={r2File}
            onFileChange={setR2File}
            disabled={running}
          />
          <FileDropZone
            label="Reference Genome"
            hint=".fasta, .fa, .fna, .gz"
            accept=".fasta,.fa,.fna,.fsa,.fasta.gz,.fa.gz,.fna.gz,.gz"
            file={refFile}
            onFileChange={setRefFile}
            disabled={running}
          />
        </div>
      </div>

      <Settings
        options={options}
        onChange={setOptions}
        disabled={running}
      />

      <button
        className="run-button"
        onClick={handleRun}
        disabled={!canRun}
      >
        {running ? 'Running...' : 'Run Consensus Assembly'}
      </button>

      {running && (
        <section className="progress" aria-live="polite">
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="progress-text">{progress}</p>
        </section>
      )}

      {error && (
        <section className="error" role="alert">
          <p>{error}</p>
        </section>
      )}

      {result && <Results result={result} />}

      {logLines.length > 0 && <LogConsole logs={logLines} />}
    </>
  )
}

function App() {
  useEffect(() => {
    const saved = (localStorage.getItem('gx-theme') as 'light' | 'dark') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return (
    <div className="app">
      <NavBar appName="consensusx" appSubtitle="Reference-Based Consensus Assembly" />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<AnalysisPage />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <AppFooter appName="consensusx" />
    </div>
  )
}

export default App
