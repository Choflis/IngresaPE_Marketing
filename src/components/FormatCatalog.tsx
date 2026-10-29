'use client';
import { useState } from 'react';
import { ArrowUpRight, Film, Layers, Image as ImageIcon, Search, VolumeX } from 'lucide-react';
import type { Template } from '@/lib/types';
import { catalogTemplates } from '@/lib/template-catalog';

export function FormatArtwork({ template }: { template: Template }) {
  const isFijas = template.composition === 'las-fijas';
  return (
    <div className={`catalog-art catalog-art-${template.composition}`} aria-hidden="true">
      <div className="catalog-poster">
        {template.kind === 'video' ? (
          <>
            <div className="poster-brand">INGRESA.PE</div>
            <div className="poster-title">
              {isFijas ? (
                <>
                  LAS
                  <br />
                  <b>FIJAS</b>
                </>
              ) : template.composition === 'challenge' ? (
                <>
                  ¿ACEPTAS
                  <br />
                  <b>EL RETO?</b>
                </>
              ) : (
                <>
                  DINO
                  <br />
                  <b>RESPONDE.</b>
                </>
              )}
            </div>
            <img src={isFijas ? '/brand/mascot-las-fijas.webp' : '/brand/mascot.webp'} alt="" />
            <div className="poster-question">
              <span>{isFijas ? 'RAZONAMIENTO MATEMÁTICO' : 'PRACTICA PARA LA UNSA'}</span>
              <strong>
                Lee. Elige.
                <br />
                Entiende la respuesta.
              </strong>
              <i>A</i>
              <i>B</i>
              <i>C</i>
            </div>
            {template.composition === 'challenge' && <span className="poster-clock">05</span>}
          </>
        ) : (
          <>
            <div className="poster-brand">INGRESA.PE</div>
            <div className="poster-editorial">
              {template.kind === 'carousel' ? (
                <>
                  Pregunta.
                  <br />
                  Pista.
                  <br />
                  <b>Explicación.</b>
                </>
              ) : (
                <>
                  Una pregunta.
                  <br />
                  <b>Cada día.</b>
                </>
              )}
            </div>
            <div className="poster-rule" />
            <span className="poster-footer">APRENDE ALGO NUEVO HOY ↗</span>
            {template.kind === 'carousel' && <span className="poster-pages">● ○ ○</span>}
          </>
        )}
      </div>
      <span className="catalog-ratio">{template.kind === 'video' ? '9:16' : '4:5'}</span>
    </div>
  );
}

export function FormatCatalog({
  templates,
  onOpen,
  onUse,
  compact = false,
}: {
  templates: Template[];
  onOpen: (id: number) => void;
  onUse: (id: number) => void;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const visible = catalogTemplates(templates).filter(
    (t) =>
      (!filter || t.kind === filter) &&
      `${t.name} ${t.description}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')),
  );
  return (
    <section className="format-catalog" aria-label="Catálogo de formatos">
      <div className="catalog-toolbar">
        <div className="segmented-control" aria-label="Tipo de formato">
          {[
            ['', 'Todos'],
            ['video', 'Videos'],
            ['image', 'Imágenes'],
            ['carousel', 'Carruseles'],
          ].map(([value, label]) => (
            <button
              key={label}
              aria-pressed={filter === value}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar formatos"
            placeholder="Buscar un formato"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={`catalog-grid ${compact ? 'catalog-grid-compact' : ''}`}>
        {visible.map((t) => {
          const Icon = t.kind === 'video' ? Film : t.kind === 'carousel' ? Layers : ImageIcon;
          return (
            <article className="catalog-card" data-kind={t.kind} key={t.version_id}>
              <button
                className="catalog-preview"
                aria-label={`Ver formato ${t.name}`}
                onClick={() => onOpen(t.version_id)}
              >
                <FormatArtwork template={t} />
                <span className="catalog-open">
                  <ArrowUpRight size={18} />
                </span>
              </button>
              <div className="catalog-card-body">
                <div className="catalog-kind">
                  <Icon size={14} />
                  {t.kind === 'video'
                    ? `${t.duration_seconds} s · Video`
                    : t.kind === 'carousel'
                      ? '3 páginas · Carrusel'
                      : 'Imagen'}
                  {t.composition === 'las-fijas' && (
                    <span className="reference-label">Tu referencia</span>
                  )}
                </div>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <div className="catalog-card-footer">
                  <span>
                    {t.kind === 'video' ? (
                      <>
                        <VolumeX size={14} />
                        Voz pendiente
                      </>
                    ) : (
                      'Composición local'
                    )}
                  </span>
                  <button className="text-button" onClick={() => onUse(t.version_id)}>
                    Usar formato <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="inline-empty">
          <Film size={26} />
          <h3>No encontramos ese formato</h3>
          <p>Prueba otro nombre o cambia el tipo de contenido.</p>
          <button
            className="button"
            onClick={() => {
              setSearch('');
              setFilter('');
            }}
          >
            Mostrar todos
          </button>
        </div>
      )}
    </section>
  );
}
