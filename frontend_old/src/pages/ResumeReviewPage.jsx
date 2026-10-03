import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCareerStore } from '../store/careerStore';
import { careerAPI } from '../api/career';
import { Card, SectionHeader, Button } from '../components/ui/Primitives';
import { 
  FileText, CheckCircle2, AlertCircle, ArrowLeft, DownloadCloud, 
  Loader2, User, Briefcase, GraduationCap, Code, Award, FolderOpen, Languages, Pencil, X, Plus, Trash2
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Editable list of simple strings (skills, certifications, achievements, languages)
// ---------------------------------------------------------------------------
function EditableChipList({ items = [], onChange, label }) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setNewValue('');
    setAdding(false);
  };

  const handleRemove = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.filter(Boolean).map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs text-ink">
            {item}
            <button onClick={() => handleRemove(i)} className="ml-0.5 text-muted hover:text-danger"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
              className="w-32 rounded border border-line bg-raised px-2 py-0.5 text-xs text-ink outline-none focus:border-accent"
              placeholder={`Add ${label}`}
            />
            <button onClick={handleAdd} className="text-xs text-accent">Add</button>
          </span>
        ) : (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent">
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable text field
// ---------------------------------------------------------------------------
function EditableField({ label, value, onChange, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const save = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value || ''); setEditing(false); };

  if (editing) {
    const InputEl = multiline ? 'textarea' : 'input';
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted">{label}</label>
        <InputEl
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (!multiline && e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          rows={multiline ? 3 : undefined}
          className="w-full rounded border border-line bg-raised px-2 py-1 text-sm text-ink outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button onClick={save} className="text-xs text-accent">Save</button>
          <button onClick={cancel} className="text-xs text-muted">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-2">
      <div>
        <span className="text-xs text-muted">{label}</span>
        <p className="text-sm text-ink">{value || <span className="italic text-muted">—</span>}</p>
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-opacity">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Experience / Project / Education cards
// ---------------------------------------------------------------------------
function ExperienceCard({ item, index, onUpdate, onRemove }) {
  return (
    <div className="rounded border border-line bg-raised p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{item.role || item.company || 'Untitled'}</p>
          <p className="text-xs text-muted">{[item.company, item.location].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-muted">{[item.start_date, item.end_date].filter(Boolean).join(' – ')}</p>
        </div>
        <button onClick={() => onRemove(index)} className="text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {Array.isArray(item.description) && item.description.filter(Boolean).length > 0 && (
        <ul className="list-disc list-inside text-xs text-muted space-y-0.5">
          {item.description.filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
      {Array.isArray(item.technologies) && item.technologies.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {item.technologies.filter(Boolean).map((t, i) => (
            <span key={i} className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationCard({ item, index, onRemove }) {
  return (
    <div className="rounded border border-line bg-raised p-4 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{item.degree || item.institution || 'Untitled'}</p>
        <p className="text-xs text-muted">{[item.institution, item.field].filter(Boolean).join(' · ')}</p>
        <p className="text-xs text-muted">{[item.start_date, item.end_date].filter(Boolean).join(' – ')}</p>
      </div>
      <button onClick={() => onRemove(index)} className="text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function ProjectCard({ item, index, onRemove }) {
  return (
    <div className="rounded border border-line bg-raised p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{item.name || 'Untitled'}</p>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">{item.url}</a>}
        </div>
        <button onClick={() => onRemove(index)} className="text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {item.description && <p className="text-xs text-muted">{item.description}</p>}
      {Array.isArray(item.technologies) && item.technologies.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {item.technologies.filter(Boolean).map((t, i) => (
            <span key={i} className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ResumeReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const processResume = useCareerStore((s) => s.processResume);
  const importResumeFn = useCareerStore((s) => s.importResume);

  const [resume, setResume] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedSections, setSelectedSections] = useState({
    personal: true,
    summary: true,
    education: true,
    skills: true,
    experience: true,
    projects: true,
    certifications: true,
    achievements: true,
    languages: true,
  });

  // Fetch resume metadata + extraction on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [resumeData, extractionData] = await Promise.all([
          careerAPI.getResume(id),
          careerAPI.getExtraction(id).catch(() => null),
        ]);
        if (cancelled) return;
        setResume(resumeData);
        setExtraction(extractionData);
        if (extractionData?.structured_draft) {
          setDraft(JSON.parse(JSON.stringify(extractionData.structured_draft)));
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load resume.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      const updated = await processResume(id);
      setResume(updated);
      // Fetch the extraction result
      const ext = await careerAPI.getExtraction(id);
      setExtraction(ext);
      if (ext?.structured_draft) {
        setDraft(JSON.parse(JSON.stringify(ext.structured_draft)));
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const sections = Object.keys(selectedSections).filter(k => selectedSections[k]);
    try {
      await importResumeFn(id, sections);
      navigate('/app/profile');
    } catch (e) {
      setError(e.message || 'Import failed.');
      setImporting(false);
    }
  };

  const updateDraftField = (section, key, value) => {
    setDraft(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && !Array.isArray(prev[section])
        ? { ...prev[section], [key]: value }
        : value
    }));
  };

  const removeFromList = (section, index) => {
    setDraft(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  // --- Render states ---
  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !resume) {
    return (
      <div className="p-8">
        <EmptyState icon={AlertCircle} title="Could not load resume" description={error} />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="p-8">
        <EmptyState icon={FileText} title="Resume not found" />
      </div>
    );
  }

  const showExtraction = draft && (resume.status === 'review_required' || resume.status === 'completed');
  const needsProcessing = resume.status === 'uploaded';
  const failed = resume.status === 'failed';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate('/app/resumes')} className="mb-2 flex items-center text-xs text-muted hover:text-ink transition-colors">
            <ArrowLeft className="mr-1 h-3 w-3" /> Back to Resumes
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Review Extraction</h1>
          <p className="mt-1 text-sm text-muted">{resume.original_filename}</p>
        </div>
        {showExtraction && (
          <Button onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
            Import to Profile
          </Button>
        )}
      </header>

      {error && (
        <div className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {/* Needs processing */}
      {needsProcessing && (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted mb-4" />
          <h2 className="text-lg font-semibold text-ink">Resume ready for extraction</h2>
          <p className="mt-2 text-sm text-muted mb-6">
            ALBATROSS will read your resume and extract structured career data for you to review.
          </p>
          <Button onClick={handleProcess} disabled={processing}>
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {processing ? 'Extracting…' : 'Extract Information'}
          </Button>
        </Card>
      )}

      {/* Processing in-flight */}
      {resume.status === 'processing' && (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent mb-4" />
          <h2 className="text-lg font-semibold text-ink">Processing your resume…</h2>
          <p className="mt-2 text-sm text-muted">This may take a few seconds.</p>
        </Card>
      )}

      {/* Failed */}
      {failed && (
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-danger mb-4" />
          <h2 className="text-lg font-semibold text-ink">Extraction Failed</h2>
          <p className="mt-2 text-sm text-muted mb-6">
            {resume.error_message || "We couldn't extract enough structured information. You can retry."}
          </p>
          <Button onClick={handleProcess} disabled={processing}>
            {processing ? 'Retrying…' : 'Retry Extraction'}
          </Button>
        </Card>
      )}

      {/* Extraction result */}
      {showExtraction && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Personal */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Personal Information</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {['name','email','phone','location','linkedin','github','portfolio'].map(key => (
                  <EditableField
                    key={key}
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    value={draft?.personal?.[key] || ''}
                    onChange={(v) => updateDraftField('personal', key, v)}
                  />
                ))}
              </div>
            </Card>

            {/* Summary */}
            {(draft?.summary || draft?.summary === '') && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-ink">Summary</h3>
                </div>
                <EditableField
                  label="Professional summary"
                  value={draft.summary}
                  onChange={(v) => setDraft(prev => ({ ...prev, summary: v }))}
                  multiline
                />
              </Card>
            )}

            {/* Experience */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Experience</h3>
                <span className="ml-auto text-xs text-muted">{(draft?.experience || []).length} entries</span>
              </div>
              <div className="space-y-3">
                {(draft?.experience || []).map((item, i) => (
                  <ExperienceCard key={i} item={item} index={i} onUpdate={() => {}} onRemove={(idx) => removeFromList('experience', idx)} />
                ))}
                {(draft?.experience || []).length === 0 && <p className="text-xs text-muted italic">No experience entries extracted.</p>}
              </div>
            </Card>

            {/* Education */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Education</h3>
              </div>
              <div className="space-y-3">
                {(draft?.education || []).map((item, i) => (
                  <EducationCard key={i} item={item} index={i} onRemove={(idx) => removeFromList('education', idx)} />
                ))}
                {(draft?.education || []).length === 0 && <p className="text-xs text-muted italic">No education entries extracted.</p>}
              </div>
            </Card>

            {/* Skills */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Code className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Skills</h3>
              </div>
              <EditableChipList
                items={draft?.skills || []}
                onChange={(v) => setDraft(prev => ({ ...prev, skills: v }))}
                label="skill"
              />
            </Card>

            {/* Projects */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Projects</h3>
              </div>
              <div className="space-y-3">
                {(draft?.projects || []).map((item, i) => (
                  <ProjectCard key={i} item={item} index={i} onRemove={(idx) => removeFromList('projects', idx)} />
                ))}
                {(draft?.projects || []).length === 0 && <p className="text-xs text-muted italic">No projects extracted.</p>}
              </div>
            </Card>

            {/* Certifications */}
            {(draft?.certifications || []).filter(Boolean).length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-ink">Certifications</h3>
                </div>
                <EditableChipList
                  items={draft.certifications}
                  onChange={(v) => setDraft(prev => ({ ...prev, certifications: v }))}
                  label="certification"
                />
              </Card>
            )}

            {/* Achievements */}
            {(draft?.achievements || []).filter(Boolean).length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-ink">Achievements</h3>
                </div>
                <EditableChipList
                  items={draft.achievements}
                  onChange={(v) => setDraft(prev => ({ ...prev, achievements: v }))}
                  label="achievement"
                />
              </Card>
            )}

            {/* Languages */}
            {(draft?.languages || []).filter(Boolean).length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Languages className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-ink">Languages</h3>
                </div>
                <EditableChipList
                  items={draft.languages}
                  onChange={(v) => setDraft(prev => ({ ...prev, languages: v }))}
                  label="language"
                />
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-ink mb-1">Import Options</h3>
              <p className="text-xs text-muted mb-4">Select which sections to import into your Career Profile.</p>
              <div className="space-y-2.5">
                {Object.keys(selectedSections).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-line text-accent focus:ring-accent h-3.5 w-3.5"
                      checked={selectedSections[key]}
                      onChange={(e) => setSelectedSections(prev => ({...prev, [key]: e.target.checked}))}
                    />
                    <span className="text-sm capitalize text-ink">{key}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-line">
                <Button onClick={handleImport} disabled={importing} className="w-full justify-center">
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                  Import to Profile
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Source</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>File</span>
                  <span className="font-medium text-ink truncate ml-2 max-w-[140px]">{resume.original_filename}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Type</span>
                  <span className="font-medium text-ink uppercase">{resume.file_type}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Pages</span>
                  <span className="font-medium text-ink">{extraction?.extraction_metadata?.page_count ?? '—'}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Provenance</span>
                  <span className="font-medium text-accent">Resume Extraction</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
