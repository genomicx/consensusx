import { useState, useEffect, useCallback } from 'react'
import { FileDropZone } from './components/FileDropZone'
import { Settings } from './components/Settings'
import { LogConsole } from './components/LogConsole'
import { Results } from './components/Results'
import { AboutPage } from './components/AboutPage'
import { runConsensusx } from './consensusx/pipeline'
import { DEFAULT_OPTIONS } from './consensusx/types'
import type { ConsensusxOptions, ConsensusxResult } from './consensusx/types'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'analysis' | 'about'

function App() {
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

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('gx-theme') as Theme) || 'dark'
  })

  const [currentView, setCurrentView] = useState<View>('analysis')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gx-theme', theme)
  }, [theme])

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
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Consensusx</h1>
          <button
            className="theme-toggle"
            onClick={() =>
              setTheme((t) => (t === 'light' ? 'dark' : 'light'))
            }
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <p className="subtitle">Reference-Based Consensus Assembly</p>
        <nav className="tab-bar">
          <button
            className={`tab ${currentView === 'analysis' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('analysis')}
          >
            Analysis
          </button>
          <button
            className={`tab ${currentView === 'about' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('about')}
          >
            About
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'analysis' ? (
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

            {logLines.length > 0 && <LogConsole lines={logLines} />}
          </>
        ) : (
          <AboutPage />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>GenomicX &mdash; open-source bioinformatics for the browser</span>
          <div className="footer-links">
            <a href="https://github.com/genomicx" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://genomicx.github.io/about" target="_blank" rel="noopener noreferrer">Mission</a>
            <a href="https://www.happykhan.com/" target="_blank" rel="noopener noreferrer">Nabil-Fareed Alikhan</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
