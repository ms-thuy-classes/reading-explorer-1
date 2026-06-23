# 📚 Cấu Trúc JSON Đầy Đủ Cho Tất Cả Dạng Câu Hỏi

Dưới đây là **cấu trúc JSON chi tiết** cho từng loại câu hỏi, kèm theo các **alias** (tên gọi thay thế) được hệ thống chấp nhận.

---

## 🎯 Tổng quan các Type

| # | Type chuẩn | Các alias chấp nhận | Mô tả |
|---|---|---|---|
| 1 | `mcq` | `mcq`, `multiple_choice` | Trắc nghiệm nhiều lựa chọn |
| 2 | `true_false` | `true_false`, `truefalse`, `tf` | Đúng / Sai |
| 3 | `true_false_not_given` | `true_false_not_given`, `truefalse_not_given`, `tfng` | Đúng / Sai / Không đề cập |
| 4 | `yes_no_not_given` | `yes_no_not_given`, `yesno_not_given`, `ynng` | Yes / No / Not Given |
| 5 | `matching` | `matching`, `match` | Nối (2 dạng) |
| 6 | `fill_blank` | `fill_blank`, `fillblank`, `fill` | Điền từ |
| 7 | `sentence_completion` | `sentence_completion`, `sentence` | Hoàn thành câu |
| 8 | `short_answer` | `short_answer`, `short` | Trả lời ngắn |

---

## 1️⃣ TRẮC NGHIỆM (MCQ)

### Alias chấp nhận:
```
"mcq"  |  "multiple_choice"
```

### Cấu trúc JSON:
```json
{
  "id": 1,
  "type": "mcq",
  "text": "What does the reading NOT mention?",
  "options": [
    "A. how dolphins communicate with each other",
    "B. how dolphins move quickly through the water",
    "C. how dolphins play games and have fun"
  ],
  "answer": "B. how dolphins move quickly through the water"
}
```

### 📌 Lưu ý:
- `options`: Mảng các đáp án (thường 3-5 lựa chọn)
- `answer`: Phải **khớp chính xác** 1 trong `options` (phân biệt hoa/thường)
- Có thể dùng `A.`, `B.`, `C.` hoặc không

---

## 2️⃣ ĐÚNG / SAI (True/False)

### Alias chấp nhận:
```
"true_false"  |  "truefalse"  |  "tf"
```

### Cấu trúc JSON:
```json
{
  "id": 2,
  "type": "true_false",
  "text": "The Earth revolves around the Sun.",
  "answer": "True"
}
```

### 📌 Lưu ý:
- `answer`: Chỉ có 2 giá trị → `"True"` hoặc `"False"`
- Phân biệt hoa/thường

---

## 3️⃣ ĐÚNG / SAI / KHÔNG ĐỀ CẬP (True/False/Not Given)

### Alias chấp nhận:
```
"true_false_not_given"  |  "truefalse_not_given"  |  "tfng"
```

### Cấu trúc JSON:
```json
{
  "id": 3,
  "type": "tfng",
  "text": "The passage mentions that dolphins can live up to 50 years.",
  "answer": "Not Given"
}
```

### 📌 Lưu ý:
- `answer`: Chỉ có 3 giá trị → `"True"`, `"False"`, hoặc `"Not Given"`
- Dùng cho IELTS Reading

---

## 4️⃣ YES / NO / NOT GIVEN

### Alias chấp nhận:
```
"yes_no_not_given"  |  "yesno_not_given"  |  "ynng"
```

### Cấu trúc JSON:
```json
{
  "id": 12,
  "type": "ynng",
  "text": "Is green tea fermented?",
  "answer": "No"
}
```

### 📌 Lưu ý:
- `answer`: Chỉ có 3 giá trị → `"Yes"`, `"No"`, hoặc `"Not Given"`
- Dùng cho câu hỏi dạng hỏi ý kiến tác giả (IELTS)

---

## 5️⃣ NỐI (MATCHING) — 2 DẠNG

### Alias chấp nhận:
```
"matching"  |  "match"
```

### 🔸 DẠNG A: 1 câu = 1 text, chọn 1 đáp án (Heading Matching)

**Đây là dạng bạn đang dùng** — mỗi câu hỏi có `text` riêng và chọn 1 đáp án từ `matchingOptions`.

```json
{
  "id": 6,
  "type": "matching",
  "text": "using body language",
  "matchingOptions": [
    "A. Communication",
    "B. Play",
    "C. Teamwork"
  ],
  "answer": "A. Communication"
}
```

