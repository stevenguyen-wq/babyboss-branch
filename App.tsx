import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { BRANCHES, isLastShift, ICE_CREAM_FLAVORS, hasStorageFridgeInput } from './constants';
import { UserSession, BranchName, ActionType, DailyReportData, UserRole, AttendanceRecord, WeeklyStats, ShiftSummary, StaffProfile } from './types';
import Layout from './components/Layout';
import CameraCapture from './components/CameraCapture';
import ConfirmationModal from './components/ConfirmationModal';
import { submitReport, getDailyReport, authenticateUser, submitAttendance, getMonthlyAttendance, getWeeklyStats, getShiftHistory, getAllStaff } from './services/sheetService';
import { 
  Camera, 
  ChevronRight, 
  ClipboardList, 
  Archive, 
  Download, 
  Upload, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  DollarSign,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  ScanEye,
  Trash2,
  Plus,
  Scale,
  User,
  Lock,
  MapPin,
  Thermometer,
  Package,
  Layers,
  FileKey,
  Search,
  LogOut,
  Clock,
  History,
  ShieldCheck,
  Calendar,
  Banknote,
  Users,
  ChevronDown,
  Droplets,
  Utensils
} from 'lucide-react';

// --- Helper Components ---

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon: React.ElementType;
  wrapperClassName?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, icon: Icon, className, wrapperClassName, ...props }) => (
  <div className={wrapperClassName}>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <Icon size={18} />
      </div>
      <input 
        {...props}
        className={`w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-white disabled:bg-gray-50 disabled:text-gray-500 ${className || ''}`}
      />
    </div>
  </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon: React.ElementType;
  options: string[];
  placeholder?: string;
  wrapperClassName?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, icon: Icon, options, placeholder, className, wrapperClassName, ...props }) => (
  <div className={wrapperClassName}>
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <Icon size={18} />
      </div>
      <select 
        {...props}
        className={`w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-white appearance-none disabled:bg-gray-50 ${className || ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <ChevronDown size={16} />
      </div>
    </div>
  </div>
);

// --- View Components ---

// 1. Login View
interface LoginProps {
  onLogin: (session: UserSession) => void;
}
const LoginView: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1: Auth
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data retrieved after auth
  const [authData, setAuthData] = useState<{name: string, branch: BranchName, role: UserRole, phone: string} | null>(null);

  const handleLogin = async () => {
    if (!username || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await authenticateUser(username, password);
      
      if (result.success && result.user) {
        setAuthData({
          name: result.user.name,
          branch: result.user.branch,
          role: result.user.role,
          phone: result.user.phone
        });
        
        // If Admin, skip check-in step
        if (result.user.role === 'admin') {
           onLogin({
             branch: result.user.branch,
             shift: 0, // Admin doesn't have a shift
             name: result.user.name,
             role: 'admin',
             phone: result.user.phone,
             checkInTime: new Date().toISOString()
           });
        } else {
           setStep(2);
        }
      } else {
        setError(result.message || 'Đăng nhập thất bại');
      }
    } catch (e) {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (imageSrc: string) => {
    // Only capture photo to trigger event, DO NOT send image to DB as per request.
    // We need Geolocation.
    setLoading(true);
    
    if (!navigator.geolocation) {
       setError("Trình duyệt không hỗ trợ định vị.");
       setLoading(false);
       return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (authData) {
          const session: UserSession = {
            branch: authData.branch,
            shift: shift,
            name: authData.name,
            role: authData.role,
            phone: authData.phone,
            checkInTime: new Date().toISOString()
          };
          
          try {
             await submitAttendance(session, 'IN', {
               lat: position.coords.latitude,
               lng: position.coords.longitude
             });
             onLogin(session);
          } catch (e) {
             setError("Lỗi khi gửi dữ liệu chấm công.");
          }
        }
      },
      (err) => {
         setError("Cần cấp quyền vị trí để Check-in.");
         setLoading(false);
      }
    );
  };

  if (step === 1) {
    return (
      <div className="space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto text-brand-600">
            <ClipboardList size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Đăng Nhập Hệ Thống</h2>
          <p className="text-gray-500 text-sm">Baby Boss Operations</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 border border-gray-100">
          <InputField 
            label="Tên đăng nhập"
            icon={User}
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="Nhập username"
          />

          <InputField 
            label="Mật khẩu"
            icon={Lock}
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ca làm việc</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setShift(s)}
                  className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                    shift === s 
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Ca {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!username || !password || loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Đăng nhập'}
          </button>
          
          <div className="text-center pt-2">
             <p className="text-xs text-gray-400">TK: admin/123 hoặc staff1/123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStep(1)} className="p-2 -ml-2 text-gray-600">
           <ArrowLeft />
        </button>
        <h2 className="text-xl font-bold">Xác nhận Check-in</h2>
      </div>

      <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100 flex items-start gap-3">
         <div className="bg-brand-100 p-2 rounded-full text-brand-600">
            <User size={24} />
         </div>
         <div>
            <p className="text-sm text-gray-500">Xin chào,</p>
            <p className="font-bold text-gray-900 text-lg">{authData?.name}</p>
            <div className="flex items-center gap-1 text-sm text-brand-700 mt-1">
               <MapPin size={14} /> {authData?.branch} <span className="text-gray-400 mx-1">|</span> Ca {shift}
            </div>
         </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
           <AlertTriangle size={16} />
           {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-500">
           <Loader2 className="animate-spin mb-4 text-brand-600" size={32} />
           <p>Đang lấy vị trí và check-in...</p>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-4 text-center">Chụp ảnh selfie tại quầy để xác nhận vào ca</p>
          <CameraCapture 
            onCapture={handleCapture} 
            autoStart={true} 
            label="Chụp ảnh Check-in" 
            facingMode="user" 
          />
        </div>
      )}
    </div>
  );
};

// 2. CheckOut View
interface CheckOutProps {
    user: UserSession;
    onSuccess: () => void;
    onCancel: () => void;
}
const CheckOutView: React.FC<CheckOutProps> = ({ user, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCapture = (imageSrc: string) => {
        // UI Capture only. Trigger confirmation.
        setShowConfirm(true);
    };

    const handleConfirmCheckout = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            setError("Trình duyệt không hỗ trợ định vị.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await submitAttendance(user, 'OUT', {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    onSuccess();
                } catch (e) {
                    setError("Lỗi khi gửi dữ liệu Check-out.");
                    setLoading(false);
                }
            },
            (err) => {
                setError("Cần cấp quyền vị trí để Check-out.");
                setLoading(false);
            }
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin mb-4 text-brand-600" size={40} />
                <p className="text-gray-600 font-medium">Đang xử lý check-out...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            <ConfirmationModal 
               isOpen={showConfirm}
               onClose={() => setShowConfirm(false)}
               onConfirm={handleConfirmCheckout}
               title="Xác nhận Check-out"
               message="Bạn có chắc chắn muốn kết thúc ca làm việc và check-out không?"
               confirmLabel="Check Out Ngay"
               isDangerous={true}
            />

            <div className="flex items-center gap-2 mb-4">
                <button onClick={onCancel} className="p-2 -ml-2 text-gray-600">
                    <ArrowLeft />
                </button>
                <h2 className="text-xl font-bold">Xác nhận Check-out</h2>
            </div>

            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-600">
                    <LogOut size={24} />
                </div>
                <div>
                    <p className="font-bold text-gray-900 text-lg">Kết thúc ca làm việc</p>
                    <p className="text-sm text-gray-500">Hệ thống sẽ ghi nhận giờ và vị trí của bạn.</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-4 text-center">Chụp ảnh xác nhận để check-out</p>
                <CameraCapture 
                  onCapture={handleCapture} 
                  autoStart={true} 
                  label="Chụp ảnh Check-out"
                  facingMode="user"
                />
            </div>
        </div>
    );
};

// 3. Work Hours View (Staff)
interface WorkHoursProps {
    user: UserSession;
    onBack: () => void;
}
const WorkHoursView: React.FC<WorkHoursProps> = ({ user, onBack }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const data = await getMonthlyAttendance(user.name);
            setRecords(data);
            setLoading(false);
        };
        fetch();
    }, [user.name]);

    const totalMonthHours = useMemo(() => {
        return records.reduce((sum, rec) => sum + rec.totalHours, 0);
    }, [records]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin mb-4 text-brand-600" size={32} />
                <p className="text-gray-500">Đang tải bảng chấm công...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600">
                    <ArrowLeft />
                </button>
                <h2 className="text-xl font-bold">Lịch Sử Làm Việc</h2>
            </div>

            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                 <p className="text-teal-100 text-sm font-medium mb-1">Tổng giờ làm tháng này</p>
                 <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-bold">{totalMonthHours.toFixed(1)}</h3>
                    <span className="text-lg opacity-80">giờ</span>
                 </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                    <History size={18} className="text-gray-500" />
                    <h3 className="font-bold text-gray-700">Chi tiết chấm công</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {records.map((rec, idx) => (
                        <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                                <p className="font-bold text-gray-800">{rec.date}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span className="flex items-center gap-1 text-green-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {new Date(rec.checkIn).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>-</span>
                                    <span className="flex items-center gap-1 text-red-600"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-100 px-3 py-1 rounded-lg font-bold text-gray-700 text-sm">
                                {rec.totalHours > 0 ? `${rec.totalHours}h` : '--'}
                            </div>
                        </div>
                    ))}
                    {records.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">Chưa có dữ liệu chấm công.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- NEW ADMIN VIEWS ---

// A. Weekly Report View
const WeeklyReportView: React.FC<{ user: UserSession; onBack: () => void }> = ({ user, onBack }) => {
    const isAdmin = user.role === 'admin';
    const [selectedBranch, setSelectedBranch] = useState<string>(user.branch);
    const [stats, setStats] = useState<WeeklyStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getWeeklyStats(selectedBranch).then(data => {
            setStats(data);
            setLoading(false);
        });
    }, [selectedBranch]);

    const maxRevenue = stats ? Math.max(...stats.revenues) : 0;

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-600"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">Báo Cáo Tuần</h2>
                </div>
                {isAdmin && (
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg p-1.5 bg-white max-w-[150px]"
                    >
                        {BRANCHES.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                )}
            </div>
            
            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-600" /></div>
            ) : (
                <>
                    <div className="bg-brand-600 text-white p-6 rounded-2xl shadow-lg">
                        <p className="text-brand-100 text-sm mb-1">Tổng doanh thu 7 ngày qua</p>
                        <h3 className="text-3xl font-bold">{stats?.totalRevenue.toLocaleString('vi-VN')} ₫</h3>
                        <p className="text-xs text-brand-200 mt-1">{selectedBranch}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-6">Biểu đồ doanh thu</h4>
                        <div className="flex items-end justify-between h-48 gap-2">
                            {stats?.revenues.map((rev, idx) => {
                                const heightPercent = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full bg-brand-50 rounded-t-lg overflow-hidden flex items-end h-full">
                                            <div 
                                                className="w-full bg-brand-500 hover:bg-brand-400 transition-all duration-500 rounded-t-md" 
                                                style={{ height: `${heightPercent}%` }}
                                            ></div>
                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {(rev / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium">{stats?.dates[idx]}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// B. Shift History View
const ShiftHistoryView: React.FC<{ user: UserSession; onBack: () => void }> = ({ user, onBack }) => {
    const isAdmin = user.role === 'admin';
    const [selectedBranch, setSelectedBranch] = useState<string>(user.branch);
    const [shifts, setShifts] = useState<ShiftSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getShiftHistory(selectedBranch).then(data => {
            setShifts(data);
            setLoading(false);
        });
    }, [selectedBranch]);

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-600"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">Báo Cáo Theo Ca</h2>
                </div>
                {isAdmin && (
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg p-1.5 bg-white max-w-[150px]"
                    >
                        {BRANCHES.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-600" /></div>
            ) : shifts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Chưa có dữ liệu ca cho chi nhánh này.</div>
            ) : (
                <div className="space-y-3">
                    {shifts.map(shift => (
                        <div key={shift.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded mb-1 inline-block">Ca {shift.shift}</span>
                                    <h4 className="font-bold text-gray-800">{shift.branch}</h4>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                        <User size={12} /> {shift.staffName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${shift.status === 'OK' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                        {shift.status === 'OK' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                        {shift.status}
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(shift.timestamp).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                            <div className="border-t border-gray-50 pt-2 flex justify-between items-center mt-1">
                                 <span className="text-sm text-gray-500">Tiền mặt:</span>
                                 <span className="font-bold text-gray-900">{shift.cash.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            {shift.note && (
                                <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg mt-1">
                                    Note: {shift.note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// C. Admin Staff Attendance View
const AdminStaffAttendanceView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [selectedStaffUser, setSelectedStaffUser] = useState<string>('');
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(false);

    useEffect(() => {
        // Load staff list
        getAllStaff().then(data => {
            setAllStaff(data);
            setLoadingStaff(false);
        });
    }, []);

    // Filter staff based on selected branch
    const availableStaff = useMemo(() => {
        if (!selectedBranch) return [];
        return allStaff.filter(s => s.branch === selectedBranch);
    }, [allStaff, selectedBranch]);

    // Fetch records when staff is selected
    useEffect(() => {
        if (selectedStaffUser) {
            setLoadingRecords(true);
            getMonthlyAttendance(selectedStaffUser).then(data => {
                setRecords(data);
                setLoadingRecords(false);
            });
        } else {
            setRecords([]);
        }
    }, [selectedStaffUser]);

    const totalMonthHours = useMemo(() => {
        return records.reduce((sum, rec) => sum + rec.totalHours, 0);
    }, [records]);

    if (loadingStaff) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-600" /></div>;

    const uniqueBranches = Array.from(new Set(allStaff.map(s => s.branch)));

    return (
         <div className="space-y-6">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600"><ArrowLeft /></button>
                <h2 className="text-xl font-bold">Chấm công Nhân viên</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <SelectField 
                    label="Chọn Chi Nhánh"
                    icon={MapPin}
                    placeholder="-- Chọn chi nhánh --"
                    options={uniqueBranches}
                    value={selectedBranch}
                    onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        setSelectedStaffUser('');
                    }}
                />

                <div className="relative">
                     <SelectField 
                        label="Chọn Nhân Viên"
                        icon={User}
                        placeholder="-- Chọn nhân viên --"
                        options={availableStaff.map(s => s.name)}
                        value={allStaff.find(s => s.username === selectedStaffUser)?.name || ''}
                        onChange={(e) => {
                           const staff = allStaff.find(s => s.name === e.target.value);
                           if (staff) setSelectedStaffUser(staff.username);
                        }}
                        disabled={!selectedBranch}
                    />
                </div>
            </div>

            {selectedStaffUser && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                    {loadingRecords ? (
                         <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-600" /></div>
                    ) : (
                        <>
                             <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                                <p className="text-teal-100 text-sm font-medium mb-1">Tổng giờ làm tháng này</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-bold">{totalMonthHours.toFixed(1)}</h3>
                                    <span className="text-lg opacity-80">giờ</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                                    <History size={18} className="text-gray-500" />
                                    <h3 className="font-bold text-gray-700">Chi tiết chấm công</h3>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                    {records.map((rec, idx) => (
                                        <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-800">{rec.date}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1 text-green-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {new Date(rec.checkIn).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span>-</span>
                                                    <span className="flex items-center gap-1 text-red-600"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-100 px-3 py-1 rounded-lg font-bold text-gray-700 text-sm">
                                                {rec.totalHours > 0 ? `${rec.totalHours}h` : '--'}
                                            </div>
                                        </div>
                                    ))}
                                    {records.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 text-sm">Chưa có dữ liệu chấm công.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
         </div>
    );
};

// 5. Report Form (The complex one)
interface ReportFormProps {
  user: UserSession;
  type: ActionType;
  onBack: () => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ user, type, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{message: string, discrepancy?: string} | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form States
  const [reportId, setReportId] = useState('');
  const [cashStart, setCashStart] = useState<string>('');
  const [tempDisplay, setTempDisplay] = useState<string>('');
  const [tempStorage, setTempStorage] = useState<string>('');
  const [inventory, setInventory] = useState<Record<string, string>>({});
  const [inventoryImages, setInventoryImages] = useState<Record<string, string>>({});
  const [storageCounts, setStorageCounts] = useState<Record<string, string>>({});
  
  // Dynamic List States
  const [selectedDisplayFlavors, setSelectedDisplayFlavors] = useState<string[]>([]);
  const [selectedStorageFlavors, setSelectedStorageFlavors] = useState<string[]>([]);
  const [tempDisplayFlavor, setTempDisplayFlavor] = useState<string>('');
  const [tempStorageFlavor, setTempStorageFlavor] = useState<string>('');

  // AI Verification State
  const [showCamera, setShowCamera] = useState(false);
  const [activeFlavor, setActiveFlavor] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [aiReadings, setAiReadings] = useState<Record<string, number | null>>({});

  // Di An Extras
  const [diAnExtras, setDiAnExtras] = useState<any>({});

  const branchConfig = BRANCHES.find(b => b.name === user.branch);
  const isDiAn = user.branch === 'Baby Boss Dĩ An';

  useEffect(() => {
    // Generate automatic report ID
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    
    // Create branch initials
    const branchInitials = user.branch
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const generatedId = `RPT-${branchInitials}-${user.shift}-${dateStr}-${randomSuffix}`;
    setReportId(generatedId);
  }, [user.branch, user.shift]);

  const handleWeightChange = (flavor: string, val: string) => {
    setInventory(prev => ({ ...prev, [flavor]: val }));
  };

  const handleStorageCountChange = (flavor: string, val: string) => {
    setStorageCounts(prev => ({ ...prev, [flavor]: val }));
  };

  // Add/Remove Logic for Display Flavors
  const addDisplayFlavor = () => {
    if (tempDisplayFlavor && !selectedDisplayFlavors.includes(tempDisplayFlavor)) {
      setSelectedDisplayFlavors([...selectedDisplayFlavors, tempDisplayFlavor]);
      setTempDisplayFlavor('');
    }
  };

  const removeDisplayFlavor = (flavor: string) => {
    setSelectedDisplayFlavors(selectedDisplayFlavors.filter(f => f !== flavor));
    const newInventory = { ...inventory };
    delete newInventory[flavor];
    setInventory(newInventory);
    
    const newImages = { ...inventoryImages };
    delete newImages[flavor];
    setInventoryImages(newImages);
  };

  // Add/Remove Logic for Storage Flavors
  const addStorageFlavor = () => {
    if (tempStorageFlavor && !selectedStorageFlavors.includes(tempStorageFlavor)) {
      setSelectedStorageFlavors([...selectedStorageFlavors, tempStorageFlavor]);
      setTempStorageFlavor('');
    }
  };

  const removeStorageFlavor = (flavor: string) => {
    setSelectedStorageFlavors(selectedStorageFlavors.filter(f => f !== flavor));
    const newCounts = { ...storageCounts };
    delete newCounts[flavor];
    setStorageCounts(newCounts);
  };

  const availableDisplayFlavors = useMemo(() => 
    ICE_CREAM_FLAVORS.filter(f => !selectedDisplayFlavors.includes(f)), 
  [selectedDisplayFlavors]);

  const availableStorageFlavors = useMemo(() => 
    ICE_CREAM_FLAVORS.filter(f => !selectedStorageFlavors.includes(f)), 
  [selectedStorageFlavors]);

  const verifyWeightWithAI = async (flavor: string, base64Image: string) => {
    const base64Data = base64Image.split(',')[1] || base64Image;
    setVerifying(prev => ({ ...prev, [flavor]: true }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            },
            {
              text: 'Look at the digital scale in this image. Identify the numeric weight value shown on the display. Return ONLY the number (e.g. 1.25 or 0.8). If you absolutely cannot see a clear number on a screen, return "N/A". Do not return units.'
            }
          ]
        }
      });
      
      const text = response.text?.trim();
      const number = parseFloat(text || '');
      
      if (!isNaN(number)) {
        setAiReadings(prev => ({ ...prev, [flavor]: number }));
      } else {
        setAiReadings(prev => ({ ...prev, [flavor]: null }));
      }

    } catch (error) {
      console.error("AI Verification failed", error);
    } finally {
      setVerifying(prev => ({ ...prev, [flavor]: false }));
    }
  };
  
  const openCamera = (flavor: string) => {
    setActiveFlavor(flavor);
    setShowCamera(true);
  };

  const handleCameraCapture = (imageSrc: string) => {
    if (activeFlavor) {
      setInventoryImages(prev => ({ ...prev, [activeFlavor]: imageSrc }));
      setShowCamera(false);
      
      // Trigger AI verification immediately
      verifyWeightWithAI(activeFlavor, imageSrc);
    } else {
      // Test mode: just close camera
      setShowCamera(false);
    }
  };

  const handleDiAnChange = (field: string, val: any) => {
    setDiAnExtras((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = {
        reportId, // Include generated ID
        cashStart: parseFloat(cashStart),
        tempDisplay: parseFloat(tempDisplay),
        tempStorage: parseFloat(tempStorage),
        inventory: Object.fromEntries(Object.entries(inventory).map(([k, v]) => [k, parseFloat(v as string)])),
        storageCount: Object.fromEntries(
            Object.entries(storageCounts).map(([k, v]) => [k, parseInt(v as string) || 0])
        ),
        images: inventoryImages,
        diAnExtras: isDiAn ? diAnExtras : undefined
      };
      
      const res = await submitReport(user, data, type);
      setResult({ message: res.message, discrepancy: res.discrepancy });
    } catch (e) {
      setResult({ message: "Đã xảy ra lỗi kết nối.", discrepancy: "Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = (flavor: string) => {
    if (verifying[flavor]) return 'loading';
    
    // Only return status if we have a reading attempt
    if (flavor in aiReadings) {
        const ai = aiReadings[flavor];
        if (ai === null) return 'error';
        
        if (inventory[flavor]) {
             const manual = parseFloat(inventory[flavor]);
             const diff = Math.abs(manual - ai);
             return diff <= 0.05 ? 'match' : 'mismatch';
        }
    }
    return 'none';
  };

  // Helper to render AI status
  const renderAIStatus = (flavor: string) => {
    if (verifying[flavor]) return null; // handled by badge

    const ai = aiReadings[flavor];
    
    if (ai === null) {
        return (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold block">AI không đọc được số.</span>
                    <span>Vui lòng chụp lại ảnh rõ nét hoặc nhập tay.</span>
                </div>
            </div>
        );
    }
    
    if (ai !== undefined && inventory[flavor]) {
       const manual = parseFloat(inventory[flavor]);
       const diff = Math.abs(manual - ai);
       
       if (diff > 0.05) {
         return <div className="flex items-center gap-1 text-xs text-orange-600 mt-1 font-medium"><AlertTriangle size={12} /> AI thấy: {ai}kg</div>;
       }
    }
    return null;
  };

  if (result) {
    return (
      <div className="text-center space-y-6 pt-10">
         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold">Đã Gửi Báo Cáo!</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left">
            <p className="text-gray-800 font-medium mb-2">{result.message}</p>
            {result.discrepancy && (
              <p className={`text-sm ${result.discrepancy.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {result.discrepancy}
              </p>
            )}
          </div>
          <button 
            onClick={onBack}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg"
          >
            Quay lại Dashboard
          </button>
      </div>
    );
  }

  // Common styles
  const sectionCardClass = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4";
  const itemCardClass = "bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative transition-all hover:shadow-md hover:border-brand-200 group";
  
  return (
    <div className="space-y-6 pb-20 relative">
      <ConfirmationModal 
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          title="Gửi Báo Cáo?"
          message="Bạn có chắc chắn muốn gửi báo cáo này? Hãy kiểm tra kỹ lại các số liệu."
          confirmLabel="Gửi Ngay"
      />

      {/* Camera Modal Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <button 
            onClick={() => setShowCamera(false)}
            className="absolute top-4 right-4 text-white z-50 p-2 bg-gray-800 rounded-full"
          >
            <X size={24} />
          </button>
          <div className="w-full h-full flex items-center justify-center">
             <CameraCapture 
               onCapture={handleCameraCapture} 
               autoStart={true} 
               label={activeFlavor ? `Chụp cân: ${activeFlavor}` : "Chụp thử (Test Mode)"} 
               facingMode="environment"
             />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600">
           <ArrowLeft />
        </button>
        <h2 className="text-xl font-bold">{type === 'REPORT_START' ? 'Báo Cáo Đầu Ca' : 'Báo Cáo Cuối Ca'}</h2>
      </div>

      {/* 1. General Info */}
      <div className={sectionCardClass}>
        <h3 className="font-bold text-gray-800 border-b pb-3 text-base flex items-center gap-2">
           <FileText size={18} className="text-brand-600"/> 1. Thông tin chung
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report ID */}
            <div className="col-span-full">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Mã Báo Cáo</label>
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-gray-500">
                   <FileKey size={18} />
                   <span className="font-mono text-sm">{reportId}</span>
                </div>
            </div>

            {/* Cash */}
            <div className="col-span-full">
                <InputField 
                  label="Tổng két đầu ca (VNĐ)"
                  icon={DollarSign}
                  type="number"
                  value={cashStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCashStart(e.target.value)}
                  placeholder="Ví dụ: 2000000"
                />
            </div>

            {/* Temp */}
             <InputField 
               label="Nhiệt Trưng Bày (°C)"
               icon={Thermometer}
               type="number"
               value={tempDisplay}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempDisplay(e.target.value)}
               placeholder="-18"
             />
             {branchConfig?.hasStorageFridge && (
               <InputField 
                 label="Nhiệt Tủ Trữ (°C)"
                 icon={Thermometer}
                 type="number"
                 value={tempStorage}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempStorage(e.target.value)}
                 placeholder="-20"
               />
             )}
        </div>
      </div>

      {/* 2. Ice Cream Inventory */}
      <div className={sectionCardClass}>
        <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <Layers size={18} className="text-brand-600"/> 2. Kiểm kê Kem
            </h3>
            <button 
                onClick={() => { setActiveFlavor(null); setShowCamera(true); }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
            >
                <ScanEye size={16} /> Test Camera
            </button>
        </div>
        
        {/* Add Flavor Control */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex gap-2">
           <SelectField 
             wrapperClassName="flex-1"
             icon={Layers}
             placeholder="-- Chọn vị kem --"
             options={availableDisplayFlavors}
             value={tempDisplayFlavor}
             onChange={e => setTempDisplayFlavor(e.target.value)}
             className="border-gray-300 py-2.5"
           />
           <button 
             onClick={addDisplayFlavor}
             disabled={!tempDisplayFlavor}
             className="bg-brand-600 text-white w-12 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm hover:bg-brand-700"
           >
             <Plus size={22} />
           </button>
        </div>

        {selectedDisplayFlavors.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
            Chưa có vị kem nào được chọn.
          </div>
        )}

        <div className="space-y-3">
          {selectedDisplayFlavors.map(flavor => {
             const status = getVerificationStatus(flavor);
             
             let inputBorderClass = "border-gray-200 focus:ring-brand-200 focus:border-brand-400";
             if (status === 'match') inputBorderClass = "border-green-500 focus:ring-green-200 focus:border-green-500 bg-green-50/50";
             else if (status === 'mismatch') inputBorderClass = "border-orange-500 focus:ring-orange-200 focus:border-orange-500 bg-orange-50/50";
             else if (status === 'error') inputBorderClass = "border-red-300 focus:ring-red-200 focus:border-red-500 bg-red-50/50";
             else if (status === 'loading') inputBorderClass = "border-blue-300 focus:ring-blue-200 focus:border-blue-500 bg-blue-50/50";

             return (
            <div key={flavor} className={itemCardClass}>
               <div className="flex justify-between items-start mb-2">
                 <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-base">{flavor}</span>
                    {status !== 'none' && (
                        <div className={`mt-1.5 w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            status === 'match' ? 'bg-green-100 text-green-700 border-green-200' : 
                            status === 'mismatch' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            status === 'error' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                            {status === 'match' && <CheckCircle size={14} strokeWidth={2.5} />}
                            {status === 'mismatch' && <AlertTriangle size={14} strokeWidth={2.5} />}
                            {status === 'error' && <X size={14} strokeWidth={2.5} />}
                            {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                            
                            <span className="uppercase tracking-wide">
                                {status === 'match' ? 'AI KHỚP' : 
                                 status === 'mismatch' ? 'AI LỆCH' : 
                                 status === 'error' ? 'LỖI ĐỌC' : 
                                 'ĐANG XỬ LÝ'}
                            </span>
                        </div>
                    )}
                 </div>
                 <button 
                     onClick={() => removeDisplayFlavor(flavor)}
                     className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={18} />
                 </button>
               </div>
              
              <div className="flex gap-3 items-stretch">
                  <div className="flex-1 relative">
                        <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={inventory[flavor] || ''}
                        onChange={e => handleWeightChange(flavor, e.target.value)}
                        className={`w-full h-full pl-4 pr-10 py-3 text-lg font-bold rounded-xl border focus:ring-2 outline-none transition-all ${inputBorderClass}`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">kg</span>
                        {status === 'loading' && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Loader2 size={18} className="animate-spin text-blue-500" />
                            </div>
                        )}
                  </div>
                  
                  <button 
                    onClick={() => openCamera(flavor)}
                    className={`flex items-center justify-center w-14 rounded-xl transition-all shadow-sm active:scale-95 border ${
                      inventoryImages[flavor] 
                        ? 'bg-white border-green-500 p-0.5' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-brand-300 text-gray-400'
                    }`}
                  >
                    {inventoryImages[flavor] ? (
                      <img 
                        src={inventoryImages[flavor]} 
                        alt="Evidence" 
                        className="w-full h-full object-cover rounded-[10px]" 
                      />
                    ) : (
                      <Camera size={22} />
                    )}
                 </button>
              </div>
              {renderAIStatus(flavor)}
            </div>
          )})}
        </div>
      </div>

      {/* 3. Storage Count */}
      <div className={sectionCardClass}>
         <h3 className="font-bold text-gray-800 border-b pb-3 text-base flex items-center gap-2">
              <Archive size={18} className="text-brand-600"/> 3. Tủ Trữ
        </h3>
        
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex gap-2">
            <SelectField 
             wrapperClassName="flex-1"
             icon={Package}
             placeholder="-- Chọn vị kem --"
             options={availableStorageFlavors}
             value={tempStorageFlavor}
             onChange={e => setTempStorageFlavor(e.target.value)}
             className="border-gray-300 py-2.5"
           />
           <button 
             onClick={addStorageFlavor}
             disabled={!tempStorageFlavor}
             className="bg-brand-600 text-white w-12 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm hover:bg-brand-700"
           >
             <Plus size={22} />
           </button>
        </div>

        {selectedStorageFlavors.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
            Kho trống hoặc chưa nhập liệu.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {selectedStorageFlavors.map(flavor => (
            <div key={flavor} className={itemCardClass}>
               <div className="flex items-center gap-3">
                   <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800 mb-1">{flavor}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="relative w-24">
                        <input 
                            type="number" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            className="w-full px-3 py-2 text-center font-bold text-gray-800 border border-gray-200 rounded-lg focus:border-brand-500 outline-none"
                            value={storageCounts[flavor] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStorageCountChange(flavor, e.target.value)}
                        />
                     </div>
                     <span className="text-sm font-medium text-gray-500 w-8">hộp</span>
                     <button 
                        onClick={() => removeStorageFlavor(flavor)}
                        className="text-gray-300 hover:text-red-500 p-2"
                     >
                        <Trash2 size={16} />
                     </button>
                   </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Di An Specifics */}
      {isDiAn && (
        <div className={sectionCardClass}>
          <h3 className="font-bold text-gray-800 border-b pb-3 text-base flex items-center gap-2">
              <Utensils size={18} className="text-brand-600"/> 4. Nguyên Liệu (Dĩ An)
          </h3>
          
          <div className="space-y-4">
             {/* Sub-group: Weights/Volumes */}
             <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Droplets size={14}/> Định lượng / Pha chế</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {k: 'pearlsBlack', l: 'Trân châu đen', u: 'g'},
                    {k: 'milkTeaRoasted', l: 'TS nướng', u: 'ml'},
                    {k: 'milkTeaFruit', l: 'TS trái cây', u: 'ml'},
                    {k: 'milkTeaTraditional', l: 'TS truyền thống', u: 'ml'},
                    {k: 'teaJasmine', l: 'Trà nhài', u: 'ml'},
                    {k: 'teaOlong', l: 'Trà olong', u: 'ml'},
                    {k: 'teaPeach', l: 'Trà đào', u: 'ml'},
                    {k: 'coffee', l: 'Cafe', u: 'ml'},
                    {k: 'orangeGreen', l: 'Cam xanh', u: 'trái'},
                    {k: 'orangeYellow', l: 'Cam vàng', u: 'trái'},
                    {k: 'yogurt', l: 'Sữa chua', u: 'hũ'},
                  ].map(item => (
                    <div key={item.k} className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1">{item.l}</label>
                      <div className="flex items-baseline gap-1">
                          <input 
                            type="number" 
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-800 focus:border-brand-500 outline-none"
                            onChange={(e) => handleDiAnChange(item.k, e.target.value)}
                          />
                          <span className="text-xs text-gray-400 font-medium">{item.u}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Sub-group: Checkboxes */}
             <div>
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><CheckCircle size={14}/> Topping tồn kho</h4>
               <div className="grid grid-cols-2 gap-2">
                 {[
                   {k: 'jellyCoffee', l: 'Thạch cafe'},
                   {k: 'jellyStrawberry', l: 'Thạch dâu'},
                   {k: 'pudding', l: 'Pudding'},
                   {k: 'creamMachi', l: 'Kem Machi'},
                   {k: 'creamEgg', l: 'Kem trứng'},
                   {k: 'ginger', l: 'Gừng'},
                   {k: 'kumquat', l: 'Tắc'},
                   {k: 'coconut', l: 'Dừa'},
                 ].map(item => (
                   <label key={item.k} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl bg-white hover:border-brand-300 transition-all shadow-sm cursor-pointer select-none">
                     <input type="checkbox" className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" onChange={(e) => handleDiAnChange(item.k, e.target.checked)} />
                     <span className="text-sm font-medium text-gray-700">{item.l}</span>
                   </label>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="sticky bottom-4">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-brand-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Đang gửi...' : 'GỬI BÁO CÁO'}
        </button>
      </div>
    </div>
  );
};

// 6. Stock Actions (Import / Transfer)
interface StockActionProps {
  user: UserSession;
  type: 'EXPORT_STORAGE' | 'IMPORT_STOCK';
  onBack: () => void;
}

const StockActionForm: React.FC<StockActionProps> = ({ user, type, onBack }) => {
  const [items, setItems] = useState<{flavor: string, count: number, weight: string}[]>([{flavor: ICE_CREAM_FLAVORS[0], count: 1, weight: ''}]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const addItem = () => setItems([...items, {flavor: ICE_CREAM_FLAVORS[0], count: 1, weight: ''}]);
  
  const updateItem = (index: number, field: 'flavor' | 'count' | 'weight', value: any) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    await submitReport(user, { items }, type);
    setLoading(false);
    setCompleted(true);
  };

  if (completed) {
    return (
      <div className="text-center space-y-6 pt-10">
         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold">Thành công!</h2>
          <p className="text-gray-600">Dữ liệu đã được cập nhật vào hệ thống.</p>
          <button 
            onClick={onBack}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg"
          >
            Về Dashboard
          </button>
      </div>
    );
  }

  // Common styles
  const sectionCardClass = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4";
  const itemCardClass = "bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative transition-all hover:shadow-md hover:border-brand-200 mb-4";
  
  return (
    <div className="space-y-6">
       <ConfirmationModal 
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          title="Xác nhận phiếu?"
          message={`Bạn có chắc chắn muốn gửi phiếu ${type === 'EXPORT_STORAGE' ? 'Xuất Tủ Trữ' : 'Nhập Hàng'} này không?`}
          confirmLabel="Xác Nhận"
       />

       <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600">
           <ArrowLeft />
        </button>
        <h2 className="text-xl font-bold">{type === 'EXPORT_STORAGE' ? 'Xuất Tủ Trữ -> Trưng Bày' : 'Nhập Hàng Mới'}</h2>
      </div>

      <div className={sectionCardClass}>
        <h3 className="font-bold text-gray-800 border-b pb-3 text-base flex items-center gap-2">
           <ClipboardList size={18} className="text-brand-600"/> Chi tiết phiếu {type === 'EXPORT_STORAGE' ? 'Xuất' : 'Nhập'}
        </h3>

        {items.map((item, idx) => (
          <div key={idx} className={itemCardClass}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">Mục #{idx + 1}</span>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
               <SelectField 
                 label="Loại kem"
                 icon={Layers}
                 options={ICE_CREAM_FLAVORS}
                 value={item.flavor}
                 onChange={(e) => updateItem(idx, 'flavor', e.target.value)}
               />

              <div className="grid grid-cols-2 gap-4">
                 <InputField
                    label="Số lượng (Hộp)"
                    icon={Package}
                    type="number" 
                    min="1"
                    value={item.count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, 'count', parseInt(e.target.value))}
                 />

                 {type === 'EXPORT_STORAGE' && (
                     <InputField
                        label="Trọng lượng (Kg)"
                        icon={Scale}
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={item.weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, 'weight', e.target.value)}
                     />
                 )}
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={addItem}
          className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Thêm vị kem
        </button>
      </div>

      <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-brand-700 transition-colors"
        >
          {loading ? 'Đang xử lý...' : 'XÁC NHẬN'}
        </button>
    </div>
  );
};

// 7. Daily Report View (New)
interface DailyReportViewProps {
  user: UserSession;
  onBack: () => void;
}

type SortKey = 'flavor' | 'imported' | 'exported' | 'shrinkage';

const DailyReportView: React.FC<DailyReportViewProps> = ({ user, onBack }) => {
  const isAdmin = user.role === 'admin';
  const [selectedBranch, setSelectedBranch] = useState<string>(user.branch);
  const [data, setData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'flavor', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getDailyReport(selectedBranch);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch daily report", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedBranch]);

  const sortedInventory = useMemo(() => {
    if (!data) return [];
    
    // Filter first
    let result = data.inventoryDiff;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.flavor.toLowerCase().includes(lowerQuery));
    }

    // Then sort
    const sortableItems = [...result];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // @ts-ignore
        const aValue = a[sortConfig.key];
        // @ts-ignore
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, searchQuery]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="text-gray-300 ml-1 inline" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-brand-600 ml-1 inline" />
      : <ArrowDown size={14} className="text-brand-600 ml-1 inline" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center pt-10">
        <p className="text-red-500">Không thể tải báo cáo.</p>
        <button onClick={onBack} className="mt-4 text-brand-600 underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft />
            </button>
            <div>
            <h2 className="text-xl font-bold">Báo Cáo Ngày</h2>
            <p className="text-xs text-gray-500">{data.date}</p>
            </div>
        </div>
        {isAdmin && (
            <select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg p-1.5 bg-white max-w-[150px]"
            >
                {BRANCHES.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
        )}
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
          {/* Cash Card */}
          <div className="col-span-2 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
             
             <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-brand-100 text-sm font-medium mb-1">Tổng tiền mặt</p>
                  <h3 className="text-3xl font-bold tracking-tight">{data.totalCash.toLocaleString('vi-VN')} ₫</h3>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                   <DollarSign size={24} className="text-white" />
                </div>
             </div>
          </div>

          {/* Storage Boxes */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <span className="text-xs font-semibold text-gray-500 uppercase">Tủ Trữ</span>
                 <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                    <Archive size={18} />
                 </div>
              </div>
              <div>
                 <h4 className="text-2xl font-bold text-gray-800">{data.totalStorageBoxes}</h4>
                 <p className="text-xs text-gray-500 font-medium">Hộp kem</p>
              </div>
          </div>

          {/* Display Weight */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <span className="text-xs font-semibold text-gray-500 uppercase">Trưng Bày</span>
                 <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                    <Scale size={18} /> 
                 </div>
              </div>
              <div>
                 <h4 className="text-2xl font-bold text-gray-800">{data.totalDisplayWeight}</h4>
                 <p className="text-xs text-gray-500 font-medium">Kg kem</p>
              </div>
          </div>

          {/* Shrinkage */}
          <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Tổng Hao Hụt</span>
                  <div className={`text-xl font-bold ${data.totalShrinkage < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                     {data.totalShrinkage} kg
                  </div>
               </div>
               <div className={`p-3 rounded-xl ${data.totalShrinkage < 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                  <TrendingDown size={20} />
               </div>
          </div>
      </div>

      {/* Inventory Diff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingDown size={18} className="text-gray-500" />
          <h3 className="font-bold text-gray-800">Biến động kho & Hao hụt</h3>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
               <Search size={16} />
             </div>
             <input 
               type="text" 
               placeholder="Tìm kiếm vị kem..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all bg-white"
             />
             {searchQuery && (
               <button 
                 onClick={() => setSearchQuery('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
               >
                 <X size={14} />
               </button>
             )}
          </div>
        </div>
        
        {data.inventoryDiff.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Không có dữ liệu biến động cho ngày hôm nay.
          </div>
        ) : sortedInventory.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Không tìm thấy vị kem nào phù hợp với "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('flavor')}
                  >
                    Vị kem <SortIcon column="flavor" />
                  </th>
                  <th 
                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('imported')}
                  >
                    Nhập <SortIcon column="imported" />
                  </th>
                  <th 
                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('exported')}
                  >
                    Xuất <SortIcon column="exported" />
                  </th>
                  <th 
                    className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('shrinkage')}
                  >
                    Hao hụt <SortIcon column="shrinkage" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.flavor}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.imported > 0 ? <span className="text-green-600">+{item.imported}</span> : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.exported > 0 ? <span className="text-blue-600">-{item.exported}</span> : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${item.shrinkage < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {item.shrinkage !== 0 ? `${item.shrinkage} kg` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

       <div className="text-center text-xs text-gray-400 pt-4 pb-8">
        Số liệu được tính toán dựa trên báo cáo của các ca trong ngày và so sánh với dữ liệu ngày hôm trước.
      </div>
    </div>
  );
};

// 8. Dashboard View (Missing in previous code)
interface DashboardViewProps {
  user: UserSession;
  onAction: (action: ActionType) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onAction }) => {
  const isAdmin = user.role === 'admin';
  const branchConfig = BRANCHES.find(b => b.name === user.branch);
  const hasStorage = branchConfig?.hasStorageFridge;

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-2xl">
            A
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
            <p className="text-gray-500 text-sm">Quản lý hệ thống</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onAction('VIEW_DAILY_REPORT')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FileText size={24} />
            </div>
            <span className="font-semibold text-gray-700">Báo cáo Ngày</span>
          </button>

          <button 
            onClick={() => onAction('VIEW_WEEKLY_REPORT')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <BarChart3 size={24} />
            </div>
            <span className="font-semibold text-gray-700">Thống kê Tuần</span>
          </button>

          <button 
            onClick={() => onAction('VIEW_SHIFT_REPORT')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <Layers size={24} />
            </div>
            <span className="font-semibold text-gray-700">Lịch sử Ca</span>
          </button>

          <button 
            onClick={() => onAction('VIEW_STAFF_ATTENDANCE')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <Users size={24} />
            </div>
            <span className="font-semibold text-gray-700">Chấm công</span>
          </button>

          <button 
            onClick={() => onAction('VIEW_WORK_HOURS')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <History size={24} />
            </div>
            <span className="font-semibold text-gray-700">Lịch Sử Công</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-brand-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
        <p className="text-brand-100 text-sm mb-1">Xin chào,</p>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        {user.phone && <p className="text-brand-200 text-sm font-medium">{user.phone}</p>}
        <div className="flex items-center gap-2 mt-4 text-xs font-medium bg-white/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
          <Clock size={14} />
          Check-in: {user.checkInTime ? new Date(user.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">Hoạt động Ca {user.shift}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onAction('REPORT_START')}
            className="col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-3 text-center group"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <ClipboardList size={24} />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Báo Cáo<br/>Đầu Ca</span>
          </button>

          <button 
            onClick={() => onAction('REPORT_END')}
            className="col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-3 text-center group"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <CheckCircle size={24} />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Báo Cáo<br/>Cuối Ca</span>
          </button>
          
          {hasStorage && (
            <button 
              onClick={() => onAction('EXPORT_STORAGE')}
              className="col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-3 text-center group"
            >
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Upload size={24} />
              </div>
              <span className="font-semibold text-gray-700 text-sm">Xuất Tủ Trữ<br/>Ra Quầy</span>
            </button>
          )}

          <button 
            onClick={() => onAction('IMPORT_STOCK')}
            className="col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-3 text-center group"
          >
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Download size={24} />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Nhập Hàng<br/>Mới</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">Cá nhân</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onAction('VIEW_WORK_HOURS')}
            className="col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-500 transition-all flex flex-col items-center gap-3 text-center group"
          >
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <History size={24} />
            </div>
            <span className="font-semibold text-gray-700 text-sm">Lịch Sử Công</span>
          </button>

          <button 
            onClick={() => onAction('CHECK_OUT')}
            className="col-span-1 bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 hover:border-red-500 transition-all flex flex-col items-center gap-3 text-center group"
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <LogOut size={24} />
            </div>
            <span className="font-semibold text-red-700 text-sm">Kết Thúc<br/>Ca Làm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 9. Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [currentView, setCurrentView] = useState<ActionType | 'DASHBOARD'>('DASHBOARD');

  const handleLogin = (session: UserSession) => {
    setUser(session);
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('DASHBOARD');
  };

  const renderContent = () => {
    if (!user) {
      return <LoginView onLogin={handleLogin} />;
    }

    switch (currentView) {
      case 'DASHBOARD':
        return <DashboardView user={user} onAction={setCurrentView} />;
      case 'CHECK_OUT':
        return (
            <CheckOutView 
                user={user} 
                onSuccess={handleLogout} 
                onCancel={() => setCurrentView('DASHBOARD')}
            />
        );
      case 'VIEW_WORK_HOURS':
        return (
            <WorkHoursView 
                user={user}
                onBack={() => setCurrentView('DASHBOARD')}
            />
        );
      case 'REPORT_START':
      case 'REPORT_END':
        return (
          <ReportForm 
            user={user} 
            type={currentView} 
            onBack={() => setCurrentView('DASHBOARD')} 
          />
        );
      case 'EXPORT_STORAGE':
      case 'IMPORT_STOCK':
        return (
          <StockActionForm 
            user={user} 
            type={currentView} 
            onBack={() => setCurrentView('DASHBOARD')} 
          />
        );
      case 'VIEW_DAILY_REPORT':
         return (
           <DailyReportView 
             user={user}
             onBack={() => setCurrentView('DASHBOARD')}
           />
         );
       case 'VIEW_WEEKLY_REPORT':
         return (
           <WeeklyReportView user={user} onBack={() => setCurrentView('DASHBOARD')} />
         );
       case 'VIEW_SHIFT_REPORT':
         return (
           <ShiftHistoryView user={user} onBack={() => setCurrentView('DASHBOARD')} />
         );
       case 'VIEW_STAFF_ATTENDANCE':
         return (
           <AdminStaffAttendanceView onBack={() => setCurrentView('DASHBOARD')} />
         );
      default:
        return <DashboardView user={user} onAction={setCurrentView} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onCheckout={() => setCurrentView('CHECK_OUT')}
      title={user ? "Baby Boss Ice Cream" : "Baby Boss Staff Portal"}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;