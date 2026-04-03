export function About() {
  return (
    <div className="about-page">
      <section>
        <h2>About Consensusx</h2>
        <p>
          Consensusx generates bacterial consensus sequences from raw sequencing
          reads entirely in your browser. It maps reads to a reference genome
          using minimap2, calls a consensus with samtools, then de novo assembles
          unmapped reads using Sparrowhawk to capture accessory genome content
          (plasmids, AMR genes, phage) missed by the reference. The result is a
          hybrid FASTA suitable for downstream analysis with MLSTx, Genetrax, and
          other GenomicX tools.
        </p>
        <div className="privacy-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens client-side
            using WebAssembly.
          </p>
        </div>
      </section>

      <section>
        <h2>How It Works</h2>
        <ol className="pipeline-steps">
          <li>
            <strong>Align reads</strong> — minimap2 maps your paired-end FASTQ
            reads to the reference genome
          </li>
          <li>
            <strong>Sort &amp; index</strong> — samtools prepares the alignment
            for downstream processing
          </li>
          <li>
            <strong>Call consensus</strong> — samtools consensus generates
            reference-based consensus contigs from mapped reads
          </li>
          <li>
            <strong>Extract unmapped</strong> — reads that didn't map to the
            reference are extracted (these represent accessory genome content)
          </li>
          <li>
            <strong>De novo assemble</strong> — Sparrowhawk assembles unmapped
            reads into accessory contigs (plasmids, AMR cassettes, phage, etc.)
          </li>
          <li>
            <strong>Merge</strong> — reference consensus + accessory contigs are
            combined into a hybrid FASTA
          </li>
        </ol>
      </section>

      <section>
        <h2>References</h2>
        <ul className="reference-list">
          <li>
            Li, H. (2018). Minimap2: pairwise alignment for nucleotide sequences.
            <em> Bioinformatics</em>, 34(18), 3094–3100.
          </li>
          <li>
            Danecek, P. et al. (2021). Twelve years of SAMtools and BCFtools.
            <em> GigaScience</em>, 10(2), giab008.
          </li>
          <li>
            Lees, J. A. et al. Sparrowhawk: a Rust-based genome assembler
            compiled to WebAssembly.{' '}
            <a href="https://github.com/bacpop/sparrowhawk-web" target="_blank" rel="noopener noreferrer">
              github.com/bacpop/sparrowhawk-web
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance,
          University of Oxford
        </p>
        <p>
          Bioinformatics researcher and software developer specialising in
          microbial genomics. I build widely used open-source tools, publish
          peer-reviewed research, and co-host the MicroBinfie podcast.
        </p>
        <div className="about-links">
          <a href="https://www.happykhan.com" target="_blank" rel="noopener noreferrer">
            happykhan.com
          </a>
          <a href="https://orcid.org/0000-0002-1243-0767" target="_blank" rel="noopener noreferrer">
            ORCID: 0000-0002-1243-0767
          </a>
          <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
          <a href="https://twitter.com/happy_khan" target="_blank" rel="noopener noreferrer">
            Twitter: @happy_khan
          </a>
          <a href="https://mstdn.science/@happykhan" target="_blank" rel="noopener noreferrer">
            Mastodon: @happykhan@mstdn.science
          </a>
        </div>
      </section>
    </div>
  )
}
