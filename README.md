# UniAssist AI — Smart University Chatbot

UniAssist AI is a modern, responsive, high-performance university chatbot designed for higher-education institutions. Built using pure **HTML5, CSS3, and Vanilla JavaScript (ES6+)** on the frontend, and backed by a secure **Node.js + Express** server integrating **Google Gemini** through Google AI Studio.

UniAssist AI serves as a 24/7 intelligent companion for students, applicants, and faculty—providing verified academic guidance, admissions advice, GPA calculation breakdowns, scholarship details, and campus services without hallucinating official policies.

---

## 🌟 Key Features

### 🎓 University Academic Intelligence
- **Admissions & Deadlines**: Detailed requirements for prospective freshmen, transfer students, graduate applicants, and international F-1 visas.
- **Academic Policies & Grading**: Official 4.0 GPA scale breakdown, Dean's List requirements (≥3.60 GPA), credit overload approvals, and course add/drop timelines.
- **Colleges & Degrees**: Explores degree paths across Computing & AI, Engineering, Business, Life Sciences, and Law.
- **Scholarships & Aid**: Details on Presidential Merit Scholarships, STEM Grants, FAFSA guidelines, and graduate assistantships.
- **Campus Facilities & Hours**: 24/7 library study floor guides, recreational aquatic center schedules, tech hubs, and certified dining commons.
- **Direct Official Contacts**: One-click emails and phone numbers for the Registrar, Admissions, Advising, Financial Aid, and Campus Police.

### 💬 Modern Conversational UI/UX
- **Three-Part Application Layout**:
  - **Sidebar**: Pinned conversations, categorized recent chats, live search filtering, clear history, and student profile widget.
  - **Main Chat Feed**: University crest branding, interactive suggested topic cards, real-time streaming markdown responses, and follow-up suggestion chips.
  - **Input Area**: Expanding multi-line textarea, character counter (up to 4,000 characters), instant stop button, and quick-topic chips.
- **Message Action Bar**:
  - One-click copy for full responses or individual code snippets.
  - Regenerate AI response.
  - Helpful / Not helpful feedback tracking.
  - Text-to-speech read-aloud using the Web Speech API.
- **Code Block Formatting**: Syntax-styled containers with language tags and copy button.
- **Themes**: Seamless Light and Dark mode switching with `localStorage` persistence.
- **Exporting**: Instant export of conversation transcripts to `.txt` files with university timestamps.

### 🔒 Enterprise Security & Performance
- **Server-Side Key Isolation**: Google Gemini API key (`GEMINI_API_KEY`) is stored strictly in server environment variables and never exposed to the client browser.
- **Free-Tier Models**: Defaults to `gemini-3.8-flash` (with optional `gemini-3.1-flash-lite`), ensuring fast response times within Google AI Studio free tier limits.
- **Rate Limiting & Safety**: Built-in IP rate limiter, multi-turn payload sanitization, and `DOMPurify` protection against XSS.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Flexbox/Grid, Animations), Vanilla JavaScript (ES6+ Modules) |
| **Markdown** | `marked` for formatting, `DOMPurify` for HTML sanitization |
| **Backend** | Node.js, Express, TypeScript (`tsx`) |
| **AI Integration** | `@google/genai` SDK (`gemini-3.8-flash`, `gemini-3.1-flash-lite`) |
| **Styling Palette**| Deep Navy Blue (`#14213D`), Royal Blue (`#2563EB`), Sky Accent (`#60A5FA`), White (`#FFFFFF`) |

---

## 📁 Project Architecture

```
uniassist-ai/
├── index.html                 # Main HTML5 entry point & semantic structure
├── metadata.json              # Applet metadata & server-side Gemini capability
├── package.json               # Dependencies, devDependencies, and start scripts
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite development server configuration
├── .env.example               # Template for environment variables
├── server.ts                  # Secure Express server with Gemini SSE streaming
├── src/
│   ├── app.js                 # Vanilla JS core: state, streaming, history, UI
│   ├── style.css              # Custom CSS: navy/royal blue theme, dark mode, responsive
│   └── universityKnowledge.ts # Structured knowledge base for Metropolitan State University
└── README.md                  # Complete documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **Google Gemini API Key** (obtainable free from [Google AI Studio](https://aistudio.google.com/))

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Gemini API key in `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3000
```

### 3. Installation
Install project dependencies:
```bash
npm install
```

### 4. Running the Application
Start the full-stack development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## ⚙️ Configuration & Customization

### Modifying the University Knowledge Base
To adapt UniAssist AI for your university, open `src/universityKnowledge.ts`. You can update:
- Institution name, tagline, and founding year
- Contact directory emails, phone numbers, and physical offices
- Academic calendar dates (Fall/Spring/Summer add/drop and finals)
- Colleges, schools, and degrees offered
- Scholarships and minimum GPA requirements
- Campus facilities and operating hours

### Changing the Default Gemini Model
In `src/app.js` or via the in-app **Settings (⚙️)** modal, you can select:
- **Gemini 3.8 Flash** (*Recommended*): Fast, high-reasoning accuracy for academic counseling.
- **Gemini 3.1 Flash Lite**: Ultra-low latency for instant factual lookups.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` / `Cmd + K` | Start a new consultation |
| `Ctrl + B` / `Cmd + B` | Toggle sidebar navigation |
| `Enter` | Send message |
| `Shift + Enter` | Insert newline in message input |
| `Escape` | Close any open modal / dismiss mobile sidebar |

---

## 📄 License
Apache-2.0 License. Built for university research, admissions, and student services.
