// ============================================
// আল-নূর — app.js
// ============================================

// ── STATE ──
let currentSurahIndex = 0;
let completedDays = JSON.parse(localStorage.getItem('completedDays') || '[]');
let searchType = 'hadith';
let currentSurahData = null;

const SURAH_LIST = [
  { n: 1, name: 'আল-ফাতিহা', ar: 'الفاتحة' },
  { n: 2, name: 'আল-বাকারা', ar: 'البقرة' },
  { n: 3, name: 'আলে-ইমরান', ar: 'آل عمران' },
  { n: 36, name: 'ইয়াসীন', ar: 'يس' },
  { n: 55, name: 'আর-রাহমান', ar: 'الرحمن' },
  { n: 67, name: 'আল-মুলক', ar: 'الملك' },
  { n: 112, name: 'আল-ইখলাস', ar: 'الإخلاص' },
  { n: 113, name: 'আল-ফালাক', ar: 'الفلق' },
  { n: 114, name: 'আন-নাস', ar: 'الناس' },
];

// দৈনিক আয়াত ও হাদিস — API না থাকলে এগুলো fallback
const FALLBACK_AYAT = [
  { arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', translit: 'Waṣbir fa-inna Allāha lā yuḍīʿu ajra l-muḥsinīn', bangla: 'এবং ধৈর্য ধারণ করো, কারণ নিশ্চয়ই আল্লাহ সৎকর্মশীলদের পুরস্কার নষ্ট করেন না।', ref: 'সূরা হূদ ১১:১১৫' },
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translit: 'Inna maʿa l-ʿusri yusrā', bangla: 'নিশ্চয়ই কষ্টের সাথে সহজ আছে।', ref: 'সূরা আশ-শারহ ৯৪:৬' },
  { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', translit: 'Wa man yattaqi Allāha yajʿal lahu makhrajan', bangla: 'যে আল্লাহকে ভয় করে, তিনি তার জন্য পথ বের করে দেন।', ref: 'সূরা আত-তালাক ৬৫:২' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', translit: 'Fadhkurūnī adhkurkum', bangla: 'তোমরা আমাকে স্মরণ করো, আমি তোমাদের স্মরণ করব।', ref: 'সূরা আল-বাকারা ২:১৫২' },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', translit: "Wa qur Rabbi zidnī ʿilmā", bangla: 'বলো: হে আমার রব, আমার জ্ঞান বৃদ্ধি করুন।', ref: 'সূরা ত্বা-হা ২০:১১৪' },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', translit: 'Inna Allāha maʿa ṣ-ṣābirīn', bangla: 'নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে আছেন।', ref: 'সূরা আল-বাকারা ২:১৫৩' },
  { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', translit: 'Ḥasbunā Allāhu wa niʿma l-wakīl', bangla: 'আল্লাহই আমাদের জন্য যথেষ্ট এবং তিনি উত্তম কর্মবিধায়ক।', ref: 'সূরা আলে-ইমরান ৩:১৭৩' },
];

