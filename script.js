// ================= DATA DEFAULT & STATE =================
let examsData = JSON.parse(localStorage.getItem('ujian_ai_exams')) || [
    {
        id: 'exam_1',
        title: 'Matematika Dasar & Logika',
        subject: 'Matematika',
        durationMinutes: 10,
        questions: [
            {
                type: 'mcq',
                text: 'Berapakah hasil dari 25 + 5 × 4?',
                options: ['120', '45', '100', '35'],
                correct: 1, // 45
                explanation: 'Gunakan aturan hirarki operasi hitung (kombinasi perkalian didahulukan): 5 × 4 = 20, lalu 25 + 20 = 45.'
            },
            {
                type: 'mcq',
                text: 'Jika f(x) = 2x + 3, maka nilai dari f(4) adalah...',
                options: ['8', '11', '14', '10'],
                correct: 1, // 11
                explanation: 'Substitusi x = 4 ke dalam fungsi: f(4) = 2(4) + 3 = 8 + 3 = 11.'
            },
            {
                type: 'tf',
                text: 'Bilangan 2 adalah satu-satunya bilangan prima yang genap.',
                options: ['Benar', 'Salah'],
                correct: 0, // Benar
                explanation: 'Benar, karena semua bilangan genap lainnya habis dibagi 2 sehingga bukan bilangan prima.'
            }
        ]
    },
    {
        id: 'exam_2',
        title: 'Pemrograman Web & HTML Dasar',
        subject: 'Informatika',
        durationMinutes: 5,
        questions: [
            {
                type: 'mcq',
                text: 'Tag HTML manakah yang digunakan untuk membuat judul utama (heading terbesar)?',
                options: ['<head>', '<h6>', '<h1>', '<header>'],
                correct: 2, // <h1>
                explanation: 'Tag <h1> merepresentasikan heading tingkat pertama atau judul utama dalam dokumen HTML.'
            },
            {
                type: 'mcq',
                text: 'Atribut CSS apa yang digunakan untuk mengubah warna teks?',
                options: ['color', 'text-color', 'font-color', 'background-color'],
                correct: 0, // color
                explanation: 'Properti CSS `color` digunakan untuk menentukan warna teks suatu elemen.'
            }
        ]
    }
];

let studentResults = JSON.parse(localStorage.getItem('ujian_ai_results')) || [];
let currentStudent = JSON.parse(localStorage.getItem('ujian_ai_current_student')) || null;
let currentExam = null;
let currentQIndex = 0;
let userAnswers = {};
let examTimerInterval = null;
let timeLeftSeconds = 0;
let apiKeyStorage = localStorage.getItem('ujian_ai_apikey') || '';

