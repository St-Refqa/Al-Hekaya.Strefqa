import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc, 
  updateDoc, 
  increment, 
  orderBy,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Plus, 
  Calendar, 
  QrCode, 
  Users, 
  BookOpen, 
  Trash2, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Printer,
  Info,
  CalendarDays,
  Award,
  AlertCircle,
  Clock,
  Edit,
  ExternalLink,
  Filter,
  MessageCircle,
  Phone,
  TrendingUp,
  UserX,
  BarChart3,
  PhoneCall
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { triggerSuccessConfetti } from '../../lib/confetti';
import { cn } from '../../lib/utils';

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  date: string;
  timestamp: string;
  seasonId: string;
  meetingType: 'OT' | 'NT' | 'general';
  points: number;
  lectureId?: string;
  lectureName?: string;
  scanTime?: string;
  isSimulated?: boolean;
}

interface Student {
  uid: string;
  fullName: string;
  code: string;
  church?: string;
  isActive: boolean;
  totalPoints: number;
  xp: number;
  cumulativePoints?: number;
  storePoints?: number;
  sidebarSettings?: Record<string, any>;
}

interface Lecture {
  id: string;
  name: string;
  date: string;
  startTime: string; // "HH:MM"
  meetingType: 'OT' | 'NT' | 'general';
  isActive: boolean;
}

// Global precise timer helpers (Forced to Egypt Timezone)
const getLocalDateStr = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Africa/Cairo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());
  } catch (e) {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  }
};

const getLocalTimeStr = () => {
  try {
    const timeStr = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Africa/Cairo', 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(new Date());
    const [h, m] = timeStr.split(':');
    return `${h === '24' ? '00' : h}:${m}`;
  } catch (e) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
};

// Calculates attendance points dynamically:
// First 15 mins (grace period) = 20 points
// Every 5 mins late after that reduces points by 1 point
// Floor of 1 point (so attenders always get some reward)
const calculateDynamicPoints = (startTimeStr: string, scanTimeStr: string, dateStr?: string) => {
  try {
    let [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [scanHour, scanMin] = scanTimeStr.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMin) || isNaN(scanHour) || isNaN(scanMin)) {
      return { points: 20, minutesLate: 0, penalty: 0 };
    }

    if (dateStr === '2026-07-25') {
      startHour = 18;
      startMin = 0;
      
      const startTotal = startHour * 60 + startMin;
      const scanTotal = scanHour * 60 + scanMin;
      const minutesLate = scanTotal - startTotal;
      
      if (minutesLate <= 5) {
        return { points: 20, minutesLate: Math.max(0, minutesLate), penalty: 0 };
      } else {
        const excessMinutes = minutesLate - 5;
        const penalty = Math.ceil(excessMinutes / 5);
        const points = Math.max(1, 20 - penalty);
        return { points, minutesLate, penalty };
      }
    }

    const startTotal = startHour * 60 + startMin;
    const scanTotal = scanHour * 60 + scanMin;

    const minutesLate = scanTotal - startTotal;

    // Within first 15 mins gets full 20 pts
    if (minutesLate <= 15) {
      return { points: 20, minutesLate: Math.max(0, minutesLate), penalty: 0 };
    } else {
      const excessMinutes = minutesLate - 15;
      const penalty = Math.ceil(excessMinutes / 5);
      const points = Math.max(1, 20 - penalty);
      return { points, minutesLate, penalty };
    }
  } catch (err) {
    console.error("Error in calculateDynamicPoints:", err);
    return { points: 20, minutesLate: 0, penalty: 0 };
  }
};

