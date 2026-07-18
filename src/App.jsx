import React, { useState, useRef, useEffect } from 'react';
import { Upload, FolderOpen, Trash2, Link as LinkIcon, Move, Type, Code, X, Check, Share2, FileDown, Lock, Unlock, Key, Trophy, PlayCircle, Edit3, ArrowLeft, MessageCircle, FileText, FileQuestion, PlusCircle, ArrowUp, ArrowDown, ListOrdered, AlertCircle, Cloud, CloudDownload, CloudUpload, Copy } from 'lucide-react';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCrog3JWtlKhWs-T42JyNXj94037K3yZ98",
  authDomain: "hadarklik.firebaseapp.com",
  projectId: "hadarklik",
  storageBucket: "hadarklik.firebasestorage.app",
  messagingSenderId: "781018876591",
  appId: "1:781018876591:web:a1f413796f5a00c1c5625a",
  measurementId: "G-1DF1GQDTRL"
};

let appFirebase;
let db;
let auth;

try {
  appFirebase = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(appFirebase);
  auth = getAuth(appFirebase);
} catch(e) {
  console.error("Firebase init error", e);
}

const PREDEFINED_COLORS = [
  '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', 
  '#f43f5e', '#3b82f6', '#14b8a6', '#f59e0b', '#000000', '#ffffff'
];

// Helper: Compress Image to fit Firebase limits (1MB per doc)
const compressImage = (dataUrl, maxWidth = 1600) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = dataUrl;
  });
};

