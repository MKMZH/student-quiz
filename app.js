// app.js  –  منطق نظام المسابقات المتصل بفirebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyBWiz4f-aEHwdv34hc81MBtQ3eTzJoeGis",
  authDomain: "studentquiz-afd8e.firebaseapp.com",
  projectId: "studentquiz-afd8e",
  storageBucket: "studentquiz-afd8e.appspot.com",
  messagingSenderId: "718901037670",
  appId: "1:718901037670:web:156f5a8428cf06c708bba7",
  measurementId: "G-GY57GPT97K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ تم الاتصال بـ Firebase من app.js");

// عناصر عامة من الصفحة
const quizStatusEl   = document.getElementById("quizStatus");
const studentFormEl  = document.getElementById("studentForm");
const quizAreaEl     = document.getElementById("quizArea");
const resultAreaEl   = document.getElementById("resultArea");
const scoreDisplayEl = document.getElementById("scoreDisplay");
const resultNoteEl   = document.getElementById("resultNote");
const countdownEl    = document.getElementById("countdown");
const questionsContainer = document.getElementById("questionsContainer");
const toastEl        = document.getElementById("toast");

// متغيرات حالة
let currentSettings = null;      // إعدادات الوقت وعدد الفائزين
let currentQuestions = [];       // الأسئلة
let countdownTimer = null;       // المؤقت
let currentStudent = null;       // {name, class}

// =========================
// دوال مساعدة عامة
// =========================
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function toggleAdminPanel() {
  document.getElementById("adminPanel").classList.toggle("hidden");
}

// كشف التبويبات في لوحة الإدارة
window.toggleAdminPanel = toggleAdminPanel;
window.showTab = function (event, tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");
  renderAdminTab(tabName);
};

// =========================
// تحميل الإعدادات والأسئلة من Firebase عند فتح الصفحة
// =========================
async function loadSettingsFromFirebase() {
  const ref = doc(db, "settings", "quizTime");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    currentSettings = snap.data();
  } else {
    currentSettings = null;
  }
}

async function loadQuestionsFromFirebase() {
  const qs = await getDocs(collection(db, "questions"));
  currentQuestions = [];
  qs.forEach(d => currentQuestions.push({ id: d.id, ...d.data() }));
}

// تهيئة الواجهة عند فتح الصفحة
async function init() {
  await loadSettingsFromFirebase();
  await loadQuestionsFromFirebase();
  updateStudentView();
  renderAdminTab("time");
}

init().catch(e => console.error(e));

// =========================
// منطق الوقت للفترة من-إلى
// =========================
function getNowUtc() {
  return new Date();
}

function isWithinQuizPeriod() {
  if (!currentSettings) return false;
  const now = getNowUtc();
  const start = new Date(currentSettings.startDateTime);
  const end   = new Date(currentSettings.endDateTime);
  return now >= start && now <= end;
}

function hasQuizEnded() {
  if (!currentSettings) return false;
  const now = getNowUtc();
  const end = new Date(currentSettings.endDateTime);
  return now > end;
}

// عدّاد تنازلي حتى وقت النهاية
function startCountdown() {
  if (!currentSettings) return;
  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    const now  = getNowUtc().getTime();
    const end  = new Date(currentSettings.endDateTime).getTime();
    let diff   = end - now;

    if (diff <= 0) {
      clearInterval(countdownTimer);
      countdownEl.textContent = "⏰ انتهى وقت المسابقة";
      // إقفال إرسال الإجابات
      document.querySelector("#quizArea button").disabled = true;
      return;
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    countdownEl.textContent = `الوقت المتبقي: ${minutes} دقيقة و ${seconds} ثانية`;
  }, 1000);
}

// =========================
// واجهة الطالب
// =========================
function updateStudentView() {
  if (!currentSettings) {
    quizStatusEl.textContent = "لم تُضبط إعدادات المسابقة بعد. (من لوحة التحكم)";
    studentFormEl.classList.add("hidden");
    return;
  }

  const now   = getNowUtc();
  const start = new Date(currentSettings.startDateTime);
  const end   = new Date(currentSettings.endDateTime);

  if (now < start) {
    quizStatusEl.textContent = `المسابقة لم تبدأ بعد. تبدأ في: ${start.toLocaleString("ar-SA")}`;
    studentFormEl.classList.add("hidden");
    quizAreaEl.classList.add("hidden");
    resultAreaEl.classList.add("hidden");
  } else if (now > end) {
    quizStatusEl.textContent = `⏰ انتهى وقت المسابقة في: ${end.toLocaleString("ar-SA")}`;
    studentFormEl.classList.add("hidden");
    quizAreaEl.classList.add("hidden");
    // النتائج ستظل متاحة من لوحة الإدارة
  } else {
    quizStatusEl.textContent = "المسابقة نشطة، يمكنك الدخول.";
    studentFormEl.classList.remove("hidden");
  }
}

