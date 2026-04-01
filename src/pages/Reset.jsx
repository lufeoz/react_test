import { useState, useEffect } from 'react';
import { logDailyActivity } from './MyPage';
import { useToast } from '../components/Toast';
import { safeSetItem } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLoginModal } from '../components/Login';
import { usePosts } from '../hooks/useSupabase';
import Programs from './Programs';

// Evidence-based 3-hour evening rest routines by type
// Sources: Sonnentag(Recovery), DRAMMA(Newman 2014), Effort-Recovery(Meijman & Mulder),
// ART(Kaplan 1995), Flow(Csikszentmihalyi), Savoring(Bryant), DMN research
// Core insight: 쇼츠는 시간당 100+회 주의 재배치 → 인지 시스템이 못 쉼
// 진짜 회복 = 일에서 쓴 시스템과 다른 시스템을 쓰는 것
const REST_TYPES = [
  {
    id: 'speed',
    icon: '🚀',
    name: '과속형',
    problem: '멈추면 불안',
    core: '"쉬는 시간은 빈 시간이 아니라 회복이 일어나는 시간이다"',
    missions: [
      { text: '🔄 폰 충전기에 꽂고 옷 갈아입기', detail: '물리적 전환이 "일 모드 끝" 신호를 보냅니다. 심리적 분리(detachment)가 회복의 가장 강력한 예측인자입니다 (Sonnentag, 2007)', time: null },
      { text: '🍳 레시피 보고 요리하기 (30분 이상)', detail: '적당한 난이도 + 감각 몰입 = 일과 완전히 다른 뇌 시스템 사용. DRAMMA 모델에서 숙달+자율+분리를 동시 충족 (Newman, 2014)', time: null },
      { text: '🍵 따뜻한 음료 들고 창밖 보며 멍때리기', detail: '기본모드네트워크(DMN) 활성화 시간. 쇼츠는 DMN을 억제하지만, 멍때리기는 뇌가 하루를 정리하게 해줍니다', time: null },
      { text: '🚶 동네 10분 산책 (이어폰 없이)', detail: '저강도 움직임이 교감신경→부교감신경 전환을 일으킵니다. 운동이 아니라 산보 (Rook & Zijlstra, 2006)', time: null },
      { text: '🛁 뜨거운 물로 샤워/반신욕 + 조명 낮추기', detail: '40-42도 물에 10분 이상이면 수면 잠복기가 줄고 수면 질이 올라갑니다 (Haghayegh, 2019). 이후 체온 하강이 졸음을 유발', time: null },
    ],
  },
  {
    id: 'escape',
    icon: '📱',
    name: '도피형',
    problem: '자극 없으면 불안',
    core: '"쇼츠는 쉬는 게 아니라 뇌에게 무급 야근을 시키는 것"',
    missions: [
      { text: '🔌 폰을 다른 방 충전기에 꽂기', detail: '물리적 거리가 자동 행동 체인을 끊습니다. 눈에 안 보이면 충동이 80% 줄어듭니다', time: null },
      { text: '🎵 스피커로 내가 고른 음악 틀기 (20분)', detail: '알고리즘이 아닌 내가 고른 음악. 60-80BPM이 코르티솔을 가장 효과적으로 낮춥니다 (Thoma, 2013). 이어폰 말고 스피커로 — 공간을 채우세요', time: null },
      { text: '🧩 손으로 하는 취미 하나 (퍼즐, 레고, 뜨개질, 그림)', detail: '시각-공간 처리를 쓰는 활동은 언어-분석적 작업(일, 스크롤)과 다른 뇌 영역을 씁니다. 가볍게 몰입할 수 있는 것 (Csikszentmihalyi)', time: null },
      { text: '🍜 제대로 된 한 끼 만들어 먹기', detail: '첫 세 입은 의식적으로 맛 느끼기. 짧은 음미(savoring)만으로 안녕감이 올라갑니다 (Bryant, 2007)', time: null },
      { text: '📖 종이책이나 긴 콘텐츠 하나 (45분 이상)', detail: '쇼츠=시간당 100+회 주의 전환. 긴 콘텐츠=3-5회. 주의가 안정되면 전두엽이 쉽니다 (Ophir, Nass & Wagner, 2009)', time: null },
    ],
  },
  {
    id: 'overload',
    icon: '😵',
    name: '과부하형',
    problem: '아무것도 못 함',
    core: '"아무것도 못 하겠으면, 몸만 바꿔도 된다"',
    missions: [
      { text: '🛋 일단 바닥에 눕기. 다리 벽에 올리기 (5분)', detail: '수동적 역위가 부교감신경을 활성화합니다. 의지 안 필요. 그냥 눕기', time: 300 },
      { text: '🚿 뜨거운 물로 오래 샤워하기', detail: '감각(온도, 물소리, 수압) 자체가 인지 시스템을 쉬게 합니다. 체성감각은 일과 완전히 다른 경로를 씀', time: null },
      { text: '🥤 냉장고에서 뭐든 꺼내서 천천히 마시기', detail: '최소한의 행동 하나. 시작 자체가 마비를 깨뜨립니다 (행동활성화, Martell 2001)', time: null },
      { text: '🎧 좋아하는 음악 틀고 소파에 눕기 (30분)', detail: '능동적 회복: 스크롤(수동적)보다 음악 선택+감상(능동적)이 회복력이 높습니다 (Trougakos, 2009)', time: null },
      { text: '💡 큰 불 끄고 간접조명만 켜기', detail: '빛 자극을 줄이면 멜라토닌 분비가 시작됩니다. 환경을 바꾸는 것도 회복의 일부', time: null },
    ],
  },
  {
    id: 'blank',
    icon: '🌫',
    name: '멍형',
    problem: '너무 무기력',
    core: '"안 움직여서 쉬는 게 아니라, 안 움직여서 더 피곤한 것"',
    missions: [
      { text: '🧹 딱 한 가지만 치우기 (2분)', detail: '행동활성화의 핵심: 동기가 행동 전에 오지 않습니다. 행동이 먼저, 동기는 따라옵니다 (Martell, 2001)', time: 120 },
      { text: '🍳 간단한 거라도 직접 해먹기', detail: '라면이라도 OK. "만들었다"는 감각이 자기결정이론의 유능감을 충족시킵니다 (Deci & Ryan)', time: null },
      { text: '🚶 현관문 열고 나가서 100보만 걷기', detail: '운동 아닙니다. 100보면 됩니다. 저강도 움직임이 각성 수준을 올려줍니다', time: null },
      { text: '📱 아무한테나 "밥 먹었어?" 보내기', detail: '사회적 연결은 무기력에서 가장 방치되는 욕구. 한 줄이면 됩니다 (SDT 관계성)', time: null },
      { text: '🪴 화분에 물주기, 창문 열기', detail: '자연 요소 접촉이 주의를 부드럽게 회복시킵니다 (주의회복이론, Kaplan 1995)', time: null },
    ],
  },
  {
    id: 'overthink',
    icon: '🧠',
    name: '과생각형',
    problem: '생각 멈추기 실패',
    core: '"생각을 멈추려 하면 더 늘어난다. 손을 써라"',
    missions: [
      { text: '🍳 레시피 따라 요리하기 (생각보다 손이 바쁜 것)', detail: '손과 감각이 바쁘면 기본모드네트워크가 반추 대신 현재에 닻을 내립니다. 요리는 적당한 인지 부하 + 감각 몰입 조합', time: null },
      { text: '📝 오늘 머릿속에 있는 것 다 적기 (5분)', detail: '종이에 쏟아내기. 걱정 시간(Worry Time) 기법: 적으면 외부화됩니다 (Borkovec, 1983)', time: 300 },
      { text: '🧩 손으로 하는 활동 30분 (퍼즐, 레고, 정리, 그림)', detail: '운동감각(motor-sensory) 활동이 언어적 반추 회로를 점유합니다. 몸이 바쁘면 생각이 줄어듭니다', time: null },
      { text: '🚶 걷기. 생각이 오면 주변 색깔 세기', detail: '주의를 외부로 돌리는 훈련. 멈추는 게 아니라 방향을 바꾸는 것 (주의훈련기법, Wells 2000)', time: null },
      { text: '🛁 뜨거운 물 + 조명 끄기', detail: '감각 입력을 "온도와 어둠"으로 단순화. 생각의 재료(시각 정보)를 줄이면 반추도 줄어듭니다', time: null },
    ],
  },
  {
    id: 'suppress',
    icon: '🎭',
    name: '감정 억제형',
    problem: '감정 쌓임',
    core: '"감정을 정리하지 않아도 된다. 느끼기만 하면 된다"',
    missions: [
      { text: '🎵 지금 기분에 맞는 노래 3곡 골라 듣기', detail: '음악이 대신 감정을 표현해줍니다. 자기 선택 음악이 감정 접근의 안전한 통로 (Saarikallio, 2007)', time: null },
      { text: '📓 오늘 하루를 4분간 자유롭게 쓰기', detail: '문법, 맞춤법 무시. 쓴 후 버려도 됨. 표현적 글쓰기가 면역기능까지 개선합니다 (Pennebaker, 1997)', time: 240 },
      { text: '🍲 좋아하는 음식 만들어 먹으면서 맛 느끼기', detail: '감각에 집중하는 것 자체가 억제의 반대. 몸의 감각을 통해 감정에 간접 접근', time: null },
      { text: '📞 한 사람에게 전화하기 (문자 말고 목소리)', detail: '목소리 대 목소리 대화가 옥시토신을 분비시킵니다. 문자에는 없는 효과 (Hawkley & Cacioppo)', time: null },
      { text: '🛁 뜨거운 물에 몸 담그며 한숨 크게 쉬기', detail: '한숨은 폐포를 최대로 펴는 생리적 리셋. 억제하고 있던 호흡을 풀어줍니다 (Balban, 2023)', time: null },
    ],
  },
  {
    id: 'social',
    icon: '🤝',
    name: '관계 과부하형',
    problem: '사람 피로',
    core: '"혼자 사는 집이 회복 공간이 되려면 의도가 필요하다"',
    missions: [
      { text: '🔇 집에 오면 알림 전부 끄기', detail: '사람과의 연결선을 의도적으로 끊기. 자발적 고독(volitional solitude)이 감정조절과 창의성을 높입니다 (Nguyen, 2018)', time: null },
      { text: '🍳 나만을 위한 요리하기', detail: '누구와 나눌 필요 없는, 내가 먹고 싶은 것. 자율성(autonomy) 충족이 사회적 피로의 해독제', time: null },
      { text: '🧩 혼자 하는 취미 1시간', detail: '누구에게도 보여줄 필요 없는 활동. 결과물을 SNS에 안 올려도 되는 것. 순수하게 나를 위한 시간', time: null },
      { text: '🚶 혼자 동네 산책 (이어폰 없이)', detail: '이어폰 = 또 다른 입력. 소리까지 비워야 진짜 혼자. 주변 소리만 듣고 걸으세요', time: null },
      { text: '🛁 뜨거운 물 + 아무 생각 안 하기', detail: '물소리와 온도만. 사회적 자극이 0인 환경에서 신경계가 리셋됩니다', time: null },
    ],
  },
  {
    id: 'perfect',
    icon: '🎯',
    name: '완벽주의형',
    problem: '쉬어도 불안',
    core: '"생산적이지 않은 시간이 가장 생산적인 회복이다"',
    missions: [
      { text: '🍳 대충 해먹기 (완벽하게 안 해도 되는 요리)', detail: '라면에 계란 하나. 예쁘게 안 담아도 됨. "대충"을 연습하는 것 자체가 치료적 행동실험 (Egan, 2011)', time: null },
      { text: '🎵 아무 생각 없이 음악만 듣기 (생산적일 필요 없음)', detail: '음악을 "들으면서 뭔가 하지" 않기. 음악만. 쉼을 벌어야 한다는 믿음에 반하는 경험', time: null },
      { text: '📖 끝까지 안 읽어도 되는 책 펼치기', detail: '"끝내야 한다" 없이 읽기. 3페이지에서 덮어도 됨. 완료 강박에서 벗어나는 연습', time: null },
      { text: '🚶 목적 없이 걷기 (어디 가려고 걷지 않기)', detail: '목표 없는 산책. "몇 걸음", "몇 분" 안 재기. 숫자 없는 시간을 견디는 연습', time: null },
      { text: '🛋 아무것도 안 하고 소파에 앉아있기 (15분)', detail: '"쉼은 생산성의 보상이 아니라 생물학적 필수" — 벌지 않아도 쉴 자격이 있습니다 (Crocker & Wolfe, 2001)', time: 900 },
    ],
  },
];

