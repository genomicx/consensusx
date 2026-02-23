/**
 * Alignment and consensus module using minimap2 + samtools via Biowasm/Aioli.
 */

declare const Aioli: {
  new (tools: string[], opts?: { printInterleaved?: boolean }): Promise<AioliInstance>
}

interface AioliInstance {
  mount(files: File[]): Promise<{ path: string }[]>
  exec(cmd: string): Promise<{ stdout: string; stderr: string }>
  cat(path: string): Promise<string>
  ls(path: string): Promise<string[]>
  download(path: string): Promise<Blob>
}

type LogCallback = (msg: string) => void
type ProgressCallback = (msg: string, pct: number) => void

export interface AlignmentResult {
  consensusFasta: string
  unmappedFastq: string
  mappingStats: {
    totalReads: number
    mappedReads: number
    unmappedReads: number
    mappedPct: number
    unmappedPct: number
    meanDepth: number
    breadthOfCoverage: number
  }
  consensusLength: number
  nContent: number
  referenceName: string
}

/**
 * Run the alignment + consensus pipeline:
 * 1. minimap2: align R1/R2 to reference
 * 2. samtools view: SAM → BAM
 * 3. samtools sort: coordinate sort
 * 4. samtools index: index BAM
 * 5. samtools consensus: call consensus from mapped reads
 * 6. samtools view -f 4: extract unmapped reads
 * 7. samtools fastq: convert unmapped BAM to FASTQ
 */
