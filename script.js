let quizData = {
  questions: [],
  school: {
    name: "مدرسة الريادة النموذجية",
    logo: "https://cdn-icons-png.flaticon.com/512/2995/2995531.png",
  },
};

function toggleAdminPanel() {
  document.getElementById("adminPanel").classList.toggle("hidden");
  showTab("questions", event);
}

function showTab(tab, e) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  if (e) e.target.classList.add("active");

  const content = document.getElementById("tabContent");

  switch (tab) {
    case "questions":
      content.innerHTML = `
        <h4>إدارة الأسئلة</h4>
        <textarea id='questionText' rows='3' placeholder='نص السؤال'></textarea>
        <input id='correctAnswer' placeholder='الإجابة الصحيحة'>
        <button onclick='addQuestion()'>إضافة ➕</button>
        <div id='questionsList'></div>
      `;
      renderQuestions();
      break;

    case "settings":
      content.innerHTML = `
        <h4>إعدادات عامة</h4>
        <label>عدد الفائزين</label>
        <input type='number' id='winnersCount' value='1'>
        <button onclick='showToast("تم الحفظ 💾")'>حفظ</button>
      `;
      break;

    case "prizes":
      content.innerHTML = `
        <h4>إعداد الجوائز 🎁</h4>
        <input id='prizeMessage' placeholder='رسالة الفوز'>
        <input id='prizeImage' placeholder='رابط صورة الجائزة'>
        <button onclick='showToast("تم حفظ الجائزة 💾")'>حفظ</button>
      `;
      break;

    case "info":
      content.innerHTML = `
        <h4>بيانات المدرسة 🏫</h4>
        <label>اسم المدرسة</label>
        <input id='schoolInput' value='${quizData.school.name}'>
        <label>رابط الشعار</label>
        <input id='logoInput' value='${quizData.school.logo}'>
        <button onclick='updateSchool()'>تحديث 💾</button>
      `;
      break;
  }
}

function addQuestion() {
  const text = document.getElementById("questionText").value;
  const ans = document.getElementById("correctAnswer").value;
  if (!text || !ans) return showToast("أدخل السؤال والإجابة ⚠️");
  quizData.questions.push({ text, ans });
  renderQuestions();
  showToast("تمت إضافة السؤال ✅");
}

function renderQuestions() {
  const list = document.getElementById("questionsList");
  if (!list) return;
  list.innerHTML = quizData.questions.map((q, i) =>
    `<div>${i + 1}. ${q.text} - <b>${q.ans}</b></div>`
  ).join("");
}

/* طلاب */
function startQuiz() {
  const name = document.getElementById("studentName").value.trim();
  const cls = document.getElementById("studentClass").value.trim();
  if (!name || !cls) return showToast("أدخل الاسم والفصل ⚠️");
  if (quizData.questions.length === 0) return showToast("لا توجد أسئلة بعد ❗");

  document.getElementById("studentForm").classList.add("hidden");
  document.getElementById("quizArea").classList.remove("hidden");

  const container = document.getElementById("questionsContainer");
  container.innerHTML = quizData.questions.map((q, i) => `
    <div><p>${i + 1}. ${q.text}</p><input id='answer${i}'></div>
  `).join("");
}

function submitAnswers() {
  let correct = 0;
  quizData.questions.forEach((q, i) => {
    const ans = document.getElementById(`answer${i}`).value.trim();
    if (ans === q.ans) correct++;
  });
  const score = Math.round((correct / quizData.questions.length) * 100);
  document.getElementById("quizArea").classList.add("hidden");
  document.getElementById("resultArea").classList.remove("hidden");
  document.getElementById("scoreDisplay").textContent = `نتيجتك: ${score}%`;
}

function resetQuiz() {
  document.getElementById("resultArea").classList.add("hidden");
  document.getElementById("studentForm").classList.remove("hidden");
  document.getElementById("studentName").value = "";
  document.getElementById("studentClass").value = "";
}

/* تحديث بيانات المدرسة */
function updateSchool() {
  const name = document.getElementById("schoolInput").value;
  const logo = document.getElementById("logoInput").value;
  quizData.school = { name, logo };
  document.getElementById("schoolName").textContent = name;
  document.getElementById("schoolLogo").src = logo;
  showToast("تم تحديث بيانات المدرسة ✅");
}

/* Toast */
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
