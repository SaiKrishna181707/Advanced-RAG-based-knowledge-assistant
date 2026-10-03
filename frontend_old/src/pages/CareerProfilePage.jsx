import React from 'react';
import { Card, SectionHeader, Button } from '../components/ui/Primitives';
import EmptyState from '../components/ui/EmptyState';
import { User, GraduationCap, Briefcase, Code, Award, Link as LinkIcon } from 'lucide-react';

export default function CareerProfilePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Career Profile</h1>
          <p className="mt-1 text-sm text-muted">Your career source of truth.</p>
        </div>
        <Button variant="secondary">Edit Profile</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeader title="Personal Information" icon={User} />
            <EmptyState compact title="Your career story starts here." description="Add your education, skills, projects, and experience once. ALBATROSS will use this information across your career workspace." />
          </Card>

          <Card className="p-6">
            <SectionHeader title="Experience" icon={Briefcase} />
            <EmptyState compact title="No experience added." description="Add your work history." />
          </Card>

          <Card className="p-6">
            <SectionHeader title="Education" icon={GraduationCap} />
            <EmptyState compact title="No education added." description="Add your degrees and schooling." />
          </Card>
          
          <Card className="p-6">
            <SectionHeader title="Projects" icon={Code} />
            <EmptyState compact title="No projects added." description="Add your technical projects." />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <SectionHeader title="Skills" />
            <EmptyState compact title="No skills added." />
          </Card>
          
          <Card className="p-4">
            <SectionHeader title="Links" icon={LinkIcon} />
            <EmptyState compact title="No links added." />
          </Card>
          
          <Card className="p-4">
            <SectionHeader title="Target Roles" />
            <EmptyState compact title="No roles set." />
          </Card>
        </div>
      </div>
    </div>
  );
}
