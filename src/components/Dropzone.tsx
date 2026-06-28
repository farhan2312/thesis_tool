import { useDropzone } from 'react-dropzone'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
  disabledHint?: string
}

export default function Dropzone({ onFile, disabled, disabledHint }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled,
    onDrop: (files) => {
      if (files[0]) onFile(files[0])
    },
  })

  return (
    <div
      {...getRootProps()}
      className={`dropzone${isDragActive ? ' active' : ''}${disabled ? ' disabled' : ''}`}
    >
      <input {...getInputProps()} />
      <svg
        className="dropzone-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </svg>
      <h2>{isDragActive ? 'Drop the PDF to analyse' : 'Drag & drop an ESG / sustainability PDF'}</h2>
      <p>
        {disabled
          ? (disabledHint ?? 'Preparing…')
          : 'or click to choose a file — it is parsed and analysed here, in this tab.'}
      </p>
    </div>
  )
}
