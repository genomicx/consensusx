import type { ConsensusxInput, ConsensusxOptions, ConsensusxResult } from './types'
import { runAlignment } from './alignment'
import { runSparrowhawk } from './sparrowhawk'

type ProgressCallback = (msg: string, pct: number) => void
type LogCallback = (msg: string) => void

/**
 * Run the full Consensusx pipeline:
 * 1. Align reads to reference (minimap2 + samtools)
 * 2. Call consensus from mapped reads (samtools consensus)
 * 3. Extract unmapped reads
 * 4. De novo assemble unmapped reads (Sparrowhawk)
 * 5. Merge reference consensus + accessory contigs
 */
export async function runConsensusx(
  input: ConsensusxInput,
  options: ConsensusxOptions,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<ConsensusxResult> {
  onLog('[Consensusx] Starting hybrid consensus assembly pipeline...')
  onLog(`[Consensusx] R1: ${input.r1.name} (${formatSize(input.r1.size)})`)
  onLog(`[Consensusx] R2: ${input.r2.name} (${formatSize(input.r2.size)})`)
  onLog(`[Consensusx] Reference: ${input.reference.name} (${formatSize(input.reference.size)})`)
  onLog(`[Consensusx] Options: min-depth=${options.minDepth}, min-qual=${options.minQuality}, min-contig=${options.minContigLength}`)

  // Phase 1: Alignment + consensus (5–68%)
  const alignResult = await runAlignment(
    input.r1,
    input.r2,
    input.reference,
    options.minDepth,
    options.minQuality,
    onProgress,
    onLog,
  )

  // Phase 2: Sparrowhawk de novo assembly of unmapped reads (70–88%)
  const sparrowhawkResult = await runSparrowhawk(
    alignResult.unmappedFastq,
    options.minContigLength,
    onProgress,
    onLog,
  )

  // Phase 3: Merge outputs (90–100%)
  onProgress('Merging consensus and accessory contigs...', 90)
  onLog('[Consensusx] Merging reference consensus + accessory contigs...')

  const hybridFasta = mergeContigs(alignResult.consensusFasta, sparrowhawkResult.fasta)
  const hybridContigCount = (hybridFasta.match(/>/g) || []).length
  onLog(`[Consensusx] Hybrid assembly: ${hybridContigCount} total contigs`)

  onProgress('Done!', 100)
  onLog('[Consensusx] Pipeline complete.')

  return {
    consensusFasta: alignResult.consensusFasta,
    accessoryFasta: sparrowhawkResult.fasta,
    hybridFasta,
    mappingStats: alignResult.mappingStats,
    accessoryStats: {
      contigCount: sparrowhawkResult.contigCount,
      totalLength: sparrowhawkResult.totalLength,
      n50: sparrowhawkResult.n50,
    },
    referenceName: alignResult.referenceName,
    consensusLength: alignResult.consensusLength,
    nContent: alignResult.nContent,
  }
}

/** Merge reference consensus and accessory contigs into a single FASTA */
function mergeContigs(consensusFasta: string, accessoryFasta: string): string {
  const parts: string[] = []

  if (consensusFasta.trim()) {
    parts.push(consensusFasta.trim())
  }

  if (accessoryFasta.trim()) {
    parts.push(accessoryFasta.trim())
  }

  return parts.join('\n')
}

/** Format file size in human-readable form */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
