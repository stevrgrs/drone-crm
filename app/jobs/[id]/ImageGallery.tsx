'use client'

import { useState } from 'react'

export default function ImageGallery({ images }: { images: any[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {images.map((img: any) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Job upload"
            onClick={() => setSelected(img.image_url)}
            style={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={selected}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </>
  )
}