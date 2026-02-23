import { test, expect } from '@playwright/test'
import path from 'path'

// Test data paths — real Klebsiella pneumoniae reads + reference
const READS_DIR = '/Users/nfareed/code/genomepuzzle/ghru_output_dataset/assembly_practice'
const R1 = path.join(READS_DIR, 'Sample_1cc0da37semb_R1.fastq.gz')
const R2 = path.join(READS_DIR, 'Sample_1cc0da37semb_R2.fastq.gz')
const REFERENCE = '/Users/nfareed/Downloads/sequence (1).fasta'

test('full consensus pipeline produces non-zero results', async ({ page }) => {
  page.setDefaultNavigationTimeout(60_000)

  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Consensusx')

  // Upload R1, R2, Reference
  await page.locator('input[type="file"]').nth(0).setInputFiles(R1)
  await page.locator('input[type="file"]').nth(1).setInputFiles(R2)
  await page.locator('input[type="file"]').nth(2).setInputFiles(REFERENCE)

  // Verify files are shown
  await expect(page.locator('.file-list').nth(0)).toContainText('R1.fastq.gz')
  await expect(page.locator('.file-list').nth(1)).toContainText('R2.fastq.gz')
  await expect(page.locator('.file-list').nth(2)).toContainText('sequence')

  // Click Run and wait for pipeline to complete
  const runButton = page.locator('button.run-button')
  await expect(runButton).toBeEnabled()
  await runButton.click()
  await expect(runButton).toHaveText('Running...', { timeout: 10_000 })
  await expect(runButton).not.toHaveText('Running...', { timeout: 600_000 })

  // Results section should appear
  const results = page.locator('.results')
  await expect(results).toBeVisible({ timeout: 10_000 })

  // --- Mapping stats: use exact row text to avoid "Mapped"/"Unmapped" ambiguity ---
  const totalReadsCell = results.locator('tr').filter({ hasText: /^Total reads/ }).locator('.stat-value')
  const totalReads = await totalReadsCell.textContent()
  const totalReadsNum = parseInt(totalReads!.replace(/,/g, ''), 10)
  expect(totalReadsNum).toBeGreaterThan(100_000)
  console.log(`Total reads: ${totalReads}`)

  // Mean depth > 0
  const meanDepthCell = results.locator('tr').filter({ hasText: /^Mean depth/ }).locator('.stat-value')
  const meanDepth = await meanDepthCell.textContent()
  expect(meanDepth).not.toBe('0.0x')
  console.log(`Mean depth: ${meanDepth}`)

  // --- Consensus length > 0  — THE KEY ASSERTION ---
  const consensusLenCell = results.locator('tr').filter({ hasText: /^Consensus length/ }).locator('.stat-value')
  const consensusLength = await consensusLenCell.textContent()
  const consensusLengthNum = parseInt(consensusLength!.replace(/[, bp]/g, ''), 10)
  expect(consensusLengthNum).toBeGreaterThan(0)
  console.log(`Consensus length: ${consensusLength}`)

  // --- FASTA preview should have content ---
  const fastaPreview = results.locator('.fasta-content')
  const previewText = await fastaPreview.textContent()
  expect(previewText!.length).toBeGreaterThan(10)
  expect(previewText).toContain('>')

  // --- Log checks ---
  const logText = await page.locator('.log-body').textContent()
  expect(logText).toContain('Pipeline complete')
  expect(logText).not.toContain('unrecognized command')

  // Log Sparrowhawk status for debugging
  if (logText?.includes('Sparrowhawk')) {
    const sparrowhawkLines = logText.split('\n').filter(l => l.includes('Sparrowhawk') || l.includes('sparrowhawk'))
    for (const line of sparrowhawkLines) {
      console.log(line.trim())
    }
  }

  // --- Download buttons ---
  await expect(results.locator('button', { hasText: 'Download Hybrid FASTA' })).toBeVisible()
  await expect(results.locator('button', { hasText: 'Stats CSV' })).toBeVisible()

  console.log('E2E test passed: consensus pipeline produced valid results')
})
