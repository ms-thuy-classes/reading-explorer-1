# reading-explorer-1
pdf-practice-test/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Admin panel route
│   ├── globals.css               # Global styles + glassmorphism
│   ├── layout.tsx                # Root layout with theme provider
│   └── page.tsx                  # Main practice page
├── components/
│   ├── AdminPanel.tsx            # Full admin CRUD interface
│   ├── AnswerSheet.tsx           # Dynamic answer sheet panel
│   ├── Navbar.tsx                # Navigation bar
│   ├── PDFViewer.tsx             # PDF.js viewer with zoom/nav
│   ├── PieChart.tsx              # Chart.js doughnut chart
│   ├── ProgressBar.tsx           # Animated progress bar
│   ├── QuestionCard.tsx          # All 9 question types
│   ├── ResultDashboard.tsx       # Post-submission results
│   ├── ThemeProvider.tsx         # Dark/light mode context
│   ├── Timer.tsx                 # Countdown timer
│   └── WrongAnswerReview.tsx     # Filterable review table
├── lib/
│   ├── sampleData.ts             # Built-in sample test
│   ├── scoring.ts                # Scoring utilities
│   ├── storage.ts                # LocalStorage wrapper
│   └── types.ts                  # TypeScript interfaces
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── postcss.config.js
