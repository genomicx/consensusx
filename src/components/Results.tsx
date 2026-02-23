import { useCallback } from 'react'
import { saveAs } from 'file-saver'
import type { ConsensusxResult } from '../consensusx/types'

interface ResultsProps {
  result: ConsensusxResult
}

export function Results({ result }: ResultsProps) {
  const downloadHybrid = useCallback(() => {
    const blob = new Blob([result.hybridFasta], { type: 'text/plain' })
    saveAs(blob, 'consensus_hybrid.fasta')
  }, [result.hybridFasta])

  const downloadConsensusOnly = useCallback(() => {
    const blob = new Blob([result.consensusFasta], { type: 'text/plain' })
    saveAs(blob, 'consensus_reference.fasta')
  }, [result.consensusFasta])

  const downloadAccessoryOnly = useCallback(() => {
    if (!result.accessoryFasta) return
    const blob = new Blob([result.accessoryFasta], { type: 'text/plain' })
    saveAs(blob, 'consensus_accessory.fasta')
  }, [result.accessoryFasta])

  const downloadStats = useCallback(() => {
    const stats = [
      ['Metric', 'Value'],
      ['Reference', result.referenceName],
      ['Total reads', String(result.mappingStats.totalReads)],
      ['Mapped reads', String(result.mappingStats.mappedReads)],
      ['Mapped %', result.mappingStats.mappedPct.toFixed(1)],
      ['Unmapped reads', String(result.mappingStats.unmappedReads)],
      ['Unmapped %', result.mappingStats.unmappedPct.toFixed(1)],
      ['Mean depth', result.mappingStats.meanDepth.toFixed(1)],
      ['Breadth of coverage %', result.mappingStats.breadthOfCoverage.toFixed(1)],
      ['Consensus length', String(result.consensusLength)],
      ['N content %', result.nContent.toFixed(1)],
      ['Accessory contigs', String(result.accessoryStats.contigCount)],
      ['Accessory total length', String(result.accessoryStats.totalLength)],
      ['Accessory N50', String(result.accessoryStats.n50)],
    ]
    const csv = stats.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    saveAs(blob, 'consensus_stats.csv')
  }, [result])

  return (
    <section className="results">
      <div className="results-header">
        <h2>Results</h2>
        <div className="results-actions">
          <button className="export-button" onClick={downloadHybrid}>
            Download Hybrid FASTA
          </button>
          <button className="export-button" onClick={downloadConsensusOnly}>
            Reference Only
          </button>
          {result.accessoryFasta && (
            <button className="export-button" onClick={downloadAccessoryOnly}>
              Accessory Only
            </button>
          )}
          <button className="export-button" onClick={downloadStats}>
            Stats CSV
          </button>
        </div>
      </div>

      <div className="results-grid">
        {/* Mapping Statistics */}
        <div className="stat-card">
          <h3>Mapping</h3>
          <div className="results-table-container">
            <table className="results-table">
              <tbody>
                <tr>
                  <td className="stat-label">Reference</td>
                  <td className="stat-value">{result.referenceName}</td>
                </tr>
                <tr>
                  <td className="stat-label">Total reads</td>
                  <td className="stat-value">{result.mappingStats.totalReads.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="stat-label">Mapped</td>
                  <td className="stat-value">
                    {result.mappingStats.mappedReads.toLocaleString()}
                    <span className="stat-pct"> ({result.mappingStats.mappedPct.toFixed(1)}%)</span>
                  </td>
                </tr>
                <tr>
                  <td className="stat-label">Unmapped</td>
                  <td className="stat-value">
                    {result.mappingStats.unmappedReads.toLocaleString()}
                    <span className="stat-pct"> ({result.mappingStats.unmappedPct.toFixed(1)}%)</span>
                  </td>
                </tr>
                <tr>
                  <td className="stat-label">Mean depth</td>
                  <td className="stat-value">{result.mappingStats.meanDepth.toFixed(1)}x</td>
                </tr>
                <tr>
                  <td className="stat-label">Breadth of coverage</td>
                  <td className="stat-value">{result.mappingStats.breadthOfCoverage.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Consensus Statistics */}
        <div className="stat-card">
          <h3>Consensus</h3>
          <div className="results-table-container">
            <table className="results-table">
              <tbody>
                <tr>
                  <td className="stat-label">Consensus length</td>
                  <td className="stat-value">{result.consensusLength.toLocaleString()} bp</td>
                </tr>
                <tr>
                  <td className="stat-label">N content</td>
                  <td className="stat-value">{result.nContent.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="stat-label">Accessory contigs</td>
                  <td className="stat-value">{result.accessoryStats.contigCount}</td>
                </tr>
                <tr>
                  <td className="stat-label">Accessory total length</td>
                  <td className="stat-value">{result.accessoryStats.totalLength.toLocaleString()} bp</td>
                </tr>
                <tr>
                  <td className="stat-label">Accessory N50</td>
                  <td className="stat-value">{result.accessoryStats.n50.toLocaleString()} bp</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FASTA Preview */}
      <div className="fasta-preview">
        <h3>Hybrid Consensus Preview</h3>
        <pre className="fasta-content">
          {result.hybridFasta.slice(0, 5000)}
          {result.hybridFasta.length > 5000 && '\n... (truncated)'}
        </pre>
      </div>
    </section>
  )
}