export default function AdminAttendance() {
  const { user } = useAuth();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'lectures' | 'logs' | 'seasons' | 'report'>('scan');

  // Report tab state
  const [reportSearch, setReportSearch] = useState('');
  const [reportGroupFilter, setReportGroupFilter] = useState<'all' | 'OT' | 'NT' | 'S'>('all');
  const [reportAbsenceFilter, setReportAbsenceFilter] = useState<'all' | 'present' | 'warning' | 'danger' | 'critical'>('all');

  // Seasons States
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('');
  const [newSeasonEnd, setNewSeasonEnd] = useState('');
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);

  // Custom Lectures / Meetings States
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [newLecName, setNewLecName] = useState('');
  const [newLecDate, setNewLecDate] = useState(getLocalDateStr());
  const [newLecTime, setNewLecTime] = useState('19:00');
  const [newLecType, setNewLecType] = useState<'OT' | 'NT' | 'general'>('OT');
  const [isCreatingLecture, setIsCreatingLecture] = useState(false);

  // Simulation / Code & Clock Testing States
  const [isTestMode, setIsTestMode] = useState(false);
  const [lectureToDelete, setLectureToDelete] = useState<string | null>(null);

  // Logs Filter State
  const [logsFilterQuery, setLogsFilterQuery] = useState('');
  const [logsCategoryFilter, setLogsCategoryFilter] = useState<'all' | 'OT' | 'NT' | 'S'>('all');
  const [liveFilterQuery, setLiveFilterQuery] = useState('');
  const [logsDateFilter, setLogsDateFilter] = useState('');
  const [simDate, setSimDate] = useState(getLocalDateStr());
  const [simTime, setSimTime] = useState('19:10');
  const [simCode, setSimCode] = useState('');

  // Settings for attendance
  const [meetingType, setMeetingType] = useState<'OT' | 'NT' | 'general'>(() => {
    const day = new Date().getDay();
    if (day === 6) return 'OT';
    return 'general';
  });
  const [attendancePoints, setAttendancePoints] = useState<number>(20);

  // Scan states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; studentName?: string } | null>(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownDuration, setCooldownDuration] = useState<number>(1.5); // Customizable delay between scans (Default: 1.5s)
  const [cameraPermissionError, setCameraPermissionError] = useState<boolean>(false);
  
  // Session Scan Counter (persists on refresh)
  const [sessionScanCount, setSessionScanCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendanceSessionCount');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  // Manual & Lists States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualFilterGroup, setManualFilterGroup] = useState<'all' | 'OT' | 'NT' | 'S'>('all');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);
  const isCameraRequestedRef = useRef(false);

  // 1. Fetch Seasons
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'seasons'), orderBy('startDate', 'desc')), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Season));
      setSeasons(list);
      
      const activeObj = list.find(s => s.isActive);
      if (activeObj) {
        setActiveSeason(activeObj);
      } else if (list.length > 0) {
        setActiveSeason(list[0]);
      } else {
        const defaultId = `season_${Date.now()}`;
        const defaultSeason: Season = {
          id: defaultId,
          name: "السيزون الأول (٣ شهور) 🍂",
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isActive: true
        };
        setDoc(doc(db, 'seasons', defaultId), defaultSeason).then(() => {
          setActiveSeason(defaultSeason);
        });
      }
    });

    return () => unsub();
  }, []);

  // 1b. Fetch Lectures
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'lectures'), orderBy('date', 'desc')), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture));
      setLectures(list);
      
      const activeObj = list.find(l => l.isActive);
      if (activeObj) {
        setActiveLecture(activeObj);
        setMeetingType(activeObj.meetingType || "general");
      } else if (list.length > 0) {
        setActiveLecture(list[0]);
        setMeetingType(list[0].meetingType || "general");
      } else {
        // Create a default lecture first
        const defaultId = `lecture_${Date.now()}`;
        const defaultLec: Lecture = {
          id: defaultId,
          name: "المحاضرة الأولى (سفر التكوين) 📖",
          date: getLocalDateStr(),
          startTime: "19:00",
          meetingType: "OT",
          isActive: true
        };
        setDoc(doc(db, 'lectures', defaultId), defaultLec).then(() => {
          setActiveLecture(defaultLec);
          setMeetingType("OT");
        });
      }
    });

    return () => unsub();
  }, []);

  // Cooldown countdown manager
  useEffect(() => {
    let timerId: any;
    if (isCooldown && cooldownSeconds > 0) {
      timerId = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 0.1) {
            clearInterval(timerId);
            setIsCooldown(false);
            isProcessingScanRef.current = false;
            // Keeps scanResult set to persist as the "last scan" history card
            return 0;
          }
          return Number((prev - 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isCooldown, cooldownSeconds]);

  // 2. Fetch Students
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snap) => {
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setStudents(list);
      }
    );
    return () => unsub();
  }, []);

  // 3. Fetch Attendance Logs for current season
  useEffect(() => {
    if (!activeSeason) return;

    const unsub = onSnapshot(
      query(collection(db, 'attendance'), where('seasonId', '==', activeSeason.id), orderBy('timestamp', 'desc')),
      (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
        setAttendanceLogs(list);
      }
    );
    return () => unsub();
  }, [activeSeason]);

  // Clean-up scanner on unmount
  useEffect(() => {
    return () => {
      isCameraRequestedRef.current = false;
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Create Season helper
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName || !newSeasonStart || !newSeasonEnd) return;
    setIsCreatingSeason(true);

    try {
      const seasonId = `season_${Date.now()}`;
      const newSeason: Season = {
        id: seasonId,
        name: newSeasonName,
        startDate: newSeasonStart,
        endDate: newSeasonEnd,
        isActive: seasons.length === 0 // Active by default if it is the first one
      };

      await setDoc(doc(db, 'seasons', seasonId), newSeason);
      setNewSeasonName('');
      setNewSeasonStart('');
      setNewSeasonEnd('');
      
      triggerSuccessConfetti();
    } catch (err) {
      console.error("Failed to create season:", err);
    } finally {
      setIsCreatingSeason(false);
    }
  };

  // Toggle Season active state
  const handleToggleSeasonActive = async (targetId: string) => {
    try {
      const batch = writeBatch(db);
      seasons.forEach((s) => {
        batch.update(doc(db, 'seasons', s.id), {
          isActive: s.id === targetId
        });
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to change active season:", err);
    }
  };

  // Delete Season helper
  const handleDeleteSeason = async (seasonId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السيزون نهائياً؟ سيتم حذف السجل المرتبط به.")) return;
    try {
      await deleteDoc(doc(db, 'seasons', seasonId));
    } catch (err) {
      console.error("Failed to delete season:", err);
    }
  };

  // Create Lecture helper
  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLecName || !newLecDate || !newLecTime) return;
    setIsCreatingLecture(true);

    try {
      if (editingLecture) {
        const updatedLec: Lecture = {
          ...editingLecture,
          name: newLecName,
          date: newLecDate,
          startTime: newLecTime,
          meetingType: newLecType
        };
        await setDoc(doc(db, 'lectures', editingLecture.id), updatedLec);
        setEditingLecture(null);
      } else {
        const id = `lecture_${Date.now()}`;
        const newLec: Lecture = {
          id,
          name: newLecName,
          date: newLecDate,
          startTime: newLecTime,
          meetingType: newLecType,
          isActive: lectures.length === 0
        };

        await setDoc(doc(db, 'lectures', id), newLec);
      }
      setNewLecName('');
      triggerSuccessConfetti();
    } catch (err) {
      console.error("Failed to save lecture:", err);
    } finally {
      setIsCreatingLecture(false);
    }
  };

  const handleToggleLectureActive = async (targetId: string) => {
    try {
      const batch = writeBatch(db);
      lectures.forEach((l) => {
        batch.update(doc(db, 'lectures', l.id), {
          isActive: l.id === targetId
        });
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to switch lecture active state:", err);
    }
  };

  const handleDeleteLecture = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lectures', id));
      setLectureToDelete(null);
    } catch (err) {
      console.error("Failed to delete lecture:", err);
    }
  };

  // Helper: Core method to log attendance for a student with automatic time dynamic point scaling
  const registerStudentAttendance = async (
    studentUid: string, 
    studentCode: string, 
    studentName: string,
    meeting: 'OT' | 'NT' | 'general',
    customTime?: string,
    customDate?: string,
    customIsSimulated: boolean = false
  ): Promise<{ success: boolean; message: string; pointsAwarded: number; timeLogged: string }> => {
    if (!activeSeason) {
      return { success: false, message: "الرجاء تحديد السيزون النشط أولاً!", pointsAwarded: 0, timeLogged: "" };
    }

    const todayStr = customDate || getLocalDateStr();
    const logTimeStr = customTime || getLocalTimeStr();

    // 1. Verify if already registered today for this meeting type
    const dupCheck = query(
      collection(db, 'attendance'),
      where('seasonId', '==', activeSeason.id),
      where('studentId', '==', studentUid),
      where('date', '==', todayStr),
      where('meetingType', '==', meeting)
    );
    
    const dupSnap = await getDocs(dupCheck);
    if (!dupSnap.empty) {
      return { 
        success: true, 
        message: `تم تسجيل حضور ${studentName} مسبقاً اليوم.`, 
        pointsAwarded: 0, 
        timeLogged: logTimeStr 
      };
    }

    // Determine config lecture and start time
    const startTimeStr = activeLecture ? activeLecture.startTime : "19:00";
    const lectureNameStr = activeLecture ? activeLecture.name : (meeting === 'OT' ? 'طلاب اونلاين' : 'طلاب الورشة');

    // Calculate dynamic points points
    const calcResult = calculateDynamicPoints(startTimeStr, logTimeStr, todayStr);
    
    // Check if scan time is within 7:00 PM (19:00) to 9:00 PM (21:00) inclusive
    let isWithinPointsWindow = false;
    try {
      const [logH, logM] = logTimeStr.split(':').map(Number);
      if (!isNaN(logH) && !isNaN(logM)) {
        const totalMinutes = logH * 60 + logM;
        if (totalMinutes >= 18 * 60 && totalMinutes <= 21 * 60) {
          isWithinPointsWindow = true;
        }
      }
    } catch (e) {
      console.error("Error checking points window:", e);
    }

    const points = isWithinPointsWindow ? calcResult.points : 0;

    try {
      // 2. Add Attendance Record
      const newLog = {
        studentId: studentUid,
        studentName: studentName,
        studentCode: studentCode.toUpperCase(),
        date: todayStr,
        timestamp: new Date().toISOString(),
        seasonId: activeSeason.id,
        meetingType: meeting,
        points: points,
        lectureId: activeLecture ? activeLecture.id : 'default',
        lectureName: lectureNameStr,
        scanTime: logTimeStr,
        isSimulated: customIsSimulated
      };

      await addDoc(collection(db, 'attendance'), newLog);

      // 3. Award points and XP to student
      const studentRef = doc(db, 'users', studentUid);
      
      const currentStorePoints = targetStudent.storePoints ?? targetStudent.totalPoints ?? 0;
      const currentCumulative = targetStudent.cumulativePoints ?? targetStudent.totalPoints ?? 0;

      await updateDoc(studentRef, {
        totalPoints: targetStudent.totalPoints + points,
        cumulativePoints: currentCumulative + points,
        xp: targetStudent.xp + points,
        storePoints: currentStorePoints + points,
        sidebarSettings: {
          ...(targetStudent.sidebarSettings || {}),
          storePoints: currentStorePoints + points
        }
      });

      // Distinguish Servant vs Student cleanly
      const isServ = studentCode.toUpperCase().startsWith('S');
      const rolePrefix = isServ ? "الخادم" : "الطالب";

      let detailMsg = `تم تسجيل حضور ${rolePrefix} ${studentName} بنجاح الساعة ${logTimeStr}.`;
      
      const gracePeriod = todayStr === '2026-07-25' ? 5 : 15;
      const graceText = todayStr === '2026-07-25' ? "الخمس دقائق الأولى" : "الربع ساعة الأولى";

      if (!isWithinPointsWindow) {
        detailMsg += ` (خارج الفترة المحددة للنقاط من 6-9 مساءً)، ولم يتم احتساب نقاط. 🕒`;
      } else if (calcResult.minutesLate <= gracePeriod) {
        detailMsg += ` (خلال ${graceText})، وحصل على الدرجة الكاملة: 20 من 20 درجة! 🎉`;
      } else {
        detailMsg += ` (متأخر ${calcResult.minutesLate} دقيقة - يقل ${calcResult.penalty} درجة)، وحصل على ${points} من 20 درجة. 🕒`;
      }

      return { 
        success: true, 
        message: detailMsg, 
        pointsAwarded: points, 
        timeLogged: logTimeStr 
      };
    } catch (err) {
      console.error("Error writing attendance:", err);
      return { success: false, message: "حدث خطأ إلكتروني أثناء حفظ البيانات.", pointsAwarded: 0, timeLogged: "" };
    }
  };

  // Revert attendance (Delete log, subtract points)
  const handleRevertAttendance = async (log: AttendanceLog) => {
    if (!window.confirm(`هل تريد إلغاء الحضور للطالب ${log.studentName}؟ سيتم خصم ${log.points} نقطة من رصيده.`)) return;

    try {
      const student = students.find(s => s.uid === log.studentId);
      if (!student) throw new Error("Student not found");

      const currentStorePoints = student.storePoints ?? student.totalPoints ?? 0;
      const currentCumulative = student.cumulativePoints ?? student.totalPoints ?? 0;

      // Subtract points from student
      const studentRef = doc(db, 'users', log.studentId);
      await updateDoc(studentRef, {
        totalPoints: student.totalPoints - log.points,
        cumulativePoints: currentCumulative - log.points,
        xp: student.xp - log.points,
        storePoints: currentStorePoints - log.points,
        sidebarSettings: {
          ...(student.sidebarSettings || {}),
          storePoints: currentStorePoints - log.points
        }
      });

      // Delete the log document
      await deleteDoc(doc(db, 'attendance', log.id));
      triggerSuccessConfetti();
    } catch (error) {
      console.error("Failed to revert attendance:", error);
      alert("حدث خطأ أثناء إلغاء الحضور.");
    }
  };

  // Edit attendance points
  const handleEditPoints = async (log: AttendanceLog) => {
    const newPointsStr = window.prompt(`تعديل درجات الحضور للطالب ${log.studentName}؟\nالدرجة الحالية: ${log.points}\nأدخل الدرجة الجديدة:`, log.points.toString());
    if (newPointsStr === null || newPointsStr.trim() === '') return;
    
    const newPoints = parseInt(newPointsStr, 10);
    if (isNaN(newPoints) || newPoints < 0) {
      alert("الرجاء إدخال رقم صحيح.");
      return;
    }

    if (newPoints === log.points) return; // No change

    const pointsDiff = newPoints - log.points;

    if (!window.confirm(`تأكيد تعديل الدرجة من ${log.points} إلى ${newPoints}؟`)) return;

    try {
      // 1. Update the log document
      const logRef = doc(db, 'attendance', log.id);
      await updateDoc(logRef, {
        points: newPoints
      });

      // 2. Update the student document
      const student = students.find(s => s.uid === log.studentId);
      if (!student) throw new Error("Student not found");

      const currentStorePoints = student.storePoints ?? student.totalPoints ?? 0;
      const currentCumulative = student.cumulativePoints ?? student.totalPoints ?? 0;

      const studentRef = doc(db, 'users', log.studentId);
      await updateDoc(studentRef, {
        totalPoints: student.totalPoints + pointsDiff,
        cumulativePoints: currentCumulative + pointsDiff,
        xp: student.xp + pointsDiff,
        storePoints: currentStorePoints + pointsDiff,
        sidebarSettings: {
          ...(student.sidebarSettings || {}),
          storePoints: currentStorePoints + pointsDiff
        }
      });

      triggerSuccessConfetti();
    } catch (error) {
      console.error("Failed to edit attendance points:", error);
      alert("حدث خطأ أثناء تعديل النقاط.");
    }
  };

  // CAMERA SCANNER FUNCTIONS
  const startCamera = async () => {
    setScanResult(null);
    setCameraPermissionError(false);
    setIsCameraActive(true);
    isCameraRequestedRef.current = true;
    
    // Hard clear DOM container to remove any lingering video or table elements from previous sessions
    const container = document.getElementById("scanner-viewport");
    if (container) {
      container.innerHTML = "";
    }

    setTimeout(async () => {
      if (!isCameraRequestedRef.current) return;
      try {
        let html5Qr = html5QrCodeRef.current;
        if (!html5Qr) {
          html5Qr = new Html5Qrcode("scanner-viewport");
          html5QrCodeRef.current = html5Qr;
        }

        // Fetch cameras with graceful catch
        let devices: any[] = [];
        try {
          devices = await Html5Qrcode.getCameras();
          setCameras(devices);
        } catch (camErr) {
          console.warn("Failed to query camera devices list, falling back to direct facing constraints:", camErr);
        }
        
        let deviceId: any = null;
        if (devices && devices.length > 0) {
          deviceId = devices[0]?.id;
          // Prefer back camera if available
          const backCam = devices.find(d => {
            const label = (d.label || "").toLowerCase();
            return label.includes('back') || label.includes('environment') || label.includes('خلفية') || label.includes('الكاميرا الخلفية');
          });
          if (backCam) {
            deviceId = backCam.id;
          }
        }
        
        if (deviceId) {
          setSelectedCameraId(deviceId);
          if (isCameraRequestedRef.current) {
            await handleScanWithDevice(deviceId);
          }
        } else {
          // Fall back directly to facingMode constraint. It prompts permission request dynamically.
          console.log("No specific device id found, starting with facingMode: environment constraint.");
          if (isCameraRequestedRef.current) {
            await handleScanWithDevice({ facingMode: "environment" });
          }
        }
      } catch (err: any) {
        console.error("Camera startup error:", err);
        setIsCameraActive(false);
        const errStr = String(err).toLowerCase();
        const isPermissionDenial = errStr.includes("notallowed") || errStr.includes("permission") || errStr.includes("denied") || errStr.includes("media") || (err && err.name === "NotAllowedError");
        if (isPermissionDenial) {
          setCameraPermissionError(true);
        }
        setScanResult({ success: false, message: `أخفق تشغيل الكاميرا (${err?.message || err}). تأكد من إعطاء الصلاحيات اللازمة للموقع.` });
      }
    }, 150); // Fast delay works since target is always mounted now
  };

  const handleScanWithDevice = async (cameraSel: any) => {
    if (!html5QrCodeRef.current || !isCameraRequestedRef.current) return;
    
    try {
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const onScanSuccess = async (decodedText: string) => {
        if (isProcessingScanRef.current) return;
        isProcessingScanRef.current = true;

        try {
          const playBuzzer = () => {
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(180, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
              osc.start();
              osc.frequency.setValueAtTime(140, audioCtx.currentTime + 0.15);
              osc.stop(audioCtx.currentTime + 0.3);
            } catch (audioErr) {
              console.warn("Audio Context blocked or unsupported:", audioErr);
            }
          };

          // Expected QR payload format -> alhekaya:presence:UID:CODE
          if (decodedText.startsWith('alhekaya:presence:')) {
            const parts = decodedText.split(':');
            const studentUid = parts[2];
            const studentCode = parts[3];

            // Match student offline/online
            const targetStudent = students.find(s => s.uid === studentUid || s.code?.toUpperCase() === studentCode?.toUpperCase());
            if (targetStudent) {
              // Register
              const result = await registerStudentAttendance(
                targetStudent.uid,
                targetStudent.code,
                targetStudent.fullName,
                meetingType,
                isTestMode ? simTime : undefined,
                isTestMode ? simDate : undefined,
                isTestMode
              );

              if (result.success) {
                setScanResult({ success: true, message: result.message, studentName: targetStudent.fullName });
                setIsCooldown(true);
                setCooldownSeconds(cooldownDuration);
                
                // Increment session counter
                setSessionScanCount(prev => {
                  const next = prev + 1;
                  if (typeof window !== 'undefined') localStorage.setItem('attendanceSessionCount', next.toString());
                  return next;
                });

                triggerSuccessConfetti();
                // Play quick audio synthesized beep
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch success beep
                  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                  osc.start();
                  osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime + 0.08);
                  osc.stop(audioCtx.currentTime + 0.2);
                } catch (audioErr) {
                  console.warn("Audio beep context blocked or unsupported:", audioErr);
                }
              } else {
                setScanResult({ success: false, message: result.message, studentName: targetStudent.fullName });
                setIsCooldown(true);
                setCooldownSeconds(cooldownDuration);
                playBuzzer();
              }
            } else {
              setScanResult({ success: false, message: "كود غير مسجل. هذا المعرف لا يتطابق مع أي حساب طالب نشط في الحكايات." });
              setIsCooldown(true);
              setCooldownSeconds(cooldownDuration);
              playBuzzer();
            }
          } else {
            setScanResult({ success: false, message: "كود QR غير صالح. يرجى مسح الرمز المخصص من بطاقة الطالب." });
            setIsCooldown(true);
            setCooldownSeconds(cooldownDuration);
            playBuzzer();
          }
        } catch (innerErr: any) {
          console.error("Scanning decoding run exception:", innerErr);
          setScanResult({ success: false, message: `تعذر إتمام قراءة الحضور: ${innerErr?.message || innerErr}` });
          setIsCooldown(true);
          setCooldownSeconds(cooldownDuration);
        }
      };

      const onScanFailure = () => {
        // Continuous scanning failure - silent
      };

      try {
        // Option A: Try standard back camera facing mode
        await html5QrCodeRef.current.start(
          cameraSel,
          {
            fps: 20,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: Math.max(160, Math.min(260, size)), height: Math.max(160, Math.min(260, size)) };
            }
          },
          onScanSuccess,
          onScanFailure
        );
      } catch (firstErr: any) {
        console.warn("First scan trial failed, trying softer constraints...", firstErr);
        try {
          // Option B: Try selection with completely empty config
          await html5QrCodeRef.current.start(
            cameraSel,
            {} as any,
            onScanSuccess,
            onScanFailure
          );
        } catch (secondErr: any) {
          console.warn("Second scan trial failed, trying with facingMode: environment constraint...", secondErr);
          try {
            // Option C: Try environment (rear camera mode) with qrbox
            await html5QrCodeRef.current.start(
              { facingMode: "environment" },
              { fps: 20 },
              onScanSuccess,
              onScanFailure
            );
          } catch (thirdErr: any) {
            console.warn("Third scan trial failed, trying with raw user facing mode fallback...", thirdErr);
            // Option D: Absolute fallback with minimal constraints
            await html5QrCodeRef.current.start(
              { facingMode: "user" },
              {} as any,
              onScanSuccess,
              onScanFailure
            );
          }
        }
      }
    } catch (err: any) {
      console.error("Error switching device:", err);
      setIsCameraActive(false);
      const errStr = String(err).toLowerCase();
      const isPermissionDenial = errStr.includes("notallowed") || errStr.includes("permission") || errStr.includes("denied") || errStr.includes("media") || (err && err.name === "NotAllowedError");
      if (isPermissionDenial) {
        setCameraPermissionError(true);
      }
      setScanResult({
        success: false,
        message: `أخفق تشغيل الكاميرا (${err?.message || err}). يرجى منح صلاحيات الكاميرا وإعادة المحاولة.`
      });
    }
  };

  const stopCamera = async () => {
    isCameraRequestedRef.current = false;
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error("Camera stop error:", err);
      }
    }
    setIsCameraActive(false);
    setIsCooldown(false);
    isProcessingScanRef.current = false;
    setScanResult(null);
  };

  // Manual search & filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const upperCode = student.code?.toUpperCase() || "";
    if (manualFilterGroup === 'all') return matchesSearch;
    if (manualFilterGroup === 'OT') return matchesSearch && upperCode.startsWith('H');
    if (manualFilterGroup === 'NT') return matchesSearch && upperCode.startsWith('N');
    if (manualFilterGroup === 'S') return matchesSearch && upperCode.startsWith('S');
    return matchesSearch;
  });

  // Calculate stats for current season reports
  const studentStats = students.map(st => {
    const logs = attendanceLogs.filter(l => l.studentId === st.uid);
    const otCount = logs.filter(l => l.meetingType === 'OT').length;
    const ntCount = logs.filter(l => l.meetingType === 'NT').length;
    const genCount = logs.filter(l => l.meetingType === 'general').length;
    const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);

    return {
      uid: st.uid,
      name: st.fullName,
      code: st.code,
      team: st.code?.toUpperCase().startsWith('H') ? "طلاب اونلاين" : 
            st.code?.toUpperCase().startsWith('N') ? "طلاب الورشة" :
            st.code?.toUpperCase().startsWith('S') ? "خدام" : "عام",
      otCount,
      ntCount,
      genCount,
      totalCount: logs.length,
      totalPoints
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  // EXPORT TO EXCEL
  const handleExportExcel = () => {
    if (studentStats.length === 0) return;

    try {
      const workbook = XLSX.utils.book_new();

      // 1. Sheet 1: الملخص العام (Overall cumulative stats)
      const dataToExport = studentStats.map((stat, idx) => ({
        'الترتيب': idx + 1,
        'اسم الطالب': stat.name,
        'الكود الشخصي': stat.code,
        'الفئة / المجموعة': stat.team,

        'إجمالي أيام الحضور': stat.totalCount,
        'مجموع نقاط الحضور الحالية': stat.totalPoints
      }));

      const summaryWorksheet = XLSX.utils.json_to_sheet(dataToExport);
      summaryWorksheet['!dir'] = 'rtl';
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "الملخص العام");

      // 2. Individual sheets per meeting/lecture
      interface MeetingGroup {
        date: string;
        meetingType: 'OT' | 'NT' | 'general';
        lectureName: string;
        logs: typeof attendanceLogs;
      }

      const meetingsMap: Record<string, MeetingGroup> = {};
      attendanceLogs.forEach((log) => {
        const key = `${log.date}_${log.meetingType}_${log.lectureName || 'default'}`;
        if (!meetingsMap[key]) {
          meetingsMap[key] = {
            date: log.date,
            meetingType: log.meetingType,
            lectureName: log.lectureName || (log.meetingType === 'OT' ? 'طلاب اونلاين' : log.meetingType === 'NT' ? 'طلاب الورشة' : 'اجتماع عام'),
            logs: []
          };
        }
        meetingsMap[key].logs.push(log);
      });

      // Sort meetings with the most recent first
      const sortedMeetings = Object.values(meetingsMap).sort((a, b) => b.date.localeCompare(a.date));

      const usedNames = new Set<string>();

      sortedMeetings.forEach((meeting) => {
        const meetingData = meeting.logs.map((log, lIdx) => {
          const student = students.find(s => s.uid === log.studentId);
          const studentTeam = student && student.code?.toUpperCase().startsWith('H') ? "طلاب اونلاين" :
                             student && student.code?.toUpperCase().startsWith('N') ? "طلاب الورشة" :
                             student && student.code?.toUpperCase().startsWith('S') ? "خدام" : "عام";
          return {
            'الترتيب': lIdx + 1,
            'اسم الطالب': log.studentName || student?.fullName || '',
            'الكود الشخصي': log.studentCode || student?.code || '',
            'الفئة / المجموعة': studentTeam,
            'تاريخ الحضور': log.date,
            'ساعة رصد الحضور دقيقة بدقيقة': log.scanTime || 'غير مسجل',
            'النقاط المكسوبة': log.points,
            'طريقة الرصد': log.isSimulated ? 'محاكاة اختبارية' : 'رصد تلقائي بالماسح (الساعة)'
          };
        });

        const sheetWS = XLSX.utils.json_to_sheet(meetingData);
        sheetWS['!dir'] = 'rtl';

        // Clean & truncate sheet name (Excel maximum 31 characters limit, clean / \ ? * [ ] : )
        const rawSheetName = `${meeting.date} ${meeting.lectureName}`;
        const cleanSheetName = rawSheetName.replace(/[\\/?*[\]:]/g, ' ').substring(0, 30).trim();

        let uniqueName = cleanSheetName || "محاضرة غير مسمى";
        let counter = 1;
        while (usedNames.has(uniqueName.toLowerCase())) {
          counter++;
          const suffix = ` (${counter})`;
          uniqueName = cleanSheetName.substring(0, 30 - suffix.length) + suffix;
        }
        usedNames.add(uniqueName.toLowerCase());

        XLSX.utils.book_append_sheet(workbook, sheetWS, uniqueName);
      });

      const fileName = `attendance_report_${activeSeason?.name || 'season'}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Export error:", err);
      alert("حدث خطأ أثناء تحميل ملف الإكسيل.");
    }
  };

  const handlePrintTodayPDF = () => {
    if (todaysMeetingLogs.length === 0) return;

    const tableBody = todaysMeetingLogs.map((log, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${log.studentName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${log.studentCode}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${log.scanTime || '--:--'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${log.studentCode?.toUpperCase().startsWith('S') ? 'خادم' : (log.studentCode?.toUpperCase().startsWith('N') ? 'طلاب الورشة' : (log.studentCode?.toUpperCase().startsWith('H') ? 'طلاب اونلاين' : 'طالب'))}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${log.points}</td>
      </tr>
    `).join('');

    const html = `
      <html dir="rtl">
        <head>
          <title>تقرير حضور اليوم - ${todayDateStr}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background-color: #fce7f3; padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: center; }
            h1 { text-align: center; color: #b91c1c; font-size: 24px; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 14px; }
            .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; display: flex; justify-content: space-around; font-weight: bold; font-size: 16px; border: 1px solid #eee; }
            .summary span { color: #111827; }
            .summary span.highlight { color: #b91c1c; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 500);">
          <h1>تقرير الحضور اليومي - الكنيسة</h1>
          <div class="subtitle">التاريخ: ${todayDateStr} | الاجتماع: ${activeLecture ? activeLecture.name : (meetingType === 'OT' ? 'طلاب اونلاين' : meetingType === 'NT' ? 'طلاب الورشة' : 'عام')}</div>
          
          <div class="summary">
            <span>إجمالي الحاضرين: <span class="highlight">${totalAttendedToday}</span></span>
            <span>الطلاب: <span class="highlight">${studentsAttendedCount}</span></span>
            <span>الخدام: <span class="highlight">${servantsAttendedCount}</span></span>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">م</th>
                <th>اسم الحاضر</th>
                <th width="15%">الكود</th>
                <th width="15%">وقت الحضور</th>
                <th width="15%">الفئة</th>
                <th width="10%">النقاط</th>
              </tr>
            </thead>
            <tbody>
              ${tableBody}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Setup Today's variables for attendance summary
  const todayDateStr = getLocalDateStr();
  const todaysMeetingLogs = attendanceLogs
    .filter(l => l.date === todayDateStr && l.meetingType === meetingType)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const totalAttendedToday = todaysMeetingLogs.length;
  const servantsAttendedCount = todaysMeetingLogs.filter(l => l.studentCode?.toUpperCase().startsWith('S')).length;
  const studentsAttendedCount = totalAttendedToday - servantsAttendedCount;

  // ── REPORT TAB: compute per-student attendance stats ──────────────────────
  const totalMeetingsCount = useMemo(() => {
    const uniqueDates = new Set(attendanceLogs.map(l => l.date));
    return uniqueDates.size || 1;
  }, [attendanceLogs]);

  const studentReportData = useMemo(() => {
    return students
      .filter(s => s.isActive)
      .map(student => {
        const studentLogs = attendanceLogs.filter(l => l.studentId === student.uid);
        const totalAttended = studentLogs.length;

        // Last attendance date
        const sortedLogs = [...studentLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const lastLog = sortedLogs[0];
        const lastAttendedDate = lastLog?.date || null;

        // Weeks absent
        let weeksAbsent = 0;
        if (lastAttendedDate) {
          const last = new Date(lastAttendedDate);
          const today = new Date(todayDateStr);
          const diffMs = today.getTime() - last.getTime();
          weeksAbsent = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        } else {
          weeksAbsent = 999; // never attended
        }

        // Attendance rate
        const attendanceRate = Math.round((totalAttended / totalMeetingsCount) * 100);

        // Status
        let status: 'present' | 'warning' | 'danger' | 'critical';
        if (weeksAbsent === 0) status = 'present';
        else if (weeksAbsent <= 1) status = 'warning';
        else if (weeksAbsent <= 3) status = 'danger';
        else status = 'critical';

        // Detect group
        const code = (student.code || '').toUpperCase();
        const group: 'S' | 'OT' | 'NT' | 'H' =
          code.startsWith('S') ? 'S'
          : code.startsWith('N') ? 'NT'
          : code.startsWith('H') ? 'H'
          : 'OT';

        return {
          ...student,
          totalAttended,
          lastAttendedDate,
          weeksAbsent,
          attendanceRate,
          status,
          group
        };
      })
      .sort((a, b) => b.weeksAbsent - a.weeksAbsent);
  }, [students, attendanceLogs, todayDateStr, totalMeetingsCount]);

  const filteredReportData = useMemo(() => {
    return studentReportData.filter(s => {
      const matchSearch = !reportSearch ||
        s.fullName.toLowerCase().includes(reportSearch.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(reportSearch.toLowerCase());
      const matchGroup = reportGroupFilter === 'all' ||
        (reportGroupFilter === 'S' && s.group === 'S') ||
        (reportGroupFilter === 'OT' && (s.group === 'OT' || s.group === 'H')) ||
        (reportGroupFilter === 'NT' && s.group === 'NT');
      const matchAbsence = reportAbsenceFilter === 'all' || s.status === reportAbsenceFilter;
      return matchSearch && matchGroup && matchAbsence;
    });
  }, [studentReportData, reportSearch, reportGroupFilter, reportAbsenceFilter]);

  const formatLastDate = (dateStr: string | null): string => {
    if (!dateStr) return 'لم يحضر أبداً';
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const openWhatsApp = (phone?: string, name?: string) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean) { alert('لا يوجد رقم واتساب مسجل لهذا المخدوم.'); return; }
    const intl = clean.startsWith('0') ? '2' + clean : clean.startsWith('20') ? clean : '20' + clean;
    const msg = encodeURIComponent(`السلام عليكم ${name || ''}، 🙏\nاشتقنالك وحنعمل افتقاد معاك..`);
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  const callStudent = (phone?: string) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean) { alert('لا يوجد رقم مسجل لهذا المخدوم.'); return; }
    window.open(`tel:${clean}`);
  };

  const exportReportToExcel = () => {
    try {
      const data = filteredReportData.map((s, i) => ({
        'م': i + 1,
        'الاسم': s.fullName,
        'الكود': s.code || '',
        'الكنيسة': s.church || '',
        'الواتساب': s.whatsappNumber || '',
        'مرات الحضور': s.totalAttended,
        'نسبة الحضور %': s.attendanceRate,
        'آخر حضور': formatLastDate(s.lastAttendedDate),
        'أسابيع غياب': s.weeksAbsent === 999 ? 'لم يحضر' : s.weeksAbsent,
        'الحالة': s.status === 'present' ? 'منتظم' : s.status === 'warning' ? 'تحذير' : s.status === 'danger' ? 'خطر' : 'حرج'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!dir'] = 'rtl';
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير المخدومين');
      XLSX.writeFile(wb, `تقرير_الحضور_${activeSeason?.name || 'السيزون'}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء التصدير.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 bg-brand-cream min-h-screen text-[#1C0606] max-w-7xl mx-auto space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[32px] border border-brand-beige/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-brand-red text-white rounded-2xl shadow-md transform rotate-3">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-text">سجل الحضور والغياب الذكي</h1>
            <p className="text-[10px] sm:text-xs text-brand-beige font-black uppercase tracking-widest mt-1">
              تسجيل حضور الطلاب بالـ QR Code وتجميع نقاط السيزون
            </p>
          </div>
        </div>

        {/* Season Indicator / Selection */}
        <div className="flex flex-col items-end gap-1 bg-brand-cream/40 border border-brand-beige/5 p-4 rounded-2xl w-full md:w-auto">
          <span className="text-[9px] font-black text-brand-beige uppercase tracking-wider">السيزون النشط حالياً</span>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-brand-red" />
            <select 
              value={activeSeason?.id || ''} 
              onChange={(e) => {
                const s = seasons.find(se => se.id === e.target.value);
                if (s) setActiveSeason(s);
              }}
              className="font-bold text-sm bg-transparent border-none text-brand-text cursor-pointer focus:ring-0 text-right font-sans"
            >
              {seasons.map((s, idx) => (
                <option key={`${s.id || idx}-${idx}`} value={s.id}>{s.name} {s.isActive ? '(نشط)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto custom-scrollbar hide-scrollbar gap-2.5 bg-brand-text p-1.5 rounded-[24px]">
        {[
          { id: 'scan', label: 'ماسح الـ QR للطلاب', icon: QrCode },
          { id: 'manual', label: 'تسجيل يدوي سريع', icon: Users },
          { id: 'report', label: 'تقرير المخدومين', icon: BarChart3 },
          { id: 'lectures', label: 'إدارة مواعيد المحاضرات', icon: Clock },
          { id: 'logs', label: 'سجلات الحضور والتقارير', icon: BookOpen },
          { id: 'seasons', label: 'إدارة الفترات (السيزونز)', icon: CalendarRangeIcon }
        ].map((tab, idx) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`${tab.id}-${idx}`}
              onClick={() => {
                stopCamera();
                setActiveTab(tab.id as any);
              }}
              className={cn(
                "flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all uppercase tracking-tight whitespace-nowrap",
                isActive 
                  ? "bg-brand-red text-white shadow-md shadow-brand-red/10 animate-fade-in" 
                  : "text-white/40 hover:text-white"
              )}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB VIEW CONTROLLER */}
      <div className="bg-white rounded-[40px] border border-brand-beige/10 p-6 sm:p-10 shadow-sm min-h-[400px]">

        {/* TAB: ATTENDANCE REPORT */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-brand-text flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-brand-red" />
                  </div>
                  تقرير حالة المخدومين
                </h2>
                <p className="text-xs text-brand-beige font-semibold mt-1 mr-13">
                  {filteredReportData.length} مخدوم · إجمالي {totalMeetingsCount} اجتماعات في السيزون
                </p>
              </div>
              <button
                onClick={exportReportToExcel}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                تصدير Excel
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'منتظمون', count: studentReportData.filter(s => s.status === 'present').length, color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500' },
                { label: 'تحذير (أسبوع)', count: studentReportData.filter(s => s.status === 'warning').length, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700', dotColor: 'bg-amber-500' },
                { label: 'غياب (أسبوعين+)', count: studentReportData.filter(s => s.status === 'danger').length, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700', dotColor: 'bg-orange-500' },
                { label: 'حرج (شهر+)', count: studentReportData.filter(s => s.status === 'critical').length, color: 'bg-red-50 border-red-200', textColor: 'text-brand-red', dotColor: 'bg-brand-red' },
              ].map((stat, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${stat.color} flex flex-col items-center gap-1 text-center`}>
                  <div className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                  <span className={`text-3xl font-black ${stat.textColor}`}>{stat.count}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wide ${stat.textColor} opacity-80`}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="ابحث باسم أو كود..."
                  className="w-full pr-11 pl-4 py-3 rounded-2xl bg-brand-cream/40 border border-brand-beige/10 text-sm font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-red/20 text-right placeholder:text-brand-beige"
                />
              </div>
              <select
                value={reportGroupFilter}
                onChange={e => setReportGroupFilter(e.target.value as any)}
                className="px-4 py-3 rounded-2xl bg-brand-cream/40 border border-brand-beige/10 text-sm font-black text-brand-text focus:outline-none cursor-pointer"
              >
                <option value="all">كل المجموعات</option>
                <option value="OT">طلاب OT / أونلاين</option>
                <option value="NT">طلاب NT / الورشة</option>
                <option value="S">الخدام</option>
              </select>
              <select
                value={reportAbsenceFilter}
                onChange={e => setReportAbsenceFilter(e.target.value as any)}
                className="px-4 py-3 rounded-2xl bg-brand-cream/40 border border-brand-beige/10 text-sm font-black text-brand-text focus:outline-none cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="present">منتظمون ✅</option>
                <option value="warning">تحذير ⚠️</option>
                <option value="danger">غياب خطر 🟠</option>
                <option value="critical">حرج 🔴</option>
              </select>
            </div>

            {/* Students Grid */}
            {filteredReportData.length === 0 ? (
              <div className="text-center py-20 text-brand-beige font-black">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                لا يوجد مخدومون مطابقون للفلتر
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredReportData.map(student => {
                  const statusConfig = {
                    present:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-500', badgeText: 'منتظم ✅', textColor: 'text-emerald-700', barColor: 'bg-emerald-500' },
                    warning:  { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-500',   badgeText: 'تحذير ⚠️',  textColor: 'text-amber-700',   barColor: 'bg-amber-500' },
                    danger:   { bg: 'bg-orange-50',  border: 'border-orange-200',  badge: 'bg-orange-500',  badgeText: 'غائب 🟠',    textColor: 'text-orange-700',  barColor: 'bg-orange-500' },
                    critical: { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-brand-red',   badgeText: 'حرج 🔴',     textColor: 'text-brand-red',   barColor: 'bg-brand-red' },
                  }[student.status];

                  const hasPhone = !!(student.whatsappNumber);
                  const weeksText = student.weeksAbsent === 999
                    ? 'لم يحضر أبداً'
                    : student.weeksAbsent === 0
                    ? 'حضر مؤخراً 🟢'
                    : `${student.weeksAbsent} ${student.weeksAbsent === 1 ? 'أسبوع' : 'أسابيع'} غياب`;

                  return (
                    <div
                      key={student.uid}
                      className={`rounded-3xl border-2 ${statusConfig.border} ${statusConfig.bg} p-5 flex flex-col gap-4 transition-all hover:shadow-md`}
                    >
                      {/* Top: Name + badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-white border border-brand-beige/20 flex items-center justify-center shrink-0 shadow-sm">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <span className={`font-black text-lg ${statusConfig.textColor}`}>{student.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="font-black text-brand-text text-sm truncate">{student.fullName}</p>
                            <p className="text-[10px] font-bold text-brand-beige font-mono">#{student.code}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black text-white px-2.5 py-1 rounded-xl ${statusConfig.badge}`}>
                          {statusConfig.badgeText}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="space-y-2">
                        {/* Attendance Rate Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black text-brand-beige">
                            <span>نسبة الحضور</span>
                            <span className={statusConfig.textColor}>{student.attendanceRate}%</span>
                          </div>
                          <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-brand-beige/10">
                            <div
                              className={`h-full rounded-full transition-all ${statusConfig.barColor}`}
                              style={{ width: `${Math.min(student.attendanceRate, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/70 rounded-xl p-2.5 text-right border border-brand-beige/10">
                            <p className="text-[9px] font-black text-brand-beige uppercase tracking-wide">مرات الحضور</p>
                            <p className={`text-xl font-black ${statusConfig.textColor} font-sans`}>{student.totalAttended}</p>
                          </div>
                          <div className="bg-white/70 rounded-xl p-2.5 text-right border border-brand-beige/10">
                            <p className="text-[9px] font-black text-brand-beige uppercase tracking-wide">مدة الغياب</p>
                            <p className={`text-xs font-black ${statusConfig.textColor} leading-tight mt-0.5`}>{weeksText}</p>
                          </div>
                        </div>

                        {/* Last Attendance */}
                        <div className="bg-white/70 rounded-xl px-3 py-2 flex items-center gap-2 border border-brand-beige/10">
                          <CalendarDays className="w-3.5 h-3.5 text-brand-beige shrink-0" />
                          <div className="text-right min-w-0">
                            <p className="text-[9px] font-black text-brand-beige uppercase tracking-wide">آخر حضور</p>
                            <p className="text-[11px] font-bold text-brand-text truncate">{formatLastDate(student.lastAttendedDate)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: WhatsApp + Call */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openWhatsApp(student.whatsappNumber, student.fullName)}
                          disabled={!hasPhone}
                          title={hasPhone ? `واتساب ${student.fullName}` : 'لا يوجد رقم مسجل'}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-black text-[11px] transition-all ${
                            hasPhone
                              ? 'bg-[#25D366] text-white hover:bg-[#20b858] shadow-md shadow-[#25D366]/25 cursor-pointer'
                              : 'bg-brand-cream text-brand-beige cursor-not-allowed opacity-50'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          واتساب
                        </button>
                        <button
                          onClick={() => callStudent(student.whatsappNumber)}
                          disabled={!hasPhone}
                          title={hasPhone ? `اتصل بـ ${student.fullName}` : 'لا يوجد رقم مسجل'}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-black text-[11px] transition-all ${
                            hasPhone
                              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/25 cursor-pointer'
                              : 'bg-brand-cream text-brand-beige cursor-not-allowed opacity-50'
                          }`}
                        >
                          <PhoneCall className="w-4 h-4" />
                          مكالمة
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: QR CODE LIVE SCANNER */}
        {activeTab === 'scan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Control Panel (left on desktop) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-black text-brand-text">بيانات جلسة التحضير للغياب</h3>
                <p className="text-xs text-brand-beige font-semibold">تتم عملية رصد درجات الغياب والحضور ديناميكياً لتشجيع الانضباط بالمواعيد.</p>
              </div>

              {/* Attendance settings */}
              <div className="bg-brand-cream/20 p-5 rounded-3xl border border-brand-beige/5 space-y-4">
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-black text-brand-beige uppercase tracking-wider block">المحاضرة النشطة المحددة</span>
                  <div className="text-sm font-black text-brand-text">
                    {activeLecture ? activeLecture.name : "طلاب اونلاين"}
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2 bg-brand-cream/50 p-2.5 rounded-xl border border-brand-beige/10">
                    <span className="font-semibold text-brand-beige">موعد البدء المقرر</span>
                    <span className="font-extrabold text-brand-red font-sans">{activeLecture ? activeLecture.startTime : "19:00"} م</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-brand-beige/10 pt-3 text-right">
                  <span className="text-[9px] font-black text-brand-beige uppercase tracking-wider block">جدول احتساب درجات الحضور التلقائي اليوم</span>
                  <div className="text-[11px] space-y-1.5 leading-relaxed text-[#1C0606] font-bold">
                    <div className="flex gap-2 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>حتى ربع ساعة (حضور كامل): <strong className="text-emerald-700 font-black font-sans">٢٠ درجة</strong></span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                      <span>بعد ذلك: كل ٥ دقائق تأخير <strong className="text-brand-red font-black font-sans">يقل درجة واحدة</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cooldown Adjuster / Scan Speed Selector */}
              <div className="bg-brand-cream/20 p-5 rounded-3xl border border-brand-beige/5 space-y-3 text-right">
                <span className="text-[9px] font-black text-brand-beige uppercase tracking-wider block">إعدادات سرعة ومسافة المسح المتتابع (QR Delay)</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "فائق السرعة (0.5ث)", value: 0.5 },
                    { label: "سريع ومناسب (1.5ث)", value: 1.5 },
                    { label: "متأني ومريح (3ث)", value: 3.0 },
                  ].map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCooldownDuration(option.value)}
                      className={cn(
                        "p-2.5 rounded-xl text-[10px] font-black text-center transition-all border cursor-pointer",
                        cooldownDuration === option.value
                          ? "bg-[#1C0606] text-white border-[#1C0606]"
                          : "bg-white/40 text-brand-text border-brand-beige/20 hover:bg-white/60"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-brand-beige font-semibold">تحديد مدة الانتظار بين كل مسح ضوئي وآخر لمنع تكرار القراءة الخاطئة لنفس الرمز.</p>
              </div>

              {/* Simulator / Testing Suite Widget */}
              <div className="bg-[#1C0606] text-white p-5 rounded-3xl border border-brand-beige/10 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-right">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
                    <h4 className="font-extrabold text-xs text-brand-cream">نظام محاكاة واختبار الأكواد والوقت</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isTestMode} 
                      onChange={(e) => setIsTestMode(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                  </label>
                </div>

                {isTestMode && (
                  <div className="grid grid-cols-1 gap-3 text-xs pt-1 text-right">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="font-semibold text-white/60 text-[10px]">ساعة الحضور الافتراضية</span>
                        <input 
                          type="time" 
                          value={simTime || ''} 
                          onChange={(e) => setSimTime(e.target.value)} 
                          className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-2 font-bold focus:outline-none focus:border-brand-red font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-white/60 text-[10px]">تاريخ الحضور الافتراضي</span>
                        <input 
                          type="date" 
                          value={simDate || ''} 
                          onChange={(e) => setSimDate(e.target.value)} 
                          className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-2 font-bold focus:outline-none focus:border-brand-red font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <span className="font-semibold text-white/60 text-[10px] block">اختبر كود الطالب أو الخادم (محاكاة سكان)</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={simCode || ''} 
                          onChange={(e) => setSimCode(e.target.value)} 
                          placeholder="مثال: H101 (طالب) أو S05 (خادم)" 
                          className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-center font-bold font-sans uppercase placeholder:text-white/20"
                        />
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!simCode) {
                              alert("برجاء إدخال كود الطالب أو الخادم أولاً!");
                              return;
                            }
                            const target = students.find(s => s.code?.toUpperCase() === simCode.toUpperCase());
                            if (!target) {
                              setScanResult({
                                success: false,
                                message: `عذراً! لم نجد أي طالب أو خادم مسجل بالكود: ${simCode.toUpperCase()}`
                              });
                              return;
                            }
                            
                            const result = await registerStudentAttendance(
                              target.uid,
                              target.code,
                              target.fullName,
                              meetingType,
                              simTime,
                              simDate,
                              true
                            );

                            if (result.success) {
                              setSessionScanCount(prev => prev + 1);
                              setScanResult({
                                success: true,
                                message: result.message,
                                studentName: target.fullName
                              });
                              triggerSuccessConfetti();
                            } else {
                              setScanResult({
                                success: false,
                                message: result.message,
                                studentName: target.fullName
                              });
                            }
                          }}
                          className="bg-brand-red hover:bg-brand-red/90 text-white font-black px-4 rounded-xl transition-all"
                        >
                          محاكاة
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Session Counter Widget */}
              <div className="bg-brand-cream/20 p-5 rounded-3xl border border-brand-beige/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-red text-white flex items-center justify-center font-black text-xl shadow-inner">
                    {sessionScanCount}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-black text-brand-text">عداد المسح بالجلسة</h4>
                    <p className="text-[10px] font-bold text-brand-beige">يستمر العد حتى عند إعادة تحميل الصفحة</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (window.confirm('هل تريد تصفير العداد؟')) {
                      setSessionScanCount(0);
                      localStorage.removeItem('attendanceSessionCount');
                    }
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  تصفير العداد
                </button>
              </div>

              {/* Start buttons */}
              <div className="pt-2">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="w-full flex items-center justify-center gap-3 p-5 bg-brand-text text-white hover:bg-brand-red rounded-3xl font-black transition-all shadow-lg hover:scale-[1.02]"
                  >
                    <Play className="w-5 h-5" />
                    <span>تشغيل كاميرا الماسح الضوئي</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full flex items-center justify-center gap-3 p-5 bg-brand-red text-white hover:bg-brand-red/90 rounded-3xl font-black transition-all shadow-lg font-sans"
                  >
                    <Square className="w-5 h-5" />
                    <span>إيقاف تشغيل الكاميرا</span>
                  </button>
                )}
              </div>

              {/* Cameras picker dropdown */}
              {isCameraActive && cameras.length > 1 && (
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">تحديد الكاميرا النشطة</span>
                  <select
                    value={selectedCameraId || ''}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      handleScanWithDevice(e.target.value);
                    }}
                    className="w-full p-2 text-xs font-bold rounded-lg bg-brand-cream/30 border-brand-beige/20 text-[#1C0606]"
                  >
                    {cameras.map((c, idx) => (
                      <option key={`${c.id || idx}-${idx}`} value={c.id}>{c.label || 'كاميرا غير مسماة'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scan feedbacks - persistent log of last scan after overlay dismisses */}
              {!isCooldown && scanResult && (
                <div className={cn(
                  "p-5 rounded-3xl border flex items-start gap-4 animate-fade-in shadow-sm text-right",
                  scanResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : "bg-rose-50 border-rose-200 text-rose-950"
                )}>
                  {scanResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <h4 className="font-extrabold text-[10px] tracking-wider uppercase opacity-80">
                      {scanResult.success ? "آخر عملية ناجحة" : "تنبيه غياب / فشل قراءة"}
                    </h4>
                    <p className="text-xs font-bold leading-relaxed">{scanResult.message}</p>
                    {scanResult.studentName && (
                      <span className="inline-block mt-2 font-black text-[10px] text-[#1C0606] bg-white border border-[#1C0606]/10 px-3 py-1 rounded-full shadow-sm">
                        {scanResult.studentName}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Viewport Card */}
            <div className="lg:col-span-7 flex flex-col items-center justify-start w-full space-y-4">
              <div className="relative w-full aspect-square sm:aspect-video bg-[#120303] rounded-[36px] overflow-hidden shadow-2xl flex flex-col items-center justify-center border-4 border-brand-text group">
                
                {/* QR scanner live target boundaries container (Always permanently mounted with full dimensions to prevent 0x0 layout and transition-related startup failure) */}
                <div 
                  id="scanner-viewport" 
                  className="w-full h-full object-cover relative overflow-hidden bg-[#120303]" 
                />

                {/* Laser scan animation when camera is active and not on cooldown */}
                {isCameraActive && !isCooldown && (
                  <>
                    {/* Glowing scanning grid background details */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-10" />
                    
                    {/* Moving Laser lines */}
                    <div className="absolute left-0 right-0 h-0.5 bg-brand-red shadow-[0_0_12px_rgba(158,0,0,1)] animate-pulse top-1/4 pointer-events-none z-20" />
                    <div className="absolute left-0 right-0 h-0.5 bg-brand-red shadow-[0_0_12px_rgba(158,0,0,1)] animate-bounce top-1/2 pointer-events-none z-20" />
                    
                    {/* Overlay target focal boundaries box */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-brand-red/90 rounded-[32px] pointer-events-none z-20 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-white/10 rounded-[30px] animate-pulse" />
                      {/* Decorative bracket-like corners */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-red rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-red rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-red rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-red rounded-br-xl" />
                    </div>

                    {/* Static top layout status */}
                    <div className="absolute top-5 right-5 bg-brand-red text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20 border border-white/20">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>الكاميرا تعمل بث مباشر</span>
                    </div>
                  </>
                )}

                {/* If camera is not active, display gorgeous placeholder instruction screen */}
                {!isCameraActive && (
                  <div className="absolute inset-0 bg-[#120303] flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in w-full text-center z-10 overflow-y-auto">
                    {cameraPermissionError ? (
                      <div className="space-y-4 max-w-md p-5 bg-red-950/40 border border-brand-red/20 rounded-3xl">
                        <div className="relative w-16 h-16 bg-brand-red/10 text-brand-red border border-brand-red/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                          <AlertCircle className="w-8 h-8 text-brand-red" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-white text-sm font-black tracking-tight text-brand-red">خطأ في صلاحية الكاميرا (NotAllowedError)</h4>
                          <p className="text-white/80 text-[11px] font-medium leading-relaxed text-right space-y-1.5">
                            المتصفح يمنع التطبيق من فتح الكاميرا حالياً. لحل المشكلة بسهولة:
                            <span className="block text-brand-beige mt-1">
                              ١. <b>فتح في صفحة مستقلة:</b> افتح التطبيق في نافذة جديدة خارج إطار ومعاينة AI Studio لتجاوز قيود الـ iframe.
                            </span>
                            <span className="block text-brand-beige">
                              ٢. <b>صلاحيات المتصفح:</b> عند ظهور رسالة طلب صلاحية الكاميرا، اضغط على <b>سماح (Allow)</b>.
                            </span>
                            <span className="block text-brand-beige">
                              ٣. <b>إغلاق التطبيقات الأخرى:</b> تأكد من عدم استخدام الكاميرا من قبل أي تطبيق آخر (مثل زووم، تيمز أو مكالمات الفيديو).
                            </span>
                          </p>
                        </div>
                        <a 
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white font-black text-[11px] rounded-2xl transition-all shadow-lg mt-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>فتح الموقع في صفحة مستقلة آمنة</span>
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="relative w-24 h-24 bg-white/[0.03] text-brand-beige border border-white/[0.05] rounded-full flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-500">
                          <QrCode className="w-12 h-12 text-brand-beige animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                          <h4 className="text-white text-lg font-black tracking-tight">جاهز لبدء قراءة الأكواد</h4>
                          <p className="text-white/50 text-xs font-semibold leading-relaxed">
                            قم بالنقر على زر <span className="text-brand-red font-bold">تشغيل كاميرا الماسح الضوئي</span> للتفعيل وبدء رصد غياب وحضور طلاب كنيستنا تلقائياً.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Immersive Scan Status Cooldown Overlay */}
                {isCooldown && scanResult && (
                  <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center z-35 transition-all duration-300 animate-fade-in",
                    scanResult.success 
                      ? "bg-emerald-950/98" 
                      : "bg-red-950/98"
                  )}>
                    {scanResult.success ? (
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-red-400/10 border-4 border-red-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                        <XCircle className="w-12 h-12 text-red-400" />
                      </div>
                    )}

                    <div className="space-y-3 max-w-sm">
                      <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                        {scanResult.success ? "تم الحضور بنجاح!" : "تنبيه أثناء الرصد"}
                      </h3>
                      <p className="text-sm font-bold leading-relaxed opacity-95 text-brand-cream bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
                        {scanResult.message}
                      </p>
                      {scanResult.studentName && (
                        <div className="mt-3 inline-block">
                          <span className="text-base font-black text-brand-text bg-brand-cream border-2 border-brand-beige px-6 py-2 rounded-full shadow-lg block animate-pulse">
                            {scanResult.studentName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Automatic release count indicator / Skip option */}
                    <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCooldown(false);
                          isProcessingScanRef.current = false;
                          setScanResult(null);
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-black uppercase tracking-wider px-6 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer text-white shadow-md hover:scale-[1.03]"
                      >
                        <span>تجاوز الانتظار والمسح التالي ◀</span>
                      </button>
                    </div>

                    {/* Linear countdown progress bar indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/40 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-100 ease-out",
                          scanResult.success ? "bg-emerald-400" : "bg-red-400"
                        )}
                        style={{ width: `${(cooldownSeconds / cooldownDuration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Statistics Board for Active Meeting */}
              <div className="w-full bg-brand-cream/30 border border-brand-beige/20 rounded-3xl p-5 md:p-6 mt-4 shadow-sm animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                  <h3 className="text-lg font-black text-brand-text">جدول الحضور السريع لليوم</h3>
                  
                  {/* Totals Pills & Export */}
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start md:justify-end text-[10px] font-black uppercase tracking-widest text-[#1C0606]">
                    <div className="flex-1 md:flex-none bg-white border border-brand-beige/20 px-3 py-1.5 rounded-xl flex items-center justify-between md:justify-start gap-2 shadow-sm">
                       <span>الإجمالي</span>
                       <span className="bg-brand-red text-white px-2 py-0.5 rounded-md font-sans">{totalAttendedToday}</span>
                    </div>
                    <div className="flex-1 md:flex-none bg-white border border-brand-beige/20 px-3 py-1.5 rounded-xl flex items-center justify-between md:justify-start gap-2 shadow-sm">
                       <span>الطلاب</span>
                       <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md font-sans">{studentsAttendedCount}</span>
                    </div>
                    <div className="flex-1 md:flex-none bg-white border border-brand-beige/20 px-3 py-1.5 rounded-xl flex items-center justify-between md:justify-start gap-2 shadow-sm">
                       <span>الخدام</span>
                       <span className="bg-amber-600 text-white px-2 py-0.5 rounded-md font-sans">{servantsAttendedCount}</span>
                    </div>
                    
                    <div className="flex-1 md:flex-none relative">
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-beige opacity-60" />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الكود..."
                        value={liveFilterQuery}
                        onChange={(e) => setLiveFilterQuery(e.target.value)}
                        className="pl-2 pr-7 py-1.5 bg-white border border-brand-beige/20 rounded-xl text-xs font-bold w-full md:w-48 focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all text-right"
                      />
                    </div>

                    <button
                      onClick={handlePrintTodayPDF}
                      disabled={todaysMeetingLogs.length === 0}
                      className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="طباعة التقرير بصيغة PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة PDF</span>
                    </button>

                    <button
                      onClick={() => {
                        if (todaysMeetingLogs.length === 0) return;
                        const data = todaysMeetingLogs.map((log, idx) => ({
                          'م': idx + 1,
                          'اسم الحاضر': log.studentName,
                          'الكود': log.studentCode,
                          'الوقت': log.scanTime || '--:--',
                          'النقاط': log.points,
                          'النوع': log.studentCode?.toUpperCase().startsWith('S') ? 'خادم' : 'طالب'
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "حضور اليوم");
                        XLSX.writeFile(wb, `Attendance_Today_${todayDateStr}.xlsx`);
                      }}
                      disabled={todaysMeetingLogs.length === 0}
                      className="flex-1 md:flex-none bg-brand-text hover:bg-brand-red text-white border border-transparent px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="تصدير جدول اليوم"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تصدير إكسيل</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-brand-beige/10 rounded-2xl overflow-hidden min-h-[160px] max-h-[300px] overflow-y-auto overflow-x-auto custom-scrollbar">
                  {todaysMeetingLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                      <Users className="w-10 h-10 mb-2 opacity-50 text-brand-beige" />
                      <p className="text-xs font-black text-brand-text mt-2">الجدول فارغ اليوم.</p>
                      <p className="text-[10px] font-bold text-brand-beige mt-1">تتم إضافة الأسماء تلقائياً عند إجراء المسح.</p>
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#1C0606] text-white">
                        <tr>
                          <th className="p-3 font-semibold text-center w-12 border-b border-brand-beige/10">#</th>
                          <th className="p-3 font-semibold border-b border-brand-beige/10">اسم الحاضر</th>
                          <th className="p-3 font-semibold border-b border-brand-beige/10">الكود</th>
                          <th className="p-3 font-semibold border-b border-brand-beige/10">الوقت</th>
                          <th className="p-3 font-semibold border-b border-brand-beige/10">النقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-beige/10 font-bold text-brand-text">
                        {todaysMeetingLogs
                          .filter(log => !liveFilterQuery || log.studentName.toLowerCase().includes(liveFilterQuery.toLowerCase()) || log.studentCode.includes(liveFilterQuery.toUpperCase()))
                          .map((log, index) => (
                           <tr key={log.id} className="hover:bg-brand-cream/40 transition-colors">
                              <td className="p-3 text-center text-brand-beige">{index + 1}</td>
                              <td className="p-3 text-sm font-extrabold">{log.studentName}</td>
                              <td className="p-3 font-mono tracking-widest uppercase text-brand-beige">
                                 {log.studentCode}
                              </td>
                              <td className="p-3 font-sans text-brand-red">{log.scanTime || '--:--'}</td>
                              <td className="p-3 font-sans text-brand-red">+{log.points}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL REGISTRATION LIST */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-brand-text">التسجيل والبحث اليدوي في الملفات</h3>
                <p className="text-xs text-brand-beige font-semibold">تصفح الطلاب وسجل حضور الشخص يدوياً في حال لم تتوفر معهم الباقة الرقمية.</p>
              </div>

              {/* Group Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'الجميع' },
                  { id: 'OT', label: 'طلاب اونلاين (H)' },
                  { id: 'NT', label: 'طلاب الورشة (N)' },
                  { id: 'S', label: 'الخدام (S)' }
                ].map((g, idx) => (
                  <button
                    key={`${g.id}-${idx}`}
                    onClick={() => setManualFilterGroup(g.id as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      manualFilterGroup === g.id 
                        ? "bg-brand-text text-white border-brand-text" 
                        : "bg-brand-cream/30 text-brand-text border-brand-beige/10 hover:border-brand-text/10"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick configuration settings banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-brand-cream/30 rounded-2xl border border-brand-beige/5">
              <div className="flex items-center gap-3 text-brand-beige text-xs font-semibold">
                <Info className="w-4 h-4 text-brand-red shrink-0" />
                <div className="space-y-0.5 text-right">
                  <span className="block text-brand-text">
                    التسجيل اليدوي يخضع لنظام الحساب الزمني التلقائي (الربع ساعة الأولى ٢٠ درجة ثم يضل يقل درجة كل ٥ دقائق).
                  </span>
                  <span className="block text-[10px] text-brand-beige font-bold">
                    المحاضرة النشطة حالياً: <strong className="text-brand-red">{activeLecture ? activeLecture.name : "طلاب اونلاين"}</strong> - موعد البدء: <strong className="text-brand-text">{activeLecture ? activeLecture.startTime : "19:00"}</strong>
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <select 
                  value={meetingType || ''} 
                  onChange={(e) => setMeetingType(e.target.value as any)}
                  className="bg-white border border-brand-beige/15 text-xs font-bold rounded-lg px-3 py-1.5 text-right cursor-pointer"
                >
                  <option value="OT">طلاب اونلاين</option>
                  <option value="NT">طلاب الورشة</option>
                  <option value="general">اجتماع عام</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن الطالب بالاسم أو الكود لتسجيل حضوره..."
                className="w-full pr-12 pl-4 py-4 rounded-2xl bg-brand-cream/30 border border-brand-beige/15 text-sm font-bold focus:bg-white transition-all text-right"
              />
            </div>

            {/* Students List Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student, idx) => {
                const isOt = student.code?.toUpperCase().startsWith('H');
                const isNt = student.code?.toUpperCase().startsWith('N');
                const isServ = student.code?.toUpperCase().startsWith('S');

                // Check if already present today for this meeting
                const todayStr = new Date().toISOString().split('T')[0];
                const isPresentToday = attendanceLogs.some(
                  l => l.studentId === student.uid && l.date === todayStr && l.meetingType === meetingType
                );

                return (
                  <div key={`${student.uid || idx}-${idx}`} className="bg-white p-5 rounded-3xl border border-brand-beige/15 shadow-sm hover:border-brand-red/10 transition-all flex justify-between items-center group relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-red/[0.01] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="text-right space-y-1 relative z-10">
                      <h4 className="font-extrabold text-sm text-brand-text line-clamp-1">{student.fullName}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-brand-cream text-brand-beige rounded-md text-[9px] font-black">{student.code}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black text-white",
                          isOt ? "bg-blue-600" : isNt ? "bg-purple-600" : isServ ? "bg-amber-600" : "bg-gray-500"
                        )}>
                          {isOt ? "طلاب اونلاين" : isNt ? "طلاب الورشة" : isServ ? "خادم" : "عام"}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {isPresentToday ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>حاضر اليوم</span>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            const result = await registerStudentAttendance(
                              student.uid,
                              student.code,
                              student.fullName,
                              meetingType,
                              isTestMode ? simTime : undefined,
                              isTestMode ? simDate : undefined,
                              isTestMode
                            );
                            if (result.success) {
                              setScanResult({ success: true, message: result.message, studentName: student.fullName });
                              triggerSuccessConfetti();
                            } else {
                              alert(result.message);
                            }
                          }}
                          className="px-4 py-2 bg-brand-text text-white hover:bg-brand-red font-black text-xs rounded-xl transition-all shadow-sm"
                        >
                          تسجيل الحضور
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-10 opacity-30 font-bold text-sm text-brand-beige">
                  لم يتم العثور على أي طلاب يطابقون خيارات البحث الحالية.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2b: MEETINGS & LECTURES SCHEDULE MANAGEMENT */}
        {activeTab === 'lectures' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-right">
                <h3 className="text-xl font-black text-brand-text">جدول مواعيد المحاضرات والاجتماعات الأسبوعية</h3>
                <p className="text-xs text-brand-beige font-semibold">تثبيت وتدقيق مواعيد الحضور والانصراف، والتحكم في المحاضرة النشطة لخصم درجات التأخير ديناميكياً.</p>
              </div>
            </div>

            {/* Weekly calendar rules with integrated 9:00 AM auto reminders config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Meeting fixed schedules and alerts info */}
              <div className="bg-brand-cream/20 p-6 rounded-3xl border border-brand-beige/10 space-y-4 text-right">
                <div className="flex items-center gap-2 mb-2 text-brand-red">
                  <CalendarDays className="w-5 h-5" />
                  <h4 className="font-extrabold text-sm">المواعيد الثابتة المقررة أسبوعياً</h4>
                </div>
                <div className="space-y-3.5 text-xs text-brand-text">
                  <div className="p-3 bg-white rounded-2xl border border-brand-beige/5 space-y-1">
                    <span className="font-black text-brand-text block">📍 الاجتماع الأسبوعي العام (السبت):</span>
                    <span className="text-brand-beige block">كل يوم <strong className="text-brand-red">السبت الساعة 7:00 مساءً</strong>.</span>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold mt-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>تنبيه تذكيري تلقائي: السبت الساعة 9:00 صباحاً 🕒</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Creator Form to custom name lectures */}
              <div className="bg-white p-6 rounded-3xl border border-brand-beige/10 space-y-4 text-right">
                <div className="flex items-center gap-2 mb-1 text-brand-text">
                  <Plus className="w-5 h-5 text-brand-red" />
                  <h4 className="font-extrabold text-sm">{editingLecture ? "تعديل المحاضرة المخصصة" : "تثبيت محاضرة مخصصة جديدة"}</h4>
                </div>
                
                <form onSubmit={handleCreateLecture} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-beige uppercase">اسم المحاضرة / الاجتماع</label>
                    <input 
                      type="text"
                      required
                      value={newLecName || ''}
                      onChange={(e) => setNewLecName(e.target.value)}
                      placeholder="مثال: المحاضرة الأولى (سفر التكوين)"
                      className="w-full text-right p-3 text-xs border border-brand-beige/15 rounded-xl bg-brand-cream/20 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-brand-beige uppercase">تاريخ الانعقاد</label>
                      <input 
                        type="date"
                        required
                        value={newLecDate || ''}
                        onChange={(e) => setNewLecDate(e.target.value)}
                        className="w-full font-sans text-center p-3 text-xs border border-brand-beige/15 rounded-xl bg-brand-cream/20 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-brand-beige uppercase">ساعة البدء (للحسبة والخصم)</label>
                      <input 
                        type="time"
                        required
                        value={newLecTime || ''}
                        onChange={(e) => setNewLecTime(e.target.value)}
                        className="w-full font-sans text-center p-3 text-xs border border-brand-beige/15 rounded-xl bg-brand-cream/20 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isCreatingLecture}
                      className="flex-1 py-3 bg-brand-red text-white hover:bg-brand-text font-black text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
                    >
                      {isCreatingLecture ? "جاري الحفظ..." : (editingLecture ? "حفظ التعديلات 💾" : "تأكيد وإدراج المحاضرة المخصصة 📖")}
                    </button>
                    {editingLecture && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLecture(null);
                          setNewLecName('');
                          setNewLecDate(getLocalDateStr());
                          setNewLecTime('19:00');
                          setNewLecType('NT');
                        }}
                        className="px-4 py-3 border border-brand-beige text-brand-text font-black text-xs rounded-xl hover:bg-brand-cream transition-all cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

            </div>

            {/* List Of Lectures Grid */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest text-right block">سجل وجدول المحاضرات المعتمدة</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lectures.map((lec, idx) => {
                  const isLecActive = activeLecture?.id === lec.id;
                  return (
                    <div 
                      key={`${lec.id || idx}-${idx}`} 
                      className={cn(
                        "p-5 rounded-3xl border text-right space-y-3 transition-colors relative",
                        isLecActive 
                          ? "bg-brand-cream/30 border-brand-red shadow-md" 
                          : "bg-white border-brand-beige/10"
                      )}
                    >
                      {isLecActive && (
                        <div className="absolute top-4 left-4 flex items-center gap-1 text-[9px] font-black bg-brand-red text-white px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>نشط حالياً (الماسح يعتمد مواعيده)</span>
                        </div>
                      )}

                      <div className="space-y-1 pt-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-brand-text">{lec.name}</h4>
                        </div>
                        <p className="text-[11px] text-brand-beige font-semibold">تاريخ الانعقاد: <span className="font-bold text-brand-text font-sans">{lec.date}</span></p>
                      </div>

                      <div className="p-3 bg-brand-cream/40 rounded-2xl flex justify-between items-center text-xs">
                        <span className="text-brand-beige font-semibold">موعد البدء</span>
                        <span className="font-black text-brand-red font-sans">{lec.startTime} م</span>
                      </div>

                      <div className="flex gap-2">
                        {!isLecActive ? (
                          <button
                            type="button"
                            onClick={() => handleToggleLectureActive(lec.id)}
                            className="flex-1 py-1.5 bg-brand-text text-white hover:bg-brand-red rounded-lg text-[10px] font-black transition-all cursor-pointer"
                          >
                            تنشيط للاعتماد اليوم
                          </button>
                        ) : (
                          <div className="flex-1 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-center rounded-lg text-[10px] font-black">
                            معتمد حالياً
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLecture(lec);
                            setNewLecName(lec.name);
                            setNewLecDate(lec.date);
                            setNewLecTime(lec.startTime);
                            setNewLecType(lec.meetingType);
                            document.querySelector('#form-create-prep-meeting')?.scrollIntoView({ behavior: 'smooth' }); // Scroll to creator form area
                          }}
                          className="px-3 py-1.5 border border-brand-beige/40 bg-white hover:bg-brand-cream text-brand-text rounded-lg transition-all shadow-sm cursor-pointer"
                          title="تعديل المحاضرة"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLectureToDelete(lec.id)}
                          className="px-3 py-1.5 border border-red-200 bg-white hover:bg-red-50 text-brand-red rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {lectures.length === 0 && (
                  <div className="col-span-full py-10 text-center opacity-30 text-brand-beige font-black text-xs">
                    لم تجر إضافة أي محاضرات مخصصة بعد.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: ATTENDANCE LOGS & REPORTS */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="space-y-1 text-right">
                <h3 className="text-xl font-black text-brand-text">سجل الحضور الشامل</h3>
                <p className="text-xs text-brand-beige font-semibold">تجميع درجات الحضور وتفاصيل الأيام في السيزون النشط ({activeSeason?.name}) للطلاب.</p>
              </div>

              {/* Group Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'الجميع' },
                  { id: 'OT', label: 'طلاب اونلاين (H)' },
                  { id: 'NT', label: 'طلاب الورشة (N)' },
                  { id: 'S', label: 'الخدام (S)' }
                ].map((g, idx) => (
                  <button
                    key={`${g.id}-${idx}`}
                    onClick={() => setLogsCategoryFilter(g.id as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      logsCategoryFilter === g.id 
                        ? "bg-brand-text text-white border-brand-text" 
                        : "bg-brand-cream/30 text-brand-text border-brand-beige/10 hover:border-brand-text/10"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige opacity-50" />
                <input
                  type="text"
                  placeholder="ابحث عن الطالب بالاسم أو الكود..."
                  value={logsFilterQuery}
                  onChange={(e) => setLogsFilterQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 bg-white border border-brand-beige/15 rounded-2xl text-xs font-bold focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all text-right shadow-sm"
                />
              </div>

              {/* Date Filter & Export */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:flex-1">
                  <select
                    value={logsDateFilter}
                    onChange={(e) => setLogsDateFilter(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-brand-beige/15 rounded-2xl text-xs font-bold focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all appearance-none text-right cursor-pointer shadow-sm"
                  >
                    <option value="">كل التواريخ (عرض السجل الكامل)</option>
                    {Array.from(new Set(attendanceLogs.map(l => l.date))).sort().reverse().map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige opacity-50 pointer-events-none" />
                </div>
                
                <button
                  onClick={handleExportExcel}
                  disabled={attendanceLogs.length === 0}
                  className="flex items-center justify-center gap-2.5 px-5 py-3 w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل كشف إكسل</span>
                </button>
              </div>
            </div>

            {/* Unified Table */}
            <div className="border border-brand-beige/10 rounded-3xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-right border-collapse text-xs sm:text-sm font-sans relative">
                  <thead className="sticky top-0 bg-brand-cream/95 backdrop-blur z-10">
                    <tr className="border-b border-brand-beige/10 text-brand-beige text-[10px] font-black uppercase tracking-widest">
                      <th className="p-4">الترتيب</th>
                      <th className="p-4">العضو</th>
                      <th className="p-4">الكود</th>
                      <th className="p-4">الفئة/المجموعة</th>
                      <th className="p-4 text-center">تاريخ وساعة الحضور</th>
                      <th className="p-4 text-center">المحاضرة</th>
                      <th className="p-4 text-center text-brand-red">نقاط اليوم</th>
                      <th className="p-4 text-left font-sans text-brand-text">إجمالي النقاط</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-beige/5">
                    {attendanceLogs
                      .filter(log => !logsFilterQuery || log.studentName.toLowerCase().includes(logsFilterQuery.toLowerCase()) || log.studentCode.includes(logsFilterQuery.toUpperCase()))
                      .filter(log => !logsDateFilter || log.date === logsDateFilter)
                      .filter(log => {
                        if (logsCategoryFilter === 'all') return true;
                        if (logsCategoryFilter === 'OT') return log.studentCode.toUpperCase().startsWith('H');
                        if (logsCategoryFilter === 'NT') return log.studentCode.toUpperCase().startsWith('N');
                        if (logsCategoryFilter === 'S') return log.studentCode.toUpperCase().startsWith('S');
                        return true;
                      })
                      .map((log, idx) => {
                        const stat = studentStats.find(s => s.uid === log.studentId);
                        const totalPoints = stat ? stat.totalPoints : 0;
                        const group = stat ? stat.team : 'غير محدد';
                        
                        return (
                          <tr key={`${log.id || idx}-${idx}`} className="hover:bg-brand-cream/10 transition-colors font-bold text-[#1C0606] group">
                            <td className="p-4 font-black text-brand-beige">{idx + 1}</td>
                            <td className="p-4 font-black">{log.studentName}</td>
                            <td className="p-4 font-mono font-black text-[10px] text-brand-beige">{log.studentCode}</td>
                            <td className="p-4 text-xs">{group}</td>
                            <td className="p-4 text-center text-[10px] text-brand-beige">
                               <span className="block font-bold text-brand-text">{log.date}</span>
                               <span className="font-mono">{log.scanTime || "00:00"}</span>
                            </td>
                            <td className="p-4 text-center text-[10px] text-brand-beige max-w-[120px] truncate">{log.lectureName || 'محاضرة مخصصة'}</td>
                            <td className="p-4 text-center font-black text-brand-red font-sans">+{log.points}</td>
                            <td className="p-4 text-left font-black text-brand-text font-sans">{totalPoints}</td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditPoints(log)}
                                  className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="تعديل درجات الحضور"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleRevertAttendance(log)}
                                  className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="إلغاء هذا الحضور"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                    })}

                    {attendanceLogs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-brand-beige opacity-35 font-bold">
                          لا توجد إحصائيات حضور مسجلة لهذا السيزون بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEASONS (3-MONTH CYCLE) MANAGEMENT */}
        {activeTab === 'seasons' && (
          <div className="space-y-10">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-brand-text">فترات ومواسم الحضور والغياب (السيزونز)</h3>
              <p className="text-xs text-brand-beige font-semibold">تحديد فترة تجميع البيانات التي يتم الإحصاء عليها (مثلاً سيزون مدته ٣ أشهر) لفرز المتسابقين الأوائل.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* Form to create season */}
              <form onSubmit={handleCreateSeason} className="lg:col-span-5 bg-brand-cream/30 p-6 sm:p-8 rounded-3xl border border-brand-beige/5 space-y-4">
                <h4 className="font-extrabold text-sm text-brand-text">إنشاء سيزون (فترة جديدة)</h4>
                
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">اسم السيزون</span>
                  <input
                    type="text"
                    required
                    value={newSeasonName || ''}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    placeholder="مثال: سيزون الصيف ٢٠٢٦"
                    className="w-full p-3 rounded-xl border border-brand-beige/15 text-xs font-bold bg-white text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">تاريخ البدء</span>
                    <input
                      type="date"
                      required
                      value={newSeasonStart || ''}
                      onChange={(e) => setNewSeasonStart(e.target.value)}
                      className="w-full p-3 rounded-xl border border-brand-beige/15 text-xs font-bold bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">تاريخ الانتهاء</span>
                    <input
                      type="date"
                      required
                      value={newSeasonEnd || ''}
                      onChange={(e) => setNewSeasonEnd(e.target.value)}
                      className="w-full p-3 rounded-xl border border-brand-beige/15 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingSeason}
                  className="w-full flex items-center justify-center gap-2 p-3.5 bg-brand-red text-white hover:bg-brand-text rounded-xl font-black text-xs transition-all shadow-md mt-4 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>تأكيد إنشاء الفترة</span>
                </button>
              </form>

              {/* Seasons Active List */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="font-extrabold text-sm text-brand-text">الفترات السابقة والحالية</h4>
                
                <div className="space-y-3">
                  {seasons.map((s, idx) => (
                    <div 
                      key={`${s.id || idx}-${idx}`} 
                      className={cn(
                        "p-5 rounded-3xl border flex items-center justify-between transition-all group",
                        s.isActive 
                          ? "bg-brand-red/5 border-brand-red/30 shadow-sm" 
                          : "bg-white border-brand-beige/12"
                      )}
                    >
                      <div className="text-right space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h5 className="font-black text-sm text-brand-text">{s.name}</h5>
                          {s.isActive && (
                            <span className="px-2.5 py-0.5 bg-[#4CAF50] text-white rounded-md text-[8px] font-black tracking-widest uppercase animate-pulse">
                              نشط حالياً
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-brand-beige font-black uppercase">
                          تاريخ البداية والنهاية: <span className="font-mono tracking-tight font-sans">{s.startDate}</span> إلى <span className="font-mono tracking-tight font-sans">{s.endDate}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!s.isActive && (
                          <button
                            onClick={() => handleToggleSeasonActive(s.id)}
                            className="px-3.5 py-2 bg-brand-text text-white hover:bg-brand-red rounded-xl font-black text-[10px] transition-all"
                          >
                            تنشيط السيزون
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSeason(s.id)}
                          className="p-2.5 text-brand-beige opacity-40 hover:opacity-100 hover:text-red-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {seasons.length === 0 && (
                    <p className="text-center text-xs text-brand-beige py-10 opacity-30 font-bold">لا يوجد أي سيزون مسجل بعد.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
      {/* Delete Lecture Confirm Modal */}
      {lectureToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative border border-brand-beige/20 text-center">
            <div className="w-16 h-16 bg-red-100 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-brand-text mb-2">تأكيد الحذف</h3>
            <p className="text-brand-beige font-semibold text-sm mb-6">
              هل أنت متأكد أنك تريد حذف هذه المحاضرة نهائياً؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLectureToDelete(null)}
                className="flex-1 py-3 bg-brand-cream text-brand-text font-black rounded-xl hover:bg-brand-beige/20 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteLecture(lectureToDelete)}
                className="flex-1 py-3 bg-brand-red text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-md shadow-brand-red/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom simple calendar icon from Lucide missing occasionally
function CalendarRangeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M17 14h-6" />
      <path d="M13 18H7" />
      <path d="M7 14h.01" />
      <path d="M17 18h.01" />
    </svg>
  );
}
