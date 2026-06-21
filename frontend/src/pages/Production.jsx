import { useState, useEffect } from 'react';
import { Plus, X, Calculator, Pencil, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, useFetch, KpiSimple as KpiCard, FilterBar } from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MACHINES = [
  'DEB-SCI-01', 'DEB-SCI-02', 'PRE-HOT-01', 'PRE-COL-01',
  'FIN-PON-01', 'FIN-DEC-01', 'ENE-CHA-01', 'ENE-CMP-01',
];

const TODAY = new Date().toISOString().slice(0, 10);

function TrsGauge({ value, label }) {
  const color = value >= 85 ? '#2DD4BF' : value >= 65 ? '#FBBF24' : '#ef4444';
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}%</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

function calcTRSLocal(form) {
  const parseH = (t) => { const [h, m] = (t || '08:00').split(':').map(Number); return h + m / 60; };
  const duree = Math.max(0.1, parseH(form.shift_fin) - parseH(form.shift_debut));
  const ta = Math.min(Number(form.temps_arret || 0), duree);
  const dispo = (duree - ta) / duree;
  const totalProd = form.articles_produits.reduce((s, a) => s + Number(a.qte || 0), 0);
  const theorique = Number(form.production_theorique || 0);
  const perf = theorique > 0 ? Math.min(1, totalProd / theorique) : 1;
  const conforme = form.production_conforme !== '' ? Math.min(Number(form.production_conforme), totalProd) : totalProd;
  const qualite = totalProd > 0 ? conforme / totalProd : 1;
  return {
    duree: +duree.toFixed(1),
    dispo: +(dispo * 100).toFixed(1),
    perf: +(perf * 100).toFixed(1),
    qualite: +(qualite * 100).toFixed(1),
    trs: +(dispo * perf * qualite * 100).toFixed(1),
  };
}

const EMPTY_FORM = {
  machine: 'DEB-SCI-01', date: TODAY,
  shift_debut: '06:00', shift_fin: '14:00',
  conducteur: '',
  articles_produits: [{ ref: '', qte: 0 }],
  matieres_consommees: [{ ref: '', qte: 0 }],
  temps_arret: 0,
  production_theorique: 0,
  production_conforme: '',
  observations: '',
};

