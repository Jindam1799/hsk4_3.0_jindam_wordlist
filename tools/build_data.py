"""tools/words/*.txt -> data.js

한 줄에 단어 하나, '|'로 구분한 13칸:
번호|단어|병음|뜻|짝꿍1|병음1|뜻1|짝꿍2|병음2|뜻2|짝꿍3|병음3|뜻3

단어를 고치거나 추가한 뒤: python3 tools/build_data.py
"""
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent
words = []
for path in sorted((root / "words").glob("*.txt")):
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        f = [x.strip() for x in line.split("|")]
        if len(f) != 13:
            sys.exit(f"{path.name}:{line_no} 칸 수가 {len(f)}개입니다 (13개여야 함)")
        words.append({
            "no": int(f[0]), "word": f[1], "pinyin": f[2], "meaning": f[3],
            "pairs": [f[4:7], f[7:10], f[10:13]],
        })

expected = list(range(1, len(words) + 1))
if [w["no"] for w in words] != expected:
    sys.exit("번호가 1부터 순서대로 이어지지 않습니다")

out = root.parent / "data.js"
with out.open("w", encoding="utf-8") as fp:
    fp.write("// HSK 4급 진담 짝꿍어휘 데이터 — tools/build_data.py 로 생성 (직접 고치지 말고 tools/words/*.txt 를 고치세요)\n")
    fp.write("const WORDS = [\n")
    for w in words:
        fp.write("  " + json.dumps(w, ensure_ascii=False, separators=(",", ":")) + ",\n")
    fp.write("];\n")
print(f"data.js: {len(words)}개 단어")