// Helper: Embed HTML for Canva, Genially, YouTube, Vimeo, Images
const getMediaEmbedHtml = (url) => {
  if (!url) return '';
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.startsWith('<iframe')) {
    return `<div class="media-container iframe-container" style="display: flex; justify-content: center; overflow: hidden; width: 100%; border-radius: 12px; margin-bottom: 20px;">${trimmedUrl}</div>`;
  }
  
  if (trimmedUrl.startsWith('data:image') || trimmedUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || trimmedUrl.includes('postimg.cc') || trimmedUrl.includes('imgur.com')) {
    return `<div class="media-container image-media"><img src="${trimmedUrl}" alt="חומר עזר" /></div>`;
  }
  
  let videoId = null;
  if (trimmedUrl.includes('youtube.com/watch?v=')) {
    videoId = trimmedUrl.split('v=')[1].split('&')[0];
  } else if (trimmedUrl.includes('youtu.be/')) {
    videoId = trimmedUrl.split('youtu.be/')[1].split('?')[0];
  } else if (trimmedUrl.includes('vimeo.com/')) {
    const parts = trimmedUrl.split('vimeo.com/');
    videoId = parts[1].split('?')[0];
    return `<div class="media-container video-media"><iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen></iframe></div>`;
  }
  
  if (videoId) {
    return `<div class="media-container video-media"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
  }
  return '';
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  if (array.length > 1 && JSON.stringify(newArr) === JSON.stringify(array)) {
    [newArr[0], newArr[1]] = [newArr[1], newArr[0]];
  }
  return newArr;
};

const generateUniqueId = (prefix) => {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

export default function App() {
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [draggingPointId, setDraggingPointId] = useState(null);
  const [justDropped, setJustDropped] = useState(false);
  const [activeColor, setActiveColor] = useState('#d946ef');
  
  const [finalCode, setFinalCode] = useState('');
  const [finalMessage, setFinalMessage] = useState('כל הכבוד! הצלחתם לפרוץ את החדר!');
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState(false);
  
  const [toastMsg, setToastMsg] = useState('');

  // --- CLOUD / PROJECT CODE STATE ---
  const [projectId, setProjectId] = useState('');
  const [cloudCodeInput, setCloudCodeInput] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  // --- PLAY MODE STATE ---
  const [unlockedPoints, setUnlockedPoints] = useState([]); 
  const [solvedPoints, setSolvedPoints] = useState([]);     
  const [activeGamePoint, setActiveGamePoint] = useState(null); 
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const [studentAnswers, setStudentAnswers] = useState({}); 
  const [orderStates, setOrderStates] = useState({});
  const [finalCodeInput, setFinalCodeInput] = useState([]);
  
  const [solvedQuestions, setSolvedQuestions] = useState({}); 
  const [questionError, setQuestionError] = useState({}); 

  const imageContainerRef = useRef(null);
  const finalInputRefs = useRef([]);

  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous auth failed:", error);
      });
    }
  }, []);

  const handleStationImageUpload = (pointId, e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const compressed = await compressImage(event.target.result, 800);
        updatePoint(pointId, 'mediaUrl', compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (finalCode !== undefined) {
      const cleanTargetCode = finalCode.replace(/\s+/g, '');
      setFinalCodeInput(Array(cleanTargetCode.length).fill(''));
    }
  }, [finalCode]);

  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleCopyProjectCode = () => {
    if (projectId) {
      const textArea = document.createElement("textarea");
      textArea.value = projectId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('קוד הפרויקט הועתק בהצלחה!');
      } catch (err) {
        console.error('Copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.imageSrc && data.points) {
            setImageSrc(data.imageSrc);
            const migratedPoints = data.points.map(p => {
              let newP = {...p};
              if (!newP.questions) {
                newP.questions = [{
                  id: generateUniqueId('q'),
                  type: p.questionType || 'open',
                  text: p.questionText || 'ענו על השאלה:',
                  options: p.triviaOptions || ['', '', '', ''],
                  correctAnswer: p.correctAnswer || '',
                  rewardChar: p.rewardChar || '' 
                }];
              }
              if (newP.vaultRewardChar === undefined) newP.vaultRewardChar = '';
              return newP;
            });
            setPoints(migratedPoints);
            setFinalCode(data.finalCode || '');
            setFinalMessage(data.finalMessage || 'כל הכבוד! הצלחתם לפרוץ את החדר!');
            setSelectedPoint(null);
            setProjectId(''); 
            showToast('הפרויקט נטען בהצלחה מקובץ מקומי!');
          }
        } catch (error) {
          alert('שגיאה בטעינת קובץ הפרויקט.');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const compressed = await compressImage(event.target.result);
        setImageSrc(compressed);
        setPoints([]); 
        setSelectedPoint(null);
        setProjectId('');
        showToast('התמונה הועלתה בהצלחה!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveToCloud = async () => {
    if (!db) {
      showToast('שגיאה בחיבור לענן. אנא נסו שוב מאוחר יותר.');
      return;
    }
    setIsSavingCloud(true);
    try {
      let currentId = projectId;
      if (!currentId) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        currentId = '';
        for(let i=0; i<5; i++) currentId += chars.charAt(Math.floor(Math.random() * chars.length));
        setProjectId(currentId);
      }
      
      const dataToSave = { imageSrc, points, finalCode, finalMessage };
      const docRef = doc(db, 'escapeRooms', currentId);
      await setDoc(docRef, dataToSave);
      showToast(`הפרויקט נשמר! קוד הפרויקט שלך: ${currentId}`);
      setIsExportModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירה. ייתכן והתמונה שבחרת כבדה מדי.");
    }
    setIsSavingCloud(false);
  };

  const handleLoadFromCloud = async () => {
    if(!cloudCodeInput.trim() || !db) return;
    setIsLoadingCloud(true);
    try {
      const code = cloudCodeInput.trim().toUpperCase();
      const docRef = doc(db, 'escapeRooms', code);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setImageSrc(data.imageSrc || null);
        setPoints(data.points || []);
        setFinalCode(data.finalCode || '');
        setFinalMessage(data.finalMessage || 'כל הכבוד! הצלחתם לפרוץ את החדר!');
        setProjectId(code);
        setIsAppStarted(true);
        showToast('הפרויקט נטען בהצלחה!');
      } else {
        alert("קוד הפרויקט שהזנת לא נמצא במערכת. בדוק שהקלדת נכון.");
      }
    } catch(e) {
      console.error(e);
      alert("שגיאת תקשורת במערכת הקודים.");
    }
    setIsLoadingCloud(false);
  };

  const downloadFile = (dataStr, filename) => {
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportJSON = () => {
    const data = { imageSrc, points, finalCode, finalMessage };
    downloadFile("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data)), "escape-room-project.json");
    setIsExportModalOpen(false);
    showToast('קובץ העריכה (JSON) נשמר בהצלחה למחשב!');
  };

  const getGameHTML = () => {
    const safePointsData = JSON.stringify(points).replace(/</g, '\\u003c');
    
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>חדר בריחה וירטואלי</title>
  <style>
    :root { --bg: #fdf4ff; --surface: #ffffff; --text: #4a044e; --accent: #a21caf; --success: #10b981; --danger: #e11d48; --border: #fae8ff; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 15px; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow-x: hidden; padding-bottom: 120px;}
    .game-header { text-align: center; margin-bottom: 20px; width: 100%; max-width: 900px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background: var(--surface); padding: 15px 25px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid var(--border); gap: 10px;}
    .game-header h1 { color: var(--accent); margin: 0; font-size: 20px; font-weight: 800; }
    .btn-final { background: linear-gradient(135deg, #d946ef, #a855f7); color: white; border: none; padding: 10px 20px; border-radius: 999px; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; gap: 8px; align-items: center; transition: 0.2s; box-shadow: 0 4px 15px rgba(217, 70, 239, 0.3); }
    .btn-final:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(217, 70, 239, 0.4); }
    
    .canvas-container { position: relative; max-width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(134, 25, 143, 0.1); border: 4px solid white; display: inline-block; background: white; margin-bottom: 20px;}
    .canvas-container img { max-width: 100%; max-height: 80vh; display: block; border-radius: 12px;}
    
    @keyframes floatPoint { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .point-wrapper { position: absolute; transform: translate(-50%, -50%); z-index: 10;}
    .point-inner { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; cursor: pointer; transition: 0.2s; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); animation: floatPoint 3s ease-in-out infinite;}
    .point-inner:hover { transform: scale(1.15); }
    
    .point-wrapper.locked .point-inner::after { content: '🔒'; position: absolute; bottom: -8px; right: -8px; font-size: 16px; background: #fff; border-radius: 50%; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: black;}
    .point-wrapper.unlocked .point-inner { background-color: var(--success) !important; border-color: white; animation: none;}
    .point-wrapper.unlocked .point-inner::after { content: '✓'; position: absolute; bottom: -8px; right: -8px; font-size: 16px; background: #fff; border-radius: 50%; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: var(--success); }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(74, 4, 78, 0.6); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: center; z-index: 100; opacity: 0; transition: opacity 0.3s; }
    .modal-overlay.active { display: flex; opacity: 1; }
    .modal-content { background: var(--surface); padding: 30px; border-radius: 24px; width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto; text-align: center; position: relative; box-shadow: 0 25px 50px rgba(74, 4, 78, 0.2); border: 1px solid var(--border); }
    .close-btn { position: absolute; top: 15px; left: 15px; background: #f3e8ff; border: none; color: #a855f7; font-size: 20px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;}
    h2 { margin-top: 0; color: var(--accent); font-size: 24px; margin-bottom: 20px;}
    
    .media-container { position: relative; max-width: 100%; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;}
    .video-media { padding-bottom: 56.25%; height: 0; }
    .video-media iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .image-media img { width: 100%; height: auto; display: block; }
    .iframe-container { background: #f8fafc; padding: 10px; border: 2px dashed #cbd5e1; }
    
    .learning-text { text-align: right; color: #4a044e; margin-bottom: 20px; white-space: pre-wrap; font-size: 16px; line-height: 1.6; background: #faf5ff; padding: 15px; border-radius: 12px; border: 1px solid #f3e8ff;}
    
    .question-block { background: #fff; border: 2px solid #e9d5ff; border-radius: 16px; padding: 20px; margin-bottom: 20px; text-align: right;}
    .question-title { font-weight: 800; font-size: 18px; color: #701a75; margin-bottom: 15px; text-align: center; border-bottom: 1px dashed #fae8ff; padding-bottom: 10px;}
    
    .trivia-option { display: block; width: 100%; text-align: right; padding: 12px 15px; margin-bottom: 10px; background: #fdf4ff; border: 2px solid #fae8ff; border-radius: 12px; cursor: pointer; font-size: 16px; color: #4a044e; transition: 0.2s; font-family: inherit;}
    .trivia-option:hover { background: #fae8ff; border-color: #f0abfc; }
    .trivia-option.selected { background: #f0abfc; border-color: #d946ef; color: white; font-weight: bold;}
    
    .order-item { display: flex; justify-content: space-between; align-items: center; background: #fdf4ff; border: 2px solid #fae8ff; padding: 10px 15px; border-radius: 12px; margin-bottom: 8px; font-weight: bold;}
    .order-btns button { background: #e9d5ff; border: none; width: 30px; height: 30px; border-radius: 8px; color: #7e22ce; font-weight: bold; cursor: pointer; margin-left: 5px;}
    .order-btns button:hover { background: #d8b4fe; }
    .order-btns button:disabled { opacity: 0.3; cursor: not-allowed; }

    input[type="text"] { width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #e9d5ff; background: #faf5ff; color: var(--text); margin-bottom: 15px; text-align: center; font-size: 18px; outline: none; font-weight: bold; }
    input[type="text"]:focus { border-color: #d946ef; background: white;}
    
    /* Code Squares Input - RTL Direction */
    .code-squares-container { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; direction: rtl; flex-wrap: wrap;}
    .code-square { width: 50px; height: 60px; font-size: 28px; text-align: center; font-weight: 900; border: 3px solid #d946ef; border-radius: 12px; color: #701a75; background: #faf5ff; text-transform: uppercase; outline: none;}
    .code-square:focus { border-color: #a21caf; background: white; box-shadow: 0 0 10px rgba(217,70,239,0.3);}

    .btn { background: var(--success); color: white; border: none; padding: 10px 14px; width: 100%; border-radius: 12px; font-size: 16px; cursor: pointer; margin-bottom: 10px; font-weight: bold; transition: 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.3);}
    .btn:hover { background: #059669; transform: translateY(-2px);}
    .btn-hint { background: white; color: #f59e0b; border: 2px solid #fcd34d; box-shadow: none; font-size: 14px; padding: 8px;}
    .hint-box { display: none; background: #fffbeb; border: 1px solid #fde68a; color: #d97706; padding: 15px; border-radius: 12px; margin-top: 15px; font-size: 14px; }
    .error { color: var(--danger); font-size: 15px; margin-bottom: 15px; display: none; font-weight: bold; background: #ffe4e6; padding: 10px; border-radius: 8px;}
    
    .q-success { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px; border-radius: 12px; margin-top: 10px; color: #065f46; font-weight: bold; display: flex; align-items: center; justify-content: space-between;}
    .q-reward-char { background: white; border: 2px solid #10b981; color: #10b981; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900;}

    .win-screen { text-align: center; padding: 20px 0; }
    .win-icon { font-size: 60px; margin-bottom: 15px; animation: bounce 2s infinite; }
    @keyframes bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-15px);} 60% {transform: translateY(-7px);} }
  </style>
</head>
<body>
  <div class="game-header">
    <h1>חדר בריחה</h1>
    <div id="vaultCodesDisplay" style="display:none; align-items:center; gap:8px;">
       <span style="font-size:12px; font-weight:bold; color:var(--accent);">צופן הכספת:</span>
       <div id="vaultCodesSlots" style="display:flex; gap:5px;" dir="ltr"></div>
    </div>
    <button class="btn-final" onclick="openFinalDoor()">לכספת הראשית 🗝️</button>
  </div>
  
  <div class="canvas-container">
    <img src="${imageSrc}" alt="חדר בריחה" />
    <div id="points-container"></div>
  </div>

  <div class="modal-overlay" id="mainModal">
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal()">×</button>
      <h2 id="modalTitle">תחנה</h2>
      
      <div class="error" id="errorMsg"></div>

      <div id="entryLockState">
        <div style="font-size: 60px; margin-bottom: 15px;">🔒</div>
        <p style="color: #701a75; font-size: 16px; margin-bottom: 15px; font-weight: bold;">התחנה נעולה. הזינו את הקוד כדי להיכנס:</p>
        <input type="text" id="entryPasscodeInput" placeholder="קוד פתיחה..." autocomplete="off">
        <button class="btn" style="background: linear-gradient(135deg, #d946ef, #a855f7);" onclick="checkEntryCode()">פתח תחנה</button>
        <button class="btn btn-hint" id="entryHintBtn" onclick="toggleHint('entry')">צריך רמז?</button>
        <div class="hint-box" id="entryHintBox"></div>
      </div>

      <div id="taskState" style="display: none;">
        <div id="mediaContainer"></div>
        <div id="learningTextContainer" class="learning-text"></div>
        <div id="externalLinkContainer"></div>
        <div id="questionsContainer"></div>
        
        <div id="finishTaskBtnContainer" style="display: none; margin-top: 20px; border-top: 2px dashed #e9d5ff; padding-top: 20px;">
           <button class="btn" onclick="completeStation()">סיום תחנה והתקדמות 🔓</button>
        </div>

        <button class="btn btn-hint" id="taskHintBtn" onclick="toggleHint('task')">רמז כללי למשימות 💡</button>
        <div class="hint-box" id="taskHintBox"></div>
      </div>

      <div id="successState" style="display: none; padding: 20px 0;">
        <div style="font-size: 60px; margin-bottom: 15px; color: var(--success);">🏆</div>
        
        <div id="rewardBox" style="display:none; margin-bottom:20px;"></div>
        <div id="vaultRewardBox" style="display:none; margin-bottom:20px;"></div>

        <div id="successMessageBox" style="background: #ecfdf5; border: 2px solid #34d399; color: #065f46; padding: 20px; border-radius: 16px; font-size: 18px; font-weight: bold; line-height: 1.5; box-shadow: 0 4px 6px rgba(52,211,153,0.2);">
        </div>
      </div>
    </div>
  </div>

  <script>
    const pointsData = ${safePointsData};
    const finalRoomCode = "${finalCode || ''}";
    const finalRoomMessage = "${finalMessage || ''}";
    const cleanFinalRoomCode = finalRoomCode.replace(/\\s+/g, '');
    
    let unlockedPointIds = []; 
    let solvedPointIds = [];   
    let currentActivePoint = null;
    let studentAnswers = {}; 
    let orderStates = {}; 
    let solvedQuestions = {}; 

    function shuffleArr(array) {
      const newArr = [...array];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      if (array.length > 1 && JSON.stringify(newArr) === JSON.stringify(array)) {
        [newArr[0], newArr[1]] = [newArr[1], newArr[0]];
      }
      return newArr;
    }

    function getMediaHtml(url) {
      if (!url) return '';
      const trimmedUrl = url.trim();
      if (trimmedUrl.startsWith('<iframe')) {
        return \`<div class="media-container iframe-container" style="display: flex; justify-content: center; overflow: hidden; width: 100%; border-radius: 12px; margin-bottom: 20px;">\${trimmedUrl}</div>\`;
      }
      if (trimmedUrl.startsWith('data:image') || trimmedUrl.match(/\\.(jpeg|jpg|gif|png|webp)$/i) || trimmedUrl.includes('postimg.cc') || trimmedUrl.includes('imgur.com')) {
        return \`<div class="media-container image-media"><img src="\${trimmedUrl}" alt="חומר עזר" /></div>\`;
      }
      let videoId = null;
      if (trimmedUrl.includes('youtube.com/watch?v=')) { videoId = trimmedUrl.split('v=')[1].split('&')[0]; } 
      else if (trimmedUrl.includes('youtu.be/')) { videoId = trimmedUrl.split('youtu.be/')[1].split('?')[0]; }
      else if (trimmedUrl.includes('vimeo.com/')) {
         const parts = trimmedUrl.split('vimeo.com/');
         videoId = parts[1].split('?')[0];
         return \`<div class="media-container video-media"><iframe src="https://player.vimeo.com/video/\${videoId}" allowfullscreen></iframe></div>\`;
      }
      if (videoId) {
        return \`<div class="media-container video-media"><iframe src="https://www.youtube.com/embed/\${videoId}" allowfullscreen></iframe></div>\`;
      }
      return '';
    }

    function initGame() {
      const container = document.getElementById('points-container');
      container.innerHTML = ''; 
      pointsData.forEach(p => {
        const isSolved = solvedPointIds.includes(p.id);
        const isUnlocked = unlockedPointIds.includes(p.id) || (!p.entryPasscode || p.entryPasscode.trim() === '');
        const isLocked = !isUnlocked && (p.entryPasscode && p.entryPasscode.trim() !== '');

        const wrapper = document.createElement('div');
        wrapper.className = 'point-wrapper';
        if (isSolved) wrapper.classList.add('unlocked');
        else if (isLocked) wrapper.classList.add('locked');

        wrapper.style.left = p.x + '%'; 
        wrapper.style.top = p.y + '%';
        
        const inner = document.createElement('div');
        inner.className = 'point-inner';
        inner.style.backgroundColor = isSolved ? 'var(--success)' : p.color;
        inner.innerText = isSolved ? '' : p.label; 
        
        wrapper.appendChild(inner);
        wrapper.onclick = () => openPoint(p.id);
        container.appendChild(wrapper);
      });
      updateInventory();
    }

    function updateInventory() {
      const disp = document.getElementById('vaultCodesDisplay');
      const slotsCont = document.getElementById('vaultCodesSlots');
      
      let totalVaultChars = 0;
      let unlockedChars = [];
      
      pointsData.forEach(p => {
         if(p.vaultRewardChar && p.vaultRewardChar.trim() !== '') {
            totalVaultChars++;
            if (solvedPointIds.includes(p.id)) {
               unlockedChars.push(p.vaultRewardChar.trim());
            }
         }
      });
      
      if (totalVaultChars === 0) {
        disp.style.display = 'none';
        return;
      }
      
      disp.style.display = 'flex';
      slotsCont.innerHTML = '';
      
      // SCRAMBLE THE UNLOCKED CHARACTERS!
      unlockedChars.sort();
      
      let displayArr = [...unlockedChars];
      while(displayArr.length < totalVaultChars) {
          displayArr.push('?');
      }
      
      displayArr.forEach(char => {
        const isSolved = char !== '?';
        const slot = document.createElement('div');
        slot.style.width = '30px'; slot.style.height = '30px';
        slot.style.borderRadius = '8px'; slot.style.display = 'flex';
        slot.style.alignItems = 'center'; slot.style.justifyContent = 'center';
        slot.style.fontSize = '16px'; slot.style.fontWeight = 'bold';
        
        if (isSolved) {
           slot.style.background = '#fdf4ff'; slot.style.border = '2px solid #d946ef';
           slot.style.color = '#a21caf'; slot.innerText = char;
        } else {
           slot.style.background = '#faf5ff'; slot.style.border = '2px dashed #d946ef';
           slot.style.color = '#d946ef'; slot.innerText = '?';
        }
        slotsCont.appendChild(slot);
      });
    }

    function openPoint(id) {
      currentActivePoint = pointsData.find(p => p.id === id);
      const isUnlockedEntry = unlockedPointIds.includes(id) || (!currentActivePoint.entryPasscode || currentActivePoint.entryPasscode.trim() === '');
      const isSolvedTask = solvedPointIds.includes(id);
      
      if ((!currentActivePoint.entryPasscode || currentActivePoint.entryPasscode.trim() === '') && !unlockedPointIds.includes(id)) {
          unlockedPointIds.push(id);
      }

      document.getElementById('modalTitle').innerText = \`תחנה \${currentActivePoint.label}\`;
      hideError();
      
      if(currentActivePoint.questions) {
         currentActivePoint.questions.forEach(q => {
            if(q.type === 'order' && !orderStates[q.id]) {
               orderStates[q.id] = shuffleArr([...q.options]);
            }
         });
      }

      if (isSolvedTask) {
        renderSuccessState();
      } else if (isUnlockedEntry) {
        renderTaskState();
      } else {
        renderEntryState();
      }
      document.getElementById('mainModal').classList.add('active');
    }

    function hideError() { document.getElementById('errorMsg').style.display = 'none'; }
    function showError(msg) {
      const el = document.getElementById('errorMsg');
      el.innerText = msg;
      el.style.display = 'block';
      document.querySelector('.modal-content').animate([{transform: 'translateX(-10px)'}, {transform: 'translateX(10px)'}, {transform: 'translateX(0)'}], {duration: 300});
    }

    function renderEntryState() {
      document.getElementById('entryLockState').style.display = 'block';
      document.getElementById('taskState').style.display = 'none';
      document.getElementById('successState').style.display = 'none';
      document.getElementById('entryPasscodeInput').value = '';
      document.getElementById('entryHintBox').style.display = 'none';
      document.getElementById('entryHintBox').innerText = currentActivePoint.entryHint || '';
      document.getElementById('entryHintBtn').style.display = currentActivePoint.entryHint ? 'inline-block' : 'none';
    }

    function renderTaskState() {
      document.getElementById('entryLockState').style.display = 'none';
      document.getElementById('taskState').style.display = 'block';
      document.getElementById('successState').style.display = 'none';

      document.getElementById('mediaContainer').innerHTML = getMediaHtml(currentActivePoint.mediaUrl);
      
      const txtCont = document.getElementById('learningTextContainer');
      if(currentActivePoint.learningText) { txtCont.style.display='block'; txtCont.innerText = currentActivePoint.learningText; }
      else { txtCont.style.display='none'; }

      const linkCont = document.getElementById('externalLinkContainer');
      const hasMediaHtml = getMediaHtml(currentActivePoint.mediaUrl) !== '';
      if(currentActivePoint.mediaUrl && !hasMediaHtml) {
         linkCont.innerHTML = \`<a href="\${currentActivePoint.mediaUrl}" target="_blank" style="display:inline-block; padding:10px 20px; background:#fdf4ff; color:#c026d3; border-radius:8px; margin-bottom:15px; text-decoration:none; font-weight:bold; border: 1px solid #fae8ff;">לחצו כאן למעבר לחומר עזר ↗</a>\`;
      } else {
         linkCont.innerHTML = '';
      }

      renderQuestions();

      document.getElementById('taskHintBox').style.display = 'none';
      document.getElementById('taskHintBox').innerText = currentActivePoint.taskHint || '';
      document.getElementById('taskHintBtn').style.display = currentActivePoint.taskHint ? 'inline-block' : 'none';
    }

    function renderQuestions() {
      const qContainer = document.getElementById('questionsContainer');
      qContainer.innerHTML = '';
      
      if(!currentActivePoint.questions || currentActivePoint.questions.length === 0) {
          document.getElementById('finishTaskBtnContainer').style.display = 'block';
          return;
      }

      let allQuestionsSolved = true;

      currentActivePoint.questions.forEach((q, index) => {
         const isSolved = solvedQuestions[q.id];
         if (!isSolved) allQuestionsSolved = false;

         const qBlock = document.createElement('div');
         qBlock.className = 'question-block';
         
         const title = document.createElement('div');
         title.className = 'question-title';
         title.innerText = \`שאלה \${index + 1}: \${q.text}\`;
         qBlock.appendChild(title);

         if (isSolved) {
            const succDiv = document.createElement('div');
            succDiv.className = 'q-success';
            let succHtml = '<span>✓ תשובה נכונה!</span>';
            if (q.rewardChar && q.rewardChar.trim() !== '') {
               succHtml += \`<div style="display:flex; align-items:center; gap:5px;"><span style="font-size:12px; font-weight:normal; color:#4a044e;">צופן לשאלה זו:</span><div class="q-reward-char">\${q.rewardChar}</div></div>\`;
            }
            succDiv.innerHTML = succHtml;
            qBlock.appendChild(succDiv);
         } else {
            const qErr = document.createElement('div');
            qErr.id = 'err_' + q.id;
            qErr.className = 'error';
            qBlock.appendChild(qErr);

            if (q.type === 'open') {
               const inp = document.createElement('input');
               inp.type = 'text';
               inp.placeholder = 'הקלידו תשובה...';
               inp.value = studentAnswers[q.id] || '';
               inp.oninput = (e) => studentAnswers[q.id] = e.target.value;
               qBlock.appendChild(inp);
            } 
            else if (q.type === 'trivia') {
               const opts = q.options.filter(o => o.trim() !== '');
               opts.forEach((opt, idx) => {
                  const btn = document.createElement('button');
                  btn.className = 'trivia-option ' + (studentAnswers[q.id] === idx ? 'selected' : '');
                  btn.innerText = opt;
                  btn.onclick = () => {
                     studentAnswers[q.id] = idx;
                     renderQuestions();
                  };
                  qBlock.appendChild(btn);
               });
            }
            else if (q.type === 'order') {
               const items = orderStates[q.id] || [];
               items.forEach((item, idx) => {
                  const row = document.createElement('div');
                  row.className = 'order-item';
                  const span = document.createElement('span'); span.innerText = item;
                  const btns = document.createElement('div'); btns.className = 'order-btns';
                  const upBtn = document.createElement('button'); upBtn.innerText = '↑'; upBtn.disabled = idx === 0;
                  upBtn.onclick = () => moveOrderItem(q.id, idx, -1);
                  const downBtn = document.createElement('button'); downBtn.innerText = '↓'; downBtn.disabled = idx === items.length - 1;
                  downBtn.onclick = () => moveOrderItem(q.id, idx, 1);
                  btns.appendChild(upBtn); btns.appendChild(downBtn);
                  row.appendChild(span); row.appendChild(btns);
                  qBlock.appendChild(row);
               });
            }

            const chkBtn = document.createElement('button');
            chkBtn.className = 'btn';
            chkBtn.style.padding = '8px';
            chkBtn.style.fontSize = '14px';
            chkBtn.innerText = 'בדוק תשובה לשאלה זו';
            chkBtn.onclick = () => checkQuestion(q);
            qBlock.appendChild(chkBtn);
         }
         
         qContainer.appendChild(qBlock);
      });

      document.getElementById('finishTaskBtnContainer').style.display = allQuestionsSolved ? 'block' : 'none';
    }

    function checkQuestion(q) {
      let isCorrect = false;
      if (q.type === 'open') {
         const ans = (studentAnswers[q.id] || '').trim().toLowerCase();
         const correct = (q.correctAnswer || '').trim().toLowerCase();
         if (ans === correct) isCorrect = true;
      } 
      else if (q.type === 'trivia') {
         if (studentAnswers[q.id] === q.correctAnswer) isCorrect = true;
      }
      else if (q.type === 'order') {
         const currentOrder = orderStates[q.id];
         if (JSON.stringify(currentOrder) === JSON.stringify(q.options)) isCorrect = true;
      }

      if (isCorrect) {
         solvedQuestions[q.id] = true;
         renderQuestions(); 
      } else {
         const errEl = document.getElementById('err_' + q.id);
         errEl.innerText = 'תשובה שגויה, נסו שוב!';
         errEl.style.display = 'block';
      }
    }

    function completeStation() {
       solvedPointIds.push(currentActivePoint.id);
       initGame(); 
       hideError();
       renderSuccessState();
    }

    function moveOrderItem(qId, idx, dir) {
       let arr = orderStates[qId];
       let temp = arr[idx];
       arr[idx] = arr[idx + dir];
       arr[idx + dir] = temp;
       renderQuestions();
    }

    function checkEntryCode() {
      const guess = document.getElementById('entryPasscodeInput').value.trim().toLowerCase();
      const correct = (currentActivePoint.entryPasscode || '').trim().toLowerCase();
      if (guess === correct) {
        unlockedPointIds.push(currentActivePoint.id);
        hideError();
        renderTaskState();
      } else {
        showError('קוד פתיחה שגוי, נסו שוב!');
      }
    }

    function toggleHint(type) {
      const box = document.getElementById(type + 'HintBox');
      box.style.display = box.style.display === 'block' ? 'none' : 'block';
    }

    function openFinalDoor() {
      document.getElementById('modalTitle').innerText = 'הכספת הראשית 🏆';
      hideError();
      
      let squaresHtml = '';
      if(cleanFinalRoomCode && cleanFinalRoomCode.length > 0) {
         for(let i=0; i<cleanFinalRoomCode.length; i++){
            squaresHtml += \`<input type="text" class="code-square final-input" maxlength="1" oninput="handleSquareInput(event, \${i}, \${cleanFinalRoomCode.length})" onkeydown="handleSquareKey(event, \${i})">\`;
         }
      } else {
         squaresHtml = '<p>לא הוגדר קוד סופי. לחצו לפתיחה!</p>';
      }

      const content = \`
        <p style="color:#a21caf; font-size:16px; margin-bottom: 20px; font-weight:bold;">הזינו את הקוד הסופי (מימין לשמאל):</p>
        <div class="code-squares-container" id="finalSquaresContainer" dir="rtl">
           \${squaresHtml}
        </div>
        <button class="btn" style="background: linear-gradient(135deg, #d946ef, #a855f7); font-size:20px; padding:15px; margin-top:20px;" onclick="checkFinalSquares()">פרוץ את הכספת 🔓</button>
      \`;
      
      document.getElementById('entryLockState').style.display = 'none';
      document.getElementById('taskState').style.display = 'none';
      document.getElementById('successState').style.display = 'none';
      
      let finalDiv = document.getElementById('finalDivTemp');
      if(!finalDiv) {
         finalDiv = document.createElement('div');
         finalDiv.id = 'finalDivTemp';
         document.querySelector('.modal-content').appendChild(finalDiv);
      }
      finalDiv.innerHTML = content;
      finalDiv.style.display = 'block';
      
      document.getElementById('mainModal').classList.add('active');
      
      setTimeout(() => {
         const inputs = document.querySelectorAll('.final-input');
         if(inputs.length > 0) inputs[0].focus();
      }, 100);
    }

    function handleSquareInput(e, index, total) {
       const inputs = document.querySelectorAll('.final-input');
       if(e.target.value.length === 1 && index < total - 1) {
          inputs[index+1].focus();
       }
    }
    
    function handleSquareKey(e, index) {
       const inputs = document.querySelectorAll('.final-input');
       if(e.key === 'Backspace' && e.target.value === '' && index > 0) {
          inputs[index-1].focus();
       }
    }

    function checkFinalSquares() {
      let guess = '';
      if(cleanFinalRoomCode && cleanFinalRoomCode.length > 0) {
         const inputs = document.querySelectorAll('.final-input');
         inputs.forEach(inp => guess += inp.value);
      }

      if (!cleanFinalRoomCode || guess.toLowerCase() === cleanFinalRoomCode.toLowerCase()) {
        document.querySelector('.modal-content').innerHTML = \`<div class="win-screen"><div class="win-icon">🏆</div><h2 style="font-size:30px; margin-bottom:10px;">\${finalRoomMessage}</h2><p style="color:#86198f; font-size:18px; font-weight:bold;">כל הכבוד, סיימתם את המשחק!</p><button class="close-btn" onclick="closeModal()">×</button></div>\`;
      } else {
        showError('הקוד שגוי, הכספת נשארת נעולה!');
      }
    }

    function renderSuccessState() {
      document.getElementById('entryLockState').style.display = 'none';
      document.getElementById('taskState').style.display = 'none';
      document.getElementById('successState').style.display = 'block';
      
      const rBox = document.getElementById('rewardBox');
      const vBox = document.getElementById('vaultRewardBox');
      
      if(currentActivePoint.questions) {
         const pointRewards = currentActivePoint.questions.filter(q => q.rewardChar && q.rewardChar.trim() !== '').map(q => q.rewardChar.trim());
         if(pointRewards.length > 0) {
            let html = '<p style="color:#a21caf; font-size:16px; margin-bottom:5px; font-weight:bold;">צפנים שאספתם בשאלות למעלה:</p>';
            html += '<p style="color:#d946ef; font-size:14px; margin-top:0; margin-bottom:15px; font-weight:bold;">(השתמשו בהם כדי לפענח את פתיחת התחנה הבאה!)</p>';
            html += '<div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px;" dir="ltr">';
            pointRewards.forEach(char => {
               html += \`<div style="width:45px; height:45px; background:#fae8ff; border:2px solid #d946ef; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; color:#a21caf; text-transform:uppercase; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">\${char}</div>\`;
            });
            html += '</div>';
            rBox.innerHTML = html;
            rBox.style.display = 'block';
         } else {
            rBox.style.display = 'none';
         }
      }

      if(currentActivePoint.vaultRewardChar && currentActivePoint.vaultRewardChar.trim() !== '') {
          let html = '<p style="color:#059669; font-size:16px; margin-bottom:5px; font-weight:bold;">מצאתם חלק מהצופן לכספת הראשית!</p>';
          html += '<p style="color:#10b981; font-size:14px; margin-top:0; margin-bottom:15px; font-weight:bold;">(התו התווסף מעורבב למלאי העליון, תצטרכו לפענח את הסדר!)</p>';
          html += \`<div style="display:flex; justify-content:center;" dir="ltr"><div style="width:50px; height:50px; background:#ecfdf5; border:3px dashed #10b981; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:900; color:#059669; text-transform:uppercase;">\${currentActivePoint.vaultRewardChar}</div></div>\`;
          vBox.innerHTML = html;
          vBox.style.display = 'block';
      } else {
          vBox.style.display = 'none';
      }

      document.getElementById('successMessageBox').innerText = currentActivePoint.successMessage || 'כל הכבוד! סיימתם את התחנה.';
    }

    function closeModal() {
      document.getElementById('mainModal').classList.remove('active');
      const fDiv = document.getElementById('finalDivTemp');
      if(fDiv) fDiv.style.display = 'none';
    }

    initGame();
  </script>
</body>
</html>`;
  };

  const generateStandaloneHTML = () => {
    downloadFile("data:text/html;charset=utf-8," + encodeURIComponent(getGameHTML()), "escape-room-game.html");
    setIsExportModalOpen(false);
    showToast('קובץ המשחק המלא (HTML) נשמר במחשב בהצלחה! שלחו אותו לתלמידים.');
  };

  const handleCopyEmbed = () => {
    const textArea = document.createElement("textarea");
    textArea.value = getGameHTML();
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedSuccess(true);
      showToast('הקוד הועתק! עכשיו עברו ל-Google Sites והדביקו בעזרת חלונית "הטמעה".');
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch (err) {
      console.error('Copy failed');
    }
    document.body.removeChild(textArea);
  };

  const handleMouseDown = (e, id) => {
    if (isPlayMode) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingPointId(id);
    setSelectedPoint(id); 
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!draggingPointId || !imageContainerRef.current || isPlayMode) return;
      const container = imageContainerRef.current;
      const rect = container.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      setPoints(prevPoints => prevPoints.map(p => p.id === draggingPointId ? { ...p, x, y } : p));
    };

    const handleGlobalMouseUp = () => {
      if (draggingPointId) {
        setDraggingPointId(null);
        setJustDropped(true);
        setTimeout(() => setJustDropped(false), 100);
      }
    };

    if (draggingPointId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingPointId, isPlayMode]);

  const handleImageClick = (e) => {
    if (e.target !== imageContainerRef.current && e.target.tagName !== 'IMG') return;
    if (draggingPointId || justDropped || isPlayMode) return;

    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const isTooClose = points.some(p => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3);
    if (isTooClose) {
       showToast('כבר קיימת תחנה במיקום הזה. גררו אותה למקום אחר כדי להוסיף חדשה.');
       return;
    }

    const newPoint = {
      id: generateUniqueId('p'),
      x, y,
      label: (points.length + 1).toString(),
      color: activeColor,
      
      entryPasscode: '',
      entryHint: '',
      
      learningText: '',
      mediaUrl: '',
      
      questions: [
        {
          id: generateUniqueId('q'),
          type: 'open',
          text: 'שאלה חדשה:',
          options: ['', '', '', ''],
          correctAnswer: '',
          rewardChar: '', 
        }
      ],
      taskHint: '',

      successMessage: 'כל הכבוד! סדרו את האותיות שאספתם כדי לקבל את הקוד לתחנה הבאה.',
      vaultRewardChar: '',
    };

    setPoints([...points, newPoint]);
    setSelectedPoint(newPoint.id);
  };

  const updatePoint = (id, field, value) => {
    setPoints(points.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const deletePoint = (id) => {
    setPoints(points.filter(p => p.id !== id));
    if (selectedPoint === id) setSelectedPoint(null);
  };

  const addQuestion = (pointId) => {
    setPoints(points.map(p => {
      if (p.id === pointId) {
        return {
          ...p,
          questions: [...p.questions, {
            id: generateUniqueId('q'),
            type: 'open',
            text: 'שאלה נוספת:',
            options: ['', '', '', ''],
            correctAnswer: '',
            rewardChar: ''
          }]
        };
      }
      return p;
    }));
  };

  const updateQuestion = (pointId, qId, field, value) => {
    setPoints(points.map(p => {
      if (p.id === pointId) {
        return { ...p, questions: p.questions.map(q => q.id === qId ? { ...q, [field]: value } : q) };
      }
      return p;
    }));
  };

  const deleteQuestion = (pointId, qId) => {
    setPoints(points.map(p => {
      if (p.id === pointId) { return { ...p, questions: p.questions.filter(q => q.id !== qId) }; }
      return p;
    }));
  };

  const updateQuestionOption = (pointId, qId, index, value) => {
    setPoints(points.map(p => {
      if (p.id === pointId) {
        return {
          ...p,
          questions: p.questions.map(q => {
            if (q.id === qId) {
              const newOptions = [...q.options];
              newOptions[index] = value;
              return { ...q, options: newOptions };
            }
            return q;
          })
        };
      }
      return p;
    }));
  };

  const addOrderOption = (pointId, qId) => {
    setPoints(points.map(p => {
      if (p.id === pointId) {
        return {
          ...p,
          questions: p.questions.map(q => q.id === qId ? { ...q, options: [...q.options, ''] } : q)
        };
      }
      return p;
    }));
  };

  const removeOrderOption = (pointId, qId, index) => {
    setPoints(points.map(p => {
      if (p.id === pointId) {
        return {
          ...p,
          questions: p.questions.map(q => {
            if (q.id === qId) {
              const newOpts = [...q.options];
              newOpts.splice(index, 1);
              return { ...q, options: newOpts };
            }
            return q;
          })
        };
      }
      return p;
    }));
  };

  const handlePlayPointClick = (e, point) => {
    e.stopPropagation();
    setActiveGamePoint(point);
    setGuess('');
    setErrorMsg('');
    setShowHint(false);
    
    if ((!point.entryPasscode || point.entryPasscode.trim() === '') && !unlockedPoints.includes(point.id)) {
      setUnlockedPoints(prev => [...prev, point.id]);
    }

    if (point.questions) {
      const newOrderStates = { ...orderStates };
      point.questions.forEach(q => {
        if(q.type === 'order' && !newOrderStates[q.id]) {
          newOrderStates[q.id] = shuffleArray([...q.options]);
        }
      });
      setOrderStates(newOrderStates);
    }
  };

  const handlePlayEntrySubmit = () => {
    if (guess.trim().toLowerCase() === (activeGamePoint.entryPasscode || '').trim().toLowerCase()) {
      setUnlockedPoints([...unlockedPoints, activeGamePoint.id]);
      setGuess('');
      setErrorMsg('');
      setShowHint(false);
    } else {
      setErrorMsg('קוד פתיחה שגוי, נסו שוב!');
    }
  };

  const checkQuestionPlayMode = (q) => {
    let isCorrect = false;
    
    if (q.type === 'open') {
       const ans = (studentAnswers[q.id] || '').trim().toLowerCase();
       const correct = (q.correctAnswer || '').trim().toLowerCase();
       if (ans === correct) isCorrect = true;
    } 
    else if (q.type === 'trivia') {
       if (studentAnswers[q.id] === q.correctAnswer) isCorrect = true;
    }
    else if (q.type === 'order') {
       const currentOrder = orderStates[q.id];
       if (JSON.stringify(currentOrder) === JSON.stringify(q.options)) isCorrect = true;
    }

    if (isCorrect) {
       setSolvedQuestions(prev => ({...prev, [q.id]: true}));
       setQuestionError(prev => ({...prev, [q.id]: null}));
    } else {
       setQuestionError(prev => ({...prev, [q.id]: 'תשובה שגויה, נסו שוב!'}));
    }
  };

  const completeStationPlayMode = () => {
    setSolvedPoints([...solvedPoints, activeGamePoint.id]);
    setErrorMsg('');
  };

  const handleFinalSubmit = () => {
    const finalGuess = finalCodeInput.join('');
    const cleanTargetCode = (finalCode || '').replace(/\s+/g, '');
    if (!cleanTargetCode || finalGuess.toLowerCase() === cleanTargetCode.toLowerCase()) {
      setGameWon(true);
    } else {
      setErrorMsg('הקוד שגוי, הכספת נשארת נעולה!');
    }
  };

  const moveOrderPlayMode = (qId, index, dir) => {
    const arr = [...orderStates[qId]];
    if (index + dir < 0 || index + dir >= arr.length) return;
    const temp = arr[index];
    arr[index] = arr[index + dir];
    arr[index + dir] = temp;
    setOrderStates({...orderStates, [qId]: arr});
  };

  const handleFinalInputChange = (e, index) => {
    const val = e.target.value.slice(-1); 
    setFinalCodeInput(prev => {
      const newArr = [...prev];
      newArr[index] = val;
      return newArr;
    });
    
    const cleanTargetCode = (finalCode || '').replace(/\s+/g, '');
    if (val && index < cleanTargetCode.length - 1) {
      finalInputRefs.current[index + 1]?.focus();
    }
  };

  const handleFinalInputKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !finalCodeInput[index] && index > 0) {
      finalInputRefs.current[index - 1]?.focus();
    }
  };

  const currentPointData = points.find(p => p.id === selectedPoint);
  
  let totalVaultChars = 0;
  let unlockedChars = [];
  points.forEach(p => {
     if(p.vaultRewardChar && p.vaultRewardChar.trim() !== '') {
        totalVaultChars++;
        if(solvedPoints.includes(p.id)) {
           unlockedChars.push(p.vaultRewardChar.trim());
        }
     }
  });
  
  unlockedChars.sort();
  
  let displayRewards = [...unlockedChars];
  while(displayRewards.length < totalVaultChars) {
      displayRewards.push('?');
  }

  const isActivePointFullySolved = activeGamePoint && 
    (!activeGamePoint.questions || activeGamePoint.questions.length === 0 || 
     activeGamePoint.questions.every(q => solvedQuestions[q.id]));

  if (!isAppStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-fuchsia-50 relative" dir="rtl">
        
        {/* הבאנר הלבן המוקטן למעלה */}
        <div className="bg-white px-6 py-6 shadow-sm z-20 flex flex-col items-center text-center border-b border-fuchsia-100 shrink-0">
          <img src="https://i.postimg.cc/DfxP89V0/Whats_App_Image_2026_03_18_at_11_10_41_1_removebg_preview.png" alt="לוגו חדר בריחה בקליק" className="h-16 md:h-20 w-auto mx-auto mb-2 drop-shadow-sm hover:scale-105 transition-transform duration-500"/>
          <h1 className="text-2xl md:text-3xl font-black text-fuchsia-950 mb-2 tracking-tight">חדר בריחה בקליק</h1>
          <p className="text-fuchsia-800 text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">הפכו כל תמונה להרפתקה. שלבו חידות טריוויה, סידור מילים, וחלקי קוד שהתלמידים יאספו בדרך אל הכספת הראשית!</p>
        </div>

        {/* אזור התוכן המרכזי: תמונה וכפתורים */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-5xl mx-auto">
          
          {/* התמונה המרכזית (ללא שקיפות) */}
          <div className="w-full rounded-[2rem] overflow-hidden shadow-xl border-4 border-white bg-fuchsia-100 flex items-center justify-center mb-8 aspect-video md:aspect-[16/7]">
             <img src="https://i.postimg.cc/PxN2tFTF/Gemini-Generated-Image-o9wugoo9wugoo9wu.png" alt="תמונת פתיחה" className="w-full h-full object-cover" />
          </div>

          {/* שורת הכפתורים למטה (שני מלבנים זהים) */}
          <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-center">
            
            {/* כפתור 1: משחק חדש */}
            <button onClick={() => setIsAppStarted(true)} className="flex-1 w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 text-xl h-16 hover:-translate-y-1 border-2 border-transparent">
              יצירת משחק חדש <ArrowLeft size={24} />
            </button>
            
            {/* כפתור 2: טעינת משחק מקוד */}
            <div className="flex-1 w-full bg-white border-2 border-fuchsia-200 rounded-2xl shadow-lg flex items-center overflow-hidden h-16 hover:-translate-y-1 transition-transform duration-300 focus-within:border-fuchsia-500 focus-within:ring-2 focus-within:ring-fuchsia-100">
              <input 
                type="text" 
                value={cloudCodeInput}
                onChange={(e) => setCloudCodeInput(e.target.value.toUpperCase())}
                placeholder="קוד פרויקט קיים..." 
                className="flex-1 bg-transparent text-fuchsia-950 placeholder-fuchsia-300 text-center font-black text-lg px-4 outline-none uppercase tracking-widest h-full w-full"
                maxLength="5"
              />
              <button 
                onClick={handleLoadFromCloud} 
                disabled={isLoadingCloud || cloudCodeInput.length < 5}
                className="bg-fuchsia-100 hover:bg-fuchsia-200 disabled:opacity-50 text-fuchsia-800 font-black px-6 h-full transition-colors border-r border-fuchsia-200 flex items-center justify-center text-lg whitespace-nowrap"
              >
                {isLoadingCloud ? 'טוען...' : 'עריכת קיים'}
              </button>
            </div>

          </div>

        </div>

        {/* קרדיט וזכויות יוצרים בתחתית עם השם המעודכן */}
        <div className="pb-4 text-center shrink-0">
           <p className="text-fuchsia-600/80 text-sm font-bold tracking-wide">© תמר חמאדה | קהילת רעיונות פוגשים בינה</p>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-fuchsia-50 text-purple-900 relative" dir="rtl">
      
      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-fuchsia-900 text-white px-8 py-4 rounded-full shadow-2xl z-[200] font-bold animate-bounce border-2 border-fuchsia-300 flex items-center gap-3 text-lg">
          <Check size={24} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

      <style>{`
        @keyframes floatPoint {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <header className="bg-white border-b border-fuchsia-200 p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm z-50 relative">
        <div className="flex items-center gap-3">
          <img src="https://i.postimg.cc/DfxP89V0/Whats_App_Image_2026_03_18_at_11_10_41_1_removebg_preview.png" alt="לוגו קטן" className="h-12 w-auto drop-shadow-sm"/>
          <div>
            <h1 className="text-xl font-black text-fuchsia-950 leading-tight">חדר בריחה בקליק</h1>
            <p className="text-xs text-fuchsia-600 font-medium">כלי המורה: יוצרים משחק בשניות</p>
          </div>
        </div>

        {projectId && !isPlayMode && (
           <div 
             className="hidden md:flex bg-blue-50 border-2 border-blue-200 px-4 py-1.5 rounded-xl items-center gap-3 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors group" 
             onClick={handleCopyProjectCode} 
             title="לחץ להעתקת קוד הפרויקט"
           >
             <div className="bg-blue-100 p-1.5 rounded-lg group-hover:bg-blue-200 transition-colors">
               <Copy size={18} className="text-blue-600" />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">קוד פרויקט (לחץ להעתקה)</span>
               <span className="font-black text-xl text-blue-900 tracking-widest leading-none">{projectId}</span>
             </div>
           </div>
        )}

        {isPlayMode && displayRewards.length > 0 && (
          <div className="flex flex-col items-center gap-1">
             <span className="text-xs font-bold text-fuchsia-600">קודים לכספת שנאספו בדרך (מעורבבים):</span>
             <div className="flex gap-1 flex-wrap justify-center" dir="ltr">
               {displayRewards.map((char, idx) => {
                 const isSolved = char !== '?';
                 return (
                   <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black uppercase ${isSolved ? 'bg-fuchsia-50 border-2 border-fuchsia-500 text-fuchsia-700 shadow-inner' : 'border-2 border-dashed border-fuchsia-300 text-fuchsia-300 bg-white'}`}>
                     {char}
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isPlayMode ? (
            <>
              <label className="cursor-pointer bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors border border-fuchsia-200 shadow-sm">
                <Upload size={18} />
                <span className="hidden sm:inline">העלו קובץ גיבוי</span>
                <input type="file" accept="image/*,.json" className="hidden" onChange={handleFileUpload} />
              </label>
              
              {imageSrc && (
                <>
                  <button onClick={() => { 
                      setIsPlayMode(true); 
                      setUnlockedPoints([]); 
                      setSolvedPoints([]); 
                      setSolvedQuestions({}); 
                      setGameWon(false); 
                      setFinalCodeInput(Array((finalCode || '').replace(/\s+/g, '').length).fill('')); 
                  }} className="bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md shadow-emerald-500/20">
                    <PlayCircle size={18} />
                    <span>תצוגה מקדימה</span>
                  </button>
                  <button onClick={() => setIsExportModalOpen(true)} className="bg-purple-600 text-white hover:bg-purple-700 px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md shadow-purple-600/20">
                    <Share2 size={18} />
                    <span>ייצוא למשתמשים</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <button onClick={() => setIsPlayMode(false)} className="bg-white text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-50 px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Edit3 size={18} />
              <span>חזור לעריכה</span>
            </button>
          )}
        </div>
      </header>

      {}
      <main className="flex-1 overflow-auto bg-fuchsia-50 p-4 md:p-8 relative">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {!imageSrc ? (
            <div className="text-center text-fuchsia-500 py-24 border-4 border-dashed border-fuchsia-200 rounded-3xl w-full bg-white shadow-sm mt-10">
              <div className="bg-fuchsia-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                 <FolderOpen size={48} className="text-fuchsia-500" />
              </div>
              <h2 className="text-2xl font-bold text-fuchsia-900 mb-2">מורים, מתחילים כאן!</h2>
              <p className="text-fuchsia-700 text-lg mb-6">השתמשו בכפתור כדי להעלות תמונת בסיס שעליה תבנו את המשחק.</p>
              <label className="cursor-pointer inline-block bg-fuchsia-600 text-white hover:bg-fuchsia-700 px-8 py-3 rounded-full font-bold transition-colors shadow-lg shadow-fuchsia-500/30">
                העלאת תמונה למשחק
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl shadow-xl border border-fuchsia-100 overflow-hidden flex flex-col relative pb-10">
                
                {!isPlayMode && (
                  <div className="bg-purple-50 border-b border-purple-100 p-4 text-center">
                    <p className="text-purple-800 font-black text-lg flex items-center justify-center gap-2">
                       <Move size={20} className="text-purple-600" />
                       הקליקו על התמונה כדי להוסיף תחנה, וגררו אותה למיקום הרצוי.
                    </p>
                  </div>
                )}

                <div className="p-4 md:p-8 flex justify-center items-center bg-fuchsia-100/30 relative min-h-[50vh] overflow-hidden pb-32">
                   {isPlayMode && (
                      <div className="absolute top-4 left-0 right-0 z-20 flex flex-wrap justify-between items-center px-6 gap-4">
                        <button onClick={() => { setShowFinalModal(true); setFinalCodeInput(Array((finalCode || '').replace(/\s+/g, '').length).fill('')); setErrorMsg(''); }} className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-6 py-2.5 rounded-full font-bold shadow-xl shadow-purple-500/30 flex items-center gap-2 hover:scale-105 transition-transform border border-fuchsia-400">
                          <Key size={18} /> לכספת הראשית
                        </button>
                      </div>
                   )}

                   <div ref={imageContainerRef} className={`relative select-none shadow-2xl rounded-2xl border-4 border-white bg-white ${!isPlayMode ? 'cursor-crosshair' : ''}`} onClick={handleImageClick} style={{ display: 'inline-block' }}>
                      <img src={imageSrc} alt="חדר בריחה" className="max-w-full max-h-[75vh] object-contain rounded-xl block pointer-events-none" />
                      
                      {points.map((point) => {
                        const isSolved = isPlayMode && solvedPoints.includes(point.id);
                        const isUnlocked = isPlayMode && (unlockedPoints.includes(point.id) || (!point.entryPasscode || point.entryPasscode.trim() === ''));
                        const isLocked = isPlayMode && !isUnlocked;
                        
                        return (
                          <div
                            key={point.id}
                            className={`absolute z-10 transition-all ${isPlayMode ? 'cursor-pointer' : 'cursor-grab'} ${!isPlayMode && selectedPoint === point.id ? 'z-20' : ''}`}
                            style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
                            onMouseDown={(e) => handleMouseDown(e, point.id)}
                            onClick={(e) => { if (isPlayMode) { handlePlayPointClick(e, point); } else { e.stopPropagation(); setSelectedPoint(point.id); } }}
                          >
                             <div 
                               className={`rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform duration-200
                                 ${!isPlayMode && selectedPoint === point.id ? 'ring-4 ring-offset-2 ring-fuchsia-400 scale-125' : 'hover:scale-110'}
                                 ${!isPlayMode && draggingPointId === point.id ? 'scale-125 shadow-2xl' : ''}
                               `}
                               style={{
                                 backgroundColor: isSolved ? '#10b981' : point.color, 
                                 width: '44px', height: '44px', fontSize: '18px',
                                 animation: isPlayMode && !isSolved ? 'floatPoint 3s ease-in-out infinite' : 'none'
                               }}
                             >
                               {isSolved ? <Check size={24} /> : point.label}
                               {isLocked && !isSolved && (<div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-fuchsia-200 text-fuchsia-600 shadow-sm"><Lock size={12} /></div>)}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                </div>

                {!isPlayMode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-fuchsia-100 p-4 flex justify-center items-center gap-4">
                    <span className="text-sm font-bold text-fuchsia-700">צבע לתחנה הבאה:</span>
                    <div className="flex gap-2 bg-fuchsia-50 p-2 rounded-full border border-fuchsia-100">
                      {PREDEFINED_COLORS.map(color => (
                        <button key={color} onClick={() => setActiveColor(color)} className={`w-8 h-8 rounded-full transition-all border-2 ${activeColor === color ? 'scale-125 border-fuchsia-900 shadow-md' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {}
              {!isPlayMode && currentPointData && (
                <div className="bg-white rounded-3xl shadow-2xl border-2 overflow-hidden transition-all duration-300 relative" style={{ borderColor: currentPointData.color }}>
                  
                  <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm relative z-10" style={{ borderBottomColor: currentPointData.color + '40' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-lg font-black shadow-md border-2 border-white" style={{ backgroundColor: currentPointData.color }}>
                        {currentPointData.label}
                      </div>
                      <h3 className="font-black text-2xl text-fuchsia-950">עריכת תחנה</h3>
                    </div>
                    <button onClick={() => deletePoint(currentPointData.id)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm">
                      <Trash2 size={18} /> מחיקת תחנה
                    </button>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8 bg-fuchsia-50/20">
                    
                    {/* STEP 1: ENTRY LOCK */}
                    <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
                       <h4 className="text-lg font-black text-purple-900 mb-4 flex items-center gap-2 border-b border-purple-50 pb-3">
                         <span className="bg-purple-100 p-1.5 rounded-lg text-purple-600"><Lock size={18}/></span>
                         שלב 1: כניסה לתחנה
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <label className="block text-sm font-bold text-purple-800 mb-1">קוד לפתיחת התחנה</label>
                           <p className="text-xs text-purple-600 mb-2 font-medium">כדי ליצור רצף: הזינו את הפתרון מהתחנה הקודמת. <strong className="text-red-500">השאירו ריק אם זו התחנה הראשונה.</strong></p>
                           <input type="text" value={currentPointData.entryPasscode} placeholder="למשל: 5555" onChange={(e) => updatePoint(currentPointData.id, 'entryPasscode', e.target.value)} className="w-full text-base bg-purple-50 border-purple-200 border-2 rounded-xl px-4 py-2.5 text-purple-900 outline-none focus:border-purple-500 font-bold" />
                         </div>
                         <div>
                           <label className="block text-sm font-bold text-purple-800 mb-1">רמז כניסה (אופציונלי)</label>
                           <p className="text-xs text-purple-600 mb-2 font-medium">יעזור לתלמידים אם שכחו את הקוד.</p>
                           <input type="text" value={currentPointData.entryHint} placeholder="רמז: זה הקוד שקיבלתם במשימה הקודמת..." onChange={(e) => updatePoint(currentPointData.id, 'entryHint', e.target.value)} className="w-full text-base bg-white border-purple-200 border-2 rounded-xl px-4 py-2.5 text-purple-900 outline-none focus:border-purple-500 font-medium" />
                         </div>
                       </div>
                    </div>

                    {/* STEP 2: LEARNING CONTENT */}
                    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                       <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-50 pb-3">
                         <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><FileText size={18}/></span>
                         שלב 2: חומר למידה (תמונה / סרטון / טקסט)
                       </h4>
                       <div className="space-y-5">
                         
                         <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                           <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><LinkIcon size={16}/> חומר עזר חזותי (בחרו העלאת תמונה או קישור)</label>
                           
                           <div className="flex flex-col gap-4">
                             <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                               <label className="cursor-pointer bg-white text-blue-600 border border-blue-300 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap">
                                 <Upload size={16} /> העלאת תמונה למשימה
                                 <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStationImageUpload(currentPointData.id, e)} />
                               </label>
                               <span className="text-xs text-blue-600 font-medium text-center">או</span>
                               <input type="url" value={currentPointData.mediaUrl?.startsWith('data:image') ? '' : (currentPointData.mediaUrl || '')} placeholder="קישור יוטיוב, וימאו או קוד הטמעה (Canva/Genially)" onChange={(e) => updatePoint(currentPointData.id, 'mediaUrl', e.target.value)} className="flex-1 text-sm bg-white border-blue-200 border rounded-lg px-3 py-2 text-blue-950 outline-none text-left focus:border-blue-500" dir="ltr" />
                             </div>

                             {currentPointData.mediaUrl && currentPointData.mediaUrl.startsWith('data:image') && (
                               <div className="relative inline-block border-2 border-blue-200 rounded-lg p-1 bg-white shadow-sm w-max mt-2">
                                 <img src={currentPointData.mediaUrl} alt="תמונה מלווה" className="h-32 object-contain rounded-md" />
                                 <button onClick={() => updatePoint(currentPointData.id, 'mediaUrl', '')} className="absolute -top-3 -right-3 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 w-8 h-8 rounded-full flex items-center justify-center border border-red-200 shadow-sm"><X size={16}/></button>
                               </div>
                             )}
                           </div>
                         </div>

                         <div>
                           <label className="block text-sm font-bold text-blue-800 mb-1">טקסט/מידע/סיפור המסגרת</label>
                           <textarea value={currentPointData.learningText || ''} onChange={(e) => updatePoint(currentPointData.id, 'learningText', e.target.value)} rows={3} className="w-full text-base bg-blue-50/50 border-blue-200 border-2 rounded-xl px-4 py-3 text-blue-950 outline-none resize-y focus:border-blue-500 font-medium leading-relaxed" placeholder="הקלידו או הדביקו טקסט שילווה את התחנה..." />
                         </div>
                       </div>
                    </div>

                    {/* STEP 3: THE CHALLENGES */}
                    <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm">
                       <h4 className="text-lg font-black text-amber-900 mb-4 flex items-center justify-between border-b border-amber-50 pb-3">
                         <div className="flex items-center gap-2">
                           <span className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><FileQuestion size={18}/></span>
                           שלב 3: משימות ושאלות לבדיקה
                         </div>
                       </h4>

                       <div className="space-y-6">
                         {currentPointData.questions && currentPointData.questions.map((q, qIndex) => (
                           <div key={q.id} className="p-6 bg-amber-50/40 border border-amber-200 rounded-2xl relative shadow-sm">
                              <div className="flex justify-between items-center mb-5">
                                <span className="font-black text-amber-800 bg-amber-200 px-4 py-1.5 rounded-full text-sm shadow-sm">שאלה {qIndex + 1}</span>
                                <button onClick={() => deleteQuestion(currentPointData.id, q.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                              </div>

                              <div className="space-y-5">
                                <div>
                                  <label className="block text-sm font-bold text-amber-800 mb-1">סוג השאלה</label>
                                  <select value={q.type} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'type', e.target.value)} className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 text-amber-900 font-bold focus:outline-none focus:border-amber-400 shadow-sm">
                                    <option value="open">טקסט חופשי (מילה / מספר / השלמה)</option>
                                    <option value="trivia">טריוויה (בחירה מרובה)</option>
                                    <option value="order">סידור פריטים (המערכת תערבב לתלמיד)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-bold text-amber-800 mb-1">השאלה / ההוראה:</label>
                                  <input type="text" value={q.text} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'text', e.target.value)} className="w-full text-lg bg-white border-amber-200 border-2 rounded-xl px-4 py-3 text-amber-950 outline-none focus:border-amber-500 font-bold" placeholder="כתבו כאן את השאלה..." />
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-inner">
                                  
                                  {q.type === 'open' && (
                                    <div>
                                      <label className="block text-sm font-bold text-amber-800 mb-2">התשובה הנכונה המדויקת:</label>
                                      <input type="text" value={q.correctAnswer} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'correctAnswer', e.target.value)} className="w-full md:w-1/2 text-lg bg-emerald-50 border-emerald-300 border-2 rounded-xl px-4 py-3 text-emerald-700 outline-none focus:border-emerald-500 font-black text-center" placeholder="למשל: תפוח" />
                                    </div>
                                  )}

                                  {q.type === 'trivia' && (
                                    <div>
                                      <label className="block text-sm font-bold text-amber-800 mb-3">אפשרויות תשובה (סמנו את הנכונה):</label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[0,1,2,3].map((idx) => (
                                          <div key={idx} className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-colors ${q.correctAnswer === idx ? 'bg-emerald-50 border-emerald-400' : 'bg-amber-50/50 border-transparent hover:border-amber-200'}`}>
                                             <input type="radio" name={`correct_${q.id}`} checked={q.correctAnswer === idx} onChange={() => updateQuestion(currentPointData.id, q.id, 'correctAnswer', idx)} className="w-5 h-5 cursor-pointer accent-emerald-500"/>
                                             <input type="text" value={q.options[idx] || ''} onChange={(e) => updateQuestionOption(currentPointData.id, q.id, idx, e.target.value)} className="flex-1 bg-white border-amber-200 border rounded-lg px-3 py-2 text-amber-900 outline-none focus:border-amber-400" placeholder={`אפשרות ${idx+1}`} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {q.type === 'order' && (
                                    <div>
                                      <label className="block text-sm font-bold text-amber-800 mb-2">הזינו את הפריטים בסדר הנכון (המערכת תערבב):</label>
                                      <div className="space-y-2 mb-4">
                                        {q.options.map((opt, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-200 flex justify-center items-center text-xs font-bold text-amber-700">{idx+1}</div>
                                            <input type="text" value={opt} onChange={(e) => updateQuestionOption(currentPointData.id, q.id, idx, e.target.value)} className="flex-1 bg-white border-amber-200 border-2 rounded-lg px-3 py-2 text-amber-900 outline-none focus:border-amber-400 font-bold" placeholder="פריט..." />
                                            {q.options.length > 2 && (<button onClick={() => removeOrderOption(currentPointData.id, q.id, idx)} className="text-red-400 p-2"><Trash2 size={16}/></button>)}
                                          </div>
                                        ))}
                                      </div>
                                      <button onClick={() => addOrderOption(currentPointData.id, q.id)} className="text-sm font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors">+ הוסף פריט לסידור</button>
                                    </div>
                                  )}

                                </div>

                                <div className="bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-200 mt-4">
                                  <label className="block text-sm font-bold text-fuchsia-800 mb-1 flex items-center gap-2">
                                    <ListOrdered size={16}/> צופן מקומי לשאלה זו (אופציונלי - לתחנה הבאה)
                                  </label>
                                  <p className="text-xs text-fuchsia-600 mb-3 font-medium">לא חובה. התו שהתלמיד יקבל כאן יעזור לו להרכיב את הקוד שפותח את התחנה הבאה.</p>
                                  <input type="text" maxLength="2" value={q.rewardChar || ''} onChange={(e) => updateQuestion(currentPointData.id, q.id, 'rewardChar', e.target.value)} className="w-24 text-center text-xl bg-white border-fuchsia-300 border-2 rounded-xl px-2 py-2 text-fuchsia-950 outline-none focus:border-fuchsia-500 font-black uppercase shadow-sm" placeholder="למשל: A" dir="ltr" />
                                </div>
                              </div>
                           </div>
                         ))}
                         
                         <button onClick={() => addQuestion(currentPointData.id)} className="w-full py-5 border-2 border-dashed border-amber-400 rounded-2xl text-amber-700 font-black flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors text-lg shadow-sm">
                           <PlusCircle size={24} /> הוסף שאלה נוספת לתחנה זו
                         </button>

                         <div>
                           <label className="block text-sm font-bold text-amber-800 mb-1">רמז כללי לתחנה (אופציונלי)</label>
                           <input type="text" value={currentPointData.taskHint || ''} onChange={(e) => updatePoint(currentPointData.id, 'taskHint', e.target.value)} className="w-full text-base bg-white border-amber-200 border rounded-xl px-4 py-2 text-amber-900 outline-none focus:border-amber-400" placeholder="הזן רמז לעזרה בפתרון החידות..." />
                         </div>

                       </div>
                    </div>

                    {/* STEP 4: SUCCESS MESSAGE & VAULT REWARD */}
                    <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                       <h4 className="text-lg font-black text-emerald-900 mb-3 flex items-center gap-2">
                         <span className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600"><Check size={18}/></span>
                         שלב 4: סיום התחנה
                       </h4>
                       
                       <div className="space-y-5">
                         <div>
                           <label className="block text-sm font-bold text-emerald-800 mb-1">הודעת ניצחון ורמז</label>
                           <p className="text-xs text-emerald-700 mb-3 font-medium">הודעה זו תופיע לאחר פתרון כל השאלות. תנו להם הנחיה מה לעשות עם חלקי הצופן שאספו.</p>
                           <textarea
                             value={currentPointData.successMessage}
                             onChange={(e) => updatePoint(currentPointData.id, 'successMessage', e.target.value)}
                             rows={2}
                             className="w-full text-lg bg-emerald-50 border-emerald-300 border-2 rounded-xl px-4 py-3 text-emerald-900 outline-none resize-none focus:border-emerald-600 font-black leading-relaxed"
                             placeholder="לדוגמה: כל הכבוד! סדרו את האותיות שאספתם כדי לקבל את הקוד לתחנה הבאה."
                           />
                         </div>

                         <div className="bg-emerald-100/50 p-4 rounded-xl border border-emerald-200 mt-4">
                           <label className="block text-sm text-emerald-900 mb-2 font-black flex items-center gap-2">
                             <Trophy size={16}/> צופן לכספת הראשית (ייאסף למלאי הכללי)
                           </label>
                           <p className="text-xs text-emerald-700 mb-3 font-medium">כשהתלמיד יסיים את התחנה כולה, האות הזו תתווסף באופן מעורבב למלאי העליון לקראת פתיחת הכספת הסופית.</p>
                           <input 
                             type="text" 
                             maxLength="2" 
                             value={currentPointData.vaultRewardChar || ''} 
                             onChange={(e) => updatePoint(currentPointData.id, 'vaultRewardChar', e.target.value)} 
                             className="w-24 text-center text-xl bg-white border-emerald-400 border-2 rounded-xl px-2 py-2 text-emerald-950 outline-none focus:border-emerald-600 font-black uppercase shadow-sm" 
                             placeholder="למשל: Z" 
                             dir="ltr" 
                           />
                         </div>
                       </div>
                    </div>

                  </div>
                </div>
              )}

              {}
              {!isPlayMode && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-fuchsia-100 mt-8">
                  <h2 className="text-xl font-black text-fuchsia-950 flex items-center gap-2 mb-6 pb-4 border-b border-fuchsia-50">
                    <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Trophy size={24} /></div>
                    הכספת הראשית (סיום החדר כולו)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-base font-bold text-fuchsia-900 mb-2">קוד סופי לניצחון</label>
                      <p className="text-sm text-fuchsia-600 mb-4 font-medium">הקוד שמסיים את המשחק. התלמידים ירכיבו אותו מכל התווים שאספו בתחנות (הם יצטרכו לגלות את הסדר הנכון!).</p>
                      <input type="text" value={finalCode} placeholder="למשל: 1234, או גמל" onChange={(e) => setFinalCode(e.target.value)} className="w-full bg-fuchsia-50 border-fuchsia-200 border-2 rounded-xl px-4 py-3 text-purple-900 focus:border-purple-500 outline-none transition-colors font-bold text-center text-xl uppercase" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-base font-bold text-fuchsia-900 mb-2">הודעת ניצחון וסיום</label>
                      <p className="text-sm text-fuchsia-600 mb-4 font-medium">מה יופיע לתלמידים כשיפתחו את הכספת בהצלחה?</p>
                      <textarea value={finalMessage} onChange={(e) => setFinalMessage(e.target.value)} rows={2} className="w-full bg-fuchsia-50 border-fuchsia-200 border-2 rounded-xl px-4 py-3 text-purple-900 focus:border-purple-500 outline-none resize-none transition-colors font-bold text-lg" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {}
      {isPlayMode && (activeGamePoint || showFinalModal) && (
        <div className="fixed inset-0 bg-fuchsia-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-lg w-full border border-fuchsia-100 overflow-hidden relative max-h-[90vh] flex flex-col">
            <button onClick={() => { setActiveGamePoint(null); setShowFinalModal(false); }} className="absolute top-4 left-4 bg-fuchsia-50 text-fuchsia-400 hover:text-fuchsia-700 hover:bg-fuchsia-100 w-10 h-10 flex items-center justify-center rounded-full transition-colors z-20">
              <X size={24} />
            </button>
            
            {activeGamePoint && (
              <div className="p-6 md:p-8 text-center overflow-y-auto flex-1">
                <h3 className="text-3xl font-black text-fuchsia-900 mb-6 border-b-2 border-fuchsia-50 pb-4">תחנה {activeGamePoint.label}</h3>
                
                {errorMsg && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl font-bold mb-4 animate-bounce">{errorMsg}</div>}

                {solvedPoints.includes(activeGamePoint.id) ? (
                  <div className="py-6">
                    <div className="text-emerald-500 font-black text-6xl mb-6">🏆</div>
                    
                    {activeGamePoint.questions && activeGamePoint.questions.filter(q => q.rewardChar && q.rewardChar.trim() !== '').length > 0 && (
                      <div className="mb-6 bg-fuchsia-50 p-5 rounded-2xl border-2 border-fuchsia-200 inline-block shadow-sm">
                        <p className="text-base font-black text-fuchsia-800 mb-1">צפנים שאספתם בשאלות למעלה:</p>
                        <p className="text-xs font-bold text-fuchsia-600 mb-4">(השתמשו בהם כדי לפענח את פתיחת התחנה הבאה!)</p>
                        <div className="flex gap-3 justify-center" dir="ltr">
                          {activeGamePoint.questions.filter(q => q.rewardChar && q.rewardChar.trim() !== '').map((q, i) => (
                            <div key={i} className="w-12 h-12 bg-white border-2 border-fuchsia-400 rounded-xl flex items-center justify-center text-2xl font-black text-fuchsia-600 uppercase shadow-sm">
                              {q.rewardChar}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeGamePoint.vaultRewardChar && activeGamePoint.vaultRewardChar.trim() !== '' && (
                      <div className="mb-6 bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-200 inline-block shadow-sm w-full">
                        <p className="text-base font-black text-emerald-800 mb-1">מצאתם חלק מהצופן לכספת הראשית!</p>
                        <p className="text-xs font-bold text-emerald-600 mb-4">(התו התווסף מעורבב למלאי העליון, תצטרכו לפענח את הסדר!)</p>
                        <div className="flex gap-3 justify-center" dir="ltr">
                            <div className="w-16 h-16 bg-white border-4 border-dashed border-emerald-400 rounded-xl flex items-center justify-center text-3xl font-black text-emerald-600 uppercase shadow-md">
                              {activeGamePoint.vaultRewardChar}
                            </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-6 rounded-2xl text-xl font-black leading-relaxed shadow-lg shadow-emerald-500/20 mb-6">
                      {activeGamePoint.successMessage}
                    </div>
                  </div>
                ) : 
                
                unlockedPoints.includes(activeGamePoint.id) ? (
                  <div className="text-right">
                    
                    {activeGamePoint.mediaUrl && (
                      <div dangerouslySetInnerHTML={{ __html: getMediaEmbedHtml(activeGamePoint.mediaUrl) }} className="mb-6 rounded-xl overflow-hidden" />
                    )}

                    {activeGamePoint.learningText && (
                      <div className="bg-fuchsia-50/50 p-5 rounded-xl border border-fuchsia-100 text-fuchsia-950 font-medium leading-relaxed mb-6 whitespace-pre-wrap text-base">
                        {activeGamePoint.learningText}
                      </div>
                    )}

                    {!getMediaEmbedHtml(activeGamePoint.mediaUrl) && activeGamePoint.mediaUrl && (
                      <a href={activeGamePoint.mediaUrl} target="_blank" rel="noreferrer" className="inline-block bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 px-6 py-3 rounded-xl font-bold mb-6 w-full text-center hover:bg-fuchsia-100 transition-colors">מעבר לחומר עזר חיצוני ↗</a>
                    )}

                    <div className="space-y-6 mb-6">
                      {activeGamePoint.questions?.map((q, index) => {
                         const isSolved = solvedQuestions[q.id];
                         return (
                           <div key={q.id} className={`bg-white border-2 p-5 rounded-2xl shadow-sm ${isSolved ? 'border-emerald-300 bg-emerald-50/30' : 'border-amber-200'}`}>
                             <h4 className={`text-lg font-black mb-4 text-center border-b pb-3 ${isSolved ? 'text-emerald-800 border-emerald-100' : 'text-amber-900 border-amber-100'}`}>שאלה {index+1}: {q.text}</h4>
                             
                             {isSolved ? (
                               <div className="text-center">
                                 <div className="text-emerald-600 font-bold text-lg mb-2 flex items-center justify-center gap-2"><Check size={20}/> תשובה נכונה!</div>
                                 {q.rewardChar && q.rewardChar.trim() !== '' && (
                                    <div className="mt-3 bg-white border-2 border-fuchsia-300 p-3 rounded-xl inline-block">
                                      <span className="text-xs text-fuchsia-800 font-bold block mb-1">צופן שנאסף:</span>
                                      <span className="text-2xl font-black text-fuchsia-600 uppercase" dir="ltr">{q.rewardChar}</span>
                                    </div>
                                 )}
                               </div>
                             ) : (
                               <>
                                 {questionError[q.id] && <div className="text-red-500 font-bold text-center mb-3 bg-red-50 p-2 rounded-lg">{questionError[q.id]}</div>}
                                 
                                 {q.type === 'open' && (
                                   <input type="text" value={studentAnswers[q.id] || ''} onChange={(e) => setStudentAnswers({...studentAnswers, [q.id]: e.target.value})} placeholder="הקלידו תשובה..." className="w-full text-center text-lg bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-amber-950 focus:border-amber-500 outline-none font-bold mb-3" />
                                 )}

                                 {q.type === 'trivia' && (
                                   <div className="space-y-3 mb-3">
                                     {q.options.filter(o=>o.trim()!=='').map((opt, i) => (
                                       <button key={i} onClick={() => setStudentAnswers({...studentAnswers, [q.id]: i})} className={`w-full text-right p-3 rounded-xl border-2 transition-all font-bold text-base ${studentAnswers[q.id] === i ? 'bg-amber-400 border-amber-500 text-white shadow-md' : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'}`}>
                                         {opt}
                                       </button>
                                     ))}
                                   </div>
                                 )}

                                 {q.type === 'order' && (
                                   <div className="space-y-2 mb-3">
                                     {orderStates[q.id]?.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-amber-50 border-2 border-amber-200 p-3 rounded-xl font-bold text-amber-900">
                                           <span>{item}</span>
                                           <div className="flex gap-1">
                                              <button disabled={i===0} onClick={() => moveOrderPlayMode(q.id, i, -1)} className="bg-amber-200 hover:bg-amber-300 text-amber-800 p-1.5 rounded-lg disabled:opacity-30 transition-colors"><ArrowUp size={16}/></button>
                                              <button disabled={i===orderStates[q.id].length-1} onClick={() => moveOrderPlayMode(q.id, i, 1)} className="bg-amber-200 hover:bg-amber-300 text-amber-800 p-1.5 rounded-lg disabled:opacity-30 transition-colors"><ArrowDown size={16}/></button>
                                           </div>
                                        </div>
                                     ))}
                                   </div>
                                 )}
                                 
                                 <button onClick={() => checkQuestionPlayMode(q)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm mt-2">
                                   בדיקת תשובה לשאלה זו
                                 </button>
                               </>
                             )}
                           </div>
                         )
                      })}
                    </div>

                    {isActivePointFullySolved && (
                       <button onClick={completeStationPlayMode} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 shadow-lg shadow-emerald-500/30 text-xl border-t-2 border-dashed border-fuchsia-200 mt-6">
                         סיום תחנה והתקדמות <Unlock size={24} />
                       </button>
                    )}

                    {activeGamePoint.taskHint && (
                      <div className="mt-4">
                        <button onClick={() => setShowHint(!showHint)} className="w-full bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-50 py-2.5 rounded-xl text-base font-bold transition-colors">רמז כללי למשימות? 💡</button>
                        {showHint && <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">{activeGamePoint.taskHint}</div>}
                      </div>
                    )}
                  </div>
                ) : 
                
                (
                  <div className="py-8">
                    <div className="text-6xl mb-6">🔒</div>
                    <p className="text-fuchsia-900 text-lg mb-6 font-black">התחנה נעולה. הזינו את הקוד כדי להיכנס:</p>
                    {errorMsg && <p className="text-red-500 text-sm mb-2 font-bold animate-bounce">{errorMsg}</p>}
                    <input type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="קוד פתיחה..." className="w-full text-center text-2xl bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl px-4 py-4 text-fuchsia-950 mb-6 focus:border-fuchsia-600 outline-none font-black" />
                    <button onClick={handlePlayEntrySubmit} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:-translate-y-1 shadow-lg shadow-purple-500/30 text-xl mb-4">
                      פתח תחנה <Unlock size={24} />
                    </button>
                    {activeGamePoint.entryHint && (
                      <div>
                        <button onClick={() => setShowHint(!showHint)} className="w-full bg-white border-2 border-fuchsia-200 text-fuchsia-600 hover:bg-fuchsia-50 py-3 rounded-xl text-base font-bold transition-colors">רמז לקוד הכניסה?</button>
                        {showHint && <div className="mt-3 p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-xl text-fuchsia-800 text-sm font-medium">{activeGamePoint.entryHint}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showFinalModal && (
              <div className="p-8 text-center">
                {!gameWon ? (
                  <>
                    <div className="mx-auto bg-gradient-to-tr from-purple-500 to-fuchsia-500 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-purple-500/30 text-white">
                      <Key size={48} />
                    </div>
                    <h3 className="text-3xl font-black text-fuchsia-900 mb-2">הכספת הראשית</h3>
                    <p className="text-fuchsia-700 text-base mb-8 font-bold">הזינו את הקוד הסופי שאספתם כדי לפתוח (מימין לשמאל):</p>
                    
                    {errorMsg && <p className="text-red-500 text-sm mb-4 font-bold bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                    
                    {finalCode ? (
                      <div className="flex justify-center gap-2 mb-8 flex-wrap" dir="rtl">
                         {finalCodeInput.map((val, idx) => (
                            <input 
                              key={idx}
                              ref={el => finalInputRefs.current[idx] = el}
                              type="text" 
                              maxLength="1"
                              value={val} 
                              onChange={(e) => handleFinalInputChange(e, idx)}
                              onKeyDown={(e) => handleFinalInputKeyDown(e, idx)}
                              className="w-12 h-14 md:w-14 md:h-16 text-center text-3xl font-black bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl text-purple-950 focus:border-purple-600 focus:bg-white outline-none uppercase shadow-inner" 
                            />
                         ))}
                      </div>
                    ) : (
                      <p className="text-fuchsia-500 text-sm mb-5 font-bold bg-fuchsia-50 py-2 rounded-lg">לא הוגדר קוד סופי. לחץ לאישור!</p>
                    )}
                    
                    <button onClick={handleFinalSubmit} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:-translate-y-1 transition-transform shadow-xl shadow-purple-500/40 text-2xl">
                      פרוץ את הכספת
                    </button>
                  </>
                ) : (
                  <div className="py-10">
                    <div className="inline-block bg-yellow-100 p-6 rounded-full mb-6">
                       <Trophy size={80} className="text-yellow-500 drop-shadow-lg" />
                    </div>
                    <h2 className="text-4xl font-black text-fuchsia-900 mb-4">ניצחתם!</h2>
                    <p className="text-fuchsia-800 text-2xl font-bold bg-fuchsia-100 p-6 rounded-2xl">{finalMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-fuchsia-950/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-fuchsia-100 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-fuchsia-100 bg-fuchsia-50/50">
              <h3 className="text-xl font-black text-fuchsia-900">אפשרויות סיום ושמירה למורים</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-fuchsia-400 hover:text-fuchsia-700 bg-white shadow-sm w-8 h-8 rounded-full flex justify-center items-center transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <button onClick={handleSaveToCloud} disabled={isSavingCloud} className="w-full flex items-center gap-5 p-5 border-2 border-blue-200 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all text-right group shadow-sm disabled:opacity-50">
                <div className="bg-blue-500 text-white p-3.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shadow-blue-500/20">
                  {isSavingCloud ? <div className="animate-spin border-4 border-white border-t-transparent rounded-full w-7 h-7"></div> : <CloudUpload size={28} />}
                </div>
                <div>
                  <div className="font-black text-blue-900 text-xl mb-1">{projectId ? 'עדכון קוד פרויקט' : 'הפקת קוד פרויקט (לשמירה)'}</div>
                  <div className="text-sm text-blue-800 font-medium">שומר את הפרויקט ומספק קוד (אותו תוכלו להעתיק) לחזרה לעריכה בהמשך.</div>
                </div>
              </button>

              <button onClick={handleCopyEmbed} className="w-full flex items-center gap-5 p-5 border-2 border-orange-200 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-all text-right group shadow-sm">
                <div className="bg-orange-500 text-white p-3.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shadow-orange-500/20 relative">
                  {copiedSuccess ? <Check size={28} className="text-white" /> : <Code size={28} />}
                  {copiedSuccess && <span className="absolute -top-10 -right-2 bg-orange-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">הקוד הועתק!</span>}
                </div>
                <div>
                  <div className="font-black text-orange-900 text-xl mb-1">העתקת קוד להטמעה</div>
                  <div className="text-sm text-orange-800 font-medium">מעתיק את המשחק (HTML) להדבקה ב-Google Sites.</div>
                </div>
              </button>

              <button onClick={generateStandaloneHTML} className="w-full flex items-center gap-5 p-5 border-2 border-purple-200 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-all text-right group shadow-sm">
                <div className="bg-purple-600 text-white p-3.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shadow-purple-600/20">
                  <PlayCircle size={28} />
                </div>
                <div>
                  <div className="font-black text-purple-900 text-xl mb-1">הורדת משחק (HTML)</div>
                  <div className="text-sm text-purple-800 font-medium">מוריד קובץ עצמאי שניתן לשלוח ישירות לתלמידים.</div>
                </div>
              </button>

              <button onClick={handleExportJSON} className="w-full flex items-center gap-5 p-5 border-2 border-fuchsia-200 bg-fuchsia-50 rounded-2xl hover:bg-fuchsia-100 transition-all text-right group shadow-sm">
                <div className="bg-fuchsia-600 text-white p-3.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shadow-fuchsia-600/20">
                  <FileDown size={28} />
                </div>
                <div>
                  <div className="font-black text-fuchsia-900 text-xl mb-1">הורדת קובץ גיבוי</div>
                  <div className="text-sm text-fuchsia-800 font-medium">שומר את הפרויקט כקובץ מקומי (JSON) על המחשב שלך.</div>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
