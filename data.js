// HSK 4급 진담 짝꿍어휘 데이터
// 형식: { no, word, pinyin, meaning, pairs: [[중국어, 병음, 한국어 뜻] x3] }
// 나머지 단어는 tools/csv_to_data.py 로 CSV에서 변환해 이 파일을 덮어쓰면 됩니다.
const WORDS = [
  { no: 1, word: "啊", pinyin: "ā", meaning: "아, 어(감탄사)", pairs: [
    ["啊，我明白了", "ā, wǒ míngbai le", "아, 알겠어요"],
    ["啊，原来是这样", "ā, yuánlái shì zhèyàng", "아, 원래 이런 거였구나"],
    ["啊，真漂亮", "ā, zhēn piàoliang", "아, 정말 예쁘다"] ] },
  { no: 2, word: "爱情", pinyin: "àiqíng", meaning: "애정, 사랑", pairs: [
    ["爱情故事", "àiqíng gùshi", "사랑 이야기"],
    ["追求爱情", "zhuīqiú àiqíng", "사랑을 추구하다"],
    ["美好的爱情", "měihǎo de àiqíng", "아름다운 사랑"] ] },
  { no: 3, word: "爱心", pinyin: "àixīn", meaning: "사랑하는 마음, 사랑의 마음", pairs: [
    ["献爱心", "xiàn àixīn", "사랑을 베풀다"],
    ["充满爱心", "chōngmǎn àixīn", "사랑하는 마음이 가득하다"],
    ["很有爱心", "hěn yǒu àixīn", "사랑이 많다"] ] },
  { no: 4, word: "安检", pinyin: "ānjiǎn", meaning: "보안 검색을 하다; 보안 검색", pairs: [
    ["过安检", "guò ānjiǎn", "보안 검색을 통과하다"],
    ["机场安检", "jīchǎng ānjiǎn", "공항 보안 검색"],
    ["安检人员", "ānjiǎn rényuán", "보안 검색 요원"] ] },
  { no: 5, word: "安排", pinyin: "ānpái", meaning: "배정하다, 마련하다, 계획하다", pairs: [
    ["安排时间", "ānpái shíjiān", "시간을 배정하다"],
    ["安排工作", "ānpái gōngzuò", "업무를 배정하다"],
    ["提前安排", "tíqián ānpái", "미리 준비·계획하다"] ] },
  { no: 6, word: "按", pinyin: "àn", meaning: "누르다; ~에 따라", pairs: [
    ["按按钮", "àn ànniǔ", "버튼을 누르다"],
    ["按要求完成", "àn yāoqiú wánchéng", "요구대로 완성하다"],
    ["按规定办理", "àn guīdìng bànlǐ", "규정에 따라 처리하다"] ] },
  { no: 7, word: "按时", pinyin: "ànshí", meaning: "제때에", pairs: [
    ["按时完成", "ànshí wánchéng", "제때에 완성하다"],
    ["按时到达", "ànshí dàodá", "제시간에 도착하다"],
    ["按时吃药", "ànshí chī yào", "제때에 약을 먹다"] ] },
  { no: 8, word: "按照", pinyin: "ànzhào", meaning: "~에 따라", pairs: [
    ["按照计划", "ànzhào jìhuà", "계획에 따라"],
    ["按照规定", "ànzhào guīdìng", "규정에 따라"],
    ["按照要求", "ànzhào yāoqiú", "요구에 따라"] ] },
  { no: 9, word: "白酒", pinyin: "báijiǔ", meaning: "백주, 중국 증류주", pairs: [
    ["喝白酒", "hē báijiǔ", "백주를 마시다"],
    ["一瓶白酒", "yì píng báijiǔ", "백주 한 병"],
    ["中国白酒", "Zhōngguó báijiǔ", "중국 백주"] ] },
  { no: 10, word: "办公", pinyin: "bàngōng", meaning: "일하다, 사무를 보다", pairs: [
    ["在家办公", "zài jiā bàngōng", "재택근무하다"],
    ["办公时间", "bàngōng shíjiān", "근무 시간"],
    ["办公用品", "bàngōng yòngpǐn", "사무용품"] ] },
];
