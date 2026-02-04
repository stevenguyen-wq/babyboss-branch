export type BranchName = 
  | 'Vincom Bà Triệu'
  | 'Aeon Hà Đông'
  | 'Vincom Thảo Điền'
  | 'Vincom Phan Văn Trị'
  | 'Vincom Landmark 81'
  | 'Gigamall Thủ Đức'
  | 'Baby Boss Dĩ An';

export type UserRole = 'admin' | 'staff';

export interface BranchConfig {
  name: BranchName;
  shifts: number;
  hasStorageFridge: boolean; // Phan Van Tri and Di An only have display fridge (so no separate storage temp needed?)
}

export interface UserSession {
  branch: BranchName;
  shift: number;
  name: string;
  role: UserRole;
  checkInTime?: string;
  phone?: string;
}

export interface IceCreamItem {
  id: string;
  name: string;
}

export interface ReportData {
  reportId: string; // Unique ID for the report
  cashStart: number;
  tempStorage: number;
  tempDisplay: number;
  inventory: Record<string, number>; // flavor name -> weight (kg)
  storageCount: Record<string, number>; // flavor name -> count (boxes)
  images: Record<string, string>; // flavor name -> base64/url
  
  // Di An Specific
  diAnExtras?: DiAnSpecificData;
}

export interface DiAnSpecificData {
  pearlsBlack: number; // g
  milkTeaRoasted: number; // ml
  milkTeaFruit: number; // ml
  milkTeaTraditional: number; // ml
  teaJasmine: number; // ml
  teaOlong: number; // ml
  teaPeach: number; // ml
  coffee: number; // ml
  jellyCoffee: boolean;
  jellyStrawberry: boolean;
  pudding: boolean;
  creamMachi: boolean;
  creamEgg: boolean;
  ginger: boolean;
  kumquat: boolean;
  coconut: boolean;
  orangeGreen: number; // count
  orangeYellow: number; // count
  yogurt: number; // jar
}

export interface DailyReportData {
  date: string;
  totalCash: number;
  totalStorageBoxes: number;
  totalDisplayWeight: number;
  totalShrinkage: number;
  inventoryDiff: {
    flavor: string;
    imported: number; // Nhập
    exported: number; // Xuất
    shrinkage: number; // Hao hụt
  }[];
}

export interface AttendanceRecord {
  date: string;
  checkIn: string; // ISO string
  checkOut: string | null; // ISO string
  totalHours: number; // calculated hours
}

// Admin Report Types
export interface WeeklyStats {
  dates: string[];
  revenues: number[];
  totalRevenue: number;
}

export interface ShiftSummary {
  id: string;
  branch: string;
  shift: number;
  staffName: string;
  timestamp: string;
  cash: number;
  status: 'OK' | 'DISCREPANCY';
  note?: string;
}

export interface StaffProfile {
  username: string;
  name: string;
  branch: BranchName;
}

export type ActionType = 
  | 'REPORT_START' 
  | 'REPORT_END' 
  | 'EXPORT_STORAGE' 
  | 'IMPORT_STOCK' 
  | 'VIEW_DAILY_REPORT' 
  | 'VIEW_WEEKLY_REPORT'
  | 'VIEW_SHIFT_REPORT'
  | 'VIEW_STAFF_ATTENDANCE'
  | 'CHECK_OUT' 
  | 'VIEW_WORK_HOURS';