// ================= INISIALISASI APLIKASI =================
document.addEventListener('DOMContentLoaded', () => {
    if (currentStudent) {
        showScreen('dashboard-screen');
        updateDashboardUI();
    } else {
        showScreen('login-screen');
    }

    // Student Login
    document.getElementById('student-login-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('student-name').value.trim();
        const className = document.getElementById('student-class').value.trim();
        const studentId = document.getElementById('student-id').value.trim();

        if (!name || !className || !studentId) return;

        currentStudent = { name, className, studentId };
        localStorage.setItem('ujian_ai_current_student', JSON.stringify(currentStudent));
        showScreen('dashboard-screen');
        updateDashboardUI();
    };

    document.getElementById('logout-btn').onclick = () => {
        currentStudent = null;
        localStorage.removeItem('ujian_ai_current_student');
        showScreen('login-screen');
    };

    // Modal Triggers
    document.getElementById('open-admin-btn').onclick = () => document.getElementById('admin-modal').classList.remove('hidden');
    document.getElementById('close-admin-modal').onclick = () => document.getElementById('admin-modal').classList.add('hidden');
    document.getElementById('open-leaderboard-btn').onclick = () => {
        renderLeaderboard();
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    };
    document.getElementById('close-leaderboard').onclick = () => document.getElementById('leaderboard-modal').classList.add('hidden');

    document.getElementById('open-ai-helper-btn').onclick = () => document.getElementById('ai-modal').classList.remove('hidden');
    document.getElementById('close-ai-modal').onclick = () => document.getElementById('ai-modal').classList.add('hidden');

    // Exam Navigation Buttons
    document.getElementById('next-btn').onclick = () => navigateQuestion(1);
    document.getElementById('prev-btn').onclick = () => navigateQuestion(-1);
    document.getElementById('submit-exam-btn').onclick = finishExam;
    document.getElementById('back-dashboard-btn').onclick = () => {
        showScreen('dashboard-screen');
        updateDashboardUI();
    };

    // AI Helper Tabs
    document.querySelectorAll('.ai-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        };
    });

    document.getElementById('ai-submit-btn').onclick = handleAIHelperRequest;
    document.getElementById('ai-help-btn').onclick = triggerQuestionAIHint;

    // Admin Login & Management
    document.getElementById('admin-login-submit').onclick = () => {
        const pin = document.getElementById('admin-pin-input').value;
        if (pin === '1234') {
            document.getElementById('admin-login-view').classList.add('hidden');
            document.getElementById('admin-dashboard-view').classList.remove('hidden');
            renderAdminExams();
            renderAdminStudents();
        } else {
            alert('PIN Admin salah! (Gunakan 1234)');
        }
    };

    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('pane-' + tab.dataset.atab).classList.add('active');
        };
    });

    document.getElementById('save-api-key-btn').onclick = () => {
        apiKeyStorage = document.getElementById('admin-api-key').value.trim();
        localStorage.setItem('ujian_ai_apikey', apiKeyStorage);
        alert('API Key berhasil disimpan!');
    };

    document.getElementById('create-exam-btn').onclick = createNewExamByAdmin;
    document.getElementById('export-csv-btn').onclick = exportResultsToCSV;
    document.getElementById('download-certificate-btn').onclick = downloadCertificate;
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateDashboardUI() {
    if (!currentStudent) return;
    document.getElementById('dash-name').textContent = currentStudent.name;
    document.getElementById('menu-coins').textContent = studentResults.length * 50;

    // Render Exam List
    const examListEl = document.getElementById('exam-list');
    examListEl.innerHTML = '';
    examsData.forEach(exam => {
        const div = document.createElement('div');
        div.className = 'exam-item';
        div.innerHTML = `
            <div class="exam-item-info">
                <h4>${exam.title}</h4>
                <small>${exam.subject} • ${exam.questions.length} Soal • ${exam.durationMinutes} Menit</small>
            </div>
            <button class="start-exam-btn" onclick="startExam('${exam.id}')">Mulai</button>
        `;
        examListEl.appendChild(div);
    });

    // Render History
    const historyListEl = document.getElementById('history-list');
    const studentHistory = studentResults.filter(r => r.studentId === currentStudent.studentId);
    if (studentHistory.length === 0) {
        historyListEl.innerHTML = '<p class="empty-text" style="color:var(--text-secondary);font-size:12px;">Belum ada riwayat ujian selesai.</p>';
    } else {
        historyListEl.innerHTML = '';
        studentHistory.forEach(h => {
            const div = document.createElement('div');
            div.className = 'exam-item';
            div.innerHTML = `
                <div class="exam-item-info">
                    <h4>${h.examTitle}</h4>
                    <small>Nilai: <b>${h.score}</b> • ${h.date}</small>
                </div>
                <span style="font-size:12px;color:var(--accent-emerald);font-weight:700;">${h.status}</span>
            `;
            historyListEl.appendChild(div);
        });
    }
}

// ================= UJIAN ENGINE =================
function startExam(examId) {
    currentExam = examsData.find(e => e.id === examId);
    if (!currentExam) return;

    currentQIndex = 0;
    userAnswers = {};
    timeLeftSeconds = currentExam.durationMinutes * 60;

    showScreen('exam-screen');
    document.getElementById('active-exam-title').textContent = currentExam.title;

    buildQuestionNavGrid();
    renderQuestion();
    startExamTimer();
}

function startExamTimer() {
    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = setInterval(() => {
        timeLeftSeconds--;
        const mins = Math.floor(timeLeftSeconds / 60);
        const secs = timeLeftSeconds % 60;
        document.getElementById('time-left').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (timeLeftSeconds <= 0) {
            clearInterval(examTimerInterval);
            alert('Waktu ujian telah habis!');
            finishExam();
        }
    }, 1000);
}

function buildQuestionNavGrid() {
    const grid = document.getElementById('question-nav-grid');
    grid.innerHTML = '';
    currentExam.questions.forEach((_, idx) => {
        const pill = document.createElement('button');
        pill.className = `q-nav-pill ${idx === 0 ? 'current' : ''}`;
        pill.textContent = idx + 1;
        pill.id = `qnav-${idx}`;
        pill.onclick = () => {
            currentQIndex = idx;
            renderQuestion();
        };
        grid.appendChild(pill);
    });
}

