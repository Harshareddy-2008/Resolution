import React, { useState } from 'react';
import {
  Download,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  AuditLog,
  CoachingCenter,
  Company,
  Course,
  CourseEnrollment,
  EmailNotificationLog,
  JobApplication,
  JobListing,
  PlacementRecord,
  RetentionCheckIn,
  SalaryHistoryRecord,
  UserPublicProfile,
} from '../types/resolution';
import {
  cleanId,
  cleanString,
  db,
  handleFirestoreError,
  OperationType,
  recordAuditLog,
} from '../lib/firebase';

interface AdminPortalViewProps {
  currentUserUid: string;
  currentUserEmail: string;
  users: UserPublicProfile[];
  companies: Company[];
  coachingCenters: CoachingCenter[];
  jobs: JobListing[];
  applications: JobApplication[];
  placements: PlacementRecord[];
  enrollments: CourseEnrollment[];
  retentionCheckIns: RetentionCheckIn[];
  salaryHistory: SalaryHistoryRecord[];
  emailLogs: EmailNotificationLog[];
  auditLogs: AuditLog[];
  courses: Course[];
  initialTab?: string;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  currentUserUid,
  currentUserEmail,
  users,
  companies,
  coachingCenters,
  jobs,
  applications,
  placements,
  enrollments,
  retentionCheckIns,
  salaryHistory,
  emailLogs,
  auditLogs,
  courses,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User & Employee Directory Filter/Sort State
  const [userSearch, setUserSearch] = useState('');
  const [gradYearFilter, setGradYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userSortBy, setUserSortBy] = useState<'salary_desc' | 'placements_recent' | 'skills_desc'>('salary_desc');

  // Retention Cohort Filter State
  const [retentionCompanyFilter, setRetentionCompanyFilter] = useState('ALL');
  const [sendingEmailCheckInId, setSendingEmailCheckInId] = useState<string | null>(null);
  const [previewEmailContent, setPreviewEmailContent] = useState<{
    subject: string;
    bodyPreview: string;
    recipientEmail: string;
  } | null>(null);

  // AI Market Insights State
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [marketInsights, setMarketInsights] = useState<{
    executiveSummary: string;
    emergingSkills: string[];
    commonSkillGaps: string[];
    methodologyNote: string;
  } | null>(null);

  // 15 Live Summary KPIs for Main Admin Dashboard
  const totalUsers = users.length;
  const undergradUsers = users.filter((u) => u.careerStatus === 'undergraduate').length;
  const gradJobSeekers = users.filter((u) => u.careerStatus === 'graduated_unemployed').length;
  const employedUsers =
    users.filter((u) => u.careerStatus === 'graduated_employed').length +
    placements.filter((p) => p.status === 'confirmed').length;
  const unemployedUsers = users.filter((u) => u.careerStatus === 'graduated_unemployed').length;
  const verifiedCompanies = companies.filter((c) => c.verificationStatus === 'verified').length;
  const verifiedCoachingCenters = coachingCenters.filter((c) => c.approvalStatus === 'approved').length;
  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApplications = applications.length;
  const confirmedPlacements = placements.length;
  const activeEnrollments = enrollments.filter((e) => e.status !== 'Completed').length;
  const completedCourses = enrollments.filter((e) => e.status === 'Completed').length;
  const dueForFollowUp = retentionCheckIns.filter((r) =>
    ['Scheduled', 'Reminder Sent', 'Awaiting Response'].includes(r.status)
  ).length;
  const verifiedRetained = retentionCheckIns.filter((r) => r.employmentStatus === 'Employed').length;
  const awaitingConfirmation = retentionCheckIns.filter((r) => r.employmentStatus === 'Unknown').length;

  // Compute Cohort Retention Metrics for 90, 180, and 365 Days
  const filteredCheckIns = retentionCheckIns.filter((chk) =>
    retentionCompanyFilter === 'ALL' ? true : chk.companyName === retentionCompanyFilter
  );

