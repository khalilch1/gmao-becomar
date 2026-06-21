import { useState, useRef } from 'react';
import { Camera, X, ZoomIn, Trash2, Upload, ChevronLeft, ChevronRight, Image } from 'lucide-react';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function photoUrl(filename) {
  return `${BASE}/uploads/${filename}`;
}

// Visionneuse plein écran
function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index);
  const prev = () => setCur((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCur((c) => (c + 1) % photos.length);

  const onKey = (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      onKeyDown={onKey}
      tabIndex={0}
      autoFocus
    >
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
        }}
      >
        <X size={18} /> Fermer
      </button>

      {/* Compteur */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
        {cur + 1} / {photos.length}
      </div>

      {/* Navigation gauche */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          style={{
            position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: 8, padding: '12px 10px', cursor: 'pointer', color: '#fff',
          }}
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image */}
      <img
        src={photoUrl(photos[cur])}
        alt={`Photo ${cur + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      />

      {/* Navigation droite */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          style={{
            position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: 8, padding: '12px 10px', cursor: 'pointer', color: '#fff',
          }}
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Miniatures */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, maxWidth: '80vw', overflowX: 'auto', padding: '4px 0',
        }}>
          {photos.map((f, i) => (
            <img
              key={f}
              src={photoUrl(f)}
              alt=""
              onClick={(e) => { e.stopPropagation(); setCur(i); }}
              style={{
                width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                border: i === cur ? '2px solid var(--accent, #f60)' : '2px solid transparent',
                opacity: i === cur ? 1 : 0.55, flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Composant principal : galerie + upload + suppression
export default function PhotoManager({ photos = [], onUpload, onDelete, readOnly }) {
  const [lightbox, setLightbox] = useState(null); // index ou null
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    setErr('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file);
      }
    } catch (e) {
      setErr(e.message || 'Erreur upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (readOnly) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Camera size={15} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Photos ({photos.length})
        </span>
      </div>

      {err && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>
          {err}
        </div>
      )}

      {/* Zone drag & drop + grille */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 10,
          padding: photos.length === 0 ? '24px 16px' : '12px',
          textAlign: photos.length === 0 ? 'center' : 'left',
          background: 'var(--surface-2)',
        }}
      >
        {photos.length === 0 && !readOnly && (
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            <Image size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
            Glissez des photos ici ou cliquez pour sélectionner
          </div>
        )}

        {photos.length === 0 && readOnly && (
          <div className="muted" style={{ fontSize: 13 }}>Aucune photo disponible</div>
        )}

        {/* Grille de miniatures */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: !readOnly ? 10 : 0 }}>
            {photos.map((filename, i) => (
              <div key={filename} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <img
                  src={photoUrl(filename)}
                  alt={`Photo ${i + 1}`}
                  onClick={() => setLightbox(i)}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    borderRadius: 8, cursor: 'pointer',
                    border: '1px solid var(--border)',
                  }}
                />
                {/* Bouton zoom */}
                <button
                  onClick={() => setLightbox(i)}
                  title="Agrandir"
                  style={{
                    position: 'absolute', bottom: 3, left: 3,
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <ZoomIn size={12} />
                </button>
                {/* Bouton supprimer */}
                {!readOnly && (
                  <button
                    onClick={() => onDelete(filename)}
                    title="Supprimer"
                    style={{
                      position: 'absolute', top: 3, right: 3,
                      background: 'rgba(220,38,38,0.8)', border: 'none',
                      borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bouton upload */}
        {!readOnly && (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              className="btn"
              style={{ gap: 6, fontSize: 12, padding: '6px 12px' }}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={14} />
              {uploading ? 'Envoi…' : 'Ajouter des photos'}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// Petit badge cliquable pour la liste (affiche le nombre de photos)
export function PhotoBadge({ photos = [], onClick }) {
  if (photos.length === 0) return null;
  return (
    <button
      onClick={onClick}
      title={`${photos.length} photo${photos.length > 1 ? 's' : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '2px 7px', cursor: 'pointer',
        fontSize: 11, color: 'var(--text-muted)',
      }}
    >
      <Camera size={12} /> {photos.length}
    </button>
  );
}
