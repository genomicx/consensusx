/**
 * Sparrowhawk de novo assembly of unmapped reads.
 *
 * Sparrowhawk (https://github.com/bacpop/sparrowhawk-web) is a Rust-based
 * genome assembler compiled to WebAssembly. It takes paired-end FASTQ input
 * and produces assembled contigs.
 *
 * IMPORTANT: Sparrowhawk's wasm-bindgen-file-reader uses FileReaderSync,
 * which is only available in Web Workers. The assembly runs in a dedicated
 * worker thread (sparrowhawk.worker.ts).
 */

import SparrowhawkWorker from './sparrowhawk.worker?worker'

type LogCallback = (msg: string) => void
type ProgressCallback = (msg: string, pct: number) => void

export interface SparrowhawkResult {
  fasta: string
  contigCount: number
  totalLength: number
  n50: number
}

/**
 * Convert a FASTQ string into a File object for Sparrowhawk.
 */
function fastqStringToFile(fastq: string, filename: string): File {
  const blob = new Blob([fastq], { type: 'text/plain' })
  return new File([blob], filename, { type: 'text/plain' })
}

/**
 * Split interleaved or concatenated unmapped reads into R1 and R2 files.
 * Input format: standard FASTQ with paired reads alternating.
 */
function splitPairedReads(fastq: string): { r1: string; r2: string } {
  const lines = fastq.split('\n')
  const r1Lines: string[] = []
  const r2Lines: string[] = []
  let readIndex = 0

  for (let i = 0; i < lines.length; i += 4) {
    if (i + 3 >= lines.length) break
    if (!lines[i].startsWith('@')) continue

    const block = lines.slice(i, i + 4).join('\n')
    if (readIndex % 2 === 0) {
      r1Lines.push(block)
    } else {
      r2Lines.push(block)
    }
    readIndex++
  }

  return {
    r1: r1Lines.join('\n') + '\n',
    r2: r2Lines.join('\n') + '\n',
  }
}

/**
 * Compute N50 from an array of contig lengths.
 */
function computeN50(lengths: number[]): number {
  if (lengths.length === 0) return 0
  const sorted = [...lengths].sort((a, b) => b - a)
  const totalLength = sorted.reduce((sum, l) => sum + l, 0)
  const halfTotal = totalLength / 2
  let cumulative = 0
  for (const len of sorted) {
    cumulative += len
    if (cumulative >= halfTotal) return len
  }
  return 0
}

/**
 * Parse FASTA string to extract contig lengths.
 */
function parseFastaLengths(fasta: string): number[] {
  const lengths: number[] = []
  let currentLength = 0

  for (const line of fasta.split('\n')) {
    if (line.startsWith('>')) {
      if (currentLength > 0) lengths.push(currentLength)
      currentLength = 0
    } else {
      currentLength += line.trim().length
    }
  }
  if (currentLength > 0) lengths.push(currentLength)

  return lengths
}

/**
 * Filter FASTA contigs by minimum length.
 */
function filterContigsByLength(fasta: string, minLength: number): string {
  const contigs: { header: string; seq: string }[] = []
  let currentHeader = ''
  let currentSeq = ''

  for (const line of fasta.split('\n')) {
    if (line.startsWith('>')) {
      if (currentHeader && currentSeq.length >= minLength) {
        contigs.push({ header: currentHeader, seq: currentSeq })
      }
      currentHeader = line
      currentSeq = ''
    } else {
      currentSeq += line.trim()
    }
  }
  if (currentHeader && currentSeq.length >= minLength) {
    contigs.push({ header: currentHeader, seq: currentSeq })
  }

  return contigs
    .map((c) => `${c.header}\n${c.seq}`)
    .join('\n')
}

/**
 * Prefix contig headers with "accessory_" to distinguish from reference contigs.
 */
function prefixContigHeaders(fasta: string): string {
  return fasta
    .split('\n')
    .map((line) => {
      if (line.startsWith('>')) {
        return `>accessory_${line.slice(1)}`
      }
      return line
    })
    .join('\n')
}

/**
 * Run Sparrowhawk de novo assembly on unmapped reads via Web Worker.
 */