  const computeCheckpointStats = (days: 90 | 180 | 365) => {
    const cohort = filteredCheckIns.filter((c) => c.checkpointDays === days);
    const eligibleCount = cohort.length;
    const confirmedEmployed = cohort.filter((c) => c.employmentStatus === 'Employed').length;
    const confirmedOriginalEmployer = cohort.filter(
      (c) => c.employmentStatus === 'Employed' && c.remainsWithOriginalCompany
    ).length;
    const confirmedDifferentEmployer = cohort.filter(
      (c) => c.employmentStatus === 'Employed' && !c.remainsWithOriginalCompany
    ).length;
    const confirmedUnemployed = cohort.filter((c) => c.employmentStatus === 'Unemployed').length;
    const knownOutcomes = confirmedEmployed + confirmedUnemployed;
    const unknownOutcomes = eligibleCount - knownOutcomes;

    // Exact Formula: (Confirmed Employed at checkpoint / Known outcomes in eligible cohort at checkpoint) * 100
    const overallRetentionRate =
      knownOutcomes > 0 ? Math.round((confirmedEmployed / knownOutcomes) * 100) : 0;
    const originalEmployerRetentionRate =
      knownOutcomes > 0 ? Math.round((confirmedOriginalEmployer / knownOutcomes) * 100) : 0;
    const responseRate = eligibleCount > 0 ? Math.round((knownOutcomes / eligibleCount) * 100) : 0;
    const unknownPct = eligibleCount > 0 ? Math.round((unknownOutcomes / eligibleCount) * 100) : 0;

    return {
      days,
      eligibleCount,
      confirmedEmployed,
      confirmedOriginalEmployer,
      confirmedDifferentEmployer,
      confirmedUnemployed,
      knownOutcomes,
      unknownOutcomes,
      overallRetentionRate,
      originalEmployerRetentionRate,
      responseRate,
      unknownPct,
    };
  };

  const stats90 = computeCheckpointStats(90);
  const stats180 = computeCheckpointStats(180);
  const stats365 = computeCheckpointStats(365);

  const retentionChartData = [
    {
      checkpoint: '90 Days',
      OriginalEmployer: stats90.originalEmployerRetentionRate,
      ContinuedEmployment: stats90.overallRetentionRate,
      ResponseRate: stats90.responseRate,
    },
    {
      checkpoint: '180 Days',
      OriginalEmployer: stats180.originalEmployerRetentionRate,
      ContinuedEmployment: stats180.overallRetentionRate,
      ResponseRate: stats180.responseRate,
    },
    {
      checkpoint: '365 Days',
      OriginalEmployer: stats365.originalEmployerRetentionRate,
      ContinuedEmployment: stats365.overallRetentionRate,
      ResponseRate: stats365.responseRate,
    },
  ];

  // Skill Demand Aggregation from Live Jobs
  const skillCounts: Record<string, { demandCount: number; avgMaxSalary: number }> = {};
  jobs.forEach((job) => {
    (job.requiredSkills || []).forEach((sk) => {
      if (!skillCounts[sk]) {
        skillCounts[sk] = { demandCount: 0, avgMaxSalary: 0 };
      }
      skillCounts[sk].demandCount += 1;
      skillCounts[sk].avgMaxSalary = Math.round(
        (skillCounts[sk].avgMaxSalary * (skillCounts[sk].demandCount - 1) + job.salaryMax) /
          skillCounts[sk].demandCount
      );
    });
  });

  const skillDemandChartData = Object.entries(skillCounts)
    .map(([skill, val]) => ({
      skill,
      listings: val.demandCount,
      avgSalaryLakhs: Number((val.avgMaxSalary / 100000).toFixed(1)),
    }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 8);

  // Trigger Automated 90/180/365-Day Check-In Email
  const handleSendRetentionEmail = async (chk: RetentionCheckIn) => {
    setSendingEmailCheckInId(chk.id);
    try {
      const firstName = chk.candidateName.split(' ')[0] || 'Candidate';
      const response = await fetch('/api/retention/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          checkpointDays: chk.checkpointDays,
          companyName: chk.companyName,
          designation: chk.designation,
          checkInId: chk.id,
        }),
      });
      const emailData = await response.json();