// عندما يضغط الطالب "دخول المسابقة"
window.enterQuiz = async function () {
  if (!isWithinQuizPeriod()) {
    showToast("المسابقة غير متاحة في هذا الوقت.");
    updateStudentView();
    return;
  }

  const name = document.getElementById("studentName").value.trim();
  const cls  = document.getElementById("studentClass").value.trim();
  if (!name || !cls) {
    showToast("يرجى إدخال الاسم والفصل.");
    return;
  }
  currentStudent = { name, class: cls };

  // التحقق: هل شارك هذا الطالب من قبل؟
  const qRef = collection(db, "participants");
  const q = query(qRef,
    where("name", "==", name),
    where("class", "==", cls),
    where("quizId", "==", currentSettings.quizId || "default")
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    // سبق وشارك
    const data = snap.docs[0].data();
    quizStatusEl.textContent = "لقد شاركت مسبقًا في هذه المسابقة.";
    studentFormEl.classList.add("hidden");
    quizAreaEl.classList.add("hidden");
    resultAreaEl.classList.remove("hidden");
    scoreDisplayEl.textContent = `نتيجتك السابقة: ${data.score}%`;
    resultNoteEl.textContent = "لا يمكنك المشاركة مرة أخرى في هذه المسابقة.";
    return;
  }

  // السماح بالدخول
  studentFormEl.classList.add("hidden");
  quizAreaEl.classList.remove("hidden");
  resultAreaEl.classList.add("hidden");

  // عرض الأسئلة
  questionsContainer.innerHTML = "";
  if (currentQuestions.length === 0) {
    questionsContainer.innerHTML = "<p>لا توجد أسئلة مضافة.</p>";
    return;
  }
  currentQuestions.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "question-card";
    div.innerHTML = `
      <p>${index + 1}. ${q.text}</p>
      <input type="text" id="answer-${q.id}" placeholder="اكتب إجابتك هنا">
    `;
    questionsContainer.appendChild(div);
  });

  // بدء العد التنازلي
  startCountdown();
};

// إرسال الإجابات
window.submitAnswers = async function () {
  if (!isWithinQuizPeriod()) {
    showToast("انتهى الوقت، لا يمكن إرسال الإجابات.");
    return;
  }
  if (!currentStudent) {
    showToast("يجب تعبئة بيانات الطالب أولاً.");
    return;
  }

  // حساب النتيجة
  let correctCount = 0;
  currentQuestions.forEach(q => {
    const input = document.getElementById(`answer-${q.id}`);
    if (!input) return;
    const studentAns = (input.value || "").trim();
    if (studentAns && studentAns.toLowerCase() === (q.answer || "").toLowerCase()) {
      correctCount++;
    }
  });

  const total = currentQuestions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // حفظ في participants
  await addDoc(collection(db, "participants"), {
    name: currentStudent.name,
    class: currentStudent.class,
    quizId: currentSettings.quizId || "default",
    correct: correctCount,
    total: total,
    score: score,
    submittedAt: new Date().toISOString()
  });

  // عرض النتيجة
  quizAreaEl.classList.add("hidden");
  resultAreaEl.classList.remove("hidden");
  scoreDisplayEl.textContent = `${score}%`;
  if (score === 100) {
    resultNoteEl.textContent = "ممتاز! أجبت عن جميع الأسئلة بشكل صحيح 👏";
  } else if (score >= 60) {
    resultNoteEl.textContent = "عمل جيد! يمكنك تحسين نتيجتك في المسابقات القادمة.";
  } else {
    resultNoteEl.textContent = "حاول مرة أخرى في مسابقة أخرى لتحسين نتيجتك.";
  }
  quizStatusEl.textContent = "تم تسجيل مشاركتك، لا يمكنك المشاركة مرة أخرى في هذه المسابقة.";
};

