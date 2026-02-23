import { useCallback } from 'react'

interface FileDropZoneProps {
  label: string
  hint: string
  accept: string
  file: File | null
  onFileChange: (file: File | null) => void
  disabled: boolean
}

export function FileDropZone({ label, hint, accept, file, onFileChange, disabled }: FileDropZoneProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileChange(e.target.files[0])
      }
    },
    [onFileChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (disabled) return
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileChange(e.dataTransfer.files[0])
      }
    },
    [onFileChange, disabled],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="file-upload"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label className="file-upload-area">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          aria-label={label}
        />
        <svg
          className="file-upload-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {file ? (
          <>
            <div className="file-upload-label">{label}</div>
            <ul className="file-list">
              <li>{file.name}</li>
            </ul>
          </>
        ) : (
          <>
            <div className="file-upload-label">{label}</div>
            <div className="file-upload-hint">{hint}</div>
          </>
        )}
      </label>
    </div>
  )
}