function renderQuestion() {
    const q = currentExam.questions[currentQIndex];
    document.getElementById('active-question-counter').textContent = `Soal ${currentQIndex + 1} dari ${currentExam.questions.length}`;
    document.getElementById('question-text').textContent = q.text;

    const optContainer = document.getElementById('options-container');
    const essayContainer = document.getElementById('essay-container');

    optContainer.innerHTML = '';
    essayContainer.classList.add('hidden');

    if (q.type === 'mcq' || q.type === 'tf') {
        optContainer.classList.remove('hidden');
        q.options.forEach((opt, idx) => {
            const item = document.createElement('div');
            item.className = `option-item ${userAnswers[currentQIndex] === idx ? 'selected' : ''}`;
            item.innerHTML = `<i class="fa-regular fa-circle-dot"></i> <span>${opt}</span>`;
            item.onclick = () => {
                userAnswers[currentQIndex] = idx;
                renderQuestion();
                updateNavPillStatus();
            };
            optContainer.appendChild(item);
        });
    } else {
        optContainer.classList.add('hidden');
        essayContainer.classList.remove('hidden');
        const textarea = document.getElementById('essay-answer');
        textarea.value = userAnswers[currentQIndex] || '';
        textarea.oninput = (e) => {
            userAnswers[currentQIndex] = e.target.value;
            updateNavPillStatus();
        };
    }

    // Update Nav Pills active state
    document.querySelectorAll('.q-nav-pill').forEach((p, idx) => {
        p.classList.toggle('current', idx === currentQIndex);
    });
}

function updateNavPillStatus() {
    const pill = document.getElementById(`qnav-${currentQIndex}`);
    if (userAnswers[currentQIndex] !== undefined && userAnswers[currentQIndex] !== '') {
        pill.classList.add('answered');
    } else {
        pill.classList.remove('answered');
    }
}

function navigateQuestion(direction) {
    const newIdx = currentQIndex + direction;
    if (newIdx >= 0 && newIdx < currentExam.questions.length) {
        currentQIndex = newIdx;
        renderQuestion();
    }
}

function finishExam() {
    if (examTimerInterval) clearInterval(examTimerInterval);

    let correctCount = 0;
    const total = currentExam.questions.length;

    currentExam.questions.forEach((q, idx) => {
        if (q.type === 'mcq' || q.type === 'tf') {
            if (userAnswers[idx] === q.correct) correctCount++;
        } else {
            if (userAnswers[idx] && userAnswers[idx].trim().length > 3) correctCount++; // Evaluasi esai dasar
        }
    });

    const score = Math.round((correctCount / total) * 100);
    const status = score >= 70 ? 'LULUS' : 'REMEDIAL';

    const resultRecord = {
        studentId: currentStudent.studentId,
        studentName: currentStudent.name,
        className: currentStudent.className,
        examTitle: currentExam.title,
        score,
        correctCount,
        total,
        status,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    studentResults.unshift(resultRecord);
    localStorage.setItem('ujian_ai_results', JSON.stringify(studentResults));

    // Render Result Screen
    showScreen('result-screen');
    document.getElementById('final-score').textContent = score;
    document.getElementById('result-status').textContent = status;
    document.getElementById('result-status').style.color = score >= 70 ? 'var(--accent-emerald)' : '#ef4444';
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('total-count').textContent = total;
    document.getElementById('time-taken').textContent = `${Math.floor((currentExam.durationMinutes * 60 - timeLeftSeconds) / 60)} Menit`;

    generateAIEvaluation(score, correctCount, total);
}

// ================= AI MOD FEATURES =================
async function generateAIEvaluation(score, correct, total) {
    const box = document.getElementById('ai-analysis-content');
    box.innerHTML = 'AI sedang menganalisis pola jawaban Anda...';

    if (apiKeyStorage) {
        try {
            const prompt = `Analisis hasil ujian siswa dengan nilai ${score} (${correct} benar dari ${total} soal). Berikan evaluasi motivasi dan saran belajar yang konstruktif dalam bahasa Indonesia.`;
            const reply = await callRealAIAPI(prompt);
            box.innerHTML = marked.parse(reply);
            return;
        } catch (e) {
            console.error(e);
        }
    }

    // Smart Fallback Analysis
    let text = '';
    if (score >= 90) {
        text = 'Luar biasa! Penguasaan konsep materi Anda sangat matang. Pertahankan konsistensi belajar dan coba eksplorasi materi tingkat lanjut.';
    } else if (score >= 70) {
        text = 'Kerja bagus! Anda telah memahami sebagian besar materi dengan baik. Perhatikan kembali beberapa soal yang terlewat untuk hasil yang lebih sempurna.';
    } else {
        text = 'Jangan berkecil hati. Nilai Anda menunjukkan perlunya pengulangan materi dasar. Gunakan fitur AI Study Assistant untuk merangkum dan memperdalam topik yang belum dipahami.';
    }
    box.innerHTML = text;
}

async function triggerQuestionAIHint() {
    const q = currentExam.questions[currentQIndex];
    document.getElementById('ai-modal').classList.remove('hidden');
    document.getElementById('ai-prompt-input').value = `Tolong berikan petunjuk (hint) untuk menjawab soal ini tanpa memberikan jawaban langsung: "${q.text}"`;
}

async function handleAIHelperRequest() {
    const promptText = document.getElementById('ai-prompt-input').value.trim();
    const responseBox = document.getElementById('ai-response-box');
    if (!promptText) return;

    responseBox.classList.remove('hidden');
    responseBox.innerHTML = 'AI sedang memproses permintaan...';

    if (apiKeyStorage) {
        try {
            const reply = await callRealAIAPI(promptText);
            responseBox.innerHTML = marked.parse(reply);
            return;
        } catch (e) {
            console.error(e);
        }
    }

    // Fallback Simulated AI Response
    setTimeout(() => {
        responseBox.innerHTML = `<b>Jawaban AI Assistant:</b><br>Berdasarkan topik <i>"${promptText}"</i>, konsep utamanya adalah memahami definisi dasar, rumus terkait, serta langkah logis penyelesaian masalah secara sistematis. Selalu teliti dalam membaca setiap instruksi soal.`;
    }, 600);
}

async function callRealAIAPI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyStorage}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            system_instruction: { parts: [{ text: 'Anda adalah asisten AI pendidikan yang cerdas dan suportif dalam platform UJIAN AI MOD PRO.' }] }
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini API Error');
    return data.candidates[0].content.parts[0].text;
}

