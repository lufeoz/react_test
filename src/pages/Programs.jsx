import { useState } from 'react';
import { logDailyActivity } from './MyPage';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLoginModal } from '../components/Login';

// 3-hour evening rest programs by type
// Each day = one complete evening routine (전환 → 능동적 회복 → 정리 → 수면준비)
// Sources: Sonnentag(Recovery), DRAMMA(Newman 2014), Effort-Recovery(Meijman),
// ART(Kaplan), Flow(Csikszentmihalyi), Savoring(Bryant)
// 3-hour evening routines as structured programs
// Each day = complete 3-hour evening (전환 20min → 능동회복 60min → 느슨한 활동 60min → 수면준비 40min)
const PROGRAMS = [
  // === 모든 유형 공통: 7일 ===
  {
    id: 'evening-7', type: 'all', icon: '🌙', name: '7일 저녁 루틴 만들기', duration: 7,
    description: '쇼츠 대신 3시간을 채우는 저녁 루틴 습관 만들기',
    color: '#6c5ce7',
    missions: [
      { day: 1, title: '전환만 해보기', task: '집에 오면: ①폰 다른 방 충전기에 ②옷 갈아입기 ③창문 열고 3번 숨쉬기. 이것만 하고 나머지는 자유', tip: '물리적 전환이 "일 끝" 신호를 만듭니다. 오늘은 이것만 (Sonnentag, 2007)' },
      { day: 2, title: '전환 + 저녁 직접 해먹기', task: '어제 전환 루틴 반복 → 뭐든 직접 만들어 먹기. 라면도 OK. 첫 세 입은 천천히 맛보기', tip: '요리는 DRAMMA 모델에서 분리+자율+숙달을 동시 충족 (Newman, 2014)' },
      { day: 3, title: '전환 + 요리 + 10분 산책', task: '전환 → 요리 → 식후 동네 10분 걷기 (이어폰 없이)', tip: '저강도 움직임이 교감→부교감 전환 (Rook & Zijlstra, 2006)' },
      { day: 4, title: '전환 + 요리 + 손으로 하는 뭔가 30분', task: '전환 → 요리 → 퍼즐/그림/레고/뜨개질/정리 뭐든. 30분 타이머', tip: '운동감각 활동은 일(인지)과 다른 뇌 영역을 씁니다 (Effort-Recovery Model)' },
      { day: 5, title: '전환 + 요리 + 취미 + 뜨거운 물', task: '전환 → 요리 → 취미 30분 → 뜨거운 샤워/반신욕', tip: '40도 물 10분 이상이면 수면 질이 올라갑니다 (Haghayegh, 2019)' },
      { day: 6, title: '풀코스 + 전화 한 통', task: '전환 → 요리하면서 친구/가족 전화 → 취미 → 뜨거운 물 → 간접조명', tip: '목소리 대화가 옥시토신 분비. 문자에는 없는 효과 (Hawkley & Cacioppo)' },
      { day: 7, title: '나만의 3시간 완성', task: '7일간 해본 것 중 좋았던 조합으로 나만의 저녁 루틴 적기. 오늘 실행', tip: '자율성이 핵심. 남의 루틴이 아닌 내 루틴 (DRAMMA 자율성)' },
    ],
  },
  // === 🚀 과속형 7일 ===
  {
    id: 'speed-7', type: 'speed', icon: '🚀', name: '7일 저녁 감속 루틴', duration: 7,
    description: '퇴근 후 속도를 줄이는 3시간 저녁 프로그램',
    color: '#ff6b6b',
    missions: [
      { day: 1, title: '마감 의식 + 전환', task: '퇴근 전 할 일 목록 적기 + "마감 완료" 말하기 → 집에서 옷 갈아입기. 이후 자유', tip: '적기만 해도 미완료 과제의 침투적 사고가 줄어듭니다 (Masicampo, 2011)' },
      { day: 2, title: '느린 요리', task: '전환 → 레시피 보고 새로운 요리 하나. 시간 안 재기. 과정을 느끼기', tip: '속도에 중독된 사람에게 "천천히 만드는 것"이 핵심 연습' },
      { day: 3, title: '목적 없는 산책', task: '전환 → 요리 → 어디 가려고 걷지 말고 그냥 걷기 20분. 시간/거리 안 재기', tip: '숫자 없는 활동이 과속형에게 가장 필요한 경험' },
      { day: 4, title: '아무것도 안 하는 30분', task: '전환 → 요리 → 소파에 앉아서 30분 아무것도 안 하기. 불편하면 그게 정상', tip: '공백 노출: 반복하면 "안 해도 된다"는 감각이 생깁니다 (Wolpe, 1958)' },
      { day: 5, title: '비생산적 취미', task: '전환 → 요리 → 결과물 없는 취미 1시간. 그림, 음악 듣기, 퍼즐 등', tip: '"뭔가 되어야 한다"에서 벗어나기. 과정 자체가 회복' },
      { day: 6, title: '디지털 일몰', task: '전환 → 요리 → 취미 → 밤 9시 모든 화면 끄기. 간접조명 + 종이책이나 멍', tip: '화면 끄기 후 멜라토닌 분비까지 90분. 일찍 끌수록 좋음' },
      { day: 7, title: '나만의 감속 루틴', task: '이번 주에서 좋았던 조합으로 내 루틴 만들기. 핵심: 시간을 안 재는 저녁', tip: '"생산적이지 않은 3시간이 내일의 에너지를 만든다"' },
    ],
  },
  // === 📱 도피형 7일 ===
  {
    id: 'escape-7', type: 'escape', icon: '📱', name: '7일 폰 없는 저녁', duration: 7,
    description: '쇼츠를 대체할 3시간을 실제로 채워보기',
    color: '#a29bfe',
    missions: [
      { day: 1, title: '폰 격리만', task: '집에 오면 폰을 다른 방에 두기. 이것만. 뭘 해도 됨. 얼마나 견디는지만 체크', tip: '자기모니터링만으로 행동이 ~20% 줄어듭니다 (Korotitsch, 1999)' },
      { day: 2, title: '폰 없이 요리', task: '폰 격리 → 레시피를 미리 보고 기억으로 요리. 틀려도 OK. 맛보면서 먹기', tip: '감각 몰입이 자극 충동을 대체합니다' },
      { day: 3, title: '스피커 음악 저녁', task: '폰 격리 → 미리 만든 플레이리스트를 스피커로 → 요리 → 음악 들으며 정리', tip: '알고리즘이 아닌 내가 고른 음악. 공간을 소리로 채우면 폰이 덜 그립습니다' },
      { day: 4, title: '손 바쁘게 하기', task: '폰 격리 → 요리 → 손으로 하는 취미 1시간 (퍼즐, 정리, 그림, 레고)', tip: '운동감각 활동이 스크롤 충동을 점유합니다. 손이 바쁘면 폰을 못 듦' },
      { day: 5, title: '긴 콘텐츠 하나', task: '폰 격리 → 요리 → 영화 한 편 or 다큐 하나 처음부터 끝까지 (TV로)', tip: '쇼츠=100+회 주의전환/시간. 영화=3-5회. 주의가 안정됩니다 (Ophir, 2009)' },
      { day: 6, title: '3시간 풀코스', task: '폰 격리 → 요리 → 취미 → 샤워 → 간접조명 + 종이책. 폰 안 봄', tip: '대체할 것이 충분하면 폰이 필요 없어집니다' },
      { day: 7, title: '나의 대체 메뉴', task: '"폰 대신 할 것" 5가지 적기. 이번 주에서 실제로 좋았던 것으로. 냉장고에 붙이기', tip: 'DRAMMA 점수: 쇼츠 1/6 vs 요리+취미 4-5/6 (Newman, 2014)' },
    ],
  },
  // === 😵 과부하형 7일 ===
  {
    id: 'overload-7', type: 'overload', icon: '😵', name: '7일 최소 에너지 저녁', duration: 7,
    description: '에너지가 0일 때도 할 수 있는 저녁 루틴',
    color: '#fd9644',
    missions: [
      { day: 1, title: '바닥에 눕기만', task: '집에 오면 바닥에 눕기. 다리 벽에 올리기. 5분만. 나머지 자유', tip: '의지 필요 0. 부교감신경만 활성화하면 됩니다' },
      { day: 2, title: '눕기 + 뜨거운 물', task: '바닥 5분 → 뜨거운 샤워 (시간 제한 없음). 이것만', tip: '온도 변화가 신경계를 리셋합니다. 생각 안 해도 됨' },
      { day: 3, title: '눕기 + 샤워 + 뭐든 시켜먹기', task: '바닥 5분 → 샤워 → 뭐든 시켜서 천천히 먹기. 폰 보면서 먹어도 OK', tip: '과부하형에게 중요한 건 "해야 한다"를 줄이는 것' },
      { day: 4, title: '간단한 거 하나 해먹기', task: '바닥 → 샤워 → 계란후라이라도 직접 해먹기. 기운이 나면', tip: '"할 수 있는 가장 작은 것" 원리 (행동활성화, Martell 2001)' },
      { day: 5, title: '누워서 음악 30분', task: '바닥 → 샤워 → 밥 → 조명 끄고 누워서 좋아하는 음악 30분', tip: '능동적 회복: 스크롤보다 음악 감상이 회복력이 높음 (Trougakos, 2009)' },
      { day: 6, title: '에너지 되면 산책', task: '바닥 → 샤워 → 밥 → 기운 되면 10분 산책. 안 되면 안 해도 됨', tip: '강제 아님. 오늘 에너지가 허락하면만' },
      { day: 7, title: '나의 최소 루틴', task: '이번 주에서 "에너지 0일 때도 할 수 있는 것"과 "조금 있을 때 할 수 있는 것" 분류', tip: '과부하형에겐 2단계 루틴이 필요합니다' },
    ],
  },
  // === 🌫 멍형 7일 ===
  {
    id: 'blank-7', type: 'blank', icon: '🌫', name: '7일 저녁 깨우기', duration: 7,
    description: '소파에서 일어나는 것부터. 아주 천천히',
    color: '#78e08f',
    missions: [
      { day: 1, title: '일어나서 물 마시기', task: '소파/침대에서 일어나서 물 한 잔 마시기. 이것만', tip: '행동이 동기보다 먼저. 물 마시기가 시작 (Martell, 2001)' },
      { day: 2, title: '물 + 창문 열기', task: '일어나기 → 물 마시기 → 창문 열고 30초 밖 공기 맡기', tip: '자연 요소 접촉이 주의를 부드럽게 회복 (Kaplan, 1995)' },
      { day: 3, title: '물 + 창문 + 뭐든 하나 해먹기', task: '일어나기 → 물 → 창문 → 간단한 거 하나 만들어 먹기', tip: '"만들었다"는 감각이 유능감을 줌 (SDT)' },
      { day: 4, title: '밥 + 설거지', task: '해먹기 → 바로 설거지 (음악 틀면서). 설거지는 운동감각 활동이라 뇌가 쉼', tip: '손을 쓰는 반복 동작이 인지 시스템을 쉬게 합니다 (Effort-Recovery)' },
      { day: 5, title: '밥 + 설거지 + 100보', task: '해먹기 → 설거지 → 현관문 나가서 100보만 걷고 돌아오기', tip: '100보. 운동 아닙니다. 관성만 이용하세요' },
      { day: 6, title: '밥 + 산책 + 누군가에게 연락', task: '해먹기 → 산책 → 아무에게나 "밥 먹었어?" 한 줄', tip: '관계성은 무기력에서 가장 방치되는 욕구 (SDT)' },
      { day: 7, title: '나의 시동 루틴', task: '"일어나기 → ___ → ___ → ___" 내 순서 만들기. 첫 단계가 가장 중요', tip: '"~하면 ~한다" 구현의도가 동기를 우회 (Gollwitzer, 1999)' },
    ],
  },
  // === 🧠 과생각형 7일 ===
  {
    id: 'overthink-7', type: 'overthink', icon: '🧠', name: '7일 손 바쁜 저녁', duration: 7,
    description: '생각을 멈추는 게 아니라 손을 바쁘게 만들기',
    color: '#e056c1',
    missions: [
      { day: 1, title: '머릿속 쏟아내기 + 전환', task: '집에 오면 5분간 머릿속에 있는 것 전부 종이에 쓰기 → 접어서 서랍에 넣기 → 옷 갈아입기', tip: '외부화: 적으면 반추가 줄어듭니다 (Borkovec, 1983)' },
      { day: 2, title: '쏟아내기 + 요리', task: '5분 쓰기 → 전환 → 레시피 따라 요리. 손이 바쁘면 생각이 줄어듦', tip: '요리의 인지 부하가 반추 회로를 점유합니다' },
      { day: 3, title: '쏟아내기 + 요리 + 설거지', task: '쓰기 → 요리 → 먹기 → 바로 설거지 (음악 틀면서). 계속 손을 씀', tip: '운동감각 활동이 언어적 반추를 대체합니다' },
      { day: 4, title: '+ 손 취미 30분', task: '쓰기 → 요리 → 설거지 → 퍼즐/그림/정리/레고 30분', tip: '몰입(flow)이 가능한 활동이 생각을 가장 효과적으로 내려놓게 합니다 (Csikszentmihalyi)' },
      { day: 5, title: '+ 걷기 (주변 관찰)', task: '쓰기 → 요리 → 취미 → 산책 15분, 주변 색깔 5개 세기', tip: '주의를 외부로 돌리기. 멈추는 게 아니라 방향 전환 (Wells, 2000)' },
      { day: 6, title: '+ 뜨거운 물 + 어둠', task: '쓰기 → 요리 → 취미 → 산책 → 조명 끄고 뜨거운 샤워', tip: '시각 정보를 줄이면 생각의 재료가 줄어듭니다' },
      { day: 7, title: '나의 "손 바쁜" 루틴', task: '이번 주에서 생각이 가장 조용했던 활동 조합 적기. 내 루틴으로 확정', tip: '"생각을 멈추려 하면 더 늘어난다. 손을 써라" (Wegner, 1987)' },
    ],
  },
  // === 🎭 감정 억제형 7일 ===
  {
    id: 'suppress-7', type: 'suppress', icon: '🎭', name: '7일 감정이 있는 저녁', duration: 7,
    description: '억누르지 않고 흘러가게 두는 3시간',
    color: '#f9ca24',
    missions: [
      { day: 1, title: '기분에 맞는 음악 3곡', task: '집에 오면 지금 기분에 맞는 노래 3곡 골라서 스피커로 듣기. 이것만', tip: '음악이 감정 접근의 안전한 통로 (Saarikallio, 2007)' },
      { day: 2, title: '음악 + 4분 쓰기', task: '음악 듣기 → 오늘 마음에 걸리는 거 4분간 자유롭게 쓰기. 버려도 됨', tip: '표현적 글쓰기가 면역까지 개선 (Pennebaker, 1997)' },
      { day: 3, title: '음악 + 쓰기 + 좋아하는 음식', task: '음악 → 쓰기 → 위로가 되는 음식 만들어 먹기. 맛 느끼면서', tip: '감각 경험이 억제의 반대. 몸으로 감정에 간접 접근' },
      { day: 4, title: '+ 전화 한 통', task: '음악 → 쓰기 → 요리 → 먹으면서 or 후에 누군가에게 전화. "좀 힘들었어" 한마디면 됨', tip: '목소리 교환이 옥시토신 분비 (Hawkley & Cacioppo)' },
      { day: 5, title: '+ 뜨거운 물에 한숨', task: '음악 → 쓰기 → 요리 → 뜨거운 샤워하면서 한숨 크게 3번', tip: '한숨은 생리적 리셋. 억제하던 호흡을 풀어줍니다 (Balban, 2023)' },
      { day: 6, title: '+ 감정에 맞는 영화/드라마', task: '전환 → 요리 → 지금 감정에 맞는 작품 하나 보기. 울고 싶으면 울어도 됨', tip: '안전한 자극을 통한 감정 노출. 대리 경험이 카타르시스를 줌' },
      { day: 7, title: '나의 감정 루틴', task: '"오늘 기분이 ___일 때 내가 하면 좋은 것" 3가지 경우 적기', tip: '감정별 대응 메뉴가 있으면 억제 대신 선택을 하게 됩니다' },
    ],
  },
  // === 🤝 관계 과부하형 7일 ===
  {
    id: 'social-7', type: 'social', icon: '🤝', name: '7일 나만의 저녁', duration: 7,
    description: '사람에게 지친 후 혼자만의 3시간 만들기',
    color: '#45aaf2',
    missions: [
      { day: 1, title: '알림 끄기', task: '집에 오면 모든 알림 끄기. 비행기모드도 OK. 이것만', tip: '자발적 고독이 감정조절과 창의성을 높임 (Nguyen, 2018)' },
      { day: 2, title: '알림 끄기 + 나만을 위한 요리', task: '알림 끄기 → 누구와 나눌 필요 없는, 내가 먹고 싶은 것 만들기', tip: '자율성 충족이 사회적 피로의 해독제 (DRAMMA)' },
      { day: 3, title: '+ 혼자 하는 취미', task: '알림 끄기 → 요리 → SNS에 안 올릴 취미 1시간. 순수하게 나를 위한 시간', tip: '"보여주기"가 없는 활동이 진짜 회복' },
      { day: 4, title: '+ 이어폰 없는 산책', task: '알림 끄기 → 요리 → 취미 → 이어폰 없이 산책. 소리까지 비우기', tip: '이어폰 = 또 다른 입력. 청각까지 비워야 진짜 혼자' },
      { day: 5, title: '+ 뜨거운 물 혼자', task: '알림 끄기 → 요리 → 취미 → 산책 → 뜨거운 물. 물소리와 온도만', tip: '사회적 자극이 0인 환경에서 신경계 리셋' },
      { day: 6, title: '혼자 좋아하는 영화/음악', task: '알림 끄기 → 요리 → 나만 좋아하는 영화 하나 끝까지 보기', tip: '취향에 타협 없는 저녁. 이게 자발적 고독의 핵심' },
      { day: 7, title: '나의 혼자 루틴', task: '"사람에게 지친 날" 할 것 3가지 적기. 죄책감 없이', tip: '"거리 조절은 관계를 나쁘게 하지 않는다" (Ames, 2008)' },
    ],
  },
  // === 🎯 완벽주의형 7일 ===
  {
    id: 'perfect-7', type: 'perfect', icon: '🎯', name: '7일 대충의 저녁', duration: 7,
    description: '완벽하지 않아도 되는 3시간 연습',
    color: '#26de81',
    missions: [
      { day: 1, title: '대충 해먹기', task: '집에 와서 뭐든 대충 해먹기. 예쁘게 안 담아도 됨. 맛없어도 OK', tip: '"대충"이 가장 어려운 유형. 의도적 불완전 연습 (Egan, 2011)' },
      { day: 2, title: '대충 해먹기 + 설거지 안 하기', task: '대충 해먹기 → 설거지 내일로 미루기. 불편감 측정 0-10', tip: '미완료 내성 훈련. 불편해도 세상은 안 무너집니다' },
      { day: 3, title: '+ 생산적이지 않은 1시간', task: '대충 밥 → 1시간 동안 아무 성과 없는 활동. 음악 듣기, 멍때리기, 산책', tip: '"쉼은 생산성의 보상이 아니다" (Crocker & Wolfe, 2001)' },
      { day: 4, title: '+ 끝까지 안 해도 되는 것', task: '대충 밥 → 책 3페이지만 읽고 덮기 or 영화 30분만 보고 끄기', tip: '"끝내야 한다" 강박에서 벗어나기. 중간에 그만둬도 됨' },
      { day: 5, title: '+ 숫자 없는 산책', task: '대충 밥 → 시간 안 재고, 거리 안 재고, 걸음 안 세고 걷기', tip: '측정 없는 활동. 완벽주의형에게 가장 낯선 경험' },
      { day: 6, title: '+ 아무도 모르는 시간', task: '대충 밥 → 산책 → SNS에 안 올리고, 누구에게도 말 안 하는 저녁 시간', tip: '보여줄 필요 없는 시간이 진짜 자율성' },
      { day: 7, title: '나의 "대충" 루틴', task: '"완벽하지 않아도 되는 저녁"의 내 버전 적기. 핵심: 점수를 안 매기는 것', tip: '음미(Savoring): "했다"만 느끼기. 흠잡지 않기 (Bryant, 2007)' },
    ],
  },
  // === 14일 심화: 모든 유형 ===
  {
    id: 'deep-14', type: 'all', icon: '🌙', name: '14일 저녁 루틴 심화', duration: 14,
    description: '7일 루틴을 확장하고 주말까지 연결하기',
    color: '#6c5ce7',
    missions: [
      { day: 1, title: '내 루틴 실행', task: '7일 프로그램에서 만든 내 루틴 실행. 회복감 0-10 측정', tip: '기준선 측정' },
      { day: 2, title: '전화 추가', task: '루틴 중 한 구간에 친구/가족 전화 추가. 요리하면서 or 산책하면서', tip: '질 높은 사회적 연결 (Hawkley & Cacioppo)' },
      { day: 3, title: '새로운 요리', task: '한 번도 안 해본 요리 도전. 실패해도 OK', tip: '숙달 경험이 회복을 강화 (Sonnentag, 2012)' },
      { day: 4, title: '자연 요소', task: '루틴에 자연 추가: 화분 물주기, 창문 열기, 공원 산책, 비소리 틀기', tip: '자연 노출 주 120분이 안녕감 임계치 (White, 2019)' },
      { day: 5, title: '취미 확장', task: '손 취미를 45분으로 확장. 새로운 기법이나 패턴 시도', tip: '몰입(flow) 시간이 길수록 회복력 증가 (Fullagar & Kelloway, 2009)' },
      { day: 6, title: '멍때리기 연습', task: '루틴 마지막에 15분 아무것도 안 하기. 창밖 or 천장 보기', tip: 'DMN 활성화: 뇌의 정비 시간 (기본모드네트워크 연구)' },
      { day: 7, title: '1주 회고', task: '회복감 가장 높았던 날의 조합 확인', tip: '데이터 기반 최적화' },
      { day: 8, title: '주말 확장판', task: '평일 3시간 루틴을 주말 반나절로 확장. 오전 내내 폰 안 보기', tip: '주말 회복이 주중 에너지를 결정 (Sonnentag)' },
      { day: 9, title: '음미 저녁', task: '오늘 루틴의 모든 순간을 의식적으로 느끼기. 물 온도, 음식 맛, 공기 냄새', tip: '음미(savoring)가 같은 활동의 회복력을 2배로 (Bryant, 2007)' },
      { day: 10, title: '누군가 초대', task: '집에 한 명 초대해서 같이 요리하거나, 각자 할 거 하면서 같이 있기', tip: '"같이 있지만 각자" = 최고의 사회적 회복' },
      { day: 11, title: '수면 루틴', task: '밤 10시 하드스톱: 폰 다른 방 → 조명 낮추기 → 하나만 (책/음악/멍)', tip: '일관된 수면 전 루틴이 파블로프 수면 신호가 됨 (Exelmans, 2016)' },
      { day: 12, title: '계절 루틴', task: '지금 계절에 맞는 요소 추가: 여름=냉면+선풍기, 겨울=국물+담요+핫초코', tip: '감각적 계절감이 현재에 닻을 내림' },
      { day: 13, title: '비 오는 날 루틴', task: '날씨 안 좋을 때 버전 만들기. 실내에서만 할 수 있는 조합', tip: '상황별 루틴이 있으면 "뭐 하지?" 고민이 사라짐' },
      { day: 14, title: '나의 저녁 매뉴얼', task: '평일/주말/비오는날/지친날 4가지 버전의 내 저녁 루틴 완성', tip: '이제 쇼츠 대신 뭘 할지 알고 있습니다' },
    ],
  },
];

