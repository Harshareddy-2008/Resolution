export type PortalRole = 'user' | 'company' | 'coaching' | 'admin';

export type CareerStatus =
  | 'undergraduate'
  | 'graduated_unemployed'
  | 'graduated_employed'
  | 'postgraduate'
  | 'other';

export interface UserPublicProfile {
  id?: string;
  uid: string;
  displayName: string;
  role: PortalRole;
  careerStatus: CareerStatus;
  highestQualification?: string;
  collegeName?: string;
  graduationYear?: string;
  fieldOfStudy?: string;
  city?: string;
  state?: string;
  country?: string;
  skills?: string[];
  targetRoles?: string[];
  resumeSummary?: string;
  readinessScore?: number;
  yearsOfExperience?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserPrivateRecord {
  userId: string;
  email: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  postalCode?: string;
  currentCompany?: string;
  designation?: string;
  industry?: string;
  workLocation?: string;
  joiningDate?: string;
  currentSalary?: number;
  expectedSalary?: number;
  employeeIdVerification?: string;
  privacyConsent: boolean;
  emailNotificationsConsent: boolean;
  resumeFileName?: string;
  resumeAnalysisJson?: string;
  updatedAt?: any;
}

export interface AIResumeAnalysis {
  summary: string;
  technicalSkills: {
    name: string;
    proficiency: string;
    evidence: string;
  }[];
  programmingLanguages: string[];
  softwareAndTools: string[];
  softSkills: string[];
  education: string[];
  certifications: string[];
  projects: string[];
  internships: string[];
  workExperience: string[];
  yearsOfExperience: number;
  suitableJobRoles: string[];
  missingSkillsForTargetRoles: string[];
  readinessScore: number;
  readinessLimitations: string;
  courseRecommendations: {
    courseName: string;
    provider: string;
    reason: string;
    targetSkillGap: string;
  }[];
  resumeImprovements: string[];
}

export interface Company {
  id: string;
  ownerId: string;
  companyName: string;
  officialEmail: string;
  contactPerson: string;
  contactNumber?: string;
  website?: string;
  description?: string;
  industry: string;
  companySize?: string;
  yearEstablished?: string;
  headquarters?: string;
  country: string;
  state?: string;
  city: string;
  officeAddress?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
}

export interface JobListing {
  id: string;
  companyId: string;
  ownerId: string;
  companyName: string;
  title: string;
  department?: string;
  industry: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  educationalQualifications?: string;
  requiredExperience?: string;
  vacancies?: number;
  employmentType: 'Full-time' | 'Internship' | 'Contract' | 'Part-time';
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  location: string;
  country?: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  benefits?: string;
  deadline?: string;
  interviewProcess?: string;
  requiredCertifications?: string;
  status: 'active' | 'paused' | 'closed';
  createdAt?: any;
  updatedAt?: any;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Offered'
  | 'Hired'
  | 'Rejected';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyOwnerId: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidateQualification?: string;
  candidateSkills: string[];
  matchScore: number;
  matchExplanation?: string;
  status: ApplicationStatus;
  interviewDate?: string;
  offeredSalary?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface PlacementRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  jobId: string;
  jobTitle?: string;
  companyId: string;
  companyOwnerId: string;
  companyName: string;
  designation: string;
  joiningDate: string;
  workLocation: string;
  offeredSalary: number;
  currency: string;
  employmentType: string;
  status: 'confirmed' | 'completed';
  createdAt?: any;
  updatedAt?: any;
}

export type RetentionCheckInStatus =
  | 'Scheduled'
  | 'Reminder Sent'
  | 'Awaiting Response'
  | 'Confirmed Employed'
  | 'Confirmed Unemployed'
  | 'Employment Changed'
  | 'Verification Required'
  | 'Closed';

export interface RetentionCheckIn {
  id: string;
  placementId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  companyId: string;
  companyOwnerId: string;
  companyName: string;
  designation: string;
  joiningDate: string;
  checkpointDays: 90 | 180 | 365;
  dueDate: string;
  emailStatus: 'Pending' | 'Sent' | 'Failed';
  responseDate?: string;
  employmentStatus: 'Unknown' | 'Employed' | 'Unemployed';
  remainsWithOriginalCompany: boolean;
  currentEmployer?: string;
  reportedSalary?: number;
  verificationStatus: 'Unverified' | 'Candidate Confirmed' | 'Employer Verified';
  status: RetentionCheckInStatus;
  assistanceRequested: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CoachingCenter {
  id: string;
  ownerId: string;
  centerName: string;
  officialEmail: string;
  contactNumber: string;
  website?: string;
  description?: string;
  country: string;
  state?: string;
  city: string;
  address?: string;
  trainingMode: 'Online' | 'Offline' | 'Hybrid';
  domains: string[];
  trainerDetails?: string;
  accreditation?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
}

export interface Course {
  id: string;
  centerId: string;
  ownerId: string;
  centerName: string;
  courseName: string;
  category: string;
  description: string;
  skillsTaught: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  fees: number;
  currency: string;
  deliveryMode: 'Online' | 'Offline' | 'Hybrid';
  startDate?: string;
  endDate?: string;
  schedule?: string;
  prerequisites?: string;
  trainerInfo?: string;
  certificationDetails?: string;
  syllabus?: string;
  capacity?: number;
  placementAssistance: boolean;
  status: 'published' | 'archived';
  createdAt?: any;
  updatedAt?: any;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  courseName: string;
  centerId: string;
  centerOwnerId: string;
  centerName: string;
  studentId: string;
  studentName: string;
  skillsTaught: string[];
  progressPercent: number;
  status: 'Enrolled' | 'In Progress' | 'Completed';
  certificateIssued: boolean;
  certificateId?: string;
  feedbackRating?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface SalaryHistoryRecord {
  id: string;
  userId: string;
  userName: string;
  recordType: 'Initial' | 'Placement' | 'Promotion' | 'RetentionCheckIn' | 'RoleChange';
  companyName: string;
  designation: string;
  industry?: string;
  annualSalary: number;
  currency: string;
  verificationType: 'Self-Reported' | 'Employer-Verified' | 'Unverified';
  skillsAtTime?: string[];
  effectiveDate: string;
  createdAt?: any;
}

export interface EmailNotificationLog {
  id: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  templateType:
    | 'Retention_90_Day'
    | 'Retention_180_Day'
    | 'Retention_365_Day'
    | 'Placement_Confirmation'
    | 'Unemployment_Support';
  subject: string;
  bodyPreview: string;
  checkpointDays?: number;
  placementId?: string;
  checkInId?: string;
  deliveryStatus: 'Delivered' | 'Pending' | 'Failed';
  sentAt: string;
  createdAt?: any;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: any;
}
