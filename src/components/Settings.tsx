import type { ConsensusxOptions } from '../consensusx/types'

interface SettingsProps {
  options: ConsensusxOptions
  onChange: (options: ConsensusxOptions) => void
  disabled: boolean
}

export function Settings({ options, onChange, disabled }: SettingsProps) {
  return (
    <div className="settings-panel">
      <h3>Settings</h3>
      <div className="settings-grid">
        <div className="setting-item">
          <label htmlFor="min-depth">
            Minimum depth
            <span className="setting-value">{options.minDepth}</span>
          </label>
          <input
            id="min-depth"
            type="range"
            min={1}
            max={100}
            value={options.minDepth}
            onChange={(e) =>
              onChange({ ...options, minDepth: parseInt(e.target.value, 10) })
            }
            disabled={disabled}
          />
        </div>

        <div className="setting-item">
          <label htmlFor="min-quality">
            Minimum quality
            <span className="setting-value">{options.minQuality}</span>
          </label>
          <input
            id="min-quality"
            type="range"
            min={0}
            max={40}
            value={options.minQuality}
            onChange={(e) =>
              onChange({ ...options, minQuality: parseInt(e.target.value, 10) })
            }
            disabled={disabled}
          />
        </div>

        <div className="setting-item">
          <label htmlFor="min-contig">
            Min accessory contig length (bp)
            <span className="setting-value">{options.minContigLength}</span>
          </label>
          <input
            id="min-contig"
            type="range"
            min={100}
            max={5000}
            step={100}
            value={options.minContigLength}
            onChange={(e) =>
              onChange({ ...options, minContigLength: parseInt(e.target.value, 10) })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