function ProductionForm({ form, setForm, articles, matieres, collabs, onCancel, onSubmit, saving, title, readOnly }) {
  const trs = calcTRSLocal(form);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addArt = () => setForm((f) => ({ ...f, articles_produits: [...f.articles_produits, { ref: '', qte: 0 }] }));
  const removeArt = (i) => setForm((f) => ({ ...f, articles_produits: f.articles_produits.filter((_, j) => j !== i) }));
  const setArt = (i, k, v) => setForm((f) => { const a = [...f.articles_produits]; a[i] = { ...a[i], [k]: v }; return { ...f, articles_produits: a }; });

  const addMat = () => setForm((f) => ({ ...f, matieres_consommees: [...f.matieres_consommees, { ref: '', qte: 0 }] }));
  const removeMat = (i) => setForm((f) => ({ ...f, matieres_consommees: f.matieres_consommees.filter((_, j) => j !== i) }));
  const setMat = (i, k, v) => setForm((f) => { const m = [...f.matieres_consommees]; m[i] = { ...m[i], [k]: v }; return { ...f, matieres_consommees: m }; });

  const artSelected = form.articles_produits.filter((a) => a.ref && Number(a.qte) > 0);
  const matSelected = form.matieres_consommees.filter((m) => m.ref && Number(m.qte) > 0);

  return (
    <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
      <div className="card-head">
        <div className="card-title">{title}</div>
        <button className="btn" onClick={onCancel} style={{ padding: '7px 10px' }}><X size={16} /></button>
      </div>

      {/* Section machine & shift */}
      <div style={{ padding: '0 0 16px' }}>
        <div style={{ padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Machine & Shift</span>
        </div>
        <div className="row-2">
          <div className="field"><label>Machine</label>
            <select className="select" value={form.machine} onChange={set('machine')} disabled={readOnly}>
              {MACHINES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Conducteur</label>
            <select className="select" value={form.conducteur} onChange={set('conducteur')} disabled={readOnly}>
              <option value="">— Sélectionner —</option>
              {collabs.map((c) => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="row-2">
          <div className="field"><label>Date de production</label>
            <input className="input" type="date" value={form.date} onChange={set('date')} disabled={readOnly} /></div>
          <div className="row-2">
            <div className="field"><label>Début shift</label>
              <input className="input mono" type="time" value={form.shift_debut} onChange={set('shift_debut')} disabled={readOnly} /></div>
            <div className="field"><label>Fin shift</label>
              <input className="input mono" type="time" value={form.shift_fin} onChange={set('shift_fin')} disabled={readOnly} /></div>
          </div>
        </div>
      </div>

      {/* Articles produits */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Articles produits</span>
          {!readOnly && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addArt}><Plus size={13} /> Ajouter</button>}
        </div>
        {form.articles_produits.map((a, i) => {
          const artInfo = articles.find((x) => x.ref === a.ref);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
              <div className="field" style={{ flex: 3, marginBottom: 0 }}>
                {i === 0 && <label>Article</label>}
                <select className="select" value={a.ref} onChange={(e) => setArt(i, 'ref', e.target.value)} disabled={readOnly}>
                  <option value="">— Sélectionner un article —</option>
                  {articles.map((x) => <option key={x.ref} value={x.ref}>{x.designation} ({x.unite})</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                {i === 0 && <label>Quantité</label>}
                <input className="input mono" type="number" min="0" step="1" value={a.qte}
                  onChange={(e) => setArt(i, 'qte', e.target.value)} disabled={readOnly} />
              </div>
              {artInfo && <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, paddingBottom: 8 }}>
                {dh(artInfo.cout_unitaire * Number(a.qte || 0))}
              </div>}
              {!readOnly && form.articles_produits.length > 1 && (
                <button className="btn" style={{ padding: '8px', marginBottom: 1 }} onClick={() => removeArt(i)}>
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
        {artSelected.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textAlign: 'right', marginTop: 4 }}>
            Valeur produite : {dh(artSelected.reduce((s, a) => { const info = articles.find((x) => x.ref === a.ref); return s + (info ? info.cout_unitaire * Number(a.qte) : 0); }, 0))}
          </div>
        )}
      </div>

      {/* Matières consommées */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Matières premières consommées</span>
          {!readOnly && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addMat}><Plus size={13} /> Ajouter</button>}
        </div>
        {form.matieres_consommees.map((m, i) => {
          const matInfo = matieres.find((x) => x.ref === m.ref);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
              <div className="field" style={{ flex: 3, marginBottom: 0 }}>
                {i === 0 && <label>Matière première</label>}
                <select className="select" value={m.ref} onChange={(e) => setMat(i, 'ref', e.target.value)} disabled={readOnly}>
                  <option value="">— Sélectionner une matière —</option>
                  {matieres.map((x) => <option key={x.ref} value={x.ref}>{x.designation} — stock: {num(+(x.stock||0).toFixed(1))} {x.unite}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                {i === 0 && <label>Quantité</label>}
                <input className="input mono" type="number" min="0" step="0.1" value={m.qte}
                  onChange={(e) => setMat(i, 'qte', e.target.value)} disabled={readOnly} />
              </div>
              {matInfo && <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, paddingBottom: 8 }}>
                {dh(matInfo.cout_unitaire * Number(m.qte || 0))}
              </div>}
              {!readOnly && form.matieres_consommees.length > 1 && (
                <button className="btn" style={{ padding: '8px', marginBottom: 1 }} onClick={() => removeMat(i)}>
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
        {matSelected.length > 0 && (
          <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, textAlign: 'right', marginTop: 4 }}>
            Coût matières : {dh(matSelected.reduce((s, m) => { const info = matieres.find((x) => x.ref === m.ref); return s + (info ? info.cout_unitaire * Number(m.qte) : 0); }, 0))}
          </div>
        )}
      </div>

      {/* TRS & qualité */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Données TRS</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Temps d'arrêt (h)</label>
            <input className="input mono" type="number" min="0" step="0.5" value={form.temps_arret} onChange={set('temps_arret')} disabled={readOnly} /></div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Production théorique</label>
            <input className="input mono" type="number" min="0" value={form.production_theorique} onChange={set('production_theorique')} disabled={readOnly} /></div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Production conforme</label>
            <input className="input mono" type="number" min="0" value={form.production_conforme} onChange={set('production_conforme')} placeholder="= prod. réelle si vide" disabled={readOnly} /></div>
        </div>

        <div style={{ background: 'var(--surface-3)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', gap: 24, justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Durée shift</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{trs.duree}h</div>
          </div>
          <TrsGauge value={trs.dispo} label="Disponibilité" />
          <span style={{ fontSize: 24, color: 'var(--border)' }}>×</span>
          <TrsGauge value={trs.perf} label="Performance" />
          <span style={{ fontSize: 24, color: 'var(--border)' }}>×</span>
          <TrsGauge value={trs.qualite} label="Qualité" />
          <span style={{ fontSize: 24, color: 'var(--border)' }}>=</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: trs.trs >= 85 ? '#2DD4BF' : trs.trs >= 65 ? '#FBBF24' : '#ef4444' }}>
              {trs.trs}%
            </div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>TRS</div>
          </div>
        </div>
      </div>

      <div className="field"><label>Observations</label>
        <input className="input" value={form.observations} onChange={set('observations')} placeholder="Remarques, incidents, qualité..." disabled={readOnly} /></div>

      <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn" onClick={onCancel}>{readOnly ? 'Fermer' : 'Annuler'}</button>
        {!readOnly && (
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            <Calculator size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer & calculer TRS'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Production() {
  const { canDo } = useAuth();
  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.productions, [reload]);
  const [articles, setArticles] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [collabs, setCollabs] = useState([]);

  useEffect(() => {
    api.articles().then(setArticles).catch(() => {});
    api.matieres().then(setMatieres).catch(() => {});
    api.collaborateurs().then(setCollabs).catch(() => {});
  }, [reload]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editProd, setEditProd] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({ q: '', machine: 'Tous', trsMin: 'Tous' });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const refresh = () => setReload((r) => r + 1);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        articles_produits: form.articles_produits.filter((a) => a.ref && Number(a.qte) > 0),
        matieres_consommees: form.matieres_consommees.filter((m) => m.ref && Number(m.qte) > 0),
        production_conforme: form.production_conforme !== '' ? Number(form.production_conforme) : null,
      };
      await api.createProduction(payload);
      setOpen(false);
      setForm(EMPTY_FORM);
      refresh();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (p) => {
    setEditProd(p);
    setEditForm({
      machine: p.machine, date: p.date,
      shift_debut: p.shift_debut, shift_fin: p.shift_fin,
      conducteur: p.conducteur || '',
      articles_produits: p.articles_produits?.length ? [...p.articles_produits] : [{ ref: '', qte: 0 }],
      matieres_consommees: p.matieres_consommees?.length ? [...p.matieres_consommees] : [{ ref: '', qte: 0 }],
      temps_arret: p.temps_arret || 0,
      production_theorique: p.production_theorique || 0,
      production_conforme: p.production_conforme ?? '',
      observations: p.observations || '',
    });
  };

  const submitEdit = async () => {
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        articles_produits: editForm.articles_produits.filter((a) => a.ref && Number(a.qte) > 0),
        matieres_consommees: editForm.matieres_consommees.filter((m) => m.ref && Number(m.qte) > 0),
        production_conforme: editForm.production_conforme !== '' ? Number(editForm.production_conforme) : null,
      };
      await api.updateProduction(editProd.id, payload);
      setEditProd(null);
      refresh();
    } catch (e) { alert(e.message); }
    finally { setEditSaving(false); }
  };

  const deleteProd = async (p) => {
    if (!confirm(`Supprimer ${p.id} ? Les mouvements de stock seront annulés.`)) return;
    await api.deleteProduction(p.id);
    refresh();
  };

  if (!data) return <Loading />;

  const avgTRS = data.length ? +(data.reduce((s, p) => s + p.trs, 0) / data.length).toFixed(1) : 0;
  const totalVal = data.reduce((s, p) => s + (p.valeur_production || 0), 0);
  const totalCoutMP = data.reduce((s, p) => s + (p.cout_matieres || 0), 0);

  const machineOptions = ['Tous', ...new Set(data.map((p) => p.machine))];
  const filteredProds = data.filter((p) => {
    if (filters.machine !== 'Tous' && p.machine !== filters.machine) return false;
    if (filters.trsMin === '≥ 85%' && p.trs < 85) return false;
    if (filters.trsMin === '< 65%' && p.trs >= 65) return false;
    if (filters.trsMin === '65–85%' && (p.trs < 65 || p.trs >= 85)) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return p.id.toLowerCase().includes(q) || p.machine.toLowerCase().includes(q) || p.conducteurNom?.toLowerCase().includes(q);
    }
    return true;
  });

  const trsColor = (v) => v >= 85 ? '#2DD4BF' : v >= 65 ? '#FBBF24' : '#ef4444';

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5, maxWidth: 620 }}>
          Saisie des <b style={{ color: 'var(--text)' }}>sessions de production</b>. Le TRS est calculé automatiquement. Chaque production met à jour les stocks articles et matières premières.
        </p>
        {canDo('production', 'create') && (
          <button className="btn btn-primary" onClick={() => { setOpen(true); setForm(EMPTY_FORM); }}>
            <Plus size={17} /> Nouvelle saisie
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="TRS moyen" value={`${avgTRS}%`} sub={`sur ${data.length} sessions`} tone={avgTRS >= 85 ? 'good' : avgTRS >= 65 ? 'amber' : 'bad'} />
        <KpiCard label="Valeur produite" value={dh(totalVal)} sub="articles finis valorisés" tone="teal" />
        <KpiCard label="Coût matières" value={dh(totalCoutMP)} sub="matières premières consommées" tone="orange" />
        <KpiCard label="Marge brute" value={dh(totalVal - totalCoutMP)} sub="valeur produite − coût MP" tone={totalVal > totalCoutMP ? 'good' : 'bad'} />
      </div>

      {/* Modal création */}
      {open && canDo('production', 'create') && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: 720, maxHeight: '95vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <ProductionForm
              form={form} setForm={setForm}
              articles={articles} matieres={matieres} collabs={collabs}
              onCancel={() => setOpen(false)} onSubmit={submit} saving={saving}
              title="Nouvelle saisie de production"
            />
          </div>
        </div>
      )}

      {/* Modal modification / consultation */}
      {editProd && (
        <div className="overlay" onClick={() => setEditProd(null)}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: 720, maxHeight: '95vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <ProductionForm
              form={editForm} setForm={setEditForm}
              articles={articles} matieres={matieres} collabs={collabs}
              onCancel={() => setEditProd(null)} onSubmit={submitEdit} saving={editSaving}
              title={canDo('production', 'edit') ? `Modifier ${editProd.id}` : `Consulter ${editProd.id}`}
              readOnly={!canDo('production', 'edit')}
            />
          </div>
        </div>
      )}

      {/* Liste des productions */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Historique des productions</div>
          <span className="card-hint">{data.length} sessions</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (ID, machine, conducteur…)', type: 'text' },
            { key: 'machine', label: 'Machine', type: 'select', options: machineOptions },
            { key: 'trsMin', label: 'TRS', type: 'select', options: ['Tous', '≥ 85%', '65–85%', '< 65%'] },
          ]}
          values={filters} onChange={setF} total={data.length} shown={filteredProds.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Machine</th><th>Date</th><th>Shift</th>
                <th>Conducteur</th><th className="mono">TRS</th>
                <th className="mono">Dispo</th><th className="mono">Perf</th><th className="mono">Qualité</th>
                <th className="mono">Valeur</th><th className="mono">Coût MP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProds.map((p) => (
                <>
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <td className="cell-code">{p.id}</td>
                    <td>
                      <div className="cell-strong" style={{ fontSize: 13 }}>{p.machineName || p.machine}</div>
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{p.date}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{p.shift_debut}→{p.shift_fin}</td>
                    <td style={{ fontSize: 13 }}>{p.conducteurNom || '—'}</td>
                    <td className="mono" style={{ fontWeight: 700, color: trsColor(p.trs) }}>{p.trs}%</td>
                    <td className="mono muted">{p.disponibilite}%</td>
                    <td className="mono muted">{p.performance}%</td>
                    <td className="mono muted">{p.qualite}%</td>
                    <td className="mono cell-strong">{dh(p.valeur_production)}</td>
                    <td className="mono" style={{ color: '#fbbf24' }}>{dh(p.cout_matieres)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap" style={{ gap: 4 }}>
                        <button className="btn" style={{ padding: '5px 7px' }} onClick={() => openEdit(p)} title={canDo('production', 'edit') ? 'Modifier' : 'Consulter'}>
                          {canDo('production', 'edit') ? <Pencil size={13} /> : <Eye size={13} />}
                        </button>
                        {canDo('production', 'delete') && (
                          <button className="btn" style={{ padding: '5px 7px', color: '#ef4444' }} onClick={() => deleteProd(p)} title="Supprimer"><Trash2 size={13} /></button>
                        )}
                        <button className="btn" style={{ padding: '5px 7px' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                          {expanded === p.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={12} style={{ padding: '0 16px 16px', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
                          {/* Articles produits */}
                          <div>
                            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Articles produits</div>
                            {(p.articlesDetail || []).length === 0
                              ? <span className="muted" style={{ fontSize: 12 }}>Aucun article enregistré</span>
                              : (p.articlesDetail || []).map((a) => (
                                <div key={a.ref} className="flex between" style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                  <span>{a.designation}</span>
                                  <span className="mono">{num(a.qte)} {a.unite} · <b style={{ color: 'var(--teal)' }}>{dh(a.total)}</b></span>
                                </div>
                              ))
                            }
                          </div>
                          {/* Matières consommées */}
                          <div>
                            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Matières consommées</div>
                            {(p.matieresDetail || []).length === 0
                              ? <span className="muted" style={{ fontSize: 12 }}>Aucune matière enregistrée</span>
                              : (p.matieresDetail || []).map((m) => (
                                <div key={m.ref} className="flex between" style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                  <span>{m.designation}</span>
                                  <span className="mono">{num(+(m.qte).toFixed(2))} {m.unite} · <b style={{ color: '#fbbf24' }}>{dh(m.total)}</b></span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                        {p.observations && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>💬 {p.observations}</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
