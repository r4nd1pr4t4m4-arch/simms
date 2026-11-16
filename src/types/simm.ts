export type PortalKey =
  | "publik"
  | "ppdb"
  | "admin"
  | "tu"
  | "gtk"
  | "siswa"
  | "ortu";

export interface ActiveSession {
  userId: string;
  identifier: string;
  name: string;
  baseRole: "ADMIN" | "TU" | "GTK" | "SISWA" | "ORTU" | "PPDB";
  subject?: string;
  nip?: string;
  nis?: string;
  nisn?: string;
  rombel?: string;
  waliKelas?: string;
  additionalRoles?: string[];
  roleDetails?: Array<{
    type: string;
    detail: string;
    skNumber?: string | null;
  }>;
  targetPath: string;
  mustChangePassword?: boolean;
}

export interface MadrasahProfile {
  name: string;
  nsm: string;
  npsn: string;
  accreditation: string;
  academicYear: string;
  semester: string;
  curriculum: string;
  headmasterName: string;
  headmasterNip: string;
  tuHeadName: string;
  tuHeadNip: string;
  address: string;
  phone: string;
  email: string;
  gpsLat: string;
  gpsLng: string;
  gpsRadiusMeters: number;
  komiteBankInfo: string;
}

export interface AcademicMaster {
  gradeLevels: Array<{
    code: string;
    label: string;
    phase: string;
    isFinalGrade: boolean;
  }>;
  rombels: Array<{
    code: string;
    name: string;
    gradeCode: string;
    waliKelas: string;
    room: string;
    quota: number;
  }>;
  subjects: Array<{
    code: string;
    name: string;
    group: string;
    jpPerWeek: number;
  }>;
}

export interface SimmDbSummary {
  ok: boolean;
  scope?: string;
  profile: MadrasahProfile;
  stats?: {
    studentCount: number;
    teacherCount: number;
    rombels: string[];
    subjects?: string[];
    gradeLevels?: string[];
  };
  academicMaster?: AcademicMaster;
  academicArchives?: Array<any>;
  teachers?: Array<any>;
  students?: Array<any>;
  ppdb?: Array<any>;
  cmsPosts?: Array<any>;
  serviceRequests?: Array<any>;
  mailAgenda?: Array<any>;
  activityLogs?: Array<any>;
  schedules?: Array<any>;
  counselingNotes?: Array<any>;
  dutySchedules?: Array<any>;
  piketIncidents?: Array<any>;
  teacherAttendances?: Array<any>;
  studentLeaves?: Array<any>;
}

export async function callSimmAction<T = any>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: boolean; error?: string; [key: string]: any } & T> {
  const res = await fetch("/api/simm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

export async function uploadToR2(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("customName", file.name);
  const res = await fetch("/api/r2/upload", {
    method: "POST",
    body: formData,
  });
  return res.json();
}