export async function runSparrowhawk(
  unmappedFastq: string,
  minContigLength: number,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<SparrowhawkResult> {
  // Check if there are enough reads to assemble (count header lines, not all @ chars)
  const readCount = unmappedFastq.split('\n').filter(l => l.startsWith('@')).length
  if (readCount < 10) {
    onLog('[Sparrowhawk] Too few unmapped reads for assembly, skipping')
    return { fasta: '', contigCount: 0, totalLength: 0, n50: 0 }
  }

  onProgress('Loading Sparrowhawk assembler...', 72)
  onLog(`[Sparrowhawk] Assembling ${readCount} unmapped reads de novo...`)

  // Cap reads to avoid WASM memory limits (4GB max)
  let fastqForAssembly = unmappedFastq
  const MAX_READS = 100_000
  if (readCount > MAX_READS) {
    onLog(`[Sparrowhawk] Subsampling unmapped reads: ${readCount} → ${MAX_READS}`)
    const lines = unmappedFastq.split('\n')
    const subsampledLines: string[] = []
    let count = 0
    for (let i = 0; i < lines.length && count < MAX_READS; i += 4) {
      if (i + 3 >= lines.length || !lines[i].startsWith('@')) continue
      subsampledLines.push(lines[i], lines[i + 1], lines[i + 2], lines[i + 3])
      count++
    }
    fastqForAssembly = subsampledLines.join('\n') + '\n'
  }

  // Split unmapped reads into paired files
  const { r1, r2 } = splitPairedReads(fastqForAssembly)
  const r1File = fastqStringToFile(r1, 'unmapped_R1.fastq')
  const r2File = fastqStringToFile(r2, 'unmapped_R2.fastq')

  const r1ReadCount = r1.split('\n').filter(l => l.startsWith('@')).length
  const r2ReadCount = r2.split('\n').filter(l => l.startsWith('@')).length
  onLog(`[Sparrowhawk] R1 reads: ${r1ReadCount}, R2 reads: ${r2ReadCount}`)

  // Sparrowhawk parameters
  const kmerSize = 31
  const minCount = 3
  const minQual = 20
  const chunkSize = 0 // no chunking

  onProgress('Preprocessing unmapped reads...', 75)
  onLog(`[Sparrowhawk] k=${kmerSize}, min_count=${minCount}, min_qual=${minQual}`)

  // Run assembly in Web Worker (FileReaderSync only works in workers)
  return new Promise<SparrowhawkResult>((resolve) => {
    const worker = new SparrowhawkWorker()

    const timeout = setTimeout(() => {
      worker.terminate()
      onLog('[Sparrowhawk] Assembly timed out after 5 minutes')
      resolve({ fasta: '', contigCount: 0, totalLength: 0, n50: 0 })
    }, 300_000) // 5 min timeout

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data

      if (msg.type === 'log') {
        onLog(msg.message)
        return
      }

      if (msg.type === 'error') {
        clearTimeout(timeout)
        worker.terminate()
        onLog(`[Sparrowhawk] Assembly failed: ${msg.message}`)
        onLog('[Sparrowhawk] Continuing with reference-only consensus...')
        resolve({ fasta: '', contigCount: 0, totalLength: 0, n50: 0 })
        return
      }

      if (msg.type === 'result') {
        clearTimeout(timeout)
        worker.terminate()

        const outfasta = msg.outfasta as string
        if (!outfasta || outfasta.trim().length === 0) {
          onLog('[Sparrowhawk] No contigs assembled from unmapped reads')
          resolve({ fasta: '', contigCount: 0, totalLength: 0, n50: 0 })
          return
        }

        // Filter and prefix contigs
        let accessoryFasta = filterContigsByLength(outfasta, minContigLength)
        accessoryFasta = prefixContigHeaders(accessoryFasta)

        const lengths = parseFastaLengths(accessoryFasta)
        const totalLength = lengths.reduce((sum, l) => sum + l, 0)
        const n50 = computeN50(lengths)

        onLog(`[Sparrowhawk] Accessory contigs (>=${minContigLength} bp): ${lengths.length}`)
        onLog(`[Sparrowhawk] Total accessory length: ${totalLength.toLocaleString()} bp`)
        onLog(`[Sparrowhawk] Accessory N50: ${n50.toLocaleString()} bp`)

        onProgress('Assembly complete', 88)
        resolve({
          fasta: accessoryFasta,
          contigCount: lengths.length,
          totalLength,
          n50,
        })
      }
    }

    worker.onerror = (err: ErrorEvent) => {
      clearTimeout(timeout)
      worker.terminate()
      onLog(`[Sparrowhawk] Worker error: ${err.message}`)
      onLog('[Sparrowhawk] Continuing with reference-only consensus...')
      resolve({ fasta: '', contigCount: 0, totalLength: 0, n50: 0 })
    }

    // Send assembly request to worker
    worker.postMessage({
      type: 'assemble',
      r1File,
      r2File,
      kmerSize,
      minCount,
      minQual,
      chunkSize,
      doBloom: true,
      doFit: true,
    })
  })
}
