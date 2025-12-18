// بيانات المسابقة
let quizData = {
  questions: [],
  participants: [],
};

// لوحة الإدارة
function toggleAdminPanel() {
  const panel = document.getElementById('adminPanel');
  panel.classList.toggle('hidden');
  showTab('questions');
}

// التبويبات داخل لوحة التحكم
function showTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const tabContent = document.getElementById('tabContent');
  switch (tabName) {
    case 'questions':
      tabContent.innerHTML = `
        <h4>إدارة الأسئلة</h4>
        <textarea id="questionText" placeholder="أدخل نص السؤال" rows="3"></textarea>
        <input id="correctAnswer" placeholder="الإجابة الصحيحة">
        <button onclick="addQuestion()">إضافة السؤال ➕</button>
        <div id="questionsList"></div>
      `;
      renderQuestions();
      break;

    case 'settings':
      tabContent.innerHTML = `
        <h4>إعدادات المسابقة</h4>
        <label>مدة المسابقة (دقائق)</label>
        <input type="number" id="duration" value="5">
        <label>عدد الفائزين</label>
        <input type="number" id="winnersCount" value="1">
        <button onclick="saveSettings()">💾 حفظ الإعدادات</button>
      `;
      break;

    case 'prizes':
      tabContent.innerHTML = `
        <h4>إعداد الجوائز 🎁</h4>
        <input id="prizeMessage" placeholder="رسالة الفوز">
        <input id="prizeImage" placeholder="رابط صورة الجائزة">
        <button onclick="savePrize()">حفظ الجائزة 💾</button>
      `;
      break;

    case 'results':
      tabContent.innerHTML = `
        <h4>نتائج الطلاب 📊</h4>
        <div id="resultsList"></div>
      `;
      renderResults();
      break;
  }
}

// إضافة سؤال
function addQuestion() {
  const q = document.getElementById('questionText').value.trim();
  const a = document.getElementById('correctAnswer').value.trim();
  if (!q || !a) return showToast('يرجى إدخال السؤال والإجابة 📝');
  quizData.questions.push({ text: q, answer: a });
  saveLocal();
  renderQuestions();
  showToast('تمت إضافة السؤال ✅');
}

function renderQuestions() {
  const list = document.getElementById('questionsList');
  if (!list) return;
  list.innerHTML = quizData.questions.map((q, i) => `
    <div class="q-item">
      <b>${i + 1}. ${q.text}</b><br>
      <small>الإجابة: ${q.answer}</small>
    </div>
  `).join('');
}

// حفظ إعدادات
function saveSettings() {
  showToast('تم حفظ الإعدادات 💾');
}

// حفظ الجائزة
function savePrize() {
  showToast('تم حفظ الجائزة 🎉');
}

// عرض الإشعارات
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// الطلاب
function startQuiz() {
  const name = document.getElementById('studentName').value.trim();
  const cls = document.getElementById('studentClass').value.trim();
  if (!name || !cls) return showToast('الاسم والفصل مطلوبان ⚠️');

  if (quizData.questions.length === 0) return showToast('لا توجد أسئلة بعد ❗');

  document.getElementById('studentForm').classList.add('hidden');
  document.getElementById('quizArea').classList.remove('hidden');

  const container = document.getElementById('questionsContainer');
  container.innerHTML = quizData.questions.map((q, i) => `
    <div>
      <p>${i + 1}. ${q.text}</p>
      <input type="text" id="answer${i}" placeholder="إجابتك...">
    </div>
  `).join('');
}

function submitAnswers() {
  const name = document.getElementById('studentName').value;
  const cls = document.getElementById('studentClass').value;
  let correct = 0;

  quizData.questions.forEach((q, i) => {
    const ans = document.getElementById(`answer${i}`).value.trim();
    if (ans && ans === q.answer) correct++;
  });

  const score = Math.round((correct / quizData.questions.length) * 100);
  quizData.participants.push({ name, cls, score });
  saveLocal();

  document.getElementById('quizArea').classList.add('hidden');
  document.getElementById('resultArea').classList.remove('hidden');
  document.getElementById('scoreDisplay').textContent = `نتيجتك: ${score}%`;
}

function resetQuiz() {
  document.getElementById('studentForm').classList.remove('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('studentName').value = '';
  document.getElementById('studentClass').value = '';
}

// عرض النتائج في لوحة التحكم
function renderResults() {
  const list = document.getElementById('resultsList');
  list.innerHTML = quizData.participants.map(p => `
    <div>${p.name} (${p.cls}) — ${p.score}%</div>
  `).join('');
}

// حفظ محلي
function saveLocal() {
  localStorage.setItem('quizData', JSON.stringify(quizData));
}

// تحميل تلقائي عند الفتح
window.onload = () => {
  const saved = localStorage.getItem('quizData');
  if (saved) quizData = JSON.parse(saved);
};