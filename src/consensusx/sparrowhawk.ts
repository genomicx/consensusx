/**
 * Sparrowhawk de novo assembly of unmapped reads.
 *
 * Sparrowhawk (https://github.com/bacpop/sparrowhawk-web) is a Rust-based
 * genome assembler compiled to WebAssembly. It takes paired-end FASTQ input
 * and produces assembled contigs.
 *
 * Integration approach: Load the Sparrowhawk WASM module from /wasm/ in public.
 * The module provides an AssemblyHelper class:
 *   - new(file1, file2, k, verbose, min_count, min_qual, csize, do_bloom, do_fit)
 *   - get_preprocessing_info() → JSON string with k-mer histogram
 *   - assemble(no_bubble_collapse, no_dead_end_removal) → void
 *   - get_assembly() → JSON string with { outfasta, ncontigs, outgfa, ... }
 */

type LogCallback = (msg: string) => void
type ProgressCallback = (msg: string, pct: number) => void

export interface SparrowhawkResult {
  fasta: string
  contigCount: number
  totalLength: number
  n50: number
}

interface SparrowhawkModule {
  AssemblyHelper: {
    new(
      file1: File,
      file2: File,
      k: number,
      verbose: boolean,
      min_count: number,
      min_qual: number,
      csize: number,
      do_bloom: boolean,
      do_fit: boolean,
    ): SparrowhawkHelper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
}

interface SparrowhawkHelper {
  get_preprocessing_info(): string
  assemble(no_bubble_collapse: boolean, no_dead_end_removal: boolean): void
  get_assembly(): string
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
 * Run Sparrowhawk de novo assembly on unmapped reads.
 */
export async function runSparrowhawk(
  unmappedFastq: string,
  minContigLength: number,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<SparrowhawkResult> {
  // Check if there are enough reads to assemble
  const readCount = (unmappedFastq.match(/@/g) || []).length
  if (readCount < 10) {
    onLog('[Sparrowhawk] Too few unmapped reads for assembly, skipping')
    return { fasta: '', contigCount: 0, totalLength: 0, n50: 0 }
  }

  onProgress('Loading Sparrowhawk assembler...', 72)
  onLog(`[Sparrowhawk] Assembling ${readCount} unmapped reads de novo...`)

  // Load the Sparrowhawk WASM module
  let wasm: SparrowhawkModule
  try {
    // Dynamic import of the Sparrowhawk WASM module from public/wasm/
    const wasmUrl = '/wasm/sparrowhawk.js'
    const mod = await import(/* @vite-ignore */ wasmUrl)
    wasm = mod as unknown as SparrowhawkModule
  } catch {
    onLog('[Sparrowhawk] WASM module not available — skipping de novo assembly')
    onLog('[Sparrowhawk] To enable: build sparrowhawk-web WASM and place in public/wasm/')
    return { fasta: '', contigCount: 0, totalLength: 0, n50: 0 }
  }

  // Split unmapped reads into paired files
  const { r1, r2 } = splitPairedReads(unmappedFastq)
  const r1File = fastqStringToFile(r1, 'unmapped_R1.fastq')
  const r2File = fastqStringToFile(r2, 'unmapped_R2.fastq')

  // Sparrowhawk parameters
  const kmerSize = 31
  const minCount = 3
  const minQual = 20
  const chunkSize = 0 // no chunking

  onProgress('Preprocessing unmapped reads...', 75)
  onLog(`[Sparrowhawk] k=${kmerSize}, min_count=${minCount}, min_qual=${minQual}`)

  // Sparrowhawk uses a static .new() factory method from the Rust WASM binding
  const AssemblyHelper = wasm.AssemblyHelper
  const helper: SparrowhawkHelper = AssemblyHelper.new(
    r1File,
    r2File,
    kmerSize,
    false,    // verbose
    minCount,
    minQual,
    chunkSize,
    true,     // do_bloom (Bloom filter preprocessing)
    true,     // do_fit (auto min_count fitting)
  )

  const preprocessInfo = JSON.parse(helper.get_preprocessing_info())
  onLog(`[Sparrowhawk] K-mers counted: ${preprocessInfo.nkmers.toLocaleString()}`)
  onLog(`[Sparrowhawk] Used min_count: ${preprocessInfo.used_min_count}`)

  // Run assembly
  onProgress('Assembling unmapped reads...', 80)
  onLog('[Sparrowhawk] Running de Bruijn graph assembly...')
  helper.assemble(false, false)

  const assemblyResult = JSON.parse(helper.get_assembly())
  onLog(`[Sparrowhawk] Assembled ${assemblyResult.ncontigs} contigs`)

  // Filter and prefix contigs
  let accessoryFasta = assemblyResult.outfasta as string
  if (!accessoryFasta || accessoryFasta.trim().length === 0) {
    onLog('[Sparrowhawk] No contigs assembled from unmapped reads')
    return { fasta: '', contigCount: 0, totalLength: 0, n50: 0 }
  }

  accessoryFasta = filterContigsByLength(accessoryFasta, minContigLength)
  accessoryFasta = prefixContigHeaders(accessoryFasta)

  const lengths = parseFastaLengths(accessoryFasta)
  const totalLength = lengths.reduce((sum, l) => sum + l, 0)
  const n50 = computeN50(lengths)

  onLog(`[Sparrowhawk] Accessory contigs (>=${minContigLength} bp): ${lengths.length}`)
  onLog(`[Sparrowhawk] Total accessory length: ${totalLength.toLocaleString()} bp`)
  onLog(`[Sparrowhawk] Accessory N50: ${n50.toLocaleString()} bp`)

  return {
    fasta: accessoryFasta,
    contigCount: lengths.length,
    totalLength,
    n50,
  }
}