      const notifId = cleanId(`email_${chk.checkpointDays}d_${chk.id}_${Date.now()}`);
      await setDoc(doc(db, 'emailNotifications', notifId), {
        recipientId: cleanId(chk.candidateId),
        recipientEmail: cleanString(chk.candidateEmail || 'candidate@resolution.in', 254),
        recipientName: cleanString(chk.candidateName, 120),
        templateType:
          chk.checkpointDays === 90
            ? 'Retention_90_Day'
            : chk.checkpointDays === 180
            ? 'Retention_180_Day'
            : 'Retention_365_Day',
        subject: cleanString(emailData.subject, 240),
        bodyPreview: cleanString(emailData.bodyPreview, 2000),
        checkpointDays: chk.checkpointDays,
        placementId: cleanId(chk.placementId),
        checkInId: cleanId(chk.id),
        deliveryStatus: 'Delivered',
        sentAt: cleanString(emailData.sentAt, 40),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'retentionCheckIns', chk.id), {
        emailStatus: 'Sent',
        status: chk.status === 'Scheduled' ? 'Reminder Sent' : chk.status,
        updatedAt: serverTimestamp(),
      });

      await recordAuditLog(
        `DISPATCH_RETENTION_${chk.checkpointDays}D_EMAIL`,
        'RetentionCheckIn',
        chk.id,
        `Dispatched ${chk.checkpointDays}-day retention check-in email to ${chk.candidateName}.`
      );

