"""CSV -> data.js 변환기

CSV 열 순서(첫 줄은 헤더):
no,word,pinyin,meaning,p1,p1_pinyin,p1_ko,p2,p2_pinyin,p2_ko,p3,p3_pinyin,p3_ko

사용법: python3 tools/csv_to_data.py 단어장.csv > data.js
엑셀에서 'CSV UTF-8'로 저장하세요.
"""
import csv
import json
import sys

rows = []
with open(sys.argv[1], encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        rows.append({
            "no": int(r["no"]),
            "word": r["word"].strip(),
            "pinyin": r["pinyin"].strip(),
            "meaning": r["meaning"].strip(),
            "pairs": [[r[f"p{i}"].strip(), r[f"p{i}_pinyin"].strip(), r[f"p{i}_ko"].strip()]
                      for i in (1, 2, 3) if r.get(f"p{i}", "").strip()],
        })

print("// HSK 4급 진담 짝꿍어휘 데이터 (tools/csv_to_data.py 로 생성)")
print("const WORDS = [")
for w in rows:
    print("  " + json.dumps(w, ensure_ascii=False) + ",")
print("];")
