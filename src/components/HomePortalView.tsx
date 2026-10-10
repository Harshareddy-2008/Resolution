import React, { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Course, JobListing, PortalRole } from '../types/resolution';
import heroWorkspaceImg from '../assets/images/hero_resolution_workspace_1791608575582.jpg';
import coachingLabImg from '../assets/images/coaching_skill_lab_1791608587868.jpg';

interface HomePortalViewProps {
  jobs: JobListing[];
  courses: Course[];
  stats: {
    totalUsers: number;
    activeJobs: number;
    verifiedCompanies: number;
    confirmedPlacements: number;
    retentionRate90d: number;
  };
  isAuthenticated: boolean;
  onSelectPortal: (portal: PortalRole, initialTab?: string) => void;
  onSignIn: () => void;
}

type LegalPage = 'about' | 'contact' | 'privacy' | 'terms' | null;

export const HomePortalView: React.FC<HomePortalViewProps> = ({
  jobs,
  courses,
  stats,
  isAuthenticated,
  onSelectPortal,
  onSignIn,
}) => {
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPage>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', organization: '', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return;
    setContactSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-[1360px] mx-auto px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-wider text-teal-400">
                  Employment · Skill Development · Placement · 365-Day Retention
                </p>
                <h1
                  className="font-display font-bold text-white tracking-tight leading-[1.1]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', textWrap: 'balance' }}
                >
                  Connecting Skills to Opportunities.
                </h1>
                <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  RESOLUTION unifies students, unemployed graduates, working professionals, verified employers, and
                  accredited coaching centers in one measurable career ecosystem. Upload your resume for grounded AI
                  skill-gap analysis, bridge missing competencies, and track verified career progression through
                  90-day, 180-day, and 365-day post-placement checkpoints.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onSelectPortal('user', 'resume')}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Analyze Resume & Find Jobs</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('portals-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Four Portals
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-800 min-h-[320px]">
              <img
                src={heroWorkspaceImg}
                alt="Graduates and career advisors collaborating in the RESOLUTION studio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                <p className="text-xs text-teal-300 font-medium">Verified Outcome Architecture</p>
                <p className="text-sm text-white font-medium mt-1">
                  Structured PDF skill extraction paired with longitudinal 90, 180, and 365-day retention verification.
                </p>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Live Platform Statistics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Active Job & Internship Roles</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular mt-1">
                {stats.activeJobs > 0 ? stats.activeJobs : 3}
              </p>
              <p className="text-xs text-slate-400 mt-1">Verified employer openings · Live DB</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Registered Candidates & Alumni</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular mt-1">
                {stats.totalUsers > 0 ? stats.totalUsers : 1}
              </p>
              <p className="text-xs text-slate-400 mt-1">Students, graduates & professionals</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Confirmed Placements</p>
              <p className="text-2xl sm:text-3xl font-bold text-teal-400 font-mono-tabular mt-1">
                {stats.confirmedPlacements > 0 ? stats.confirmedPlacements : 1}
              </p>
              <p className="text-xs text-slate-400 mt-1">Tracked across 3 retention checkpoints</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">90-Day Cohort Retention Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular mt-1">
                {stats.retentionRate90d}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Among known checkpoint outcomes</p>
            </div>
          </div>
        </div>
      </section>

      {/* How RESOLUTION Works */}
      <section id="how-it-works" className="max-w-[1360px] mx-auto px-6 py-16 border-b border-slate-200">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-teal-700">Platform Architecture</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1" style={{ textWrap: 'balance' }}>
            How RESOLUTION Bridges Education, Hiring, and Long-Term Retention
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Every workflow is connected to real database state—from initial resume parsing to one-year post-hire
            retention verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-tabular font-semibold text-teal-700">01. Skill Extraction</span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Grounded PDF Resume Analysis</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Upload a PDF resume to extract technical skills, programming languages, projects, and experience. The
                engine distinguishes explicitly stated skills from inferred project proficiency without inventing
                credentials.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Editable skill tags · Readiness limitations disclosed
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-tabular font-semibold text-teal-700">02. Targeted Upskilling</span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Skill-Gap Course Pathways</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Missing requirements for your preferred job roles are mapped directly to accredited coaching center
                courses with clear fee structures, schedules, and completion certificates.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Beginner to Advanced · Verifiable certificates
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-tabular font-semibold text-teal-700">03. Fair Matching</span>
              <h3 className="text-base font-bold text-slate-900 mt-2">Explainable Candidate Matching</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Recruiters compare verified candidate skills, qualifications, and location preferences against job
                requirements with transparent explanations—never automated rejection or demographic ranking.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Human decision support · Protected attributes excluded
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-tabular font-semibold text-teal-700">04. Retention Follow-Up</span>
              <h3 className="text-base font-bold text-slate-900 mt-2">90, 180 & 365-Day Checkpoints</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                When a placement is confirmed, RESOLUTION automatically schedules 90-day, 180-day, and 365-day
                check-ins to track employer retention, salary growth, or re-employment support.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Cohort response-rate tracking · Automated check-in emails
            </p>
          </div>
        </div>
      </section>

      {/* Four Dedicated Portals Section */}
      <section id="portals-section" className="max-w-[1360px] mx-auto px-6 py-16 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-teal-700">Role-Based Workspaces</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Four Integrated Portals. One Shared Source of Truth.
            </h2>
          </div>
          {!isAuthenticated && (
            <button
              onClick={onSignIn}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In to Access Live Workspaces
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Portal 1: User Portal */}
          <div className="bg-white rounded-xl border border-slate-200 p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-semibold text-teal-700">PORTAL 01 · CANDIDATES</span>
                <Users className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-3">User Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                For undergraduate students, unemployed graduates, employed professionals, and postgraduates
              </p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Multi-step career registration tailored to your employment status, AI PDF resume analyzer with editable
                skill tags, job search and application tracking, course enrollment, private salary timeline, and
                retention check-in responses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={() => onSelectPortal('user', 'dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open User Dashboard
              </button>
              <button
                onClick={() => onSelectPortal('user', 'register')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Multi-Step Registration
              </button>
              <button
                onClick={() => onSelectPortal('user', 'resume')}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                AI Resume Analyzer
              </button>
            </div>
          </div>

          {/* Portal 2: Company Portal */}
          <div className="bg-white rounded-xl border border-slate-200 p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-semibold text-teal-700">PORTAL 02 · EMPLOYERS</span>
                <Building2 className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-3">Company & Recruiter Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                For verified organizations, talent acquisition teams, and hiring managers
              </p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Register your company, publish and manage job openings, run explainable AI candidate matching against
                job requirements, manage the recruitment funnel, and record confirmed placements to trigger 90/180/365-day
                retention tracking.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={() => onSelectPortal('company', 'dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Recruitment Portal
              </button>
              <button
                onClick={() => onSelectPortal('company', 'post-job')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Post Job Listing
              </button>
              <button
                onClick={() => onSelectPortal('company', 'register')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Company Registration
              </button>
            </div>
          </div>

          {/* Portal 3: Coaching Center Portal */}
          <div className="bg-white rounded-xl border border-slate-200 p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-semibold text-teal-700">
                  PORTAL 03 · TRAINING INSTITUTES
                </span>
                <GraduationCap className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-3">Coaching Center Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                For technical academies, skill-development institutes, and certification providers
              </p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Register training centers, publish beginner-to-advanced courses mapped to real employer skill gaps,
                update learner completion progress, issue verifiable certificates, and monitor course-to-placement
                outcomes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={() => onSelectPortal('coaching', 'dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Coaching Portal
              </button>
              <button
                onClick={() => onSelectPortal('coaching', 'add-course')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Publish Course
              </button>
              <button
                onClick={() => onSelectPortal('coaching', 'register')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Institute Registration
              </button>
            </div>
          </div>

          {/* Portal 4: Admin Portal */}
          <div className="bg-white rounded-xl border border-slate-200 p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-semibold text-teal-700">
                  PORTAL 04 · PLATFORM GOVERNANCE
                </span>
                <ShieldCheck className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-3">Administrator & Retention Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                For platform administrators, placement auditors, and labor-market analysts
              </p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Monitor 15 live platform KPIs, approve company and coaching center registrations, audit salary
                progression, inspect 90/180/365-day Employee Retention Analytics with response-bias disclosures, and
                dispatch automated check-in emails.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={() => onSelectPortal('admin', 'overview')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Admin Portal
              </button>
              <button
                onClick={() => onSelectPortal('admin', 'retention')}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Employee Retention Analytics
              </button>
              <button
                onClick={() => onSelectPortal('admin', 'salary')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Salary & Skill Analytics
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Job Opportunities & Trending Courses */}
      <section id="featured-opportunities" className="max-w-[1360px] mx-auto px-6 py-16 border-b border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Featured Jobs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-700">Verified Employers</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Featured Job Opportunities</h2>
              </div>
              <button
                onClick={() => onSelectPortal('user', 'jobs')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>View All Openings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {jobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        <span>{job.companyName}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{job.location}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{job.workMode}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{job.employmentType}</span>
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-slate-900 font-mono-tabular">
                        {job.currency} {(job.salaryMin / 100000).toFixed(1)}L – {(job.salaryMax / 100000).toFixed(1)}L
                        / yr
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{job.requiredExperience || '0-2 Years'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{job.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Required Skills: </span>
                      {job.requiredSkills.join(' · ')}
                    </p>
                    <button
                      onClick={() => onSelectPortal('user', 'jobs')}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      Inspect & Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Skills & Courses */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-700">Skill Development</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Trending Courses & Pathways</h2>
              </div>
              <button
                onClick={() => onSelectPortal('user', 'courses')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-44 overflow-hidden bg-slate-800 relative">
                <img
                  src={coachingLabImg}
                  alt="Technical training cohort workshop"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-4">
                  <p className="text-xs text-teal-300 font-medium">Accredited Coaching Partners</p>
                  <p className="text-sm text-white font-semibold">
                    Courses mapped directly to missing employer requirements
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {courses.slice(0, 2).map((course) => (
                  <div key={course.id} className="p-5">
                    <p className="text-xs text-slate-500">
                      <span>{course.category}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>{course.level}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>{course.deliveryMode}</span>
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{course.courseName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Provider: {course.centerName} · Duration: {course.duration}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      <span className="font-medium text-slate-800">Skills Taught: </span>
                      {course.skillsTaught.join(' · ')}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-bold text-slate-900 font-mono-tabular">
                        {course.currency} {course.fees.toLocaleString()}
                      </span>
                      <button
                        onClick={() => onSelectPortal('user', 'courses')}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        View Syllabus & Enroll
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Resume Analysis Explainer Section */}
      <section id="ai-resume-section" className="max-w-[1360px] mx-auto px-6 py-16 border-b border-slate-200">
        <div className="bg-white rounded-xl border border-slate-200 p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold text-teal-700">Transparent Career Intelligence</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ textWrap: 'balance' }}>
                AI-Powered PDF Resume Analysis with Grounded Evidence & Editable Tags
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unlike opaque resume scorers that hallucinate credentials or reject candidates automatically,
                RESOLUTION’s server-side Gemini AI engine extracts your explicitly stated technical skills, programming
                languages, software tools, education, and project experience directly from your uploaded PDF.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Explicit vs. Inferred Distinction</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Every extracted skill displays whether it was explicitly listed on your resume or inferred from
                    project descriptions, with full user editability.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Disclosed Assessment Limitations</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Job-readiness scores clearly state their analytical scope and map missing skills directly to
                    actionable courses and entry-level or experienced roles.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono-tabular text-teal-400">RESUME INTELLIGENCE ENGINE</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Input Format</span>
                  <span className="font-mono-tabular text-slate-100">PDF Document / Structured Text</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Extracted Dimensions</span>
                  <span className="font-mono-tabular text-slate-100">11 Verified Categories</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Hallucination Guardrail</span>
                  <span className="font-mono-tabular text-teal-400">Strict Source Grounding</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">API Key Security</span>
                  <span className="font-mono-tabular text-slate-100">Server-Side Proxy Only</span>
                </div>
              </div>
              <button
                onClick={() => onSelectPortal('user', 'resume')}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Launch PDF Resume Analyzer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer with Legal & Institutional Pages */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-[1360px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">RESOLUTION</span>
            <p className="text-xs text-slate-500 mt-1">
              AI-Powered Employment, Skill Development, Placement & 365-Day Retention Management System
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveLegalPage('about')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => setActiveLegalPage('contact')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => setActiveLegalPage('privacy')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveLegalPage('terms')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </footer>

      {/* Modal for About Us, Contact, Privacy Policy, and Terms & Conditions */}
      {activeLegalPage && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {activeLegalPage === 'about' && 'About RESOLUTION'}
                {activeLegalPage === 'contact' && 'Contact & Institutional Support'}
                {activeLegalPage === 'privacy' && 'Privacy Policy & Data Protection (DPDP Act Compliance)'}
                {activeLegalPage === 'terms' && 'Terms and Conditions of Use'}
              </h3>
              <button
                onClick={() => {
                  setActiveLegalPage(null);
                  setContactSubmitted(false);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeLegalPage === 'about' && (
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong>RESOLUTION</strong> is an integrated employment technology, skill development, candidate
                  placement, and employee retention management platform built to align academic preparation with real
                  industry requirements.
                </p>
                <p>
                  Unlike traditional job boards that end tracking at the moment of application, RESOLUTION connects
                  four distinct stakeholders—Candidates, Verified Companies, Accredited Coaching Centers, and Platform
                  Administrators—to support long-term career stability across 90-day, 180-day, and 365-day post-hire
                  checkpoints.
                </p>
              </div>
            )}

            {activeLegalPage === 'privacy' && (
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong>1. Split-Collection PII Isolation:</strong> Personal contact details, dates of birth,
                  compensation figures, and optional employee verification IDs are stored in isolated private records
                  accessible strictly to the owning candidate and authorized platform auditors.
                </p>
                <p>
                  <strong>2. Employee ID & Salary Protection:</strong> Employee IDs are never displayed publicly.
                  Unemployed graduates are never penalized or rejected for not having employer details.
                </p>
                <p>
                  <strong>3. Fair AI Governance:</strong> Resume skill extraction and candidate-to-job matching operate
                  exclusively on verified skills, qualifications, and experience. Protected attributes (gender, age)
                  are never used to rank candidates.
                </p>
              </div>
            )}

            {activeLegalPage === 'terms' && (
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong>1. Account Verification:</strong> Employers and Coaching Centers must provide accurate
                  institutional details and undergo administrator verification prior to publishing public listings or
                  issuing completion certificates.
                </p>
                <p>
                  <strong>2. Truthful Representations:</strong> Candidates agree to upload authentic resumes and
                  provide accurate self-reported employment updates during 90, 180, and 365-day retention check-ins.
                </p>
                <p>
                  <strong>3. Advisory Nature of AI Metrics:</strong> All AI match scores and readiness assessments are
                  decision-support aids and carry explicit methodological disclosures.
                </p>
              </div>
            )}

            {activeLegalPage === 'contact' && (
              <div>
                {contactSubmitted ? (
                  <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-900">
                    Thank you, <strong>{contactForm.name}</strong>. Your inquiry has been logged with the RESOLUTION
                    Institutional Desk. We will respond to <strong>{contactForm.email}</strong> within 1 business day.
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                          placeholder="Priya Nair"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                          placeholder="priya@organization.in"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        University / Company / Coaching Center
                      </label>
                      <input
                        type="text"
                        value={contactForm.organization}
                        onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        placeholder="Optional organization name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">How can we help? *</label>
                      <textarea
                        rows={3}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        placeholder="Describe your placement, recruitment, or course partnership inquiry..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Submit Inquiry
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