const PLANS = [
  { id: 'monthly', name: '월간', price: '4,900', period: '월', badge: null },
  { id: 'yearly', name: '연간', price: '39,900', period: '년', badge: '32% 할인' },
];

const FREE_FEATURES = ['유형 테스트', '오늘의 미션 (매일 5개)', '내 유형 7일 프로그램 1개'];
const PRO_FEATURES = ['모든 유형 프로그램 잠금 해제', '14일 · 21일 장기 프로그램', '프로그램 무제한 재시작', '주간 리포트 상세 분석'];

export default function Programs({ embedded = false, myTypeOnly = false }) {
  const { user, profile, updateProfile } = useAuth();
  const { load, save: dataSave } = useData();
  const { requireLogin } = useLoginModal();
  const restType = profile?.rest_type;
  const [programs, setPrograms] = useState(() => {
    return load('dietPrograms') || {};
  });
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showMission, setShowMission] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isPro, setIsPro] = useState(() => profile?.subscription === 'pro');

  const isFreeProgramForUser = (program) => {
    return program.type === restType && program.duration === 7;
  };

  const save = (updated) => {
    setPrograms(updated);
    dataSave('dietPrograms', updated);
  };

  const startProgram = (programId) => {
    const program = PROGRAMS.find(p => p.id === programId);
    if (!isPro && !isFreeProgramForUser(program)) {
      setShowPaywall(true);
      return;
    }
    save({ ...programs, [programId]: { startDate: new Date().toISOString().split('T')[0], completedDays: [] } });
  };

  const handleSubscribe = () => {
    if (!user) {
      requireLogin('구독을 위해 로그인이 필요합니다');
      return;
    }
    setIsPro(true);
    updateProfile({ subscription: 'pro' });
    setShowPaywall(false);
  };

  const completeDay = (programId, day) => {
    const prog = programs[programId];
    if (!prog) return;
    const wasCompleted = prog.completedDays.includes(day);
    const completed = wasCompleted ? prog.completedDays.filter(d => d !== day) : [...prog.completedDays, day];
    if (!wasCompleted) {
      const stats = load('achievementStats') || {};
      stats.missionsCompleted = (stats.missionsCompleted || 0) + 1;
      dataSave('achievementStats', stats);
      logDailyActivity('mission');
    }
    save({ ...programs, [programId]: { ...prog, completedDays: completed } });
  };

  const resetProgram = (programId) => {
    const updated = { ...programs };
    delete updated[programId];
    save(updated);
    setSelectedProgram(null);
  };

  const getDayStatus = (programId, day) => {
    const prog = programs[programId];
    if (!prog) return 'locked';
    const diffDays = Math.floor((new Date() - new Date(prog.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    if (prog.completedDays.includes(day)) return 'completed';
    if (day <= diffDays) return 'available';
    return 'locked';
  };

  const getProgress = (program) => {
    const prog = programs[program.id];
    if (!prog) return 0;
    return Math.round((prog.completedDays.length / program.duration) * 100);
  };

  const getStreak = (programId) => {
    const prog = programs[programId];
    if (!prog) return 0;
    const sorted = [...prog.completedDays].sort((a, b) => b - a);
    let streak = 0;
    const currentDay = Math.floor((new Date() - new Date(prog.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    for (let d = currentDay; d >= 1; d--) {
      if (sorted.includes(d)) streak++;
      else break;
    }
    return streak;
  };

  // My type programs + 21-day master
  const myPrograms = PROGRAMS.filter(p => p.type === restType || p.type === 'all');
  const otherPrograms = PROGRAMS.filter(p => p.type !== restType && p.type !== 'all');
  const restTypeData = restType ? { speed: '🚀 과속형', escape: '📱 도피형', overload: '😵 과부하형', blank: '🌫 멍형', overthink: '🧠 과생각형', suppress: '🎭 감정 억제형', social: '🤝 관계 과부하형', perfect: '🎯 완벽주의형' }[restType] : null;

  const handleCardClick = (program) => {
    if (!isPro && !isFreeProgramForUser(program) && !programs[program.id]) {
      setShowPaywall(true);
    } else {
      setSelectedProgram(program.id);
    }
  };

  const renderProgramCard = (program) => {
    const prog = programs[program.id];
    const progress = getProgress(program);
    const isFree = isFreeProgramForUser(program);
    const locked = !isPro && !isFree && !prog;
    return (
      <div key={program.id} className={`program-card ${prog ? 'active' : ''} ${locked ? 'locked' : ''}`}
        style={{ '--program-color': program.color }} onClick={() => handleCardClick(program)}>
        <div className="program-card-top">
          <span className="program-card-icon">{program.icon}</span>
          <div className="program-card-info">
            <h3 className="program-card-name">
              {program.name}
              {locked && <span className="program-lock-badge">PRO</span>}
              {isFree && !prog && <span className="program-free-badge">FREE</span>}
            </h3>
            <p className="program-card-desc">{program.description}</p>
          </div>
        </div>
        <div className="program-card-bottom">
          <span className="program-duration">{program.duration}일</span>
          {prog ? (
            <div className="program-card-progress">
              <div className="mini-progress-bar"><div className="mini-progress-fill" style={{ width: `${progress}%`, background: program.color }} /></div>
              <span className="progress-text">{progress}%</span>
            </div>
          ) : locked ? (
            <span className="program-badge" style={{ color: 'var(--text-muted)' }}>🔒 잠금</span>
          ) : (
            <span className="program-badge" style={{ color: program.color }}>시작하기 →</span>
          )}
        </div>
      </div>
    );
  };

  // Detail view
  if (selectedProgram) {
    const program = PROGRAMS.find(p => p.id === selectedProgram);
    const prog = programs[program.id];
    const progress = getProgress(program);
    const streak = getStreak(program.id);

    return (
      <div className="page">
        <button className="video-back" onClick={() => { setSelectedProgram(null); setShowMission(null); }}>
          ← 돌아가기
        </button>

        <div className="program-detail-header" style={{ '--program-color': program.color }}>
          <span className="program-detail-icon">{program.icon}</span>
          <h2 className="program-detail-name">{program.name}</h2>
          <p className="program-detail-desc">{program.description}</p>

          {prog && (
            <div className="program-stats">
              <div className="stat"><span className="stat-value">{progress}%</span><span className="stat-label">진행률</span></div>
              <div className="stat"><span className="stat-value">{prog.completedDays.length}/{program.duration}</span><span className="stat-label">완료</span></div>
              <div className="stat"><span className="stat-value">{streak}</span><span className="stat-label">연속</span></div>
            </div>
          )}

          {prog && (
            <div className="program-progress-bar">
              <div className="program-progress-fill" style={{ width: `${progress}%`, background: program.color }} />
            </div>
          )}
        </div>

        {!prog ? (
          <button className="btn-primary program-start-btn" style={{ background: program.color }} onClick={() => startProgram(program.id)}>
            프로그램 시작하기
          </button>
        ) : (
          <>
            <div className="mission-list">
              {program.missions.map((mission) => {
                const status = getDayStatus(program.id, mission.day);
                const isOpen = showMission === mission.day;
                return (
                  <div key={mission.day} className={`mission-card ${status}`}>
                    <div className="mission-header" onClick={() => status !== 'locked' && setShowMission(isOpen ? null : mission.day)}>
                      <div className="mission-day-badge" style={status === 'completed' ? { background: program.color } : {}}>
                        {status === 'completed' ? '✓' : `D${mission.day}`}
                      </div>
                      <div className="mission-title-area">
                        <span className="mission-title">{mission.title}</span>
                        {status === 'locked' && <span className="mission-locked">🔒</span>}
                      </div>
                    </div>
                    {isOpen && status !== 'locked' && (
                      <div className="mission-body">
                        <p className="mission-task">{mission.task}</p>
                        <p className="mission-tip">💡 {mission.tip}</p>
                        <button
                          className={`mission-complete-btn ${status === 'completed' ? 'done' : ''}`}
                          style={status !== 'completed' ? { background: program.color } : {}}
                          onClick={() => completeDay(program.id, mission.day)}
                        >
                          {status === 'completed' ? '완료 취소' : '미션 완료'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="btn-reset-program" onClick={() => resetProgram(program.id)}>프로그램 초기화</button>
          </>
        )}
      </div>
    );
  }

  // ===== PAYWALL =====
  if (showPaywall) {
    return (
      <div className={embedded ? '' : 'page'}>
        <div className="paywall">
          <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>

          <div className="paywall-header">
            <span className="paywall-icon">✦</span>
            <h2 className="paywall-title">Rest Pro</h2>
            <p className="paywall-subtitle">나에게 맞는 쉼을 깊이 있게</p>
          </div>

          <div className="paywall-comparison">
            <div className="paywall-col free">
              <span className="paywall-col-title">Free</span>
              <ul className="paywall-features">
                {FREE_FEATURES.map((f, i) => <li key={i}><span className="paywall-check">✓</span>{f}</li>)}
              </ul>
            </div>
            <div className="paywall-col pro">
              <span className="paywall-col-title">Pro</span>
              <ul className="paywall-features">
                {FREE_FEATURES.map((f, i) => <li key={`f${i}`}><span className="paywall-check">✓</span>{f}</li>)}
                {PRO_FEATURES.map((f, i) => <li key={`p${i}`} className="pro-feature"><span className="paywall-check pro">✦</span>{f}</li>)}
              </ul>
            </div>
          </div>

          <div className="paywall-plans">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                className={`paywall-plan ${selectedPlan === plan.id ? 'active' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.badge && <span className="paywall-plan-badge">{plan.badge}</span>}
                <span className="paywall-plan-name">{plan.name}</span>
                <span className="paywall-plan-price">
                  <strong>{plan.price}원</strong> / {plan.period}
                </span>
              </button>
            ))}
          </div>

          <button className="paywall-subscribe-btn" onClick={handleSubscribe}>
            구독 시작하기
          </button>
          <p className="paywall-note">언제든 해지 가능 · 7일 무료 체험</p>
        </div>
      </div>
    );
  }

  // List view
  const listContent = (
    <>
      {/* My type programs */}
      {restTypeData && myPrograms.length > 0 && (
        <div className="program-section">
          {!myTypeOnly && <div className="program-section-title">{restTypeData} 추천 프로그램</div>}
          <div className="program-list">
            {myPrograms.map(renderProgramCard)}
          </div>
        </div>
      )}

      {/* No type set */}
      {!restTypeData && (
        <div className="program-no-type">
          <p>Rest 탭에서 유형 테스트를 먼저 해보세요.</p>
          <p className="program-no-type-sub">유형에 맞는 프로그램을 추천해드립니다.</p>
        </div>
      )}

      {/* Other programs - hide when myTypeOnly */}
      {!myTypeOnly && (
        <div className="program-section">
          <button className="program-section-toggle" onClick={() => setShowAll(!showAll)}>
            {showAll ? '접기 ↑' : `다른 유형 프로그램 보기 (${otherPrograms.length}개) ↓`}
          </button>
          {showAll && (
            <div className="program-list">{otherPrograms.map(renderProgramCard)}</div>
          )}
        </div>
      )}

      {/* Pro banner */}
      {!isPro && (
        <button className="paywall-banner" onClick={() => setShowPaywall(true)}>
          <span className="paywall-banner-icon">✦</span>
          <div className="paywall-banner-text">
            <strong>Rest Pro</strong>로 모든 프로그램을 잠금 해제하세요
          </div>
          <span className="paywall-banner-arrow">→</span>
        </button>
      )}
    </>
  );

  if (embedded) return listContent;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Programs</h1>
        <p className="page-subtitle">유형에 맞는 쉼 프로그램</p>
      </header>
      {listContent}
    </div>
  );
}
