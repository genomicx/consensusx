/**
 * Web Worker for Sparrowhawk de novo assembly.
 *
 * wasm-bindgen-file-reader uses FileReaderSync which is only available
 * in Web Workers, not the main thread. This worker loads the Sparrowhawk
 * WASM module and runs the assembly in a worker context.
 */

interface AssembleMessage {
  type: 'assemble'
  r1File: File
  r2File: File
  kmerSize: number
  minCount: number
  minQual: number
  chunkSize: number
  doBloom: boolean
  doFit: boolean
}

interface ResultMessage {
  type: 'result'
  outfasta: string
  ncontigs: number
  nkmers: number
  usedMinCount: number
}

interface ErrorMessage {
  type: 'error'
  message: string
}

interface LogMessage {
  type: 'log'
  message: string
}

type WorkerMessage = AssembleMessage
type WorkerResponse = ResultMessage | ErrorMessage | LogMessage

function postLog(msg: string) {
  self.postMessage({ type: 'log', message: msg } satisfies LogMessage)
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data

  if (msg.type === 'assemble') {
    try {
      postLog('[Sparrowhawk Worker] Loading WASM module...')

      // Fetch and load the WASM module
      const jsResponse = await fetch('/wasm/sparrowhawk.js')
      if (!jsResponse.ok) throw new Error(`Failed to fetch sparrowhawk.js: ${jsResponse.status}`)
      const jsText = await jsResponse.text()
      const blob = new Blob([jsText], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      const mod = await import(/* @vite-ignore */ blobUrl)
      URL.revokeObjectURL(blobUrl)

      // Initialize the WASM binary
      if (typeof mod.default === 'function') {
        await mod.default('/wasm/sparrowhawk_bg.wasm')
      }

      // Enable panic hook for better error messages
      if (typeof mod.init_panic_hook === 'function') {
        mod.init_panic_hook()
      }

      postLog('[Sparrowhawk Worker] WASM loaded, starting assembly...')

      // Create AssemblyHelper
      const helper = mod.AssemblyHelper.new(
        msg.r1File,
        msg.r2File,
        msg.kmerSize,
        false,           // verbose
        msg.minCount,
        msg.minQual,
        msg.chunkSize,
        msg.doBloom,
        msg.doFit,
      )

      const preprocessInfo = JSON.parse(helper.get_preprocessing_info())
      postLog(`[Sparrowhawk Worker] K-mers counted: ${preprocessInfo.nkmers.toLocaleString()}`)
      postLog(`[Sparrowhawk Worker] Used min_count: ${preprocessInfo.used_min_count}`)

      // Run assembly
      postLog('[Sparrowhawk Worker] Running de Bruijn graph assembly...')
      helper.assemble(false, false)

      const assemblyResult = JSON.parse(helper.get_assembly())
      postLog(`[Sparrowhawk Worker] Assembled ${assemblyResult.ncontigs} contigs`)

      self.postMessage({
        type: 'result',
        outfasta: assemblyResult.outfasta || '',
        ncontigs: assemblyResult.ncontigs || 0,
        nkmers: preprocessInfo.nkmers || 0,
        usedMinCount: preprocessInfo.used_min_count || 0,
      } satisfies ResultMessage)
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      } satisfies ErrorMessage)
    }
  }
}

// Suppress unused type warnings
export type { WorkerMessage, WorkerResponse }
