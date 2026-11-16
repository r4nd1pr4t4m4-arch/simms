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
  roleDetails?: Array<{ type: string; detail: string; skNumber?: string | null }>;
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

export interface PortalDbSummary {
  ok: boolean;
  scope: string;
  profile: MadrasahProfile;
  stats: {
    studentCount: number;
    teacherCount: number;
    rombels: string[];
    subjects?: string[];
    gradeLevels?: string[];
  };
  academicMaster: AcademicMaster;
  academicArchives: Array<any>;
  teachers: Array<any>;
  students: Array<any>;
  ppdb: Array<any>;
  cmsPosts: Array<any>;
  serviceRequests: Array<any>;
  mailAgenda: Array<any>;
  activityLogs: Array<any>;
  schedules: Array<any>;
  counselingNotes: Array<any>;
  dutySchedules?: Array<any>;
  piketIncidents?: Array<any>;
  teacherAttendances?: Array<any>;
  studentLeaves?: Array<any>;
}

export function getInitials(name: string): string {
  if (!name) return "SM";
  const parts = String(name)
    .replace(/^(Ust\.|Usth\.|Dr\.|Drs\.|H\.|Hj\.|Bapak|Ibu)\s+/gi, "")
    .split(",")[0]
    .trim()
    .split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function calcHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function callSimmAction(
  action: string,
  payload: Record<string, unknown> = {}
) {
  const res = await fetch("/api/simm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json().catch(() => ({ ok: false, error: "Respon server tidak valid" }));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Gagal memproses aksi");
  }
  return data;
}