#### Ví dụ đầy đủ (nhiều câu cùng chủ đề):
```json
[
  {
    "id": 6,
    "type": "matching",
    "text": "using body language",
    "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
    "answer": "A. Communication"
  },
  {
    "id": 7,
    "type": "matching",
    "text": "chasing each other",
    "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
    "answer": "B. Play"
  },
  {
    "id": 8,
    "type": "matching",
    "text": "whistling",
    "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
    "answer": "A. Communication"
  },
  {
    "id": 9,
    "type": "matching",
    "text": "joining other pods for games",
    "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
    "answer": "B. Play"
  },
  {
    "id": 10,
    "type": "matching",
    "text": "helping fishermen catch fish",
    "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
    "answer": "C. Teamwork"
  }
]
```

### 🔸 DẠNG B: 1 câu = nhiều mục cần nối (Classic Matching)

Dạng cổ điển: 1 câu hỏi chứa nhiều mục `left` cần nối với `right`.

```json
{
  "id": 15,
  "type": "matching",
  "text": "Match the animals with their habitats:",
  "left": ["Lion", "Penguin", "Eagle"],
  "right": ["Savanna", "Antarctica", "Mountains"],
  "answer": {
    "0": "Savanna",
    "1": "Antarctica",
    "2": "Mountains"
  }
}
```

#### 📌 Lưu ý dạng B:
- `left`: Mảng các mục bên trái (câu hỏi)
- `right`: Mảng các mục bên phải (đáp án)
- `answer`: Object với **key là string** (`"0"`, `"1"`, `"2"`) — index của `left`
- Value là đáp án đúng từ `right`

---

## 6️⃣ ĐIỀN TỪ (Fill in the Blank)

### Alias chấp nhận:
```
"fill_blank"  |  "fillblank"  |  "fill"
```

### Cấu trúc JSON:
```json
{
  "id": 14,
  "type": "fill-blank",
  "text": "The most expensive tea is made from _______.",
  "answer": "buds"
}
```

### Hoặc với nhiều đáp án được chấp nhận:
```json
{
  "id": 14,
  "type": "fill_blank",
  "text": "The capital of Vietnam is _______.",
  "answer": ["Hanoi", "hanoi", "Hà Nội"]
}
```

### 📌 Lưu ý:
- `text`: Dùng `_______` hoặc `_____` để đánh dấu chỗ trống
- `answer`: Có thể là **string** (1 đáp án) hoặc **mảng** (nhiều đáp án đúng)
- Hệ thống sẽ **bỏ qua hoa/thường** khi chấm

---

## 7️⃣ HOÀN THÀNH CÂU (Sentence Completion)

### Alias chấp nhận:
```
"sentence_completion"  |  "sentence"
```

### Cấu trúc JSON:
```json
{
  "id": 16,
  "type": "sentence_completion",
  "text": "Complete: 'If it rains, I will _______.",
  "answer": ["stay home", "stay at home", "not go out"]
}
```

### 📌 Lưu ý:
- Tương tự `fill_blank` nhưng dùng cho câu dài
- `answer`: Mảng các câu trả lời được chấp nhận

---

## 8️⃣ TRẢ LỜI NGẮN (Short Answer)

### Alias chấp nhận:
```
"short_answer"  |  "short"
```

### Cấu trúc JSON:
```json
{
  "id": 17,
  "type": "short_answer",
  "text": "How many continents are there on Earth?",
  "answer": ["7", "seven", "Seven"]
}
```

### 📌 Lưu ý:
- `answer`: Mảng các đáp án được chấp nhận (nên đưa cả số và chữ)

---

## 📄 FILE JSON HOÀN CHỈNH — TỔNG HỢP TẤT CẢ DẠNG