const QUIZ_QUESTIONS = [
  {
    q: '하루가 끝나고 집에 왔을 때, 가장 먼저 하는 건?',
    options: [
      { text: '바로 뭔가를 시작한다 (정리, 요리 등)', types: ['speed', 'perfect'] },
      { text: '일단 폰부터 본다', types: ['escape', 'overthink'] },
      { text: '아무것도 못 하고 멍하니 있는다', types: ['overload', 'blank'] },
      { text: '누군가에게 연락한다 / 연락을 피한다', types: ['social', 'suppress'] },
    ],
  },
  {
    q: '주말에 아무 계획이 없으면?',
    options: [
      { text: '불안해서 뭐라도 계획을 세운다', types: ['speed', 'perfect'] },
      { text: '넷플릭스나 유튜브를 켠다', types: ['escape'] },
      { text: '하루가 그냥 지나간다', types: ['blank', 'overload'] },
      { text: '사람 만날지 혼자 있을지 고민한다', types: ['social'] },
    ],
  },
  {
    q: '"쉬었는데 안 쉰 것 같다"고 느낄 때, 그 이유는?',
    options: [
      { text: '뭘 했는지 기억이 안 나서', types: ['escape', 'blank'] },
      { text: '해야 할 일이 계속 생각나서', types: ['overthink', 'perfect'] },
      { text: '몸은 쉬었는데 머리가 안 쉬어서', types: ['overthink', 'overload'] },
      { text: '혼자 있어도 마음이 편하지 않아서', types: ['suppress', 'social'] },
    ],
  },
  {
    q: '자기 전에 폰을 오래 보는 이유는?',
    options: [
      { text: '안 보면 심심하니까', types: ['escape'] },
      { text: '내일 걱정이 계속 떠올라서', types: ['overthink', 'perfect'] },
      { text: '그냥 손에서 안 놓아져서', types: ['blank', 'overload'] },
      { text: '답장이나 SNS를 확인하려고', types: ['social', 'suppress'] },
    ],
  },
  {
    q: '누가 "좀 쉬어"라고 하면?',
    options: [
      { text: '"쉬면 뒤처지는 것 같아"', types: ['speed', 'perfect'] },
      { text: '"쉬고 있는데?" (폰 보면서)', types: ['escape'] },
      { text: '"쉬고 싶은데 어떻게 쉬는지 모르겠어"', types: ['overload', 'blank'] },
      { text: '"혼자 있고 싶은데 말 못 하겠어"', types: ['social', 'suppress'] },
    ],
  },
];