export async function runAlignment(
  r1: File,
  r2: File,
  reference: File,
  minDepth: number,
  minQuality: number,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<AlignmentResult> {
  onProgress('Initialising WASM tools...', 5)
  onLog('[Alignment] Loading minimap2 and samtools via Biowasm...')

  const cli = await new Aioli(
    ['minimap2/2.22', 'samtools/1.10'],
    { printInterleaved: false },
  )

  // Mount input files to the virtual filesystem
  onProgress('Mounting input files...', 8)
  onLog('[Alignment] Mounting R1, R2, and reference files...')
  const [mountedR1, mountedR2, mountedRef] = await cli.mount([r1, r2, reference])
  onLog(`[Alignment] R1: ${mountedR1.path}`)
  onLog(`[Alignment] R2: ${mountedR2.path}`)
  onLog(`[Alignment] Reference: ${mountedRef.path}`)

  // Extract reference name from filename
  const referenceName = reference.name.replace(/\.(fasta|fa|fna|fsa)(\.gz)?$/i, '')

  // Step 1: Align reads to reference with minimap2
  onProgress('Aligning reads to reference...', 12)
  onLog('[Alignment] Running minimap2 -ax sr (short read alignment)...')
  const alignCmd = `minimap2 -ax sr ${mountedRef.path} ${mountedR1.path} ${mountedR2.path} -o /data/aligned.sam`
  const alignResult = await cli.exec(alignCmd)
  if (alignResult.stderr) {
    const lines = alignResult.stderr.split('\n').filter((l: string) => l.trim())
    for (const line of lines.slice(-5)) {
      onLog(`[minimap2] ${line}`)
    }
  }

  // Step 2: SAM to BAM
  onProgress('Converting SAM to BAM...', 30)
  onLog('[Alignment] Converting SAM → BAM...')
  await cli.exec('samtools view -bS /data/aligned.sam -o /data/aligned.bam')

  // Step 3: Sort BAM
  onProgress('Sorting BAM...', 40)
  onLog('[Alignment] Sorting BAM by coordinate...')
  await cli.exec('samtools sort /data/aligned.bam -o /data/sorted.bam')

  // Step 4: Index BAM
  onProgress('Indexing BAM...', 48)
  onLog('[Alignment] Indexing sorted BAM...')
  await cli.exec('samtools index /data/sorted.bam')

  // Step 5: Get flagstat for mapping statistics
  onProgress('Computing mapping statistics...', 50)
  onLog('[Alignment] Computing mapping statistics...')
  const flagstatResult = await cli.exec('samtools flagstat /data/sorted.bam')
  const stats = parseFlagstat(flagstatResult.stdout)
  onLog(`[Alignment] Total reads: ${stats.totalReads}`)
  onLog(`[Alignment] Mapped: ${stats.mappedReads} (${stats.mappedPct.toFixed(1)}%)`)
  onLog(`[Alignment] Unmapped: ${stats.unmappedReads} (${stats.unmappedPct.toFixed(1)}%)`)

  // Step 6: Compute depth statistics
  onProgress('Computing coverage depth...', 53)
  onLog('[Alignment] Computing coverage depth...')
  const depthResult = await cli.exec('samtools depth -a /data/sorted.bam')
  const depthStats = parseDepth(depthResult.stdout, minDepth)
  onLog(`[Alignment] Mean depth: ${depthStats.meanDepth.toFixed(1)}x`)
  onLog(`[Alignment] Breadth of coverage (>=${minDepth}x): ${depthStats.breadthOfCoverage.toFixed(1)}%`)
  stats.meanDepth = depthStats.meanDepth
  stats.breadthOfCoverage = depthStats.breadthOfCoverage

  // Step 7: Call consensus
  onProgress('Calling consensus...', 58)
  onLog(`[Alignment] Running samtools consensus (min-depth=${minDepth}, min-qual=${minQuality})...`)
  const consensusCmd = `samtools consensus -a --min-depth ${minDepth} -q ${minQuality} /data/sorted.bam -o /data/consensus.fasta`
  const consensusResult = await cli.exec(consensusCmd)
  if (consensusResult.stderr) {
    for (const line of consensusResult.stderr.split('\n').filter((l: string) => l.trim()).slice(-3)) {
      onLog(`[samtools consensus] ${line}`)
    }
  }

  const consensusFasta = await cli.cat('/data/consensus.fasta')
  const { length: consensusLength, nContent } = computeConsensusStats(consensusFasta)
  onLog(`[Alignment] Consensus length: ${consensusLength.toLocaleString()} bp`)
  onLog(`[Alignment] N content: ${nContent.toFixed(1)}%`)

  // Step 8: Extract unmapped reads
  onProgress('Extracting unmapped reads...', 65)
  onLog('[Alignment] Extracting unmapped reads from BAM...')
  await cli.exec('samtools view -b -f 4 /data/sorted.bam -o /data/unmapped.bam')
  await cli.exec('samtools fastq /data/unmapped.bam -1 /data/unmapped_R1.fastq -2 /data/unmapped_R2.fastq -s /data/unmapped_single.fastq')

  let unmappedFastq = ''
  try {
    const r1Unmapped = await cli.cat('/data/unmapped_R1.fastq')
    const r2Unmapped = await cli.cat('/data/unmapped_R2.fastq')
    unmappedFastq = r1Unmapped + '\n' + r2Unmapped
    const unmappedReadCount = (unmappedFastq.match(/@/g) || []).length
    onLog(`[Alignment] Extracted ${unmappedReadCount} unmapped reads for de novo assembly`)
  } catch {
    onLog('[Alignment] No unmapped reads extracted (all reads mapped)')
  }

  return {
    consensusFasta,
    unmappedFastq,
    mappingStats: stats,
    consensusLength,
    nContent,
    referenceName,
  }
}

/** Parse samtools flagstat output */
function parseFlagstat(stdout: string): {
  totalReads: number
  mappedReads: number
  unmappedReads: number
  mappedPct: number
  unmappedPct: number
  meanDepth: number
  breadthOfCoverage: number
} {
  const lines = stdout.split('\n')
  let totalReads = 0
  let mappedReads = 0

  for (const line of lines) {
    const totalMatch = line.match(/^(\d+)\s.*in total/)
    if (totalMatch) {
      totalReads = parseInt(totalMatch[1], 10)
    }
    const mappedMatch = line.match(/^(\d+)\s.*mapped\s*\(/)
    if (mappedMatch) {
      mappedReads = parseInt(mappedMatch[1], 10)
    }
  }

  const unmappedReads = totalReads - mappedReads
  const mappedPct = totalReads > 0 ? (mappedReads / totalReads) * 100 : 0
  const unmappedPct = totalReads > 0 ? (unmappedReads / totalReads) * 100 : 0

  return {
    totalReads,
    mappedReads,
    unmappedReads,
    mappedPct,
    unmappedPct,
    meanDepth: 0,
    breadthOfCoverage: 0,
  }
}

/** Parse samtools depth output to compute mean depth and breadth */
function parseDepth(stdout: string, minDepth: number): {
  meanDepth: number
  breadthOfCoverage: number
} {
  const lines = stdout.split('\n').filter((l) => l.trim())
  if (lines.length === 0) {
    return { meanDepth: 0, breadthOfCoverage: 0 }
  }

  let totalDepth = 0
  let coveredPositions = 0
  const totalPositions = lines.length

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 3) {
      const depth = parseInt(parts[2], 10)
      totalDepth += depth
      if (depth >= minDepth) {
        coveredPositions++
      }
    }
  }

  return {
    meanDepth: totalPositions > 0 ? totalDepth / totalPositions : 0,
    breadthOfCoverage: totalPositions > 0 ? (coveredPositions / totalPositions) * 100 : 0,
  }
}

/** Compute consensus sequence stats */
function computeConsensusStats(fasta: string): { length: number; nContent: number } {
  const sequence = fasta
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join('')

  const length = sequence.length
  const nCount = (sequence.match(/[Nn]/g) || []).length
  const nContent = length > 0 ? (nCount / length) * 100 : 0

  return { length, nContent }
}
