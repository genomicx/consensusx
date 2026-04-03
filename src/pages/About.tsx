import { Link } from 'react-router-dom'

export function About() {
  return (
    <div className="about-page">
      <section>
        <h2>About ConsensusX</h2>
        <p>
          ConsensusX generates bacterial consensus sequences from raw sequencing reads
          entirely in your browser. It maps reads to a reference genome using minimap2,
          calls a consensus with samtools, then de novo assembles unmapped reads using
          Sparrowhawk to capture accessory genome content (plasmids, AMR genes, phage)
          missed by the reference. The result is a hybrid FASTA suitable for downstream
          analysis with MLSTx, Genetrax, and other GenomicX tools.
        </p>
        <div className="privacy-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all read mapping and assembly happens client-side
            using WebAssembly. Your sequencing data stays private.
          </p>
        </div>
      </section>

      <section>
        <h2>Features</h2>
        <ul>
          <li>Reference-guided consensus from paired-end FASTQ reads</li>
          <li>De novo assembly of unmapped reads (accessory genome, plasmids, AMR genes)</li>
          <li>Hybrid FASTA output combining reference consensus + accessory contigs</li>
          <li>Compatible with all downstream GenomicX tools (MLSTx, Genetrax, MashX)</li>
          <li>All processing in-browser — no upload, no server</li>
        </ul>
      </section>

      <section>
        <h2>How it works</h2>
        <ol className="pipeline-steps">
          <li>
            <strong>Align reads</strong> — minimap2 maps your paired-end FASTQ reads to
            the reference genome
          </li>
          <li>
            <strong>Sort &amp; index</strong> — samtools prepares the alignment for
            downstream processing
          </li>
          <li>
            <strong>Call consensus</strong> — samtools consensus generates reference-based
            consensus contigs from mapped reads
          </li>
          <li>
            <strong>Extract unmapped</strong> — reads that didn't map to the reference are
            extracted (these represent accessory genome content)
          </li>
          <li>
            <strong>De novo assemble</strong> — Sparrowhawk assembles unmapped reads into
            accessory contigs (plasmids, AMR cassettes, phage, etc.)
          </li>
          <li>
            <strong>Merge</strong> — reference consensus + accessory contigs are combined
            into a hybrid FASTA
          </li>
        </ol>
      </section>

      <section>
        <h2>Technology</h2>
        <ul>
          <li><strong>minimap2</strong> — read alignment (via Aioli/biowasm WebAssembly)</li>
          <li><strong>samtools</strong> — alignment processing and consensus calling (WebAssembly)</li>
          <li><strong>Sparrowhawk</strong> — de novo genome assembler (Rust → WebAssembly)</li>
          <li><strong>React + Vite</strong> — frontend framework</li>
          <li><strong>Cloudflare Pages</strong> — global CDN hosting</li>
        </ul>
      </section>

      <section>
        <h2>References</h2>
        <ul>
          <li>
            Li H. (2018). Minimap2: pairwise alignment for nucleotide sequences.
            <em> Bioinformatics</em>, 34(18), 3094–3100.
          </li>
          <li>
            Danecek P. et al. (2021). Twelve years of SAMtools and BCFtools.
            <em> GigaScience</em>, 10(2), giab008.
          </li>
          <li>
            Lees JA et al. Sparrowhawk: a Rust-based genome assembler compiled to WebAssembly.{' '}
            <a href="https://github.com/bacpop/sparrowhawk-web" target="_blank" rel="noopener noreferrer">
              github.com/bacpop/sparrowhawk-web
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Source Code</h2>
        <p>
          ConsensusX is open-source software. Contributions and issues welcome on{' '}
          <a href="https://github.com/genomicx/consensusx" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance, University of Oxford
        </p>
        <p>
          Bioinformatics researcher and software developer specialising in microbial genomics.
          Builder of widely used open-source tools, peer-reviewed researcher, and co-host of
          the MicroBinfie podcast.
        </p>
        <div className="about-links">
          <a href="https://www.happykhan.com" target="_blank" rel="noopener noreferrer">happykhan.com</a>
          <a href="https://orcid.org/0000-0002-1243-0767" target="_blank" rel="noopener noreferrer">ORCID: 0000-0002-1243-0767</a>
          <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
          <a href="https://twitter.com/happy_khan" target="_blank" rel="noopener noreferrer">@happy_khan</a>
          <a href="https://mstdn.science/@happykhan" target="_blank" rel="noopener noreferrer">@happykhan@mstdn.science</a>
        </div>
      </section>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/" style={{ color: 'var(--gx-accent)', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to Application
        </Link>
      </div>
    </div>
  )
}