export default function Reset() {
  const toast = useToast();
  const { user, profile, updateProfile } = useAuth();
  const { load, save } = useData();
  const { requireLogin } = useLoginModal();
  const { createPost } = usePosts();
  const [myType, setMyType] = useState(() => profile?.rest_type || null);
  const [phase, setPhase] = useState(myType ? 'home' : 'pick'); // pick | quiz | result | home | mission | verify | done
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState({});
  const [activeMission, setActiveMission] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifyPhoto, setVerifyPhoto] = useState(null);

  useEffect(() => {
    if (profile?.rest_type && !myType) {
      setMyType(profile.rest_type);
      setPhase('home');
    }
  }, [profile, myType]);

  const type = REST_TYPES.find(t => t.id === myType);

  // Today's completed missions
  const [completed, setCompleted] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    const saved = load('restCompleted') || {};
    return saved[today] || [];
  });

  const saveCompleted = (updated) => {
    setCompleted(updated);
    const today = new Date().toISOString().slice(0, 10);
    const saved = load('restCompleted') || {};
    saved[today] = updated;
    save('restCompleted', saved);
  };

  const pickType = (id) => {
    if (!user) {
      requireLogin('쉼 유형을 저장하려면 로그인이 필요합니다');
      return;
    }
    setMyType(id);
    updateProfile({ rest_type: id });
    setPhase('home');
  };

  const answerQuiz = (types) => {
    const next = { ...quizScores };
    types.forEach(t => { next[t] = (next[t] || 0) + 1; });
    setQuizScores(next);
    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Find top type
      const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]);
      const topId = sorted[0]?.[0] || 'escape';
      setMyType(topId);
      updateProfile({ rest_type: topId });
      setPhase('result');
    }
  };

  const retakeQuiz = () => {
    setQuizStep(0);
    setQuizScores({});
    setPhase('quiz');
  };

  const startMission = (mission, index) => {
    setActiveMission({ ...mission, index });
    if (!completed.includes(index)) {
      const updated = [...completed, index];
      saveCompleted(updated);
      const stats = load('achievementStats') || {};
      stats.resetCompleted = (stats.resetCompleted || 0) + 1;
      save('achievementStats', stats);
      logDailyActivity('reset');
    }
    setVerifyNote('');
    setVerifyPhoto(null);
    setPhase('verify');
  };

  const [photoFile, setPhotoFile] = useState(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('사진은 5MB 이하만 가능합니다', 'error');
      return;
    }
    setPhotoFile(file);
    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setVerifyPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitVerify = async (skip) => {
    if (!skip && (verifyNote.trim() || verifyPhoto)) {
      try {
        let photoUrl = null;
        // Upload photo to Supabase Storage if exists
        if (photoFile && user) {
          try {
            const { uploadPhoto } = await import('../hooks/useSupabase');
            photoUrl = await uploadPhoto(user.id, photoFile);
          } catch {
            // Photo upload failed, continue without photo
          }
        }

        await createPost({
          user_name: profile?.name || '나',
          type: myType,
          type_name: type.name,
          icon: type.icon,
          mission: activeMission.text.replace(/^[^\s]+ /, ''),
          mission_emoji: activeMission.text.match(/^[^\s]+/)?.[0] || '',
          note: verifyNote.trim(),
          photo_url: photoUrl,
        });
        toast('커뮤니티에 공유되었습니다');
      } catch {
        toast('공유에 실패했습니다', 'error');
      }
    }
    setPhase('done');
  };


  const back = () => {
    setPhase('home');
    setActiveMission(null);
  };

  // ===== TYPE PICKER =====
  if (phase === 'pick') {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Rest</h1>
          <p className="page-subtitle">나는 왜 쉬지 못할까?</p>
        </header>

        <div className="rest-pick-hero">
          <p className="rest-pick-intro">
            쉬지 못하는 이유는 사람마다 다릅니다.<br />
            나에게 맞는 방법을 찾아보세요.
          </p>
          <button className="rest-quiz-start-btn" onClick={() => { setQuizStep(0); setQuizScores({}); setPhase('quiz'); }}>
            테스트로 알아보기
          </button>
          <button className="rest-pick-direct-btn" onClick={() => setPhase('pick-direct')}>
            직접 유형 고르기
          </button>
        </div>
      </div>
    );
  }

  // ===== DIRECT PICK =====
  if (phase === 'pick-direct') {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Rest</h1>
          <p className="page-subtitle">나에게 맞는 유형을 골라보세요</p>
        </header>

        <div className="rest-type-list">
          {REST_TYPES.map(t => (
            <button key={t.id} className="rest-type-card" onClick={() => pickType(t.id)}>
              <span className="rest-type-icon">{t.icon}</span>
              <div className="rest-type-info">
                <span className="rest-type-name">{t.name}</span>
                <span className="rest-type-problem">{t.problem}</span>
              </div>
            </button>
          ))}
        </div>
        <button className="rest-pick-direct-btn" style={{ marginTop: 16 }} onClick={() => setPhase('pick')}>← 돌아가기</button>
      </div>
    );
  }

  // ===== QUIZ =====
  if (phase === 'quiz') {
    const question = QUIZ_QUESTIONS[quizStep];
    return (
      <div className="page">
        <div className="quiz-progress">
          <button className="quiz-exit-btn" onClick={() => setPhase('pick')}>✕</button>
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((quizStep) / QUIZ_QUESTIONS.length) * 100}%` }} />
          </div>
          <span className="quiz-progress-text">{quizStep + 1} / {QUIZ_QUESTIONS.length}</span>
        </div>

        <div className="quiz-question">
          <p className="quiz-q">{question.q}</p>
          <div className="quiz-options">
            {question.options.map((opt, i) => (
              <button key={i} className="quiz-option" onClick={() => answerQuiz(opt.types)}>
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== RESULT =====
  if (phase === 'result' && type) {
    // Get secondary type
    const sorted = Object.entries(quizScores).sort((a, b) => b[1] - a[1]);
    const secondary = sorted[1] ? REST_TYPES.find(t => t.id === sorted[1][0]) : null;

    return (
      <div className="page">
        <div className="quiz-result">
          <p className="quiz-result-label">당신의 쉼 유형은</p>
          <div className="quiz-result-type">
            <span className="quiz-result-icon">{type.icon}</span>
            <span className="quiz-result-name">{type.name}</span>
          </div>
          <p className="quiz-result-problem">{type.problem}</p>
          <div className="quiz-result-core">{type.core}</div>

          {secondary && secondary.id !== type.id && (
            <p className="quiz-result-secondary">
              + {secondary.icon} {secondary.name} 성향도 있어요
            </p>
          )}

          <button className="rest-quiz-start-btn" onClick={() => {
            if (!user) {
              requireLogin('나만의 쉼 미션을 시작하려면 로그인이 필요합니다');
              return;
            }
            setPhase('home');
          }}>
            미션 시작하기
          </button>
          <button className="rest-pick-direct-btn" onClick={retakeQuiz}>다시 테스트하기</button>
        </div>
      </div>
    );
  }

  // ===== HOME =====
  if (phase === 'home' && type) {
    // Pick 3 daily missions (rotate based on day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const dailyMissions = type.missions.length <= 3
      ? type.missions.map((m, i) => ({ ...m, originalIndex: i }))
      : Array.from({ length: 3 }, (_, i) => {
          const idx = (dayOfYear * 3 + i) % type.missions.length;
          return { ...type.missions[idx], originalIndex: idx };
        });

    const allDone = dailyMissions.every(m => completed.includes(m.originalIndex));

    return (
      <div className="page">
        <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1>{type.icon} {type.name}</h1>
              <p className="page-subtitle">{type.problem}</p>
            </div>
            <button className="mode-toggle" onClick={() => setPhase('pick')}>유형 변경</button>
          </div>
        </header>

        <div className="rest-core-message">
          <p>{type.core}</p>
        </div>

        {/* Today's 3 Missions */}
        <div className="rest-mission-list">
          <div className="rest-mission-header">
            <span>오늘의 미션</span>
            <span className="rest-mission-count">
              {dailyMissions.filter(m => completed.includes(m.originalIndex)).length}/{dailyMissions.length}
            </span>
          </div>
          {dailyMissions.map((m) => {
            const isDone = completed.includes(m.originalIndex);
            return (
              <button
                key={m.originalIndex}
                className={`rest-mission-card ${isDone ? 'done' : ''}`}
                onClick={() => !isDone && startMission(m, m.originalIndex)}
                disabled={isDone}
              >
                <div className="rest-mission-check">
                  {isDone ? '✓' : '○'}
                </div>
                <div className="rest-mission-content">
                  <span className="rest-mission-text">{m.text}</span>
                  {m.time && <span className="rest-mission-time">{m.time >= 60 ? `${Math.floor(m.time / 60)}분` : `${m.time}초`}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="rest-all-done">
            오늘 미션을 모두 완료했습니다
          </div>
        )}

        {/* Divider + Programs */}
        <div className="rest-section-divider">
          <span>더 깊이 연습하기</span>
        </div>

        <Programs embedded myTypeOnly />

      </div>
    );
  }

  // ===== VERIFY (인증) =====
  if (phase === 'verify' && activeMission) {
    return (
      <div className="rest-screen">
        <button className="verify-back-btn" onClick={back}>← 돌아가기</button>
        <div className="verify-container">
          <div className="verify-type-badge">
            <span>{type.icon}</span>
            <span>{type.name}</span>
          </div>

          <div className="verify-header">
            <span className="verify-check">✓</span>
            <p className="verify-mission">{activeMission.text.replace(/^[^\s]+ /, '')}</p>
          </div>

          <div className="verify-detail-box">
            <p className="verify-detail">{activeMission.detail}</p>
          </div>

          <p className="verify-prompt">어떠셨나요? 한 줄 남겨보세요</p>
          <textarea
            className="verify-input"
            placeholder="예: 생각보다 괜찮았다, 15분밖에 안 걸렸는데 개운함"
            value={verifyNote}
            onChange={e => setVerifyNote(e.target.value)}
            rows={3}
            autoFocus
          />

          <div className="verify-photo-section">
            {verifyPhoto ? (
              <div className="verify-photo-preview">
                <img src={verifyPhoto} alt="인증 사진" />
                <button className="verify-photo-remove" onClick={() => setVerifyPhoto(null)}>×</button>
              </div>
            ) : (
              <label className="verify-photo-btn">
                <span>📷</span> 인증 사진 추가
                <input type="file" accept="image/*" onChange={handlePhotoSelect} hidden />
              </label>
            )}
          </div>

          <button className="verify-submit-btn" onClick={() => submitVerify(false)} disabled={!verifyNote.trim() && !verifyPhoto}>
            인증하고 공유하기
          </button>
          <button className="verify-skip-btn" onClick={() => submitVerify(true)}>
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  // ===== DONE =====
  if (phase === 'done') {
    // Find next uncompleted daily mission
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const dailyMissions = type.missions.length <= 3
      ? type.missions.map((m, i) => ({ ...m, originalIndex: i }))
      : Array.from({ length: 3 }, (_, i) => {
          const idx = (dayOfYear * 3 + i) % type.missions.length;
          return { ...type.missions[idx], originalIndex: idx };
        });
    const nextMission = dailyMissions.find(m => !completed.includes(m.originalIndex));

    return (
      <div className="rest-screen done">
        <div className="rest-done">
          <div className="rest-done-emoji">{type.icon}</div>
          <p className="rest-done-title">잘했어요</p>
          <p className="rest-done-message">{type.core}</p>
          <p className="rest-done-progress">
            {dailyMissions.filter(m => completed.includes(m.originalIndex)).length}/{dailyMissions.length} 완료
          </p>
          {nextMission ? (
            <button className="rest-done-btn next" onClick={() => startMission(nextMission, nextMission.originalIndex)}>
              다음 미션 →
            </button>
          ) : (
            <div className="rest-all-done-msg">오늘 미션을 모두 완료했어요!</div>
          )}
          <button className="rest-done-btn secondary" onClick={back}>목록으로</button>
        </div>
      </div>
    );
  }

  return null;
}
