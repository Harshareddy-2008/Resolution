import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AIResumeAnalysis,
  CareerStatus,
  Course,
  CourseEnrollment,
  JobApplication,
  JobListing,
  RetentionCheckIn,
  SalaryHistoryRecord,
  UserPrivateRecord,
  UserPublicProfile,
} from '../types/resolution';
import {
  cleanId,
  cleanString,
  cleanStringArray,
  db,
  handleFirestoreError,
  OperationType,
  recordAuditLog,
} from '../lib/firebase';

interface UserPortalViewProps {
  currentUserUid: string;
  currentUserEmail: string;
  userProfile: UserPublicProfile | null;
  userPrivate: UserPrivateRecord | null;
  jobs: JobListing[];
  courses: Course[];
  applications: JobApplication[];
  enrollments: CourseEnrollment[];
  salaryHistory: SalaryHistoryRecord[];
  retentionCheckIns: RetentionCheckIn[];
  initialTab?: string;
}

const SAMPLE_RESUME_TEXT = `AARAV SHARMA
Bengaluru, Karnataka, India · aarav.sharma@nitk.edu.in · +91 98450 11223
EDUCATION
B.Tech in Computer Science and Engineering, National Institute of Technology Karnataka (NITK), Graduation: 2025 (CGPA: 8.7/10)

TECHNICAL SKILLS
Programming Languages: TypeScript, JavaScript, Python, SQL, C++
Frameworks & Tools: React, Node.js, Express, PostgreSQL, Git, Linux, REST APIs
Soft Skills: Technical Communication, Agile Sprint Planning, Collaborative Problem Solving

INTERNSHIP & WORK EXPERIENCE
Software Engineering Intern — CloudScale Labs (Jan 2025 – Jun 2025, 6 months)
- Built full-stack telemetry dashboards using React, TypeScript, and PostgreSQL queries reducing report latency by 38%.
- Developed RESTful API endpoints in Node.js and Express with role-based access control.

ACADEMIC PROJECTS
1. Distributed Task Queue & Job Scheduler: Implemented a fault-tolerant worker queue in Python and PostgreSQL.
2. Campus Skill Exchange Portal: Built a responsive web application using React and TypeScript for student peer mentoring.

CERTIFICATIONS
- Relational Database Design & SQL Optimization Certificate (2024)`;