      setPreviewEmailContent({
        subject: emailData.subject,
        bodyPreview: emailData.bodyPreview,
        recipientEmail: chk.candidateEmail || 'candidate@resolution.in',
      });
      setStatusBanner({
        type: 'success',
        message: `Dispatched ${chk.checkpointDays}-Day Career Check-In email to ${chk.candidateName} and logged notification.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `retentionCheckIns/${chk.id}`);
    } finally {
      setSendingEmailCheckInId(null);
    }
  };

  // Approve / Reject Company or Coaching Center
  const handleVerifyCompany = async (comp: Company, status: Company['verificationStatus']) => {
    try {
      await updateDoc(doc(db, 'companies', comp.id), {
        verificationStatus: status,
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog(
        `COMPANY_VERIFICATION_${status.toUpperCase()}`,
        'Company',
        comp.id,
        `Updated company "${comp.companyName}" verification status to ${status}.`
      );
      setStatusBanner({
        type: 'success',
        message: `Company "${comp.companyName}" marked as ${status}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${comp.id}`);
    }
  };

  const handleApproveCenter = async (center: CoachingCenter, status: CoachingCenter['approvalStatus']) => {
    try {
      await updateDoc(doc(db, 'coachingCenters', center.id), {
        approvalStatus: status,
        updatedAt: serverTimestamp(),
      });
      await recordAuditLog(
        `COACHING_CENTER_${status.toUpperCase()}`,
        'CoachingCenter',
        center.id,
        `Updated coaching center "${center.centerName}" approval status to ${status}.`
      );
      setStatusBanner({
        type: 'success',
        message: `Coaching Center "${center.centerName}" marked as ${status}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coachingCenters/${center.id}`);
    }
  };

  // Generate AI Market & Skill Analytics
  const handleGenerateMarketInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/ai/market-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobsSummary: jobs.map((j) => ({
            title: j.title,
            industry: j.industry,
            requiredSkills: j.requiredSkills,
            salaryMax: j.salaryMax,
          })),
          coursesSummary: courses.map((c) => ({
            courseName: c.courseName,
            skillsTaught: c.skillsTaught,
          })),
          placementsCount: placements.length,
          retentionSummary: {
            retention90d: stats90.overallRetentionRate,
            retention180d: stats180.overallRetentionRate,
            retention365d: stats365.overallRetentionRate,
          },
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMarketInsights(data);
      }
    } catch (error) {
      console.error('Market Insights Error:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  // CSV Export Helper
  const handleExportRetentionCsv = () => {
    const headers = [
      'CheckIn_ID',
      'Candidate_Name',
      'Company',
      'Designation',
      'Joining_Date',
      'Checkpoint_Days',
      'Due_Date',
      'Email_Status',
      'Employment_Status',
      'Original_Company_Retained',
      'Reported_Salary_INR',
      'Verification_Status',
      'Workflow_Status',
    ];
    const rows = filteredCheckIns.map((r) => [
      r.id,
      `"${r.candidateName}"`,
      `"${r.companyName}"`,
      `"${r.designation}"`,
      r.joiningDate,
      r.checkpointDays,
      r.dueDate,
      r.emailStatus,
      r.employmentStatus,
      r.remainsWithOriginalCompany,
      r.reportedSalary || 0,
      r.verificationStatus,
      r.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RESOLUTION_Employee_Retention_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enrich Users with Placement & Salary info for User & Employee Management Table
  const enrichedUsers = users
    .map((u) => {
      const userPlacements = placements.filter((p) => p.candidateId === u.uid);
      const latestPlacement = userPlacements[0];
      const userSalaries = salaryHistory
        .filter((s) => s.userId === u.uid)
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      const initialSal = userSalaries[0]?.annualSalary || 0;
      const latestSal =
        userSalaries[userSalaries.length - 1]?.annualSalary || latestPlacement?.offeredSalary || 0;
      const salGrowthPct =
        initialSal > 0 && latestSal > initialSal
          ? Math.round(((latestSal - initialSal) / initialSal) * 100)
          : 0;
      const userEnrolls = enrollments.filter((e) => e.studentId === u.uid);
      const userCheckIns = retentionCheckIns.filter((c) => c.candidateId === u.uid);

      return {
        ...u,
        latestPlacement,
        initialSal,
        latestSal,
        salGrowthPct,
        enrolledCount: userEnrolls.length,
        completedCount: userEnrolls.filter((e) => e.status === 'Completed').length,
        checkInSummary:
          userCheckIns.length > 0
            ? userCheckIns.map((c) => `${c.checkpointDays}d: ${c.status}`).join(' · ')
            : 'No placement cohort yet',
      };
    })
    .filter((u) => {
      if (gradYearFilter !== 'ALL' && u.graduationYear !== gradYearFilter) return false;
      if (statusFilter !== 'ALL' && u.careerStatus !== statusFilter) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        (u.collegeName || '').toLowerCase().includes(q) ||
        (u.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (userSortBy === 'salary_desc') return b.latestSal - a.latestSal;
      if (userSortBy === 'skills_desc') return (b.skills || []).length - (a.skills || []).length;
      return (b.latestPlacement ? 1 : 0) - (a.latestPlacement ? 1 : 0);
    });

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Admin Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-teal-700">PORTAL 04 · PLATFORM GOVERNANCE & RETENTION ANALYTICS</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            RESOLUTION Administrator Command & Retention Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live Firestore telemetry · Authorized Admin: {currentUserEmail}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          {[
            { id: 'overview', label: '15-KPI Overview' },
            { id: 'retention', label: 'Employee Retention Analytics' },
            { id: 'users', label: 'Users & Employees' },
            { id: 'salary', label: 'Salary & Skill Analytics' },
            { id: 'emails', label: 'Automated Emails & Governance' },
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

      {/* TAB 1: MAIN ADMIN DASHBOARD (15 LIVE SUMMARY CARDS) */}
      {activeTab === 'overview' && (
        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Main Platform Summary Metrics (Live Database Records)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time counts across registrations, placements, courses, and 90/180/365-day retention checkpoints
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: '01. Total Registered Users', value: totalUsers },
              { label: '02. Undergraduate Students', value: undergradUsers },
              { label: '03. Graduated Job Seekers', value: gradJobSeekers },
              { label: '04. Employed Users', value: employedUsers },
              { label: '05. Unemployed Users', value: unemployedUsers },
              { label: '06. Verified Companies', value: verifiedCompanies },
              { label: '07. Verified Coaching Centers', value: verifiedCoachingCenters },
              { label: '08. Active Job Listings', value: activeJobs },
              { label: '09. Applications Submitted', value: totalApplications },
              { label: '10. Confirmed Placements', value: confirmedPlacements },
              { label: '11. Active Course Enrollments', value: activeEnrollments },
              { label: '12. Courses Completed', value: completedCourses },
              { label: '13. Due for Retention Follow-Up', value: dueForFollowUp },
              { label: '14. Verified Retained Check-Ins', value: verifiedRetained },
              { label: '15. Status Awaiting Confirmation', value: awaitingConfirmation },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1.5">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Interactive Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">90, 180 & 365-Day Retention Cohort Comparison</h3>
                  <p className="text-xs text-slate-500">
                    Original employer retention vs. overall continued employment & response rates
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('retention')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  Full Retention Suite
                </button>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="checkpoint" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="OriginalEmployer" name="Original Employer (%)" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ContinuedEmployment" name="Any Employer (%)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ResponseRate" name="Cohort Response Rate (%)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Employer Skill Demand & Associated Maximum Package (INR Lakhs)
                </h3>
                <p className="text-xs text-slate-500">
                  Derived from active job listings (Observational sample size: {jobs.length} listings)
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillDemandChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="listings" name="Job Listings Requiring Skill" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="avgSalaryLakhs"
                      name="Avg Max Package (₹ Lakhs)"
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED EMPLOYEE RETENTION ANALYTICS DASHBOARD */}
      {activeTab === 'retention' && (
        <div className="mt-8 space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700">COHORT RETENTION METHODOLOGY & RESPONSE BIAS GUARD</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Employee Retention Analytics</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                <strong>Retention Rate Formula:</strong> (Confirmed Employed at Checkpoint ÷ Eligible Cohort with Known
                Outcome at Checkpoint) × 100. Non-respondents remain classified as <em>Unknown</em> and are never
                automatically counted as employed or unemployed.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={retentionCompanyFilter}
                onChange={(e) => setRetentionCompanyFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Placement Companies</option>
                {Array.from(new Set(retentionCheckIns.map((c) => c.companyName))).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportRetentionCsv}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 3 Checkpoint Cohort Cards: 90 Days, 180 Days, 365 Days */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[stats90, stats180, stats365].map((st) => (
              <div key={st.days} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-mono-tabular font-bold text-teal-700">
                    {st.days}-DAY CHECKPOINT COHORT
                  </span>
                  <span className="text-xl font-bold text-slate-900 font-mono-tabular">
                    {st.overallRetentionRate}% Retained
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-slate-500">Original Employer</p>
                    <p className="text-base font-bold text-slate-900 font-mono-tabular mt-0.5">
                      {st.originalEmployerRetentionRate}% ({st.confirmedOriginalEmployer})
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-slate-500">Continued (Any Employer)</p>
                    <p className="text-base font-bold text-teal-700 font-mono-tabular mt-0.5">
                      {st.overallRetentionRate}% ({st.confirmedEmployed})
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span>Eligible Cohort Size:</span>
                    <span className="font-mono-tabular font-semibold text-slate-900">{st.eligibleCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirmed Employed:</span>
                    <span className="font-mono-tabular font-semibold text-teal-700">{st.confirmedEmployed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirmed Unemployed:</span>
                    <span className="font-mono-tabular font-semibold text-amber-800">{st.confirmedUnemployed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Non-Respondents (Outcome Unknown):</span>
                    <span className="font-mono-tabular font-semibold text-slate-700">
                      {st.unknownOutcomes} ({st.unknownPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-100">
                    <span className="font-medium text-slate-800">Cohort Response Rate:</span>
                    <span className="font-mono-tabular font-bold text-slate-900">{st.responseRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkpoint Records Table with Automated Email Dispatcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                90, 180 & 365-Day Retention Check-In Ledger & Automated Follow-Up Dispatcher
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trigger branded RESOLUTION career check-in emails or inspect candidate responses
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Employee & ID</th>
                    <th className="py-2.5 px-3 font-semibold">Placement Company & Role</th>
                    <th className="py-2.5 px-3 font-semibold">Checkpoint</th>
                    <th className="py-2.5 px-3 font-semibold">Due Date</th>
                    <th className="py-2.5 px-3 font-semibold">Email Status</th>
                    <th className="py-2.5 px-3 font-semibold">Outcome & Employer</th>
                    <th className="py-2.5 px-3 font-semibold">Reported Salary</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Follow-Up Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCheckIns.map((chk) => (
                    <tr key={chk.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{chk.candidateName}</p>
                        <p className="font-mono-tabular text-slate-500">{chk.candidateId.slice(0, 12)}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800">{chk.companyName}</p>
                        <p className="text-slate-500">
                          {chk.designation} · Joined {chk.joiningDate}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular font-bold text-teal-700">
                        {chk.checkpointDays} Days
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-700">{chk.dueDate}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {chk.emailStatus} · <strong>{chk.status}</strong>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{chk.employmentStatus}</p>
                        <p className="text-slate-500">
                          {chk.employmentStatus === 'Employed'
                            ? chk.remainsWithOriginalCompany
                              ? 'Retained at Original Company'
                              : `Changed to ${chk.currentEmployer}`
                            : chk.employmentStatus === 'Unemployed'
                            ? 'Support Activated · Reminders Paused'
                            : 'Awaiting Confirmation'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-800">
                        {chk.reportedSalary ? `INR ${chk.reportedSalary.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {chk.employmentStatus === 'Unemployed' ? (
                          <span className="text-slate-500">Reminders Paused</span>
                        ) : (
                          <button
                            onClick={() => handleSendRetentionEmail(chk)}
                            disabled={sendingEmailCheckInId === chk.id}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {sendingEmailCheckInId === chk.id
                              ? 'Sending...'
                              : `Send ${chk.checkpointDays}d Email`}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER & EMPLOYEE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by User ID, name, university, or skill..."
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Career Statuses</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduated_unemployed">Graduated & Unemployed</option>
                <option value="graduated_employed">Graduated & Employed</option>
                <option value="postgraduate">Postgraduate</option>
              </select>

              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="salary_desc">Sort: Highest to Lowest Reported Salary</option>
                <option value="placements_recent">Sort: Most Recent Placements</option>
                <option value="skills_desc">Sort: Skill Count</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">User ID & Name</th>
                    <th className="py-3 px-4 font-semibold">Education & Grad Year</th>
                    <th className="py-3 px-4 font-semibold">Skills</th>
                    <th className="py-3 px-4 font-semibold">Courses (Enrolled / Done)</th>
                    <th className="py-3 px-4 font-semibold">Placement & Status</th>
                    <th className="py-3 px-4 font-semibold">Latest Salary & Growth</th>
                    <th className="py-3 px-4 font-semibold">Retention Check-Ins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{u.displayName}</p>
                        <p className="font-mono-tabular text-slate-500">{u.uid.slice(0, 14)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{u.highestQualification}</p>
                        <p className="text-slate-500">
                          {u.collegeName} · {u.graduationYear}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {(u.skills || []).slice(0, 5).join(' · ')}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-800">
                        {u.enrolledCount} enrolled · {u.completedCount} completed
                      </td>
                      <td className="py-3 px-4">
                        {u.latestPlacement ? (
                          <div>
                            <p className="font-semibold text-teal-800">{u.latestPlacement.companyName}</p>
                            <p className="text-slate-500">
                              {u.latestPlacement.designation} · {u.latestPlacement.joiningDate}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">{u.careerStatus.replace('_', ' ')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular">
                        <p className="font-bold text-slate-900">
                          {u.latestSal > 0 ? `INR ${u.latestSal.toLocaleString()}` : 'Not reported'}
                        </p>
                        {u.salGrowthPct > 0 && (
                          <p className="text-teal-700 font-semibold">+{u.salGrowthPct}% vs initial</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.checkInSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAREER PROGRESSION, SALARY & IN-DEMAND SKILL ANALYTICS */}
      {activeTab === 'salary' && (
        <div className="mt-8 space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700">
                OBSERVATIONAL ANALYTICS & VERIFICATION TRANSPARENCY
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Salary Progression, Skill Demand & Course Association Analytics
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                <strong>Methodological Note:</strong> Records distinguish between <em>Employer-Verified</em> placement
                packages and <em>Self-Reported</em> updates. Associations between course completions and salary changes
                reflect observed platform trends across {salaryHistory.length} records and do not imply causal proof.
              </p>
            </div>
            <button
              onClick={handleGenerateMarketInsights}
              disabled={loadingInsights}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingInsights ? 'Generating AI Insights...' : 'Run AI Skill & Retention Analysis'}
            </button>
          </div>

          {marketInsights && (
            <div className="bg-slate-900 text-white rounded-xl p-6 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono-tabular text-teal-400">
                  AI LABOR MARKET & SKILL DEMAND REPORT
                </span>
                <span className="text-xs text-slate-400">
                  Sample: {jobs.length} Jobs · {courses.length} Courses · {placements.length} Placements
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{marketInsights.executiveSummary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3.5 rounded-lg bg-slate-800/90">
                  <p className="font-semibold text-teal-300">Emerging High-Demand Skills:</p>
                  <p className="text-slate-200 mt-1">{marketInsights.emergingSkills.join(' · ')}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-800/90">
                  <p className="font-semibold text-amber-300">Common Candidate Skill Gaps:</p>
                  <p className="text-slate-200 mt-1">{marketInsights.commonSkillGaps.join(' · ')}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                <strong>Limitations & Scope:</strong> {marketInsights.methodologyNote}
              </p>
            </div>
          )}

          {/* Salary History Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Platform Salary & Career Progression Ledger (Employer-Verified vs. Self-Reported)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Candidate / Employee</th>
                    <th className="py-2.5 px-3 font-semibold">Milestone Type</th>
                    <th className="py-2.5 px-3 font-semibold">Organization & Role</th>
                    <th className="py-2.5 px-3 font-semibold">Annual Compensation</th>
                    <th className="py-2.5 px-3 font-semibold">Verification Classification</th>
                    <th className="py-2.5 px-3 font-semibold">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaryHistory.map((sal) => (
                    <tr key={sal.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{sal.userName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{sal.recordType}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {sal.designation} · {sal.companyName}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular font-bold text-slate-900">
                        {sal.currency} {sal.annualSalary.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            sal.verificationType === 'Employer-Verified' ? 'text-teal-700' : 'text-slate-600'
                          }`}
                        >
                          {sal.verificationType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-600">{sal.effectiveDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATED EMAIL LOGS, APPROVALS & AUDIT LOGS */}
      {activeTab === 'emails' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Company & Coaching Center Approvals */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Company & Coaching Center Verification Approvals
              </h3>
              <div className="space-y-3 text-xs">
                <p className="font-semibold text-slate-500">COMPANIES ({companies.length})</p>
                {companies.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{comp.companyName}</p>
                      <p className="text-slate-500">
                        {comp.officialEmail} · Status: <strong>{comp.verificationStatus}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleVerifyCompany(comp, 'verified')}
                        className="px-2.5 py-1 bg-teal-600 text-white rounded-md font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerifyCompany(comp, 'rejected')}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                <p className="font-semibold text-slate-500 pt-3">COACHING CENTERS ({coachingCenters.length})</p>
                {coachingCenters.map((center) => (
                  <div
                    key={center.id}
                    className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{center.centerName}</p>
                      <p className="text-slate-500">
                        {center.officialEmail} · Status: <strong>{center.approvalStatus}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleApproveCenter(center, 'approved')}
                        className="px-2.5 py-1 bg-teal-600 text-white rounded-md font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveCenter(center, 'rejected')}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automated Email Delivery Logs */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Automated 90/180/365-Day Email Notification Delivery Logs
              </h3>
              <div className="space-y-3 text-xs max-h-96 overflow-y-auto">
                {emailLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.subject}</span>
                      <span className="font-mono-tabular text-teal-700 font-semibold">{log.deliveryStatus}</span>
                    </div>
                    <p className="text-slate-500">
                      To: {log.recipientName} ({log.recipientEmail}) · Sent: {log.sentAt}
                    </p>
                    <p className="text-slate-600 line-clamp-2 pt-1">{log.bodyPreview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security & Administrative Audit Logs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Immutable Administrative & Security Audit Logs</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Action</th>
                    <th className="py-2.5 px-3 font-semibold">Actor</th>
                    <th className="py-2.5 px-3 font-semibold">Target Entity</th>
                    <th className="py-2.5 px-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 px-3 font-mono-tabular font-semibold text-slate-900">{log.action}</td>
                      <td className="py-2 px-3 text-slate-600">{log.actorEmail}</td>
                      <td className="py-2 px-3 text-slate-600">
                        {log.targetType} ({log.targetId.slice(0, 12)})
                      </td>
                      <td className="py-2 px-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmailContent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Dispatched Retention Check-In Email</h3>
              <button
                onClick={() => setPreviewEmailContent(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                Recipient: <strong className="text-slate-800">{previewEmailContent.recipientEmail}</strong>
              </p>
              <p className="text-slate-500">
                Subject: <strong className="text-slate-900">{previewEmailContent.subject}</strong>
              </p>
              <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewEmailContent.bodyPreview}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