```json
{
  "id": "quiz-demo",
  "title": "Demo - Tất Cả Dạng Câu Hỏi",
  "category": "IELTS",
  "duration": 30,
  "pdf": "pdf/test1.pdf",
  "pages": [
    {
      "page": 1,
      "title": "Part 1: Multiple Choice & True/False",
      "questions": [
        {
          "id": 1,
          "type": "mcq",
          "text": "What is the main topic of the passage?",
          "options": [
            "A. Marine biology",
            "B. Climate change",
            "C. Ancient history",
            "D. Space exploration"
          ],
          "answer": "A. Marine biology"
        },
        {
          "id": 2,
          "type": "true_false",
          "text": "Dolphins are mammals, not fish.",
          "answer": "True"
        },
        {
          "id": 3,
          "type": "tfng",
          "text": "The passage states that dolphins can recognize themselves in mirrors.",
          "answer": "True"
        },
        {
          "id": 4,
          "type": "ynng",
          "text": "Does the author believe dolphins should be kept in captivity?",
          "answer": "No"
        }
      ]
    },
    {
      "page": 2,
      "title": "Part 2: Matching (Heading Style)",
      "questions": [
        {
          "id": 5,
          "type": "matching",
          "text": "using body language",
          "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
          "answer": "A. Communication"
        },
        {
          "id": 6,
          "type": "matching",
          "text": "chasing each other",
          "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
          "answer": "B. Play"
        },
        {
          "id": 7,
          "type": "matching",
          "text": "whistling sounds",
          "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
          "answer": "A. Communication"
        },
        {
          "id": 8,
          "type": "matching",
          "text": "helping fishermen",
          "matchingOptions": ["A. Communication", "B. Play", "C. Teamwork"],
          "answer": "C. Teamwork"
        }
      ]
    },
    {
      "page": 3,
      "title": "Part 3: Fill in the Blank & Short Answer",
      "questions": [
        {
          "id": 9,
          "type": "fill_blank",
          "text": "The most expensive tea is made from _______.",
          "answer": "buds"
        },
        {
          "id": 10,
          "type": "fill-blank",
          "text": "Dolphins sleep with one _______ open.",
          "answer": ["eye", "eyes"]
        },
        {
          "id": 11,
          "type": "sentence_completion",
          "text": "Complete: 'A group of dolphins is called a _______.",
          "answer": ["pod", "school"]
        },
        {
          "id": 12,
          "type": "short_answer",
          "text": "How long can dolphins live in the wild? (number + years)",
          "answer": ["20-30 years", "20 to 30 years", "20-30"]
        }
      ]
    },
    {
      "page": 4,
      "title": "Part 4: Classic Matching",
      "questions": [
        {
          "id": 13,
          "type": "matching",
          "text": "Match the animals with their habitats:",
          "left": ["Lion", "Penguin", "Eagle", "Dolphin"],
          "right": ["Savanna", "Antarctica", "Mountains", "Ocean"],
          "answer": {
            "0": "Savanna",
            "1": "Antarctica",
            "2": "Mountains",
            "3": "Ocean"
          }
        }
      ]
    }
  ]
}
```

---

## 📋 Bảng Tóm Tắt Nhanh

| Dạng | Type | Field đáp án | Ví dụ `answer` |
|---|---|---|---|
| Trắc nghiệm | `mcq` | `answer` (string) | `"B. how dolphins move..."` |
| Đúng/Sai | `true_false` | `answer` | `"True"` hoặc `"False"` |
| T/F/NG | `tfng` | `answer` | `"True"`, `"False"`, `"Not Given"` |
| Y/N/NG | `ynng` | `answer` | `"Yes"`, `"No"`, `"Not Given"` |
| Matching (heading) | `matching` | `answer` (string) | `"A. Communication"` |
| Matching (classic) | `matching` | `answer` (object) | `{"0": "Savanna", "1": "Ocean"}` |
| Điền từ | `fill_blank` | `answer` (string/array) | `"buds"` hoặc `["Hanoi", "Hà Nội"]` |
| Hoàn thành câu | `sentence` | `answer` (array) | `["stay home", "not go out"]` |
| Trả lời ngắn | `short_answer` | `answer` (array) | `["7", "seven", "Seven"]` |

---

## ⚠️ Những Lỗi Thường Gặp

### ❌ Lỗi 1: Phân biệt hoa/thường
```json
"answer": "true"     // ❌ Sai
"answer": "True"     // ✅ Đúng
```

### ❌ Lỗi 2: Key trong matching classic là number
```json
"answer": {
  0: "Savanna"       // ❌ Sai (không có dấu ngoặc kép)
}
"answer": {
  "0": "Savanna"     // ✅ Đúng (string)
}
```

### ❌ Lỗi 3: Đáp án không khớp chính xác với options
```json
"options": ["A. Hanoi", "B. HCM"],
"answer": "Hanoi"    // ❌ Sai (thiếu "A. ")
"answer": "A. Hanoi" // ✅ Đúng
```

### ❌ Lỗi 4: Thiếu dấu ngoặc kép
```json
{ type: "mcq" }      // ❌ Sai
{ "type": "mcq" }    // ✅ Đúng
```

---

## 🧪 Kiểm Tra JSON

Trước khi dùng, validate tại: **https://jsonlint.com/**

Nếu JSON hợp lệ → copy vào file `data/quiz/quiz-XXX.json` → F5 trang chủ → Start Test → làm bài!

Chúc Ms. Thúy tạo đề vui! 🌸