export const UserPortalView: React.FC<UserPortalViewProps> = ({
  currentUserUid,
  currentUserEmail,
  userProfile,
  userPrivate,
  jobs,
  courses,
  applications,
  enrollments,
  salaryHistory,
  retentionCheckIns,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-Step Registration State
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regForm, setRegForm] = useState({
    displayName: userProfile?.displayName || '',
    dateOfBirth: userPrivate?.dateOfBirth || '2003-05-14',
    gender: userPrivate?.gender || 'Prefer not to say',
    mobileNumber: userPrivate?.mobileNumber || '+91 98450 11223',
    email: userPrivate?.email || currentUserEmail || '',
    country: userProfile?.country || 'India',
    state: userProfile?.state || 'Karnataka',
    city: userProfile?.city || 'Bengaluru',
    postalCode: userPrivate?.postalCode || '560001',
    highestQualification: userProfile?.highestQualification || 'B.Tech in Computer Science',
    collegeName: userProfile?.collegeName || 'National Institute of Technology, Karnataka',
    graduationYear: userProfile?.graduationYear || '2025',
    fieldOfStudy: userProfile?.fieldOfStudy || 'Computer Science & Engineering',
    careerStatus: (userProfile?.careerStatus || 'graduated_unemployed') as CareerStatus,
    // Conditional status fields
    currentCompany: userPrivate?.currentCompany || '',
    designation: userPrivate?.designation || '',
    industry: userPrivate?.industry || 'Software & Cloud Infrastructure',
    workLocation: userPrivate?.workLocation || 'Bengaluru, India',
    joiningDate: userPrivate?.joiningDate || '',
    currentSalary: userPrivate?.currentSalary || 0,
    expectedSalary: userPrivate?.expectedSalary || 1200000,
    employeeIdVerification: userPrivate?.employeeIdVerification || '',
    targetRolesInput: (userProfile?.targetRoles || ['Full-Stack Engineer', 'Backend Software Engineer']).join(', '),
    skillsInput: (userProfile?.skills || ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python']).join(', '),
    privacyConsent: userPrivate?.privacyConsent ?? true,
    emailNotificationsConsent: userPrivate?.emailNotificationsConsent ?? true,
  });

  // AI Resume Analyzer State
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState(userPrivate?.resumeFileName || '');
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [resumeTextInput, setResumeTextInput] = useState<string>(SAMPLE_RESUME_TEXT);
  const [aiResult, setAiResult] = useState<AIResumeAnalysis | null>(() => {
    if (userPrivate?.resumeAnalysisJson) {
      try {
        return JSON.parse(userPrivate.resumeAnalysisJson);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [newSkillTag, setNewSkillTag] = useState('');

  // Job Filter State
  const [jobSearch, setJobSearch] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState<string>('ALL');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('ALL');
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);

  // New Salary Milestone Form
  const [newSalaryForm, setNewSalaryForm] = useState({
    recordType: 'Promotion' as SalaryHistoryRecord['recordType'],
    companyName: userPrivate?.currentCompany || 'Aris Enterprise Systems',
    designation: userPrivate?.designation || 'Senior Software Engineer',
    annualSalary: 1650000,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Retention Check-In Update State
  const [selectedCheckIn, setSelectedCheckIn] = useState<RetentionCheckIn | null>(null);
  const [checkInResponseForm, setCheckInResponseForm] = useState({
    outcome: 'same_company' as 'same_company' | 'different_company' | 'unemployed',
    currentEmployer: '',
    reportedSalary: 1450000,
    assistanceRequested: false,
  });

  const myApplications = applications.filter((a) => a.candidateId === currentUserUid);
  const myEnrollments = enrollments.filter((e) => e.studentId === currentUserUid);
  const mySalaryHistory = salaryHistory
    .filter((s) => s.userId === currentUserUid)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const myCheckIns = retentionCheckIns
    .filter((c) => c.candidateId === currentUserUid)
    .sort((a, b) => a.checkpointDays - b.checkpointDays);

  // Save Registration / Profile
  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = cleanId(currentUserUid);
    const parsedSkills = cleanStringArray(
      regForm.skillsInput.split(',').map((s) => s.trim()),
      50
    );
    const parsedRoles = cleanStringArray(
      regForm.targetRolesInput.split(',').map((s) => s.trim()),
      20
    );

    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          uid,
          displayName: cleanString(regForm.displayName || 'Candidate', 120),
          role: userProfile?.role || 'user',
          careerStatus: regForm.careerStatus,
          highestQualification: cleanString(regForm.highestQualification, 120),
          collegeName: cleanString(regForm.collegeName, 200),
          graduationYear: cleanString(regForm.graduationYear, 10),
          fieldOfStudy: cleanString(regForm.fieldOfStudy, 120),
          city: cleanString(regForm.city, 100),
          state: cleanString(regForm.state, 100),
          country: cleanString(regForm.country, 100),
          skills: parsedSkills,
          targetRoles: parsedRoles,
          resumeSummary: cleanString(userProfile?.resumeSummary || '', 2000),
          readinessScore: userProfile?.readinessScore ?? 80,
          yearsOfExperience: userProfile?.yearsOfExperience ?? (regForm.careerStatus === 'graduated_employed' ? 2 : 0),
          createdAt: userProfile?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, 'users', uid, 'private', 'info'),
        {
          userId: uid,
          email: cleanString(regForm.email || currentUserEmail, 254),
          mobileNumber: cleanString(regForm.mobileNumber, 30),
          dateOfBirth: cleanString(regForm.dateOfBirth, 20),
          gender: cleanString(regForm.gender, 40),
          postalCode: cleanString(regForm.postalCode, 20),
          currentCompany: cleanString(regForm.currentCompany, 160),
          designation: cleanString(regForm.designation, 160),
          industry: cleanString(regForm.industry, 120),
          workLocation: cleanString(regForm.workLocation, 160),
          joiningDate: cleanString(regForm.joiningDate, 30),
          currentSalary: Number(regForm.currentSalary) || 0,
          expectedSalary: Number(regForm.expectedSalary) || 0,
          employeeIdVerification: cleanString(regForm.employeeIdVerification, 80),
          privacyConsent: Boolean(regForm.privacyConsent),
          emailNotificationsConsent: Boolean(regForm.emailNotificationsConsent),
          resumeFileName: cleanString(resumeFileName || userPrivate?.resumeFileName || '', 255),
          resumeAnalysisJson: cleanString(userPrivate?.resumeAnalysisJson || '', 20000),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setStatusBanner({
        type: 'success',
        message: 'Career profile and split-collection privacy preferences saved to Firestore.',
      });
      setActiveTab('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  };

  // Handle PDF File Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setStatusBanner({ type: 'error', message: 'Please upload a valid PDF (.pdf) resume file.' });
      return;
    }
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setPdfBase64(base64);
      setStatusBanner({
        type: 'success',
        message: `Loaded "${file.name}". Click "Run AI Resume Analysis" to extract skills and readiness insights.`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Trigger Server-Side Gemini AI Resume Analysis
  const handleRunResumeAnalysis = async () => {
    setAnalyzingResume(true);
    setStatusBanner(null);
    try {
      const response = await fetch('/api/ai/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: pdfBase64 || undefined,
          resumeText: pdfBase64 ? undefined : resumeTextInput,
          targetRoles: userProfile?.targetRoles || ['Full-Stack Engineer', 'Data Engineer'],
          careerStatus: userProfile?.careerStatus || 'graduated_unemployed',
          availableCourses: courses.map((c) => ({
            courseName: c.courseName,
            provider: c.centerName,
            skillsTaught: c.skillsTaught,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Resume analysis failed');
      }

      setAiResult(data);

      // Persist extracted skills & summary into UserPublicProfile and UserPrivateRecord
      const uid = cleanId(currentUserUid);
      const extractedSkillNames = cleanStringArray(
        [
          ...(data.technicalSkills || []).map((s: any) => s.name),
          ...(data.programmingLanguages || []),
          ...(data.softwareAndTools || []),
        ],
        50
      );

      if (userProfile) {
        await updateDoc(doc(db, 'users', uid), {
          skills: extractedSkillNames.length > 0 ? extractedSkillNames : userProfile.skills || [],
          resumeSummary: cleanString(data.summary || '', 2000),
          readinessScore: Math.min(100, Math.max(0, Number(data.readinessScore) || 82)),
          yearsOfExperience: Math.min(60, Math.max(0, Number(data.yearsOfExperience) || 0)),
          updatedAt: serverTimestamp(),
        });
      }

      if (userPrivate) {
        await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
          resumeFileName: cleanString(resumeFileName || 'Uploaded_Resume.pdf', 255),
          resumeAnalysisJson: cleanString(JSON.stringify(data), 20000),
          updatedAt: serverTimestamp(),
        });
      }

      setStatusBanner({
        type: 'success',
        message: 'AI Resume Analysis complete! Extracted skills and readiness score synced to your profile.',
      });
    } catch (error: any) {
      setStatusBanner({ type: 'error', message: error.message || 'Failed to analyze resume.' });
    } finally {
      setAnalyzingResume(false);
    }
  };

  // Add or Remove Editable Skill Tag
  const handleAddSkillTag = async () => {
    if (!newSkillTag.trim() || !userProfile) return;
    const updated = cleanStringArray([...(userProfile.skills || []), newSkillTag.trim()], 50);
    setNewSkillTag('');
    try {
      await updateDoc(doc(db, 'users', cleanId(currentUserUid)), {
        skills: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUserUid}`);
    }
  };

  const handleRemoveSkillTag = async (skillToRemove: string) => {
    if (!userProfile) return;
    const updated = (userProfile.skills || []).filter((s) => s !== skillToRemove);
    try {
      await updateDoc(doc(db, 'users', cleanId(currentUserUid)), {
        skills: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUserUid}`);
    }
  };

  // Apply for a Job
  const handleApplyForJob = async (job: JobListing) => {
    const existing = myApplications.find((a) => a.jobId === job.id);
    if (existing) {
      setStatusBanner({ type: 'error', message: `You have already applied for ${job.title}.` });
      return;
    }

    const userSkills = userProfile?.skills || [];
    const matching = job.requiredSkills.filter((req) =>
      userSkills.some((u) => u.toLowerCase() === req.toLowerCase())
    );
    const computedScore =
      job.requiredSkills.length > 0 ? Math.round((matching.length / job.requiredSkills.length) * 100) : 85;
    const missing = job.requiredSkills.filter(
      (req) => !userSkills.some((u) => u.toLowerCase() === req.toLowerCase())
    );

    const appId = cleanId(`app_${currentUserUid.slice(0, 8)}_${job.id.slice(0, 12)}_${Date.now()}`);
    try {
      await setDoc(doc(db, 'applications', appId), {
        jobId: cleanId(job.id),
        jobTitle: cleanString(job.title, 160),
        companyId: cleanId(job.companyId),
        companyOwnerId: cleanId(job.ownerId),
        companyName: cleanString(job.companyName, 160),
        candidateId: cleanId(currentUserUid),
        candidateName: cleanString(userProfile?.displayName || 'Candidate', 120),
        candidateEmail: cleanString(userPrivate?.email || currentUserEmail, 254),
        candidateQualification: cleanString(userProfile?.highestQualification || 'Graduate', 160),
        candidateSkills: cleanStringArray(userSkills, 50),
        matchScore: computedScore,
        matchExplanation: cleanString(
          `Matched ${matching.length}/${job.requiredSkills.length} required skills (${matching.join(', ') || 'foundational profile'}). ${
            missing.length > 0 ? `Recommended upskilling: ${missing.join(', ')}.` : 'All required skills verified.'
          }`,
          1000
        ),
        status: 'Applied',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStatusBanner({
        type: 'success',
        message: `Application submitted for "${job.title}" at ${job.companyName} (Skill Match: ${computedScore}%).`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `applications/${appId}`);
    }
  };

  // Enroll in a Course
  const handleEnrollCourse = async (course: Course) => {
    const existing = myEnrollments.find((e) => e.courseId === course.id);
    if (existing) {
      setStatusBanner({ type: 'error', message: `You are already enrolled in "${course.courseName}".` });
      return;
    }

    const enrollId = cleanId(`enr_${currentUserUid.slice(0, 8)}_${course.id.slice(0, 12)}_${Date.now()}`);
    try {
      await setDoc(doc(db, 'enrollments', enrollId), {
        courseId: cleanId(course.id),
        courseName: cleanString(course.courseName, 160),
        centerId: cleanId(course.centerId),
        centerOwnerId: cleanId(course.ownerId),
        centerName: cleanString(course.centerName, 160),
        studentId: cleanId(currentUserUid),
        studentName: cleanString(userProfile?.displayName || 'Learner', 120),
        skillsTaught: cleanStringArray(course.skillsTaught, 30),
        progressPercent: 10,
        status: 'Enrolled',
        certificateIssued: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: `Enrolled in "${course.courseName}" with ${course.centerName}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `enrollments/${enrollId}`);
    }
  };

  // Record Self-Reported Salary Update
  const handleAddSalaryMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const recId = cleanId(`sal_${currentUserUid.slice(0, 8)}_${Date.now()}`);
    try {
      await setDoc(doc(db, 'salaryHistory', recId), {
        userId: cleanId(currentUserUid),
        userName: cleanString(userProfile?.displayName || 'Candidate', 120),
        recordType: newSalaryForm.recordType,
        companyName: cleanString(newSalaryForm.companyName, 160),
        designation: cleanString(newSalaryForm.designation, 160),
        industry: cleanString(userPrivate?.industry || 'Technology', 120),
        annualSalary: Math.max(0, Number(newSalaryForm.annualSalary) || 0),
        currency: 'INR',
        verificationType: 'Self-Reported',
        skillsAtTime: cleanStringArray(userProfile?.skills || [], 50),
        effectiveDate: cleanString(newSalaryForm.effectiveDate, 40),
        createdAt: serverTimestamp(),
      });
      setStatusBanner({
        type: 'success',
        message: 'Career & salary milestone recorded in your private progression history.',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `salaryHistory/${recId}`);
    }
  };

  // Submit 90/180/365-Day Retention Check-In Response
  const handleSubmitRetentionCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckIn) return;

    const isUnemployed = checkInResponseForm.outcome === 'unemployed';
    const isSameCompany = checkInResponseForm.outcome === 'same_company';

    try {
      await updateDoc(doc(db, 'retentionCheckIns', selectedCheckIn.id), {
        responseDate: new Date().toISOString().split('T')[0],
        employmentStatus: isUnemployed ? 'Unemployed' : 'Employed',
        remainsWithOriginalCompany: isSameCompany,
        currentEmployer: cleanString(
          isUnemployed
            ? 'Currently Seeking Opportunity'
            : isSameCompany
            ? selectedCheckIn.companyName
            : checkInResponseForm.currentEmployer || 'New Employer',
          160
        ),
        reportedSalary: isUnemployed ? 0 : Math.max(0, Number(checkInResponseForm.reportedSalary) || 0),
        verificationStatus: 'Candidate Confirmed',
        status: isUnemployed
          ? 'Confirmed Unemployed'
          : isSameCompany
          ? 'Confirmed Employed'
          : 'Employment Changed',
        assistanceRequested: Boolean(checkInResponseForm.assistanceRequested || isUnemployed),
        updatedAt: serverTimestamp(),
      });

      // Also record salary update if employed
      if (!isUnemployed && checkInResponseForm.reportedSalary > 0) {
        const salId = cleanId(`sal_chk_${selectedCheckIn.checkpointDays}_${Date.now()}`);
        await setDoc(doc(db, 'salaryHistory', salId), {
          userId: cleanId(currentUserUid),
          userName: cleanString(userProfile?.displayName || selectedCheckIn.candidateName, 120),
          recordType: 'RetentionCheckIn',
          companyName: cleanString(
            isSameCompany ? selectedCheckIn.companyName : checkInResponseForm.currentEmployer || 'New Employer',
            160
          ),
          designation: cleanString(selectedCheckIn.designation, 160),
          annualSalary: Number(checkInResponseForm.reportedSalary),
          currency: 'INR',
          verificationType: 'Self-Reported',
          skillsAtTime: cleanStringArray(userProfile?.skills || [], 50),
          effectiveDate: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
        });
      }

      await recordAuditLog(
        `RETENTION_CHECKIN_${selectedCheckIn.checkpointDays}D_CONFIRMED`,
        'RetentionCheckIn',
        selectedCheckIn.id,
        `Candidate confirmed ${checkInResponseForm.outcome} at ${selectedCheckIn.checkpointDays}-day checkpoint.`
      );

      setSelectedCheckIn(null);
      setStatusBanner({
        type: 'success',
        message: isUnemployed
          ? 'Your status has been updated. RESOLUTION has activated priority job recommendations and upskilling support for you, and paused redundant retention reminders.'
          : `Thank you! Your ${selectedCheckIn.checkpointDays}-day employment check-in has been verified and recorded.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `retentionCheckIns/${selectedCheckIn.id}`);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (job.status !== 'active') return false;
    if (workModeFilter !== 'ALL' && job.workMode !== workModeFilter) return false;
    if (employmentTypeFilter !== 'ALL' && job.employmentType !== employmentTypeFilter) return false;
    if (!jobSearch.trim()) return true;
    const q = jobSearch.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.companyName.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q) ||
      job.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Portal Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-teal-700">PORTAL 01 · CANDIDATE & EMPLOYEE WORKSPACE</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {userProfile?.displayName || 'Candidate'} — Career, Skill & Retention Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            <span>Status: {(userProfile?.careerStatus || 'graduated_unemployed').replace('_', ' ')}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{userProfile?.highestQualification || 'B.Tech'}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>
              {userProfile?.city || 'Bengaluru'}, {userProfile?.country || 'India'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          {[
            { id: 'dashboard', label: 'Overview' },
            { id: 'register', label: 'Profile & Status' },
            { id: 'resume', label: 'AI Resume Analyzer' },
            { id: 'jobs', label: `Jobs (${filteredJobs.length})` },
            { id: 'courses', label: `Courses (${courses.length})` },
            { id: 'progression', label: 'Salary & Check-Ins' },
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

      {/* TAB 1: USER DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="mt-8 space-y-8">
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">AI Job-Readiness Assessment</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {userProfile?.readinessScore ?? 84}/100
              </p>
              <p className="text-xs text-slate-500 mt-1">Based on verified resume artifacts</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Verified & Editable Skills</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {(userProfile?.skills || []).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Synced with AI candidate matcher</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Active Job Applications</p>
              <p className="text-2xl font-bold text-teal-700 font-mono-tabular mt-1">{myApplications.length}</p>
              <p className="text-xs text-slate-500 mt-1">
                {myApplications.filter((a) => a.status === 'Shortlisted' || a.status === 'Interview').length}{' '}
                shortlisted / interviewing
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Courses & Retention Check-Ins</p>
              <p className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">
                {myEnrollments.length} · {myCheckIns.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Active enrollments · Check-in milestones</p>
            </div>
          </div>

          {/* Pending Retention Check-In Alert if any */}
          {myCheckIns.some((c) => c.status === 'Awaiting Response' || c.status === 'Scheduled') && (
            <div className="bg-white rounded-xl border border-teal-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">ACTION REQUIRED · POST-PLACEMENT RETENTION CHECK-IN</p>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  You have a scheduled employment check-in awaiting confirmation
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Confirm whether you remain employed with your placement company, transitioned to a new employer, or
                  require re-employment support.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('progression')}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Respond to Check-In
              </button>
            </div>
          )}

          {/* Extracted Skills & Editable Skill Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Your Resume Summary & Editable Skill Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add or remove skills anytime to refine job and course recommendations
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('resume')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  Re-Analyze PDF
                </button>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                {userProfile?.resumeSummary ||
                  'Upload your PDF resume in the AI Resume Analyzer tab to generate a grounded career summary and skill proficiency matrix.'}
              </p>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Verified & Editable Skills</p>
                <div className="flex flex-wrap gap-2">
                  {(userProfile?.skills || []).map((skill) => (
                    <div
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-md"
                    >
                      <span>{skill}</span>
                      <button
                        onClick={() => handleRemoveSkillTag(skill)}
                        title={`Remove ${skill}`}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="text"
                    value={newSkillTag}
                    onChange={(e) => setNewSkillTag(e.target.value)}
                    placeholder="Add a skill (e.g., Docker, System Design)..."
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg flex-1 max-w-xs"
                  />
                  <button
                    onClick={handleAddSkillTag}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Add Skill
                  </button>
                </div>
              </div>
            </div>

            {/* Application History & Course Progress */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-base font-bold text-slate-900">Recent Job Applications & Course Progress</h2>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500">APPLICATION TRACKER</p>
                {myApplications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No applications submitted yet.</p>
                ) : (
                  myApplications.map((app) => (
                    <div key={app.id} className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{app.jobTitle}</span>
                        <span className="text-xs font-mono-tabular font-semibold text-teal-700">
                          Match: {app.matchScore}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {app.companyName} · Status: <strong className="text-slate-800">{app.status}</strong>
                        {app.interviewDate ? ` · Interview: ${app.interviewDate}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500">COURSE ENROLLMENTS</p>
                {myEnrollments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Not enrolled in any courses yet.</p>
                ) : (
                  myEnrollments.map((enr) => (
                    <div key={enr.id} className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{enr.courseName}</span>
                        <span className="text-xs font-mono-tabular font-semibold text-slate-700">
                          {enr.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 transition-all"
                          style={{ width: `${enr.progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {enr.centerName} · {enr.status}
                        {enr.certificateIssued && enr.certificateId ? ` · Cert ID: ${enr.certificateId}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-STEP USER REGISTRATION & STATUS MANAGEMENT */}
      {activeTab === 'register' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs font-semibold text-teal-700">STEP {regStep} OF 3 · VERIFIED CANDIDATE DOSSIER</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Multi-Step Career Registration & Privacy Controls
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setRegStep(step as 1 | 2 | 3)}
                  className={`px-3 py-1.5 text-xs font-mono-tabular font-semibold rounded-md cursor-pointer ${
                    regStep === step ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  0{step}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveRegistration} className="mt-6 space-y-6">
            {regStep === 1 && (
              <div className="space-y-5">
                <h3 className="text-base font-bold text-slate-900">
                  01. Personal & Academic Details (Split-Collection PII Protected)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.displayName}
                      onChange={(e) => setRegForm({ ...regForm, displayName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={regForm.dateOfBirth}
                      onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender (Optional)</label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Prefer not to say">Prefer not to say</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number with Country Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.mobileNumber}
                      onChange={(e) => setRegForm({ ...regForm, mobileNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="+91 98450 11223"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Email Address *</label>
                    <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Highest Educational Qualification *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.highestQualification}
                      onChange={(e) => setRegForm({ ...regForm, highestQualification: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="B.Tech / M.Tech / B.Sc"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      College or University Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.collegeName}
                      onChange={(e) => setRegForm({ ...regForm, collegeName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year *</label>
                      <input
                        type="text"
                        required
                        value={regForm.graduationYear}
                        onChange={(e) => setRegForm({ ...regForm, graduationYear: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study *</label>
                      <input
                        type="text"
                        required
                        value={regForm.fieldOfStudy}
                        onChange={(e) => setRegForm({ ...regForm, fieldOfStudy: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City & State *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        placeholder="City"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        value={regForm.state}
                        onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                        placeholder="State"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country & Postal Code *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={regForm.country}
                        onChange={(e) => setRegForm({ ...regForm, country: e.target.value })}
                        placeholder="Country"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        value={regForm.postalCode}
                        onChange={(e) => setRegForm({ ...regForm, postalCode: e.target.value })}
                        placeholder="Postal Code"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Continue to Step 02: Educational & Employment Status
                  </button>
                </div>
              </div>
            )}

            {regStep === 2 && (
              <div className="space-y-5">
                <h3 className="text-base font-bold text-slate-900">
                  02. Educational & Employment Status (Adaptive Workflow)
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Select Your Current Career Status *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        value: 'undergraduate',
                        label: '1. Currently pursuing undergraduate studies',
                        desc: 'Internships, entry-level opportunities, projects & courses',
                      },
                      {
                        value: 'graduated_unemployed',
                        label: '2. Graduated and unemployed',
                        desc: 'Full-time job openings & skill-gap courses (No company ID required)',
                      },
                      {
                        value: 'graduated_employed',
                        label: '3. Graduated and employed',
                        desc: 'Private career progression, salary tracking & upskilling',
                      },
                      {
                        value: 'postgraduate',
                        label: '4. Pursuing postgraduate studies',
                        desc: 'Research roles, specialist fellowships & advanced courses',
                      },
                      {
                        value: 'other',
                        label: '5. Other educational or career status',
                        desc: 'Career transitioners & independent learners',
                      },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setRegForm({ ...regForm, careerStatus: option.value as CareerStatus })}
                        className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                          regForm.careerStatus === option.value
                            ? 'border-teal-600 bg-teal-50/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900">{option.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields for Employed Graduates */}
                {regForm.careerStatus === 'graduated_employed' ? (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <p className="text-xs font-semibold text-slate-800">
                      Employed Professional Details (Stored Privately — Never Publicly Exposed)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Current Company Name</label>
                        <input
                          type="text"
                          value={regForm.currentCompany}
                          onChange={(e) => setRegForm({ ...regForm, currentCompany: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          placeholder="Aris Enterprise Systems"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Current Designation</label>
                        <input
                          type="text"
                          value={regForm.designation}
                          onChange={(e) => setRegForm({ ...regForm, designation: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Industry & Location</label>
                        <input
                          type="text"
                          value={regForm.workLocation}
                          onChange={(e) => setRegForm({ ...regForm, workLocation: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          placeholder="Bengaluru, India"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                        <input
                          type="date"
                          value={regForm.joiningDate}
                          onChange={(e) => setRegForm({ ...regForm, joiningDate: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Current Annual Salary (INR)
                        </label>
                        <input
                          type="number"
                          value={regForm.currentSalary}
                          onChange={(e) => setRegForm({ ...regForm, currentSalary: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Optional Employee ID (Private Verification Only — Never Public)
                        </label>
                        <input
                          type="text"
                          value={regForm.employeeIdVerification}
                          onChange={(e) => setRegForm({ ...regForm, employeeIdVerification: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          placeholder="Optional for employer verification"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    <p className="text-xs font-semibold text-teal-800">
                      {regForm.careerStatus === 'undergraduate'
                        ? 'Undergraduate Pathway: Internships, Entry-Level Roles & Foundational Courses Enabled'
                        : 'Graduate Job-Seeker Pathway: No Employer Details or Employee ID Required'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preferred Job Roles (Comma Separated)
                        </label>
                        <input
                          type="text"
                          value={regForm.targetRolesInput}
                          onChange={(e) => setRegForm({ ...regForm, targetRolesInput: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Expected Annual Salary (INR)
                        </label>
                        <input
                          type="number"
                          value={regForm.expectedSalary}
                          onChange={(e) => setRegForm({ ...regForm, expectedSalary: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Back to Step 01
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegStep(3)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Continue to Step 03: Skills & Consents
                  </button>
                </div>
              </div>
            )}

            {regStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-base font-bold text-slate-900">03. Skills, Privacy & Retention Consent</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Skills (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={regForm.skillsInput}
                    onChange={(e) => setRegForm({ ...regForm, skillsInput: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.privacyConsent}
                      onChange={(e) => setRegForm({ ...regForm, privacyConsent: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Data Privacy & Split-Collection Consent:</strong> I consent to RESOLUTION storing my
                      contact and salary records in a private subcollection accessible only to me and authorized
                      platform compliance auditors.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regForm.emailNotificationsConsent}
                      onChange={(e) => setRegForm({ ...regForm, emailNotificationsConsent: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>90/180/365-Day Retention Follow-Up Consent:</strong> I agree to receive scheduled
                      post-placement employment check-in notifications if hired through RESOLUTION.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Back to Step 02
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Save Complete Profile to Firestore
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: AI-POWERED PDF RESUME ANALYZER */}
      {activeTab === 'resume' && (
        <div className="mt-8 space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-teal-700">SERVER-SIDE GEMINI AI ENGINE</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">PDF Resume Upload & Structured Analysis</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Upload any PDF resume or analyze the pre-loaded graduate resume below. Our server-side Gemini 3.8
                    Flash integration extracts verified skills, projects, and skill gaps without inventing credentials.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                  <label className="block text-xs font-semibold text-slate-800">
                    Option A: Upload PDF Resume (.pdf)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer"
                  />
                  {resumeFileName && (
                    <p className="text-xs text-teal-700 font-medium">Selected File: {resumeFileName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Option B: Paste or Edit Resume Text (Used if no PDF file is attached)
                  </label>
                  <textarea
                    rows={8}
                    value={resumeTextInput}
                    onChange={(e) => {
                      setResumeTextInput(e.target.value);
                      setPdfBase64('');
                    }}
                    className="w-full p-3 text-xs font-mono-tabular border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <button
                  onClick={handleRunResumeAnalysis}
                  disabled={analyzingResume}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {analyzingResume
                    ? 'Analyzing Resume via Server-Side Gemini AI...'
                    : 'Run AI Resume Analysis & Sync Skills'}
                </button>
              </div>

              {/* AI Output Dossier */}
              <div className="lg:col-span-7 space-y-6">
                {!aiResult ? (
                  <div className="h-full min-h-[360px] rounded-xl border border-slate-200 bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
                    <FileText className="w-10 h-10 text-slate-400 mb-3" />
                    <h3 className="text-base font-bold text-slate-900">Ready to Analyze Your Resume</h3>
                    <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                      Upload a PDF document or click <strong>"Run AI Resume Analysis & Sync Skills"</strong> to extract
                      technical skills, programming languages, software tools, readiness score, and missing skill gaps.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary & Readiness Score */}
                    <div className="p-5 rounded-xl bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono-tabular text-teal-400">AI RESUME SUMMARY</span>
                        <span className="text-sm font-mono-tabular font-bold text-white">
                          Readiness Score: {aiResult.readinessScore}/100 · {aiResult.yearsOfExperience} Yrs Exp
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{aiResult.summary}</p>
                      <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <strong>Assessment Limitations:</strong> {aiResult.readinessLimitations}
                      </p>
                    </div>

                    {/* Skill Proficiency Overview (Explicit vs Inferred) */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Extracted Technical Skills (Explicitly Stated vs. Inferred Proficiency)
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                              <th className="py-2.5 px-3 font-semibold">Skill</th>
                              <th className="py-2.5 px-3 font-semibold">Identification Basis</th>
                              <th className="py-2.5 px-3 font-semibold">Resume Evidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {aiResult.technicalSkills.map((sk, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-semibold text-slate-900">{sk.name}</td>
                                <td className="py-2 px-3 text-teal-700 font-medium">{sk.proficiency}</td>
                                <td className="py-2 px-3 text-slate-600">{sk.evidence}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Categorized Extractions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900">Programming Languages & Tools</p>
                        <p className="text-slate-600">
                          {[...aiResult.programmingLanguages, ...aiResult.softwareAndTools].join(' · ') || 'None listed'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900">Suitable Job Roles</p>
                        <p className="text-teal-800 font-medium">{aiResult.suitableJobRoles.join(' · ')}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900">Missing Skills for Target Roles (Skill Gap)</p>
                        <p className="text-amber-800 font-medium">
                          {aiResult.missingSkillsForTargetRoles.join(' · ') || 'No major gaps identified'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900">Education & Certifications</p>
                        <p className="text-slate-600">
                          {[...aiResult.education, ...aiResult.certifications].join(' · ')}
                        </p>
                      </div>
                    </div>

                    {/* Course & Resume Improvement Recommendations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <p className="font-bold text-slate-900">AI Personalized Course Recommendations</p>
                        {aiResult.courseRecommendations.map((rec, i) => (
                          <div key={i} className="pt-1 border-t border-slate-200/60 first:border-0 first:pt-0">
                            <p className="font-semibold text-teal-800">
                              {rec.courseName} ({rec.provider})
                            </p>
                            <p className="text-slate-600">
                              Closes gap in <strong>{rec.targetSkillGap}</strong>: {rec.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <p className="font-bold text-slate-900">Actionable Resume Improvement Suggestions</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {aiResult.resumeImprovements.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JOB SEARCH & APPLICATION SYSTEM */}
      {activeTab === 'jobs' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs by skill (e.g. TypeScript, Python), role, company, or location..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Work Modes</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
              <select
                value={employmentTypeFilter}
                onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Employment Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const appliedRecord = myApplications.find((a) => a.jobId === job.id);
              const isSaved = savedJobIds.includes(job.id);
              const userSkills = userProfile?.skills || [];
              const matchedSkills = job.requiredSkills.filter((r) =>
                userSkills.some((u) => u.toLowerCase() === r.toLowerCase())
              );
              const missingSkills = job.requiredSkills.filter(
                (r) => !userSkills.some((u) => u.toLowerCase() === r.toLowerCase())
              );

              return (
                <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        <span>{job.companyName}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{job.department || job.industry}</span>
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
                      <p className="text-base font-bold text-slate-900 font-mono-tabular">
                        {job.currency} {job.salaryMin.toLocaleString()} – {job.salaryMax.toLocaleString()} / yr
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Experience: {job.requiredExperience || '0-2 Yrs'} · Vacancies: {job.vacancies || 1}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Required Skills ({matchedSkills.length}/{job.requiredSkills.length} Matched):
                      </p>
                      <p className="text-slate-600 mt-0.5">{job.requiredSkills.join(' · ')}</p>
                      {missingSkills.length > 0 && (
                        <p className="text-amber-800 mt-1">Skill Gap for this Role: {missingSkills.join(' · ')}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Qualifications & Interview Process:</p>
                      <p className="text-slate-600 mt-0.5">{job.educationalQualifications || 'B.Tech / Graduate'}</p>
                      {job.interviewProcess && <p className="text-slate-500 mt-1">{job.interviewProcess}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-slate-500">
                      Application Deadline: {job.deadline || 'Rolling'} · Benefits:{' '}
                      {job.benefits || 'Standard Corporate Benefits'}
                    </p>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() =>
                          setSavedJobIds((prev) =>
                            prev.includes(job.id) ? prev.filter((id) => id !== job.id) : [...prev, job.id]
                          )
                        }
                        className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                      >
                        {isSaved ? 'Saved' : 'Save Job'}
                      </button>
                      {appliedRecord ? (
                        <span className="px-4 py-2 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold rounded-lg">
                          Status: {appliedRecord.status}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyForJob(job)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SKILL DEVELOPMENT COURSES & AI RECOMMENDATIONS */}
      {activeTab === 'courses' && (
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-xs font-semibold text-teal-700">AI COURSE RECOMMENDATION ENGINE</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Courses Mapped to Your Target Roles & Missing Skill Gaps
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Comparing your current skills ({(userProfile?.skills || []).join(', ')}) against active job requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => {
              const enrolled = myEnrollments.find((e) => e.courseId === course.id);
              const userSkills = userProfile?.skills || [];
              const newSkillsOffered = course.skillsTaught.filter(
                (sk) => !userSkills.some((u) => u.toLowerCase() === sk.toLowerCase())
              );

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
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
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span>{course.duration}</span>
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">{course.courseName}</h3>
                    <p className="text-xs text-slate-600">
                      Coaching Center: <strong>{course.centerName}</strong> · Instructor:{' '}
                      {course.trainerInfo || 'Senior Faculty'}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <p className="font-semibold text-teal-800">
                        Why Recommended:{' '}
                        {newSkillsOffered.length > 0
                          ? `Teaches ${newSkillsOffered.join(', ')} required by active employer job listings.`
                          : 'Advances your proficiency to production-level certification.'}
                      </p>
                      <p className="text-slate-600">
                        <strong>Syllabus:</strong> {course.syllabus || 'Structured modular hands-on training'}
                      </p>
                      <p className="text-slate-500">
                        <strong>Certification:</strong> {course.certificationDetails || 'Verified Completion Credential'}{' '}
                        · Placement Assistance: {course.placementAssistance ? 'Included' : 'No'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-base font-bold text-slate-900 font-mono-tabular">
                        {course.currency} {course.fees.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">{course.schedule || 'Flexible Cohort'}</p>
                    </div>
                    {enrolled ? (
                      <span className="px-4 py-2 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold rounded-lg">
                        {enrolled.status} ({enrolled.progressPercent}%)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnrollCourse(course)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Enroll in Course
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: CAREER PROGRESSION, SALARY TIMELINE & 90/180/365-DAY RETENTION CHECK-INS */}
      {activeTab === 'progression' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Salary Progression Chart & Form */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Private Career & Salary Progression Timeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tracks employer-verified placement packages and self-reported appraisals over time
                </p>
              </div>

              <div className="h-64 w-full">
                {mySalaryHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mySalaryHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="effectiveDate" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(val: any) => [`INR ${Number(val).toLocaleString()}`, 'Annual Package']}
                      />
                      <Line
                        type="monotone"
                        dataKey="annualSalary"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0f172a' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No salary milestones recorded yet.
                  </div>
                )}
              </div>

              <form
                onSubmit={handleAddSalaryMilestone}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
              >
                <p className="text-xs font-bold text-slate-800">Record New Promotion, Appraisal, or Role Transition</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={newSalaryForm.recordType}
                    onChange={(e) =>
                      setNewSalaryForm({
                        ...newSalaryForm,
                        recordType: e.target.value as SalaryHistoryRecord['recordType'],
                      })
                    }
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Promotion">Promotion / Appraisal</option>
                    <option value="RoleChange">Role / Employer Change</option>
                    <option value="Initial">Initial Salary</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={newSalaryForm.companyName}
                    onChange={(e) => setNewSalaryForm({ ...newSalaryForm, companyName: e.target.value })}
                    placeholder="Company Name"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={newSalaryForm.designation}
                    onChange={(e) => setNewSalaryForm({ ...newSalaryForm, designation: e.target.value })}
                    placeholder="New Designation"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="number"
                    required
                    value={newSalaryForm.annualSalary}
                    onChange={(e) => setNewSalaryForm({ ...newSalaryForm, annualSalary: Number(e.target.value) })}
                    placeholder="Annual Salary (INR)"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Log Salary Update (Self-Reported)
                  </button>
                </div>
              </form>
            </div>

            {/* 90, 180, and 365-Day Retention Check-In Responder */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">90, 180 & 365-Day Retention Check-Ins</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify your post-placement employment status or request immediate career transition support
                </p>
              </div>

              <div className="space-y-3">
                {myCheckIns.map((chk) => (
                  <div key={chk.id} className="p-4 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-tabular font-bold text-teal-700">
                        {chk.checkpointDays}-DAY CHECKPOINT · DUE {chk.dueDate}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{chk.status}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Original Placement: <strong>{chk.designation}</strong> at <strong>{chk.companyName}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Outcome: {chk.employmentStatus} · Verification: {chk.verificationStatus}
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedCheckIn(chk);
                          setCheckInResponseForm({
                            outcome: chk.remainsWithOriginalCompany ? 'same_company' : 'different_company',
                            currentEmployer: chk.currentEmployer || chk.companyName,
                            reportedSalary: chk.reportedSalary || 1420000,
                            assistanceRequested: chk.assistanceRequested,
                          });
                        }}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Update {chk.checkpointDays}-Day Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Responding to a 90/180/365-Day Retention Check-In */}
      {selectedCheckIn && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                RESOLUTION — {selectedCheckIn.checkpointDays}-Day Career Check-In
              </h3>
              <button
                onClick={() => setSelectedCheckIn(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRetentionCheckIn} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Placement Reference: <strong>{selectedCheckIn.designation}</strong> at{' '}
                <strong>{selectedCheckIn.companyName}</strong> (Joined {selectedCheckIn.joiningDate}).
              </p>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-800">Select Your Current Employment Status *</label>
                {[
                  {
                    id: 'same_company',
                    label: `Still employed with ${selectedCheckIn.companyName} (Original Employer)`,
                  },
                  {
                    id: 'different_company',
                    label: 'Employed at a different company (Career transition)',
                  },
                  {
                    id: 'unemployed',
                    label: 'Currently unemployed (Request priority placement & course support)',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="outcome"
                      checked={checkInResponseForm.outcome === opt.id}
                      onChange={() =>
                        setCheckInResponseForm({
                          ...checkInResponseForm,
                          outcome: opt.id as 'same_company' | 'different_company' | 'unemployed',
                        })
                      }
                    />
                    <span className="font-medium text-slate-800">{opt.label}</span>
                  </label>
                ))}
              </div>

              {checkInResponseForm.outcome === 'different_company' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Employer Name *</label>
                  <input
                    type="text"
                    required
                    value={checkInResponseForm.currentEmployer}
                    onChange={(e) =>
                      setCheckInResponseForm({ ...checkInResponseForm, currentEmployer: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Enter your current organization"
                  />
                </div>
              )}

              {checkInResponseForm.outcome !== 'unemployed' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Optional Current Annual Compensation (INR)
                  </label>
                  <input
                    type="number"
                    value={checkInResponseForm.reportedSalary}
                    onChange={(e) =>
                      setCheckInResponseForm({ ...checkInResponseForm, reportedSalary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkInResponseForm.assistanceRequested}
                  onChange={(e) =>
                    setCheckInResponseForm({ ...checkInResponseForm, assistanceRequested: e.target.checked })
                  }
                />
                <span className="text-slate-700">
                  Request career advisory or upskilling assistance from RESOLUTION
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCheckIn(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Submit Confirmed Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