// =========================
// لوحة الإدارة – تبويبات
// =========================
function renderAdminTab(tabName) {
  const container = document.getElementById("tabContent");
  if (tabName === "time") {
    const startVal = currentSettings?.startDateTime || "";
    const endVal   = currentSettings?.endDateTime   || "";
    const winners  = currentSettings?.winnersCount  || 1;
    container.innerHTML = `
      <h4>🕒 وقت المسابقة</h4>
      <label>تاريخ ووقت البداية</label>
      <input type="datetime-local" id="adminStart" value="${startVal}">
      <label>تاريخ ووقت النهاية</label>
      <input type="datetime-local" id="adminEnd" value="${endVal}">
      <label>عدد الفائزين</label>
      <input type="number" id="adminWinners" value="${winners}" min="1">
      <button id="saveTimeBtn">💾 حفظ الوقت</button>
    `;
    document.getElementById("saveTimeBtn").onclick = saveTimeSettings;
  } else if (tabName === "questions") {
    container.innerHTML = `
      <h4>📝 إضافة سؤال</h4>
      <textarea id="adminQuestion" rows="3" placeholder="نص السؤال"></textarea>
      <input id="adminAnswer" placeholder="الإجابة الصحيحة">
      <button id="addQBtn">➕ إضافة السؤال</button>
      <hr>
      <h4>الأسئلة الحالية</h4>
      <div id="adminQList"></div>
    `;
    document.getElementById("addQBtn").onclick = adminAddQuestion;
    renderAdminQuestionsList();
  } else if (tabName === "results") {
    container.innerHTML = `
      <h4>📊 النتائج (عرض فقط)</h4>
      <button id="loadResBtn">تحديث النتائج</button>
      <div id="resultsList"></div>
    `;
    document.getElementById("loadResBtn").onclick = loadResultsForAdmin;
  } else if (tabName === "archive") {
    container.innerHTML = `
      <h4>📁 الأرشيف (سنكمله في خطوة لاحقة)</h4>
      <p>سيتم هنا لاحقًا نقل المسابقات المنتهية بعد اختيار الفائزين.</p>
    `;
  }
}

// حفظ وقت البداية والنهاية وعدد الفائزين
async function saveTimeSettings() {
  const start = document.getElementById("adminStart").value;
  const end   = document.getElementById("adminEnd").value;
  const winners = parseInt(document.getElementById("adminWinners").value || "1", 10);

  if (!start || !end) {
    showToast("يرجى إدخال وقت البداية والنهاية.");
    return;
  }
  const startDate = new Date(start);
  const endDate   = new Date(end);
  if (endDate <= startDate) {
    showToast("يجب أن يكون وقت النهاية بعد وقت البداية.");
    return;
  }

  const newSettings = {
    startDateTime: start,
    endDateTime: end,
    winnersCount: winners,
    quizId: "default"  // يمكن تغييره لاحقًا لدعم أكثر من مسابقة
  };

  await setDoc(doc(db, "settings", "quizTime"), newSettings);
  currentSettings = newSettings;
  showToast("تم حفظ إعدادات الوقت بنجاح.");
  updateStudentView();
}

// إضافة سؤال من لوحة الإدارة
async function adminAddQuestion() {
  const text = document.getElementById("adminQuestion").value.trim();
  const ans  = document.getElementById("adminAnswer").value.trim();
  if (!text || !ans) {
    showToast("يرجى إدخال نص السؤال والإجابة.");
    return;
  }
  await addDoc(collection(db, "questions"), { text, answer: ans });
  document.getElementById("adminQuestion").value = "";
  document.getElementById("adminAnswer").value = "";
  await loadQuestionsFromFirebase();
  renderAdminQuestionsList();
  showToast("تمت إضافة السؤال.");
}

// عرض قائمة الأسئلة في لوحة الإدارة
function renderAdminQuestionsList() {
  const listEl = document.getElementById("adminQList");
  if (!listEl) return;
  if (currentQuestions.length === 0) {
    listEl.innerHTML = "<p>لا توجد أسئلة حاليًا.</p>";
    return;
  }
  listEl.innerHTML = currentQuestions
    .map((q, i) => `<div>${i + 1}. ${q.text} — <b>${q.answer}</b></div>`)
    .join("");
}

// تحميل المشاركين ونتائجهم للإدارة
async function loadResultsForAdmin() {
  const resEl = document.getElementById("resultsList");
  resEl.innerHTML = "جاري التحميل...";
  const snaps = await getDocs(collection(db, "participants"));
  let html = "";
  snaps.forEach(d => {
    const p = d.data();
    html += `<div>${p.name} (${p.class}) — ${p.score}%</div>`;
  });
  if (!html) html = "<p>لا يوجد مشاركون بعد.</p>";
  resEl.innerHTML = html;
}