# ConsensusX

> Browser-based bacterial consensus assembly from raw sequencing reads — no server required.

ConsensusX generates bacterial consensus sequences from raw sequencing reads entirely in your browser. It maps reads to a reference genome using minimap2, calls a consensus with samtools, then de novo assembles unmapped reads using Sparrowhawk to capture accessory genome content (plasmids, AMR genes, phage) missed by the reference. The result is a hybrid FASTA suitable for downstream analysis with MLSTx, Genetrax, and other GenomicX tools.

## Features

- Reference-guided consensus from paired-end FASTQ reads
- De novo assembly of unmapped reads (accessory genome, plasmids, AMR genes)
- Hybrid FASTA output combining reference consensus + accessory contigs
- Compatible with all downstream GenomicX tools (MLSTx, Genetrax, MashX)
- All processing in-browser — no upload, no server

## Tech Stack

- **minimap2** — read alignment (via Aioli/biowasm WebAssembly)
- **samtools** — alignment processing and consensus calling (WebAssembly)
- **Sparrowhawk** — de novo genome assembler (Rust → WebAssembly)
- **React + Vite** — frontend framework
- **Cloudflare Pages** — global CDN hosting

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Running Tests

```bash
npm test           # unit tests
npm run test:e2e   # end-to-end tests (requires build first)
```

## Contributing

Contributions welcome. Please open an issue first to discuss changes.

## License

GPL-3.0-only — see [LICENSE](LICENSE)
