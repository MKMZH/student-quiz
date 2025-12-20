// ==========================
// app.js – نظام المسابقات الحديث
// ==========================

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

// تفعيل الاتصال
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("✅ متصل بـ Firebase");

// عناصر الصفحة العامة
const quizStatusEl   = document.getElementById("quizStatus");
const studentFormEl  = document.getElementById("studentForm");
const quizAreaEl     = document.getElementById("quizArea");
const resultAreaEl   = document.getElementById("resultArea");
const scoreDisplayEl = document.getElementById("scoreDisplay");
const resultNoteEl   = document.getElementById("resultNote");
const countdownEl    = document.getElementById("countdown");
const questionsContainer = document.getElementById("questionsContainer");
const toastEl        = document.getElementById("toast");

// متغيرات الحالة
let currentSettings = null;
let currentQuestions = [];
let countdownTimer = null;
let currentStudent = null;

// =====================
// دوال عامة
// =====================
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2500);
}

window.toggleAdminPanel = function () {
  document.getElementById("adminPanel").classList.toggle("hidden");
};

window.showTab = function (e, tabName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderAdminTab(tabName);
};

// =====================
// تحميل بيانات Firestore
// =====================
async function loadSettingsFromFirebase() {
  const ref = doc(db, "settings", "quizTime");
  const snap = await getDoc(ref);
  currentSettings = snap.exists() ? snap.data() : null;
}

async function loadQuestionsFromFirebase() {
  const qs = await getDocs(collection(db, "questions"));
  currentQuestions = [];
  qs.forEach(d => currentQuestions.push({ id: d.id, ...d.data() }));
}

// =====================
async function init() {
  await loadSettingsFromFirebase();
  await loadQuestionsFromFirebase();
  updateStudentView();
  renderAdminTab("time");
}
init().catch(e => console.error(e));

// =====================
// أدوات الوقت
// =====================
function getNowUtc() { return new Date(); }

function isWithinQuizPeriod() {
  if (!currentSettings) return false;
  const n = getNowUtc();
  return n >= new Date(currentSettings.startDateTime) && n <= new Date(currentSettings.endDateTime);
}

function startCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const now = getNowUtc().getTime();
    const end = new Date(currentSettings.endDateTime).getTime();
    const diff = end - now;
    if (diff <= 0) {
      clearInterval(countdownTimer);
      countdownEl.textContent = "⏰ انتهى وقت المسابقة";
      document.querySelector("#quizArea button").disabled = true;
      return;
    }
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    countdownEl.textContent = `الوقت المتبقي: ${m} دقيقة و${s} ثانية`;
  }, 1000);
}

// =====================
// واجهة الطالب
// =====================
function updateStudentView() {
  if (!currentSettings) {
    quizStatusEl.textContent = "لم تُضبط إعدادات المسابقة بعد.";
    studentFormEl.classList.add("hidden");
    return;
  }
  const now = getNowUtc();
  const start = new Date(currentSettings.startDateTime);
  const end = new Date(currentSettings.endDateTime);

  if (now < start) {
    quizStatusEl.textContent = `المسابقة لم تبدأ بعد. تبدأ في: ${start.toLocaleString("ar-SA")}`;
    studentFormEl.classList.add("hidden");
    return;
  }
  if (now > end) {
    quizStatusEl.textContent = `⏰ انتهى وقت المسابقة في: ${end.toLocaleString("ar-SA")}`;
    studentFormEl.classList.add("hidden");
    return;
  }
  quizStatusEl.textContent = "المسابقة نشطة، يمكنك الدخول.";
  studentFormEl.classList.remove("hidden");
}

// دخول الطالب
window.enterQuiz = async function () {
  if (!isWithinQuizPeriod()) { showToast("المسابقة غير متاحة الآن."); return; }
  const name = document.getElementById("studentName").value.trim();
  const cls = document.getElementById("studentClass").value.trim();
  if (!name || !cls) return showToast("يرجى إدخال الاسم والفصل.");

  currentStudent = { name, class: cls };

  const qRef = collection(db, "participants");
  const q = query(qRef, where("name","==",name), where("class","==",cls), where("quizId","==",currentSettings.quizId||"default"));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const data = snap.docs[0].data();
    quizStatusEl.textContent = "لقد شاركت مسبقًا في هذه المسابقة.";
    studentFormEl.classList.add("hidden");
    quizAreaEl.classList.add("hidden");
    resultAreaEl.classList.remove("hidden");
    scoreDisplayEl.textContent = `نتيجتك السابقة: ${data.score}%`;
    resultNoteEl.textContent = "لا يمكنك المشاركة مرة أخرى.";
    return;
  }

  studentFormEl.classList.add("hidden");
  quizAreaEl.classList.remove("hidden");
  resultAreaEl.classList.add("hidden");
  questionsContainer.innerHTML = "";

  if (currentQuestions.length === 0) {
    questionsContainer.innerHTML = "<p>لا توجد أسئلة.</p>";
    return;
  }
  currentQuestions.forEach((q,i)=>{
    const div=document.createElement("div");
    div.className="question-card";
    div.innerHTML=`<p>${i+1}. ${q.text}</p><input id="answer-${q.id}" placeholder="إجابتك">`;
    questionsContainer.appendChild(div);
  });
  startCountdown();
};

