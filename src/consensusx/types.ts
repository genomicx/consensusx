/** Pipeline input files */
export interface ConsensusxInput {
  r1: File
  r2: File
  reference: File
}

/** Pipeline options */
export interface ConsensusxOptions {
  minDepth: number
  minQuality: number
  minContigLength: number
}

export const DEFAULT_OPTIONS: ConsensusxOptions = {
  minDepth: 10,
  minQuality: 20,
  minContigLength: 500,
}

/** Mapping statistics */
export interface MappingStats {
  totalReads: number
  mappedReads: number
  unmappedReads: number
  mappedPct: number
  unmappedPct: number
  meanDepth: number
  breadthOfCoverage: number
}

/** Assembly statistics for Sparrowhawk output */
export interface AccessoryStats {
  contigCount: number
  totalLength: number
  n50: number
}

/** Full pipeline result */
export interface ConsensusxResult {
  consensusFasta: string
  accessoryFasta: string
  hybridFasta: string
  mappingStats: MappingStats
  accessoryStats: AccessoryStats
  referenceName: string
  consensusLength: number
  nContent: number
}