const FALLBACK_HADITH = [
  { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', translit: "Innamā l-aʿmālu bin-niyyāt", text: 'নিশ্চয়ই সকল কাজ নিয়তের উপর নির্ভরশীল।', ref: 'সহীহ বুখারী — হাদিস ১', narrator: 'উমর ইবনুল খাত্তাব (রা.) থেকে বর্ণিত' },
  { arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', translit: 'Al-Muslimu man salima l-Muslimūna min lisānihi wa yadihi', text: 'মুসলিম সে, যার জিহ্বা ও হাত থেকে অন্য মুসলিম নিরাপদ।', ref: 'সহীহ বুখারী — হাদিস ১০', narrator: 'আবদুল্লাহ ইবন আমর (রা.) থেকে বর্ণিত' },
  { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', translit: 'Khayrukum man taʿallama l-Qurʾāna wa ʿallamahu', text: 'তোমাদের মধ্যে সর্বোত্তম সে, যে কুরআন শেখে এবং শেখায়।', ref: 'সহীহ বুখারী — হাদিস ৫০২৭', narrator: 'উসমান (রা.) থেকে বর্ণিত' },
  { arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ', translit: 'Ṭalabu l-ʿilmi farīḍatun ʿalā kulli Muslim', text: 'জ্ঞান অর্জন করা প্রত্যেক মুসলিমের উপর ফরজ।', ref: 'ইবনে মাজাহ — হাদিস ২২৪', narrator: 'আনাস (রা.) থেকে বর্ণিত' },
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', translit: 'Lā yuʾminu aḥadukum ḥattā yuḥibba li-akhīhi mā yuḥibbu li-nafsih', text: 'তোমাদের কেউ প্রকৃত মুমিন হতে পারবে না, যতক্ষণ না সে তার ভাইয়ের জন্য তা ভালোবাসে যা নিজের জন্য ভালোবাসে।', ref: 'সহীহ বুখারী — হাদিস ১৩', narrator: 'আনাস (রা.) থেকে বর্ণিত' },
  { arabic: 'إِنَّ الصِّدْقَ يَهْدِي إِلَى الْبِرِّ', translit: 'Inna ṣ-ṣidqa yahdī ilā l-birr', text: 'নিশ্চয়ই সত্যবাদিতা সুকর্মের দিকে পথ দেখায়।', ref: 'সহীহ বুখারী — হাদিস ৬০৯৪', narrator: 'আবদুল্লাহ ইবনে মাসউদ (রা.) থেকে বর্ণিত' },
  { arabic: 'الدِّينُ النَّصِيحَةُ', translit: 'Ad-dīnu n-naṣīḥah', text: 'দ্বীন হলো কল্যাণ কামনা।', ref: 'সহীহ মুসলিম — হাদিস ৫৫', narrator: 'তামীম আদ-দারী (রা.) থেকে বর্ণিত' },
];

// ============================================
// ১. DAILY CONTENT
// ============================================
async function loadDailyContent() {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

  // Fallback দিয়ে সাথে সাথে দেখাও
  const ayat = FALLBACK_AYAT[day % FALLBACK_AYAT.length];
  const hadith = FALLBACK_HADITH[day % FALLBACK_HADITH.length];
  renderAyat(ayat);
  renderHadith(hadith);

  // API থেকে আরও ভালো data আনার চেষ্টা করো
  try {
    const res = await fetch('/api/daily-content');
    if (res.ok) {
      const data = await res.json();
      if (data.ayat) renderAyat({
        arabic: data.ayat.arabic,
        translit: '',
        bangla: data.ayat.bangla,
        ref: data.ayat.reference,
      });
      if (data.hadith) renderHadith({
        arabic: data.hadith.text_arabic || '',
        translit: '',
        text: data.hadith.text_english,
        ref: data.hadith.reference,
        narrator: data.hadith.narrator || '',
      });
    }
  } catch (e) {
    // fallback ইতিমধ্যে দেখানো হয়েছে
  }
}

function renderAyat(data) {
  document.getElementById('ayatArabic').textContent = data.arabic;
  document.getElementById('ayatTranslit').textContent = data.translit || '';
  document.getElementById('ayatTranslation').textContent = data.bangla;
  document.getElementById('ayatRef').textContent = data.ref;
  document.getElementById('ayat-loading').style.display = 'none';
  document.getElementById('ayat-content').style.display = 'block';
}

function renderHadith(data) {
  document.getElementById('hadithArabic').textContent = data.arabic;
  document.getElementById('hadithTranslit').textContent = data.translit || '';
  document.getElementById('hadithTranslation').textContent = data.text;
  document.getElementById('hadithNarrator').textContent = data.narrator || '';
  document.getElementById('hadithRef').textContent = data.ref;
  document.getElementById('hadith-loading').style.display = 'none';
  document.getElementById('hadith-content').style.display = 'block';
}

// ============================================
// ২. SURAH WORD-BY-WORD
// ============================================
function buildSurahSelect() {
  const sel = document.getElementById('surahSelect');
  SURAH_LIST.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.n;
    opt.textContent = `${s.n}. ${s.name} — ${s.ar}`;
    sel.appendChild(opt);
  });
}

async function loadSurah() {
  const surahNum = document.getElementById('surahSelect').value;
  if (!surahNum) return;

  const container = document.getElementById('versesContainer');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted)"><div class="spinner"></div><p style="margin-top:12px">সূরা লোড হচ্ছে...</p></div>';
  document.getElementById('surahDisplayArea').style.display = 'block';

  try {
    const res = await fetch(`/api/surah?surah=${surahNum}`);
    const data = await res.json();
    currentSurahData = data;

    document.getElementById('surahNameAr').textContent = data.surah_name_arabic || '';
    document.getElementById('surahNameBn').textContent = data.surah_name_english || '';
    document.getElementById('surahMeta').innerHTML = `
      <span class="meta-chip green">সূরা নং ${data.surah_number}</span>
      <span class="meta-chip gold">মোট আয়াত ${data.total_ayahs}</span>
    `;

    // আয়াত অনুযায়ী group করো
    const byAyah = {};
    (data.words || []).forEach(w => {
      if (!byAyah[w.ayah]) byAyah[w.ayah] = [];
      byAyah[w.ayah].push(w);
    });

    container.innerHTML = Object.entries(byAyah).map(([ayahNum, words]) => {
      const firstWord = words[0];
      const fullArabic = words.map(w => w.arabic).join(' ');
      return `
        <div class="verse-block">
          <div class="verse-number-bar">
            <div class="verse-num">${ayahNum}</div>
            <small style="color:var(--ink-muted);font-size:0.75rem">আয়াত ${ayahNum}</small>
          </div>
          <div class="verse-full-arabic">${fullArabic}</div>
          <div class="words-grid">
            ${words.map(w => `
              <div class="word-card" title="${w.bangla || ''}">
                <div class="word-arabic">${w.arabic}</div>
                <div class="word-transliteration">${w.transliteration || ''}</div>
                <div class="word-meaning">${w.bangla || ''}</div>
              </div>
            `).join('')}
          </div>
          ${firstWord.full_ayah_bangla ? `<div class="verse-translation-full">📝 <strong>অনুবাদ:</strong> ${firstWord.full_ayah_bangla}</div>` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="padding:20px;color:#f87171;text-align:center">❌ লোড হয়নি: ${err.message}</div>`;
  }
}

// ============================================
// ৩. INFOGRAPHIC — Gemini দিয়ে SVG
// ============================================
async function generateInfographic() {
  if (!currentSurahData) {
    showToast('আগে একটি সূরা লোড করুন');
    return;
  }

  const resultBox = document.getElementById('infographicResult');
  const loading = document.getElementById('infographicLoading');
  const svgWrap = document.getElementById('infographicSvgWrap');
  const dlBtn = document.getElementById('downloadInfographicBtn');

  resultBox.style.display = 'block';
  loading.style.display = 'flex';
  svgWrap.style.display = 'none';
  dlBtn.style.display = 'none';

  try {
    const res = await fetch('/api/infographic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surah_name: currentSurahData.surah_name_arabic || currentSurahData.surah_name_english,
        surah_number: currentSurahData.surah_number,
        total_ayahs: currentSurahData.total_ayahs,
      }),
    });

    const data = await res.json();
    loading.style.display = 'none';

    if (data.svg) {
      svgWrap.innerHTML = data.svg;
      svgWrap.style.display = 'block';
      dlBtn.style.display = 'inline-flex';

      // Download button
      dlBtn.onclick = () => {
        const blob = new Blob([data.svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `surah-${currentSurahData.surah_number}-infographic.svg`;
        a.click();
        URL.revokeObjectURL(url);
      };
    } else {
      svgWrap.innerHTML = `<div style="padding:20px;color:#f87171">❌ ${data.error || 'ইনফোগ্রাফিক তৈরি হয়নি'}</div>`;
      svgWrap.style.display = 'block';
    }
  } catch (err) {
    loading.style.display = 'none';
    svgWrap.innerHTML = `<div style="padding:20px;color:#f87171">❌ Error: ${err.message}</div>`;
    svgWrap.style.display = 'block';
  }
}

// ============================================
// ৪. SEARCH
// ============================================
function setSearchType(type, btn) {
  searchType = type;
  document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  const resultsEl = document.getElementById('searchResults');

  if (q.length < 2) {
    showToast('কমপক্ষে ২ অক্ষর লিখুন');
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-muted)"><div class="spinner"></div><p style="margin-top:8px">খোঁজা হচ্ছে...</p></div>';

  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&type=${searchType}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resultsEl.innerHTML = '<div style="padding:16px;color:var(--ink-muted);text-align:center">কোনো ফলাফল পাওয়া যায়নি।</div>';
      return;
    }

    resultsEl.innerHTML = data.results.map((r, i) => `
      <div class="search-result-item" onclick="toggleResult(this)">
        <div class="result-header">
          <div class="result-title">${r.surah_name || r.collection || (searchType === 'quran' ? 'আয়াত' : 'হাদিস')} ${r.ayah_number ? `(${r.surah_number}:${r.ayah_number})` : ''}</div>
          <span class="result-ref">${r.reference || ''}</span>
        </div>
        <div class="result-expand">
          <div class="result-expand-inner">
            ${r.surah_name_arabic || r.text_arabic ? `<div style="font-family:'Noto Naskh Arabic',serif;font-size:1.3rem;direction:rtl;text-align:right;color:var(--emerald-light);margin-bottom:10px;line-height:2">${r.surah_name_arabic || r.text_arabic || ''}</div>` : ''}
            <div style="font-size:0.88rem;color:var(--ink-soft);line-height:1.7;background:var(--gold-pale);padding:10px 14px;border-radius:8px;border-left:3px solid var(--gold)">${r.text || r.text_bangla || r.bangla || ''}</div>
            ${r.narrator ? `<div style="font-size:0.75rem;color:var(--ink-muted);margin-top:8px">🎙 ${r.narrator}</div>` : ''}
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    resultsEl.innerHTML = `<div style="padding:16px;color:#f87171">❌ Error: ${err.message}</div>`;
  }
}

function toggleResult(el) {
  el.querySelector('.result-expand').classList.toggle('open');
}

// ============================================
// ৫. 30-DAY PLAN — arabic_30day_plan.html inject
// ============================================
function loadArabicPlan() {
  fetch('arabic_30day_plan.html')
    .then(r => r.text())
    .then(html => {
      document.getElementById('arabicPlanWrapper').innerHTML = html;

      // Dark theme এর জন্য CSS variables inject করো
      const style = document.createElement('style');
      style.textContent = `
        #arabicPlanWrapper {
          --color-text-primary: #e2e8f0;
          --color-text-secondary: #94a3b8;
          --color-background-primary: #1e293b;
          --color-background-secondary: #162032;
          --color-border-tertiary: rgba(16,185,129,0.12);
          --color-border-secondary: rgba(16,185,129,0.2);
          --border-radius-lg: 12px;
          --font-sans: 'Hind Siliguri', sans-serif;
        }
        #arabicPlanWrapper .day-card { background: var(--color-background-primary); }
        #arabicPlanWrapper .tab.active { background: #10b981; border-color: #10b981; }
        #arabicPlanWrapper .tip-box { background: var(--color-background-secondary); }
        #arabicPlanWrapper .res-card { background: var(--color-background-primary); }
      `;
      document.head.appendChild(style);

      // Plan progress এর সাথে sync করো
      updatePlanProgress();
    })
    .catch(() => {
      document.getElementById('arabicPlanWrapper').innerHTML =
        '<div style="padding:20px;color:var(--ink-muted);text-align:center">arabic_30day_plan.html লোড হয়নি। ফাইলটি public/ ফোল্ডারে রাখুন।</div>';
    });
}

// ============================================
// ৬. PROGRESS TRACKER
// ============================================
function updatePlanProgress() {
  const count = completedDays.length;
  const pct = Math.round((count / 30) * 100);
  document.getElementById('completedCount').textContent = `${count}/৩০`;
  document.getElementById('progressPercent').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = pct + '%';
}

// ============================================
// ৭. TOAST
// ============================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ============================================
// ৮. EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  buildSurahSelect();
  loadDailyContent();
  loadArabicPlan();
  updatePlanProgress();

  // Search
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
});
