import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ApplicationStatus,
  Company,
  JobApplication,
  JobListing,
  PlacementRecord,
  UserPublicProfile,
} from '../types/resolution';
import {
  addDaysToDateString,
  cleanId,
  cleanString,
  cleanStringArray,
  db,
  handleFirestoreError,
  OperationType,
  recordAuditLog,
} from '../lib/firebase';

interface CompanyPortalViewProps {
  currentUserUid: string;
  currentUserEmail: string;
  companies: Company[];
  jobs: JobListing[];
  applications: JobApplication[];
  placements: PlacementRecord[];
  candidates: UserPublicProfile[];
  initialTab?: string;
}

export const CompanyPortalView: React.FC<CompanyPortalViewProps> = ({
  currentUserUid,
  currentUserEmail,
  companies,
  jobs,
  applications,
  placements,
  candidates,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const myCompany = companies.find((c) => c.ownerId === currentUserUid) || companies[0];

  // Company Registration State
  const [companyForm, setCompanyForm] = useState({
    companyName: myCompany?.companyName || 'Nexus Quantum Technologies',
    officialEmail: myCompany?.officialEmail || currentUserEmail || 'hr@nexusquantum.in',
    contactPerson: myCompany?.contactPerson || 'Vikram Malhotra',
    contactNumber: myCompany?.contactNumber || '+91 80 4112 9000',
    website: myCompany?.website || 'https://nexusquantum.example.com',
    description:
      myCompany?.description ||
      'Enterprise cloud platform, AI systems engineering, and cybersecurity infrastructure.',
    industry: myCompany?.industry || 'Software & Cloud Infrastructure',
    companySize: myCompany?.companySize || '200-500 Employees',
    yearEstablished: myCompany?.yearEstablished || '2018',
    headquarters: myCompany?.headquarters || 'Bengaluru, India',
    country: myCompany?.country || 'India',
    state: myCompany?.state || 'Karnataka',
    city: myCompany?.city || 'Bengaluru',
    officeAddress: myCompany?.officeAddress || 'Embassy GolfLinks Business Park, Bengaluru',
  });

  // Job Posting State
  const [jobForm, setJobForm] = useState({
    title: 'Backend Distributed Systems Engineer',
    department: 'Cloud Platform',
    industry: myCompany?.industry || 'Software & Cloud Infrastructure',
    description:
      'Architect resilient microservices, optimize PostgreSQL queries, and build event-driven APIs in TypeScript and Node.js.',
    requiredSkillsInput: 'TypeScript, Node.js, PostgreSQL, Docker, REST APIs',
    preferredSkillsInput: 'Kubernetes, Redis, System Design',
    educationalQualifications: 'B.Tech / B.E. / M.Tech in Computer Science or allied discipline',
    requiredExperience: '1 - 3 Years',
    vacancies: 3,
    employmentType: 'Full-time' as JobListing['employmentType'],
    workMode: 'Hybrid' as JobListing['workMode'],
    location: 'Bengaluru, India',
    country: 'India',
    salaryMin: 1200000,
    salaryMax: 1800000,
    currency: 'INR',
    benefits: 'Health insurance, learning budget, hybrid flexibility',
    deadline: '2026-12-20',
    interviewProcess: '1. Online Coding · 2. Architecture Design · 3. Hiring Manager Round',
    requiredCertifications: 'Optional cloud certification',
  });

  // Candidate Matching State
  const [selectedJobIdForMatch, setSelectedJobIdForMatch] = useState<string>(jobs[0]?.id || '');
  const [candidateSkillFilter, setCandidateSkillFilter] = useState('');
  const [aiMatchLoadingUid, setAiMatchLoadingUid] = useState<string | null>(null);
  const [aiMatchResults, setAiMatchResults] = useState<
    Record<
      string,
      {
        matchScore: number;
        matchingSkills: string[];
        missingSkills: string[];
        educationMatch: string;
        locationCompatibility: string;
        explanation: string;
      }
    >
  >({});

  // Placement Confirmation Modal State
  const [placementTargetApp, setPlacementTargetApp] = useState<JobApplication | null>(null);
  const [placementForm, setPlacementForm] = useState({
    designation: 'Software Engineer I',
    joiningDate: new Date().toISOString().split('T')[0],
    workLocation: 'Bengaluru, India',
    offeredSalary: 1350000,
    currency: 'INR',
    employmentType: 'Full-time',
  });

  // Save Company Registration
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const compId = myCompany?.id || cleanId(`comp_${currentUserUid.slice(0, 8)}_${Date.now()}`);
    try {
      await setDoc(
        doc(db, 'companies', compId),
        {
          ownerId: cleanId(currentUserUid),
          companyName: cleanString(companyForm.companyName, 160),
          officialEmail: cleanString(companyForm.officialEmail, 254),
          contactPerson: cleanString(companyForm.contactPerson, 120),
          contactNumber: cleanString(companyForm.contactNumber, 30),
          website: cleanString(companyForm.website, 300),
          description: cleanString(companyForm.description, 2000),
          industry: cleanString(companyForm.industry, 120),
          companySize: cleanString(companyForm.companySize, 60),
          yearEstablished: cleanString(companyForm.yearEstablished, 10),
          headquarters: cleanString(companyForm.headquarters, 160),
          country: cleanString(companyForm.country, 100),
          state: cleanString(companyForm.state, 100),
          city: cleanString(companyForm.city, 100),
          officeAddress: cleanString(companyForm.officeAddress, 400),
          verificationStatus: myCompany?.verificationStatus || 'pending',
          createdAt: myCompany?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setStatusBanner({
        type: 'success',
        message: 'Company registration saved to Firestore.',
      });
      setActiveTab('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${compId}`);
    }
  };

  // Create New Job Listing
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCompany) {
      setStatusBanner({ type: 'error', message: 'Please register a company first.' });
      return;
    }
    const jobId = cleanId(`job_${Date.now()}`);
    const reqSkills = cleanStringArray(
      jobForm.requiredSkillsInput.split(',').map((s) => s.trim()),
      30
    );
    const prefSkills = cleanStringArray(
      jobForm.preferredSkillsInput.split(',').map((s) => s.trim()),
      30
    );

    try {
      await setDoc(doc(db, 'jobs', jobId), {
        companyId: cleanId(myCompany.id),
        ownerId: cleanId(currentUserUid),
        companyName: cleanString(myCompany.companyName, 160),
        title: cleanString(jobForm.title, 160),
        department: cleanString(jobForm.department, 120),
        industry: cleanString(jobForm.industry, 120),
        description: cleanString(jobForm.description, 4000),
        requiredSkills: reqSkills.length > 0 ? reqSkills : ['Software Engineering'],
        preferredSkills: prefSkills,
        educationalQualifications: cleanString(jobForm.educationalQualifications, 240),
        requiredExperience: cleanString(jobForm.requiredExperience, 80),
        vacancies: Math.max(1, Number(jobForm.vacancies) || 1),
        employmentType: jobForm.employmentType,
        workMode: jobForm.workMode,
        location: cleanString(jobForm.location, 160),
        country: cleanString(jobForm.country, 100),
        salaryMin: Math.max(0, Number(jobForm.salaryMin) || 0),
        salaryMax: Math.max(Number(jobForm.salaryMin) || 0, Number(jobForm.salaryMax) || 0),
        currency: cleanString(jobForm.currency, 10),
        benefits: cleanString(jobForm.benefits, 1000),
        deadline: cleanString(jobForm.deadline, 40),
        interviewProcess: cleanString(jobForm.interviewProcess, 1000),
        requiredCertifications: cleanString(jobForm.requiredCertifications, 400),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: `Published job listing "${jobForm.title}" for ${myCompany.companyName}.`,
      });
      setActiveTab('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `jobs/${jobId}`);
    }
  };

  // Toggle Job Status (Active / Paused / Closed)
  const handleUpdateJobStatus = async (job: JobListing, newStatus: JobListing['status']) => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: `Updated "${job.title}" status to ${newStatus}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `jobs/${job.id}`);
    }
  };

  // Update Application Status
  const handleUpdateApplicationStatus = async (app: JobApplication, newStatus: ApplicationStatus) => {
    if (newStatus === 'Hired') {
      setPlacementTargetApp(app);
      setPlacementForm({
        designation: app.jobTitle,
        joiningDate: new Date().toISOString().split('T')[0],
        workLocation: 'Bengaluru, India',
        offeredSalary: app.offeredSalary || 1300000,
        currency: 'INR',
        employmentType: 'Full-time',
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'applications', app.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: `Updated ${app.candidateName}'s application status to ${newStatus}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${app.id}`);
    }
  };

  // Confirm Placement & Automatically Schedule 90, 180, and 365-Day Retention Check-Ins
  const handleConfirmPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placementTargetApp) return;

    const placementId = cleanId(`place_${Date.now()}`);
    const joinDate = placementForm.joiningDate || new Date().toISOString().split('T')[0];

    try {
      // 1. Update Application to Hired
      await updateDoc(doc(db, 'applications', placementTargetApp.id), {
        status: 'Hired',
        offeredSalary: Number(placementForm.offeredSalary) || 0,
        updatedAt: serverTimestamp(),
      });

      // 2. Create Placement Record
      await setDoc(doc(db, 'placements', placementId), {
        candidateId: cleanId(placementTargetApp.candidateId),
        candidateName: cleanString(placementTargetApp.candidateName, 120),
        candidateEmail: cleanString(placementTargetApp.candidateEmail || 'candidate@resolution.in', 254),
        jobId: cleanId(placementTargetApp.jobId),
        jobTitle: cleanString(placementTargetApp.jobTitle, 160),
        companyId: cleanId(placementTargetApp.companyId),
        companyOwnerId: cleanId(currentUserUid),
        companyName: cleanString(placementTargetApp.companyName, 160),
        designation: cleanString(placementForm.designation, 160),
        joiningDate: cleanString(joinDate, 40),
        workLocation: cleanString(placementForm.workLocation, 160),
        offeredSalary: Math.max(0, Number(placementForm.offeredSalary) || 0),
        currency: cleanString(placementForm.currency, 10),
        employmentType: cleanString(placementForm.employmentType, 40),
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Create 3 Scheduled Retention Check-In Records (90, 180, and 365 Days)
      const checkpoints: (90 | 180 | 365)[] = [90, 180, 365];
      for (const days of checkpoints) {
        const chkId = cleanId(`chk_${days}_${placementId}`);
        await setDoc(doc(db, 'retentionCheckIns', chkId), {
          placementId,
          candidateId: cleanId(placementTargetApp.candidateId),
          candidateName: cleanString(placementTargetApp.candidateName, 120),
          candidateEmail: cleanString(placementTargetApp.candidateEmail || 'candidate@resolution.in', 254),
          companyId: cleanId(placementTargetApp.companyId),
          companyOwnerId: cleanId(currentUserUid),
          companyName: cleanString(placementTargetApp.companyName, 160),
          designation: cleanString(placementForm.designation, 160),
          joiningDate: cleanString(joinDate, 40),
          checkpointDays: days,
          dueDate: addDaysToDateString(joinDate, days),
          emailStatus: 'Pending',
          employmentStatus: 'Unknown',
          remainsWithOriginalCompany: true,
          currentEmployer: cleanString(placementTargetApp.companyName, 160),
          reportedSalary: Math.max(0, Number(placementForm.offeredSalary) || 0),
          verificationStatus: 'Unverified',
          status: 'Scheduled',
          assistanceRequested: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 4. Record Employer-Verified Salary History Entry
      const salId = cleanId(`sal_place_${placementId}`);
      await setDoc(doc(db, 'salaryHistory', salId), {
        userId: cleanId(placementTargetApp.candidateId),
        userName: cleanString(placementTargetApp.candidateName, 120),
        recordType: 'Placement',
        companyName: cleanString(placementTargetApp.companyName, 160),
        designation: cleanString(placementForm.designation, 160),
        annualSalary: Math.max(0, Number(placementForm.offeredSalary) || 0),
        currency: cleanString(placementForm.currency, 10),
        verificationType: 'Employer-Verified',
        skillsAtTime: cleanStringArray(placementTargetApp.candidateSkills || [], 50),
        effectiveDate: cleanString(joinDate, 40),
        createdAt: serverTimestamp(),
      });

      await recordAuditLog(
        'PLACEMENT_CONFIRMED_AND_CHECKINS_SCHEDULED',
        'PlacementRecord',
        placementId,
        `Hired ${placementTargetApp.candidateName} as ${placementForm.designation} at ${placementTargetApp.companyName}. Scheduled 90, 180, and 365-day retention checkpoints.`
      );

      setPlacementTargetApp(null);
      setStatusBanner({
        type: 'success',
        message: `Placement confirmed for ${placementTargetApp.candidateName}! Automatically scheduled 90-day, 180-day, and 365-day retention check-ins.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `placements/${placementId}`);
    }
  };

  // Run Explainable AI Candidate Match
  const handleRunAiMatch = async (candidate: UserPublicProfile) => {
    const selectedJob = jobs.find((j) => j.id === selectedJobIdForMatch) || jobs[0];
    if (!selectedJob) return;

    setAiMatchLoadingUid(candidate.uid);
    try {
      const response = await fetch('/api/ai/match-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile: candidate,
          jobListing: selectedJob,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAiMatchResults((prev) => ({ ...prev, [candidate.uid]: data }));
      }
    } catch (error) {
      console.error('AI Match Error:', error);
    } finally {
      setAiMatchLoadingUid(null);
    }
  };

  // Recruitment Funnel Data
  const funnelData = [
    { stage: 'Applicants', count: applications.length },
    {
      stage: 'Shortlisted',
      count: applications.filter((a) =>
        ['Shortlisted', 'Interview', 'Offered', 'Hired'].includes(a.status)
      ).length,
    },
    {
      stage: 'Interview',
      count: applications.filter((a) => ['Interview', 'Offered', 'Hired'].includes(a.status)).length,
    },
    {
      stage: 'Offered',
      count: applications.filter((a) => ['Offered', 'Hired'].includes(a.status)).length,
    },
    { stage: 'Placed', count: placements.length },
  ];

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSkillFilter.trim()) return true;
    const q = candidateSkillFilter.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.highestQualification || '').toLowerCase().includes(q) ||
      (c.skills || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-teal-700">PORTAL 02 · COMPANY & RECRUITER WORKSPACE</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {myCompany?.companyName || 'Employer Portal'} — Recruitment & Talent Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            <span>Verification Status: {myCompany?.verificationStatus || 'verified'}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{myCompany?.industry || 'Software & Cloud Infrastructure'}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{myCompany?.headquarters || 'Bengaluru, India'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          {[
            { id: 'dashboard', label: 'Recruitment Dashboard' },
            { id: 'matching', label: 'AI Candidate Matching' },
            { id: 'post-job', label: 'Post Job Listing' },
            { id: 'register', label: 'Company Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {statusBanner && (
        <div
          className={`mt-6 p-4 rounded-lg border flex items-center justify-between text-xs font-medium ${
            statusBanner.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button onClick={() => setStatusBanner(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: RECRUITMENT DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Active Job Listings</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {jobs.filter((j) => j.status === 'active').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Total Applicants</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{applications.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Shortlisted</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {applications.filter((a) => a.status === 'Shortlisted').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Interviews Scheduled</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {applications.filter((a) => a.status === 'Interview' || Boolean(a.interviewDate)).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Offers Made</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {applications.filter((a) => a.status === 'Offered' || a.status === 'Hired').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Confirmed Placements</p>
              <p className="text-2xl font-bold text-teal-700 font-mono-tabular mt-1">{placements.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Recruitment Funnel Chart */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recruitment Funnel & Conversion</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live applicant progression from application to hire</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Applications & Placement Action Table */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Candidate Applications & Placement Confirmation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update candidate stages or mark "Hired" to register placement & schedule 90/180/365-day check-ins
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Candidate</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Match</th>
                      <th className="py-2.5 px-3 font-semibold">Stage</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{app.candidateName}</p>
                          <p className="text-slate-500">{app.candidateQualification}</p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{app.jobTitle}</td>
                        <td className="py-2.5 px-3 font-mono-tabular font-bold text-teal-700">{app.matchScore}%</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{app.status}</td>
                        <td className="py-2.5 px-3 text-right">
                          {app.status === 'Hired' ? (
                            <span className="text-teal-700 font-semibold">Placed</span>
                          ) : (
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleUpdateApplicationStatus(app, e.target.value as ApplicationStatus)
                              }
                              className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-xs font-medium"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Interview">Interview</option>
                              <option value="Offered">Offered</option>
                              <option value="Hired">Mark Hired (Confirm Placement)</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Manage Published Job Listings */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Manage Published Job Listings</h2>
              <button
                onClick={() => setActiveTab('post-job')}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Post New Job
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{job.companyName}</span>
                      <span className="font-mono-tabular font-semibold uppercase text-teal-700">{job.status}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{job.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {job.location} · {job.workMode} · {job.currency} {(job.salaryMin / 100000).toFixed(1)}L–
                      {(job.salaryMax / 100000).toFixed(1)}L
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    {(['active', 'paused', 'closed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateJobStatus(job, st)}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize cursor-pointer ${
                          job.status === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI CANDIDATE MATCHING */}
      {activeTab === 'matching' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">
                  EXPLAINABLE AI CANDIDATE MATCHING · HUMAN DECISION SUPPORT
                </p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Compare Verified Candidate Skills Against Job Requirements
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Protected characteristics (gender, age) are strictly excluded from all matching evaluations.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedJobIdForMatch}
                  onChange={(e) => setSelectedJobIdForMatch(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      Target Job: {j.title} ({j.companyName})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={candidateSkillFilter}
                  onChange={(e) => setCandidateSkillFilter(e.target.value)}
                  placeholder="Filter by skill, city, or qualification..."
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredCandidates.map((cand) => {
              const targetJob = jobs.find((j) => j.id === selectedJobIdForMatch) || jobs[0];
              const candSkills = cand.skills || [];
              const reqSkills = targetJob?.requiredSkills || [];
              const matching = reqSkills.filter((r) =>
                candSkills.some((c) => c.toLowerCase() === r.toLowerCase())
              );
              const missing = reqSkills.filter(
                (r) => !candSkills.some((c) => c.toLowerCase() === r.toLowerCase())
              );
              const baseScore =
                reqSkills.length > 0 ? Math.round((matching.length / reqSkills.length) * 100) : 85;
              const aiDetail = aiMatchResults[cand.uid];

              return (
                <div key={cand.uid} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{cand.displayName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cand.highestQualification || 'Graduate'} ({cand.fieldOfStudy || 'CS'}) ·{' '}
                        {cand.collegeName || 'University'} · {cand.city}, {cand.country} ·{' '}
                        {cand.yearsOfExperience ?? 1} Yrs Exp
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-700 font-mono-tabular">
                          {aiDetail ? aiDetail.matchScore : baseScore}% Match
                        </p>
                        <p className="text-xs text-slate-500">Advisory Score</p>
                      </div>
                      <button
                        onClick={() => handleRunAiMatch(cand)}
                        disabled={aiMatchLoadingUid === cand.uid}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {aiMatchLoadingUid === cand.uid ? 'Evaluating...' : 'Run Deep AI Match'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-800">Matching Required Skills:</p>
                      <p className="text-teal-800 mt-1">
                        {(aiDetail ? aiDetail.matchingSkills : matching).join(' · ') || 'Foundational overlap'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Missing / Preferred Skills:</p>
                      <p className="text-amber-800 mt-1">
                        {(aiDetail ? aiDetail.missingSkills : missing).join(' · ') || 'None missing'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Education & Location Match:</p>
                      <p className="text-slate-600 mt-1">
                        {aiDetail
                          ? `${aiDetail.educationMatch} · ${aiDetail.locationCompatibility}`
                          : `${cand.highestQualification} matches ${targetJob?.location} (${targetJob?.workMode})`}
                      </p>
                    </div>
                  </div>

                  {aiDetail && (
                    <p className="text-xs text-slate-700 bg-teal-50/70 border border-teal-200 p-3.5 rounded-lg">
                      <strong>AI Explainable Rationale:</strong> {aiDetail.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: POST JOB LISTING */}
      {activeTab === 'post-job' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 max-w-4xl">
          <h2 className="text-xl font-bold text-slate-900">Publish New Job Listing</h2>
          <p className="text-xs text-slate-500 mt-1">
            Specify technical skills, compensation package, work mode, and interview stages.
          </p>

          <form onSubmit={handleCreateJob} className="mt-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department & Industry *</label>
                <input
                  type="text"
                  required
                  value={jobForm.industry}
                  onChange={(e) => setJobForm({ ...jobForm, industry: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Required Technical Skills (Comma Separated) *</label>
                <input
                  type="text"
                  required
                  value={jobForm.requiredSkillsInput}
                  onChange={(e) => setJobForm({ ...jobForm, requiredSkillsInput: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Skills (Comma Separated)</label>
                <input
                  type="text"
                  value={jobForm.preferredSkillsInput}
                  onChange={(e) => setJobForm({ ...jobForm, preferredSkillsInput: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Educational Qualifications *</label>
                <input
                  type="text"
                  required
                  value={jobForm.educationalQualifications}
                  onChange={(e) => setJobForm({ ...jobForm, educationalQualifications: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.requiredExperience}
                    onChange={(e) => setJobForm({ ...jobForm, requiredExperience: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vacancies *</label>
                  <input
                    type="number"
                    required
                    value={jobForm.vacancies}
                    onChange={(e) => setJobForm({ ...jobForm, vacancies: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={jobForm.employmentType}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, employmentType: e.target.value as JobListing['employmentType'] })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={jobForm.workMode}
                    onChange={(e) => setJobForm({ ...jobForm, workMode: e.target.value as JobListing['workMode'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Annual Salary (INR)</label>
                  <input
                    type="number"
                    required
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Annual Salary (INR)</label>
                  <input
                    type="number"
                    required
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMax: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Location *</label>
                <input
                  type="text"
                  required
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={jobForm.deadline}
                  onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Description *</label>
              <textarea
                rows={3}
                required
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Publish Job Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: COMPANY REGISTRATION */}
      {activeTab === 'register' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 max-w-4xl">
          <h2 className="text-xl font-bold text-slate-900">Company & Recruiter Profile Registration</h2>
          <form onSubmit={handleSaveCompany} className="mt-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Business Email *</label>
                <input
                  type="email"
                  required
                  value={companyForm.officialEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, officialEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={companyForm.contactPerson}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={companyForm.contactNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Industry & Business Domain *</label>
                <input
                  type="text"
                  required
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Size & Year Established</label>
                <input
                  type="text"
                  value={companyForm.companySize}
                  onChange={(e) => setCompanyForm({ ...companyForm, companySize: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Address & Headquarters</label>
              <input
                type="text"
                value={companyForm.officeAddress}
                onChange={(e) => setCompanyForm({ ...companyForm, officeAddress: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLACEMENT CONFIRMATION MODAL */}
      {placementTargetApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Candidate Placement & Schedule Retention Checkpoints
              </h3>
              <button
                onClick={() => setPlacementTargetApp(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPlacement} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Recording confirmed hire for <strong>{placementTargetApp.candidateName}</strong> at{' '}
                <strong>{placementTargetApp.companyName}</strong>. This will automatically schedule 90-day, 180-day,
                and 365-day retention check-ins.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Designation *</label>
                  <input
                    type="text"
                    required
                    value={placementForm.designation}
                    onChange={(e) => setPlacementForm({ ...placementForm, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirmed Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={placementForm.joiningDate}
                    onChange={(e) => setPlacementForm({ ...placementForm, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Offered Annual Package (INR) *</label>
                  <input
                    type="number"
                    required
                    value={placementForm.offeredSalary}
                    onChange={(e) => setPlacementForm({ ...placementForm, offeredSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Location *</label>
                  <input
                    type="text"
                    required
                    value={placementForm.workLocation}
                    onChange={(e) => setPlacementForm({ ...placementForm, workLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlacementTargetApp(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Confirm Hire & Schedule 90/180/365d Check-Ins
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