// ================= ADMIN & CERTIFICATE =================
function renderAdminExams() {
    const list = document.getElementById('admin-exam-list');
    list.innerHTML = '';
    examsData.forEach(exam => {
        const div = document.createElement('div');
        div.className = 'admin-exam-item';
        div.innerHTML = `
            <div>
                <b>${exam.title}</b><br>
                <small>${exam.subject} • ${exam.questions.length} Soal • ${exam.durationMinutes} Menit</small>
            </div>
            <button class="danger-btn" onclick="deleteExam('${exam.id}')">Hapus</button>
        `;
        list.appendChild(div);
    });
}

function createNewExamByAdmin() {
    const title = prompt('Masukkan Judul Ujian Baru:');
    if (!title) return;
    const subject = prompt('Masukkan Mata Pelajaran:', 'Umum');
    const newExam = {
        id: 'exam_' + Date.now(),
        title,
        subject,
        durationMinutes: 10,
        questions: [
            {
                type: 'mcq',
                text: 'Contoh Pertanyaan Ujian Baru?',
                options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
                correct: 0,
                explanation: 'Penjelasan contoh soal.'
            }
        ]
    };
    examsData.push(newExam);
    localStorage.setItem('ujian_ai_exams', JSON.stringify(examsData));
    renderAdminExams();
    updateDashboardUI();
    alert('Ujian baru berhasil dibuat!');
}

function deleteExam(id) {
    examsData = examsData.filter(e => e.id !== id);
    localStorage.setItem('ujian_ai_exams', JSON.stringify(examsData));
    renderAdminExams();
    updateDashboardUI();
}

function renderAdminStudents() {
    const list = document.getElementById('admin-student-results');
    if (studentResults.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary);font-size:12px;">Belum ada data hasil siswa.</p>';
        return;
    }
    list.innerHTML = '';
    studentResults.forEach(r => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div><b>${r.studentName}</b> (${r.className})<br><small>${r.examTitle}</small></div>
            <div style="text-align:right;"><b>Nilai: ${r.score}</b><br><small>${r.status}</small></div>
        `;
        list.appendChild(div);
    });
}

function exportResultsToCSV() {
    let csv = 'Nama Siswa,Kelas,Nomor ID,Judul Ujian,Nilai,Status,Tanggal\n';
    studentResults.forEach(r => {
        csv += `"${r.studentName}","${r.className}","${r.studentId}","${r.examTitle}",${r.score},"${r.status}","${r.date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hasil_ujian_ai_mod_pro.csv';
    a.click();
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (studentResults.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:13px;">Belum ada data leaderboard.</p>';
        return;
    }
    const sorted = [...studentResults].sort((a, b) => b.score - a.score);
    list.innerHTML = '';
    sorted.forEach((r, idx) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-family:'Orbitron';font-weight:800;color:var(--neon-purple);">#${idx + 1}</span>
                <div><b>${r.studentName}</b><br><small>${r.className}</small></div>
            </div>
            <div style="text-align:right;"><b>${r.score} Poin</b><br><small>${r.examTitle}</small></div>
        `;
        list.appendChild(div);
    });
}

function downloadCertificate() {
    if (!currentStudent) return;
    const certText = `=== SERTIFIKAT KELULUSAN UJIAN AI MOD PRO ===\n\nDiberikan Kepada:\nNama: ${currentStudent.name}\nKelas: ${currentStudent.className}\nID Peserta: ${currentStudent.studentId}\n\nTelah berhasil menyelesaikan ujian dengan predikat memuaskan berkat dukungan sistem cerdas UJIAN AI MOD PRO.\nTanggal: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([certText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sertifikat_${currentStudent.name.replace(/\s+/g, '_')}.txt`;
    a.click();
}
