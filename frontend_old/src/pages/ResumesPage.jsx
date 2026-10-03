import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCareerStore } from '../store/careerStore';
import { Card, SectionHeader, Button, Badge } from '../components/ui/Primitives';
import { FileUp, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { useDropzone } from 'react-dropzone';

export default function ResumesPage() {
  const navigate = useNavigate();
  const resumes = useCareerStore((state) => state.resumes);
  const loadResumes = useCareerStore((state) => state.loadResumes);
  const uploadResume = useCareerStore((state) => state.uploadResume);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    try {
      const newResume = await uploadResume(file);
      navigate(`/app/resumes/${newResume.id}/review`);
    } catch (error) {
      console.error(error);
      setUploading(false);
    }
  }, [uploadResume, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt', '.md', '.markdown']
    },
    maxFiles: 1
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Resumes</h1>
          <p className="mt-1 text-sm text-muted">Manage the resumes associated with your Career Profile.</p>
        </div>
      </header>

      {/* Upload Zone */}
      <div 
        {...getRootProps()} 
        className={`cursor-pointer rounded-card border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/40 bg-surface'
        }`}
      >
        <input {...getInputProps()} />
        <FileUp className="mx-auto h-8 w-8 text-muted mb-3" />
        <p className="text-sm font-medium text-ink">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop resume here' : 'Drag & drop your resume here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted">Supports PDF, DOCX, TXT, MD (Max 10MB)</p>
      </div>

      {resumes.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="Your resume workspace is empty"
            description="Upload an existing resume and ALBATROSS will turn it into structured career information you can review and use across the platform."
          />
        </Card>
      ) : (
        <Card className="p-4">
          <SectionHeader title="Your Resumes" description="Select a resume to view or extract its data." />
          <ul className="mt-4 divide-y divide-line">
            {resumes.map(resume => (
              <li key={resume.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-ink">{resume.original_filename}</p>
                    <p className="text-xs text-muted capitalize">{resume.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(`/app/resumes/${resume.id}/review`)}
                >
                  Review <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