// إرسال الإجابات
window.submitAnswers = async function(){
  if(!isWithinQuizPeriod())return showToast("انتهى الوقت.");
  if(!currentStudent)return;
  let correct=0;
  currentQuestions.forEach(q=>{
    const inp=document.getElementById(`answer-${q.id}`);
    if(inp && inp.value.trim().toLowerCase()===q.answer.toLowerCase()) correct++;
  });
  const total=currentQuestions.length;
  const score=total?Math.round((correct/total)*100):0;

  await addDoc(collection(db,"participants"),{
    name:currentStudent.name,class:currentStudent.class,
    quizId:currentSettings.quizId||"default",
    correct,total,score,submittedAt:new Date().toISOString()
  });

  quizAreaEl.classList.add("hidden");
  resultAreaEl.classList.remove("hidden");
  scoreDisplayEl.textContent=`${score}%`;
  resultNoteEl.textContent=score>=80?"إجابة رائعة 👏":"محاولة جيدة 👍";
  quizStatusEl.textContent="تم إرسال إجاباتك.";
};

// =====================
// لوحة الإدارة
// =====================
function renderAdminTab(tab){
  const cont=document.getElementById("tabContent");
  if(tab==="time"){
    const sv=currentSettings?.startDateTime||"";
    const ev=currentSettings?.endDateTime||"";
    const w=currentSettings?.winnersCount||1;
    cont.innerHTML=`
      <h4>🕒 وقت المسابقة</h4>
      <label>تاريخ ووقت البداية</label>
      <input type="datetime-local" id="adminStart" value="${sv}">
      <label>تاريخ ووقت النهاية</label>
      <input type="datetime-local" id="adminEnd" value="${ev}">
      <label>عدد الفائزين</label>
      <input type="number" id="adminWinners" value="${w}" min="1">
      <button id="saveTimeBtn">💾 حفظ</button>`;
    document.getElementById("saveTimeBtn").onclick=saveTimeSettings;
  }else if(tab==="questions"){
    cont.innerHTML=`
      <h4>📝 إضافة سؤال</h4>
      <textarea id="qtext" rows="3" placeholder="السؤال"></textarea>
      <input id="qans" placeholder="الإجابة">
      <button id="addQBtn">➕ إضافة</button>
      <h4>قائمة الأسئلة</h4>
      <div id="qList"></div>`;
    document.getElementById("addQBtn").onclick=adminAddQuestion;
    renderAdminQuestionsList();
  }else if(tab==="results"){
    cont.innerHTML=`<h4>📊 النتائج</h4><button id="loadRes">تحديث</button><div id="resList"></div>`;
    document.getElementById("loadRes").onclick=loadResultsForAdmin;
  }else{
    cont.innerHTML=`<h4>📁 الأرشيف (لاحقًا)</h4>`;
  }
}

// حفظ التوقيت والعدد
async function saveTimeSettings(){
  const start=document.getElementById("adminStart").value;
  const end=document.getElementById("adminEnd").value;
  const win=parseInt(document.getElementById("adminWinners").value||"1");
  if(!start||!end)return showToast("يرجى إدخال الأوقات.");
  if(new Date(end)<=new Date(start))return showToast("النهاية يجب أن تكون بعد البداية.");

  const newS={startDateTime:start,endDateTime:end,winnersCount:win,quizId:"default"};
  await setDoc(doc(db,"settings","quizTime"),newS);
  currentSettings=newS;

  showToast("تم الحفظ.");
  await loadSettingsFromFirebase();     // ✅ التحديث الفوري
  renderAdminTab("time");               // ✅ إعادة عرض التبويب
  updateStudentView();
}

// إضافة سؤال
async function adminAddQuestion(){
  const t=document.getElementById("qtext").value.trim();
  const a=document.getElementById("qans").value.trim();
  if(!t||!a)return showToast("أدخل السؤال والإجابة.");

  await addDoc(collection(db,"questions"),{text:t,answer:a});
  document.getElementById("qtext").value="";
  document.getElementById("qans").value="";
  await loadQuestionsFromFirebase();    // ✅ تحديث القائمة
  renderAdminQuestionsList();           // ✅ إعادة العرض
  showToast("تمت إضافة السؤال.");
}

// عرض الأسئلة
function renderAdminQuestionsList(){
  const el=document.getElementById("qList");
  if(!el)return;
  if(!currentQuestions.length){el.innerHTML="<p>لا توجد أسئلة.</p>";return;}
  el.innerHTML=currentQuestions.map((q,i)=>`${i+1}. ${q.text} — <b>${q.answer}</b>`).join("<br>");
}

// النتائج
async function loadResultsForAdmin(){
  const el=document.getElementById("resList");
  el.innerHTML="جاري التحميل...";
  const s=await getDocs(collection(db,"participants"));
  if(s.empty){el.innerHTML="<p>لا مشاركين.</p>";return;}
  let h="";
  s.forEach(d=>{const p=d.data();h+=`<div>${p.name} (${p.class}) - ${p.score}%</div>`;});
  el.innerHTML=h;
}
