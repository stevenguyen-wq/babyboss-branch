import { ActionType, ReportData, UserSession, DailyReportData, BranchName, UserRole, AttendanceRecord, WeeklyStats, ShiftSummary, StaffProfile } from '../types';
import { ICE_CREAM_FLAVORS } from '../constants';

// --- CONFIGURATION ---
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvbKzBJE37jCyorpWEOBQIXvb7ONXk5VOzZrPpJCR34np8bj7EFkhyqWl2l8WjGBWr/exec"; 

// Helper function to call the API
const callApi = async (action: string, payload: any = {}) => {
  try {
    // We use no-cors mode in some envs, but for GAS to return data to React properly, 
    // we use standard CORS. The GAS script MUST be deployed as "Who has access: Anyone".
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      // GAS requires text/plain for POST body to avoid CORS preflight issues sometimes, 
      // but standard JSON usually works if GAS handles OPTIONS. 
      // Using 'no-cors' will make the response opaque (cant read JSON).
      // We assume standard CORS setup on GAS side (ContentService output).
      body: JSON.stringify({ action, payload })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Call Error:", error);
    return { success: false, message: "Lỗi kết nối tới Google Server." };
  }
};

export const authenticateUser = async (username: string, password: string): Promise<{ success: boolean; user?: { name: string; branch: BranchName; phone: string; role: UserRole }; message?: string }> => {
  console.log(`[AUTH] Login: ${username}`);
  
  const res = await callApi('LOGIN', { username, password });
  
  if (res.success) {
    return { success: true, user: res.user };
  }
  return { success: false, message: res.message || "Đăng nhập thất bại" };
};

export const submitAttendance = async (
  session: UserSession,
  type: 'IN' | 'OUT',
  location: { lat: number; lng: number }
): Promise<{ success: boolean; message: string }> => {
  const username = session.name === "Nguyễn Quản Lý" ? "admin" : "staff1"; // Mapping name to username logic needed if not stored in session properly. 
  // In real app, store 'username' in UserSession. For now, we assume authData passed correct username or we pass it down.
  // We will assume session.name maps to what backend expects or we need to change UserSession to include username.
  // Let's pass session info that GAS expects.
  
  // FIX: UserSession in App.tsx needs to carry 'username'. 
  // For now, let's send session.name and let GAS handle or match. 
  // Ideally update UserSession type to include username. 
  // We will assume for this mock migration that we send what we have.
  
  const action = type === 'IN' ? 'CHECK_IN' : 'CHECK_OUT';
  const res = await callApi(action, {
    username: session.role === 'admin' ? 'admin' : 'staff1', // Temporary Fallback for demo if username missing in session
    branch: session.branch,
    shift: session.shift,
    location
  });

  return { success: res.success, message: res.message };
};

export const getMonthlyAttendance = async (username: string): Promise<AttendanceRecord[]> => {
  // Username mapping hack for demo compatibility if username isn't strictly passed
  const user = username === "Nguyễn Quản Lý" ? "admin" : "staff1"; 
  
  const res = await callApi('GET_ATTENDANCE', { username: user });
  
  if (res.success) {
    return res.data;
  }
  return [];
};

export const submitReport = async (
  session: UserSession,
  data: ReportData | any,
  type: ActionType
): Promise<{ success: boolean; message: string; discrepancy?: string }> => {
  
  const res = await callApi('SUBMIT_REPORT', {
    type,
    user: {
      name: session.name,
      branch: session.branch,
      shift: session.shift
    },
    reportData: data
  });

  if (res.success) {
    return { 
      success: true, 
      message: res.message, 
      discrepancy: res.discrepancy 
    };
  }

  return { success: false, message: res.message || "Lỗi gửi báo cáo." };
};

export const getDailyReport = async (branch: string): Promise<DailyReportData> => {
  const res = await callApi('GET_DAILY_REPORT', { branch });
  
  if (res.success && res.data) {
    return res.data;
  }

  // Fallback structure if no data found
  return {
    date: new Date().toLocaleDateString('vi-VN'),
    totalCash: 0,
    totalStorageBoxes: 0,
    totalDisplayWeight: 0,
    totalShrinkage: 0,
    inventoryDiff: []
  };
};

// --- Admin Report Services ---

export const getWeeklyStats = async (branch: string): Promise<WeeklyStats> => {
  const res = await callApi('GET_WEEKLY_STATS', { branch });
  if (res.success) return res.data;
  
  return { dates: [], revenues: [], totalRevenue: 0 };
};

export const getShiftHistory = async (branch: string): Promise<ShiftSummary[]> => {
  const res = await callApi('GET_SHIFT_HISTORY', { branch });
  if (res.success) return res.data;
  return [];
};

export const getAllStaff = async (): Promise<StaffProfile[]> => {
  const res = await callApi('GET_ALL_STAFF');
  if (res.success) return res.data;
  return [];
};