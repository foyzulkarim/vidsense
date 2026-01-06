# Video Intelligence Platform: Requirements & Architecture Plan

**Document Version:** 1.0  
**Created:** January 2025  
**Author:** Foyzul Karim  
**Status:** Planning Phase

---

## Executive Summary

### Product Vision

**One-liner:** Upload any video under 60 seconds, and AI will deeply understand what happened—then answer any questions you have about it.

### Core USP

Unlike basic video captioning that says "a person walks," this platform builds a comprehensive understanding of the entire video narrative, identifies all actors and objects, tracks their interactions across time, and can engage in meaningful follow-up conversation about what it observed.

### Target "Wow" Moment

User uploads a 30-second doorbell camera clip. The AI responds with:

> "This video shows a delivery sequence at a residential front door. A FedEx delivery driver (male, wearing purple/orange uniform) arrives at 0:04 carrying a medium brown cardboard box. He approaches the door, looks for a doorbell, and rings it at 0:12. After waiting approximately 8 seconds with no response, he places the package on the left side of the doormat, takes a photo with his handheld device (likely for delivery confirmation), and returns to his vehicle which is partially visible at the edge of frame. The homeowner's black cat is visible watching through the window throughout the interaction. Weather appears overcast, and the timestamp suggests late afternoon."

Then the user can ask: "Did anyone else appear in the video?" or "What did he do with his phone?" and get contextually accurate answers.

### Strategic Purpose

- **Primary:** Portfolio showcase demonstrating state-of-the-art AI video understanding
- **Secondary:** Foundation/brain for future commercial surveillance and dashcam products
- **Tertiary:** Practice project aligned with Domain Group tech stack (TypeScript, Next.js, PostgreSQL, Sequelize)

### Key Constraints

| Constraint | Specification |
|------------|---------------|
| Video duration | ≤ 60 seconds |
| Authentication | None (public access) |
| Data retention | 24 hours auto-delete |
| Infrastructure | Self-hosted on personal hardware |
| Budget | Zero operational cost (own hardware) |

---

## Part 1: Understanding Depth — The "Wow Factor"

The difference between mediocre and impressive video understanding comes down to **depth of analysis**. Most demos do single-pass captioning. This platform delivers multi-layered understanding.

### Layer 1: Scene Context

- Location type (residential, commercial, street, parking lot)
- Time of day estimation (lighting analysis)
- Weather conditions if visible
- Camera perspective (doorbell, mounted, dashcam, handheld)

### Layer 2: Entity Identification

- All people with descriptions (clothing, approximate age, gender presentation, distinguishing features)
- All vehicles with details (color, type, make if identifiable, license plate region if visible)
- Animals and their species/breed if identifiable
- Objects of significance (packages, bags, tools, weapons)

### Layer 3: Temporal Narrative

- Sequence of events in chronological order
- Duration and timing of key moments
- Entry and exit points of entities
- State changes (door opens, light turns on, object moves)

### Layer 4: Interaction Analysis

- Person-to-person interactions
- Person-to-object interactions
- Cause-and-effect relationships
- Intent inference where reasonable

### Layer 5: Anomaly & Significance Detection

- What's unusual or noteworthy
- Security-relevant observations
- Potential concerns or points of interest

### Layer 6: Confidence & Uncertainty

- What the AI is confident about
- What's ambiguous or unclear
- What's outside the frame but implied

This layered approach creates the "wow" because users aren't used to AI that demonstrates genuine comprehension rather than surface-level description.

---

## Part 2: Video Processing Pipeline

### Stage 1: Video Ingestion

| Requirement | Specification |
|-------------|---------------|
| Max duration | 60 seconds |
| Max file size | 100MB (reasonable for 1080p/60s) |
| Accepted formats | MP4, MOV, AVI, MKV, WebM, M4V |
| Output format | WebM (VP9) for processing consistency |
| Resolution handling | Normalize to 720p for processing, preserve original for playback |

### Stage 2: Frame Extraction Strategy

For deep understanding, intelligent frame sampling rather than uniform extraction:

| Extraction Method | Frames | Purpose |
|-------------------|--------|---------|
| Uniform sampling | 1 fps (60 frames max) | Baseline coverage |
| Scene change detection | Variable | Capture transitions and new content |
| Motion peak detection | Variable | Capture key action moments |
| First/last frames | 2 | Establish start and end state |

**Target:** 30-60 high-value frames per video rather than processing every frame. This balances comprehension depth with processing time.

### Stage 3: Audio Extraction (Optional Enhancement)

If the video has audio:

- Extract audio track
- Run speech-to-text (Whisper)
- Include transcript in understanding context
- Note non-speech audio events (doorbell, car horn, dog barking)

### Stage 4: Pre-processing Enrichment

Before the main vision model:

- Face detection (count, positions—not identification for privacy)
- Object detection pass (YOLO) for entity inventory
- OCR on any visible text (signs, license plates, packages)
- Motion heatmap generation

This pre-processing creates structured data that enriches the main understanding pass.

---

## Part 3: AI Model Architecture

### Primary Understanding Model Options

For the "wow factor" with local inference:

| Model | Parameters | VRAM Required | Strengths |
|-------|------------|---------------|-----------|
| **Qwen2.5-VL-7B** | 7B | ~16GB | Latest iteration, excellent video understanding, strong reasoning |
| **Qwen2-VL-7B** | 7B | ~16GB | Proven capability, MLX support available |
| **InternVL2-8B** | 8B | ~18GB | Strong on detailed description |
| **LLaVA-Video-7B** | 7B | ~16GB | Purpose-built for video |
| **Phi-3.5-Vision** | 4B | ~10GB | Smaller, good for RTX 3060 with limited VRAM |

**Primary Recommendation:** **Qwen2.5-VL-7B**

- Best balance of capability and resource requirements
- Active development and community support
- Quantized versions (AWQ/GPTQ 4-bit) run on RTX 3060 (12GB VRAM)
- MLX ports available for M4 Pro

**Fallback for RTX 3060:** Phi-3.5-Vision or 4-bit quantized Qwen2-VL

### Multi-Pass Analysis Strategy

To achieve deep understanding, run multiple analysis passes:

| Pass | Purpose | Input | Output |
|------|---------|-------|--------|
| Pass 1: Inventory | Identify all entities | Sampled frames | Entity list with descriptions |
| Pass 2: Narrative | Understand sequence of events | Frames + entity list | Chronological event summary |
| Pass 3: Deep Analysis | Extract insights and significance | Frames + narrative | Layered understanding document |
| Pass 4: Synthesis | Create coherent summary | All previous outputs | Final comprehensive analysis |

This multi-pass approach means the model reviews the video multiple times with different analytical lenses, building understanding iteratively.

### Follow-up Conversation Strategy

**Option A: Same vision model with context (Recommended)**

Feed the original frames plus the generated understanding plus the user's question. The model can reference both its analysis and the visual content.

**Option B: Text-only model with understanding context (Fallback)**

Use a faster text model (Llama 3.1 8B, Qwen2.5 7B) that receives only the comprehensive understanding document. Faster responses, but can't re-examine visuals.

**Implementation:** Use Option A for accuracy, with Option B as fallback if the user's question is clearly answerable from the existing analysis.

---

## Part 4: Data Model & Persistence

### Database Schema (PostgreSQL with Sequelize)

#### Table: videos

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    webm_path VARCHAR(500),
    duration_seconds FLOAT,
    resolution VARCHAR(20),
    has_audio BOOLEAN DEFAULT false,
    file_size_bytes INTEGER,
    status VARCHAR(20) DEFAULT 'uploading',
    -- status: uploading, converting, processing, ready, error, deleted
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

#### Table: video_analysis

```sql
CREATE TABLE video_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    frame_count INTEGER,
    entities_json JSONB,
    narrative_json JSONB,
    transcript TEXT,
    comprehensive_summary TEXT,
    raw_model_outputs JSONB,
    processing_time_ms INTEGER,
    model_version VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: conversations

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Sequelize Model Definitions

```typescript
// models/Video.ts
interface VideoAttributes {
  id: string;
  originalFilename: string;
  filePath: string;
  webmPath?: string;
  durationSeconds?: number;
  resolution?: string;
  hasAudio: boolean;
  fileSizeBytes?: number;
  status: 'uploading' | 'converting' | 'processing' | 'ready' | 'error' | 'deleted';
  createdAt: Date;
  expiresAt: Date;
  deletedAt?: Date;
}

// models/VideoAnalysis.ts
interface VideoAnalysisAttributes {
  id: string;
  videoId: string;
  frameCount: number;
  entitiesJson: object;
  narrativeJson: object;
  transcript?: string;
  comprehensiveSummary: string;
  rawModelOutputs: object;
  processingTimeMs: number;
  modelVersion: string;
  createdAt: Date;
}

// models/Conversation.ts
interface ConversationAttributes {
  id: string;
  videoId: string;
  createdAt: Date;
}

// models/Message.ts
interface MessageAttributes {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
```

### Browser Local Storage Schema

```typescript
interface LocalSession {
  videoId: string;
  uploadedAt: string; // ISO timestamp
  status: string;
}

interface LocalStorageSchema {
  vidiq_sessions: {
    [videoId: string]: LocalSession;
  };
}
```

When user returns, check localStorage for session IDs, then verify against backend if video still exists (within 24hr window).

### Cleanup Job

Scheduled task (cron or node-cron) runs hourly:

1. Find all videos where `expires_at < NOW()` and `deleted_at IS NULL`
2. Delete physical files (original + webm + extracted frames)
3. Delete associated analysis, conversations, messages (cascade)
4. Set `deleted_at = NOW()` or hard delete the record

```typescript
// Example cleanup query
const expiredVideos = await Video.findAll({
  where: {
    expiresAt: { [Op.lt]: new Date() },
    deletedAt: null
  }
});
```

---

## Part 5: API Design

### RESTful Endpoints

```
POST   /api/videos/upload
       - Accepts multipart file upload
       - Validates: file type, size, duration
       - Returns: { videoId, status: "uploading" }

GET    /api/videos/:id
       - Returns video metadata and status
       - Returns: { videoId, status, duration, expiresAt, ... }

GET    /api/videos/:id/stream
       - Returns video file for playback
       - Content-Type: video/webm
       
GET    /api/videos/:id/analysis
       - Returns comprehensive analysis once processing complete
       - Returns: { summary, entities, narrative, transcript? }

POST   /api/videos/:id/chat
       - Body: { message: "user question" }
       - Returns: { response: "AI answer", messageId }

GET    /api/videos/:id/chat/history
       - Returns conversation history for the video
       - Returns: { messages: [...] }

GET    /api/health
       - System health check
       - Returns: { status, gpuAvailable, queueDepth }
```

### Request/Response Types

```typescript
// POST /api/videos/upload
interface UploadResponse {
  videoId: string;
  status: 'uploading';
}

// GET /api/videos/:id
interface VideoStatusResponse {
  videoId: string;
  status: 'uploading' | 'converting' | 'processing' | 'ready' | 'error';
  duration?: number;
  expiresAt: string;
  processingStage?: string;
  processingProgress?: number; // 0-100
  error?: string;
}

// GET /api/videos/:id/analysis
interface AnalysisResponse {
  videoId: string;
  summary: string;
  entities: {
    people: EntityDescription[];
    vehicles: EntityDescription[];
    animals: EntityDescription[];
    objects: EntityDescription[];
  };
  narrative: NarrativeEvent[];
  transcript?: string;
  sceneContext: {
    locationType: string;
    timeOfDay: string;
    weather?: string;
    cameraType: string;
  };
  keyObservations: string[];
  processingTimeMs: number;
}

// POST /api/videos/:id/chat
interface ChatRequest {
  message: string;
}

interface ChatResponse {
  messageId: string;
  response: string;
}
```

### Processing Flow

```
1. User uploads video
   └── API returns videoId immediately
   
2. Backend queues video for processing
   └── Status: "uploading" → "converting"
   
3. FFmpeg converts to WebM
   └── Status: "converting" → "processing"
   
4. Frame extraction runs
   └── Progress: 10%
   
5. Pre-processing (YOLO, OCR)
   └── Progress: 25%
   
6. Multi-pass AI analysis
   └── Progress: 30% → 80%
   
7. Synthesis and storage
   └── Progress: 80% → 100%
   └── Status: "processing" → "ready"
   
8. Frontend fetches analysis
   └── User sees comprehensive results
   
9. User can chat with follow-up questions
   └── Each question hits /api/videos/:id/chat
```

### WebSocket Alternative (Optional Enhancement)

For better UX during processing:

```typescript
// Client connects to: ws://host/api/videos/:id/progress

// Server pushes progress updates:
interface ProgressUpdate {
  stage: 'uploading' | 'converting' | 'extracting' | 'analyzing' | 'synthesizing' | 'complete';
  progress: number; // 0-1
  message?: string;
  analysis?: AnalysisResponse; // Only when stage === 'complete'
}
```

---

## Part 6: UI/UX Requirements

### Page 1: Landing / Upload

**Layout:**
- Clean, minimal design—the video understanding is the star
- Drag-and-drop zone prominently displayed (center of page)
- Clear constraints shown: "Videos up to 60 seconds, any format"
- Example thumbnails showing "what kind of videos work well"
- "Try with sample video" button for visitors who don't have a video ready

**Copy/Messaging:**
- Headline: "See What AI Really Sees"
- Subhead: "Upload any short video. Get comprehensive AI understanding in minutes."
- Trust signal: "Your video is automatically deleted after 24 hours"

**Components:**
- `<UploadDropzone />` — Drag-drop or click to browse
- `<SampleVideos />` — 3-4 thumbnail cards with sample videos
- `<FeatureHighlights />` — Brief explanation of capabilities

### Page 2: Processing

**Layout:**
- Video thumbnail/preview visible (static frame)
- Progress indicator with stages
- Estimated time remaining if calculable
- Privacy notice about auto-deletion

**Progress Stages:**
1. "Uploading..." (progress bar based on upload %)
2. "Converting video..." 
3. "Extracting key frames..."
4. "Analyzing content..." (longest stage)
5. "Generating insights..."
6. "Ready!"

**Components:**
- `<VideoPreview />` — Thumbnail from first frame
- `<ProcessingProgress />` — Stage indicator + progress bar
- `<TimeEstimate />` — "About 2 minutes remaining"
- `<CancelButton />` — Allow user to abandon

### Page 3: Analysis & Chat

**Layout (Desktop):**
```
┌─────────────────────────────────────────────────────────┐
│  [Video Player]              │  [Analysis Panel]        │
│                              │  ┌─────────────────────┐ │
│  ┌────────────────────────┐  │  │ Scene Context       │ │
│  │                        │  │  │ └─ Location: ...    │ │
│  │                        │  │  │ └─ Time: ...        │ │
│  │       Video            │  │  ├─────────────────────┤ │
│  │                        │  │  │ Entities            │ │
│  │                        │  │  │ └─ People (2)       │ │
│  └────────────────────────┘  │  │ └─ Vehicles (1)     │ │
│                              │  ├─────────────────────┤ │
│                              │  │ What Happened       │ │
│                              │  │ (narrative)         │ │
│                              │  ├─────────────────────┤ │
│                              │  │ Key Observations    │ │
│                              │  └─────────────────────┘ │
├──────────────────────────────┴──────────────────────────┤
│  [Chat Interface]                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ AI: Feel free to ask any questions about the video │ │
│  │ You: Did anyone touch the package after delivery?  │ │
│  │ AI: No, after the delivery driver placed the...    │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ [Ask anything about this video...]        [Send]   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Layout (Mobile):**
- Stacked: Video → Analysis (collapsible sections) → Chat
- Video player fixed at top during scroll (optional)
- Chat input fixed at bottom

**Components:**
- `<VideoPlayer />` — HTML5 video with controls
- `<AnalysisPanel />` — Structured, expandable sections
- `<EntityList />` — Expandable entity cards with descriptions
- `<NarrativeTimeline />` — Chronological event list
- `<ChatInterface />` — Message list + input
- `<ShareButton />` — Copy URL with videoId
- `<UploadAnother />` — Start over button

### Design System Notes

**Typography:**
- Clean sans-serif (Inter, system-ui)
- Analysis text should be highly readable (16px+)
- Code-like styling for technical details

**Colors:**
- Minimal palette
- Dark mode support (surveillance footage often viewed in low light)
- Accent color for interactive elements

**Accessibility:**
- Alt text for video thumbnails
- Keyboard navigation for chat
- Screen reader compatible analysis output
- Focus indicators on all interactive elements

---

## Part 7: Infrastructure Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Machine                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Next.js    │  │  PostgreSQL  │  │   AI Inference   │  │
│  │   App        │  │  (Docker)    │  │   Server         │  │
│  │   Port 3000  │  │  Port 5432   │  │   (Ollama)       │  │
│  │              │  │              │  │   Port 11434     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                │                    │             │
│         └────────────────┴────────────────────┘             │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Local File Storage                       │   │
│  │   /uploads (original) │ /processed (webm + frames)   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  M4 Pro: MLX inference    │    RTX 3060: CUDA inference    │
└─────────────────────────────────────────────────────────────┘
```

### Production Deployment (Self-hosted)

| Component | Recommendation |
|-----------|----------------|
| Application Server | Mac Mini M4 Pro (primary) |
| GPU Inference | RTX 3060 machine (dedicated inference server) |
| Database | PostgreSQL on same machine or separate container |
| Reverse Proxy | Caddy (automatic HTTPS) or nginx |
| Domain | Custom domain pointed at home IP or Cloudflare Tunnel |
| Storage | Local SSD, minimum 100GB for video buffer |

### Network Architecture (Production)

```
Internet
    │
    ▼
┌─────────────┐
│  Cloudflare │  (Optional: DDoS protection, caching)
│  or Direct  │
└─────────────┘
    │
    ▼
┌─────────────┐
│   Caddy     │  Reverse proxy, auto HTTPS
│   :443      │
└─────────────┘
    │
    ├──────────────────────┐
    ▼                      ▼
┌─────────────┐      ┌─────────────┐
│  Next.js    │      │  Static     │
│  App        │      │  Files      │
│  :3000      │      │  (videos)   │
└─────────────┘      └─────────────┘
    │
    ├──────────────────────┐
    ▼                      ▼
┌─────────────┐      ┌─────────────┐
│ PostgreSQL  │      │  Ollama     │
│  :5432      │      │  :11434     │
└─────────────┘      └─────────────┘
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vidiq
      POSTGRES_USER: vidiq
      POSTGRES_PASSWORD: localdev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  postgres_data:
  ollama_data:
```

### Inference Server Communication

```typescript
// Example: Calling Ollama API
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen2-vl:7b',
    prompt: analysisPrompt,
    images: base64Frames,
    stream: false
  })
});
```

### Queue Management

Since only one video can be processed at a time on the GPU:

```typescript
// Simple database-backed queue
interface ProcessingJob {
  id: string;
  videoId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Worker loop
async function processQueue() {
  while (true) {
    const job = await getNextPendingJob();
    if (job) {
      await processVideo(job);
    } else {
      await sleep(1000); // Poll interval
    }
  }
}
```

---

## Part 8: Processing Time Estimates

Based on a 60-second video with ~60 extracted frames:

| Stage | Estimated Time | Notes |
|-------|----------------|-------|
| Upload (100MB) | 5-30 seconds | Depends on user connection |
| Format conversion | 5-10 seconds | FFmpeg to WebM |
| Frame extraction | 3-5 seconds | Scene detection + uniform sampling |
| Pre-processing (YOLO, OCR) | 10-20 seconds | Can run in parallel |
| Pass 1: Inventory | 30-45 seconds | Vision model on all frames |
| Pass 2: Narrative | 30-45 seconds | Vision model second pass |
| Pass 3: Deep analysis | 20-30 seconds | Vision model with context |
| Pass 4: Synthesis | 10-15 seconds | Text generation |
| **Total** | **2-3 minutes** | For comprehensive analysis |

### Optimization Opportunities

| Optimization | Impact | Complexity |
|--------------|--------|------------|
| Batch frame processing | 30-40% faster | Medium |
| Reduce to 2 passes | 40% faster, less depth | Low |
| Cache model in VRAM | Avoid reload latency | Low |
| 4-bit quantization (AWQ) | 2x+ inference speed | Low |
| Parallel pre-processing | 10-15% faster | Medium |

### User Experience Note

2-3 minutes is acceptable for a demo/portfolio piece when the output is genuinely impressive. The key is keeping users informed of progress throughout.

---

## Part 9: Development Phases

### Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Next.js project setup with TypeScript (App Router)
- [ ] PostgreSQL connection with Sequelize
- [ ] Define all database models
- [ ] File upload endpoint with validation
  - [ ] File type validation
  - [ ] File size limit (100MB)
  - [ ] Duration check (after conversion)
- [ ] Video storage structure (`/uploads`, `/processed`)
- [ ] FFmpeg integration for WebM conversion
- [ ] Basic frame extraction (1fps uniform sampling)
- [ ] Cleanup job (hourly cron)

**Frontend:**
- [ ] Landing page with upload dropzone
- [ ] Upload progress indicator
- [ ] Processing status page (polling)
- [ ] Basic video player

**DevOps:**
- [ ] Docker Compose for local development
- [ ] Environment configuration
- [ ] Basic logging

### Phase 2: AI Integration (Week 3-4)

**Inference Setup:**
- [ ] Ollama installation and configuration
- [ ] Model selection and download (Qwen2-VL or similar)
- [ ] Inference API wrapper/client

**Single-Pass Analysis:**
- [ ] Frame-to-base64 conversion
- [ ] Prompt engineering for video understanding
- [ ] API route for triggering analysis
- [ ] Analysis result storage

**Frontend:**
- [ ] Analysis display component
- [ ] Structured output rendering
- [ ] Loading states during analysis

**Error Handling:**
- [ ] Retry logic for inference failures
- [ ] Timeout handling
- [ ] User-friendly error messages

### Phase 3: Deep Understanding (Week 5-6)

**Multi-Pass Implementation:**
- [ ] Pass 1: Entity inventory extraction
- [ ] Pass 2: Temporal narrative construction
- [ ] Pass 3: Deep analysis with context
- [ ] Pass 4: Synthesis and summary generation
- [ ] Pass orchestration logic

**Enhanced Frame Selection:**
- [ ] Scene change detection (FFmpeg or OpenCV)
- [ ] Motion-based keyframe selection
- [ ] Frame deduplication

**Pre-processing Enrichment:**
- [ ] YOLO integration for object detection
- [ ] OCR integration for text extraction
- [ ] Audio extraction and Whisper transcription

**Frontend:**
- [ ] Layered analysis display
- [ ] Expandable sections for each layer
- [ ] Entity cards with details
- [ ] Narrative timeline view

### Phase 4: Conversational Q&A (Week 7-8)

**Chat Backend:**
- [ ] Conversation model implementation
- [ ] Message storage
- [ ] Chat API endpoint
- [ ] Context injection (analysis + conversation history + question)
- [ ] Vision model integration for follow-up questions

**Chat Frontend:**
- [ ] Chat interface component
- [ ] Message list with user/assistant styling
- [ ] Input field with send button
- [ ] Typing indicator during AI response
- [ ] Auto-scroll to latest message

**Session Persistence:**
- [ ] LocalStorage session management
- [ ] Session restoration on page load
- [ ] Expired session handling

### Phase 5: Polish & Launch (Week 9-10)

**Landing Page:**
- [ ] Final design implementation
- [ ] Sample videos (3-4 curated examples)
- [ ] Feature highlights section
- [ ] Mobile responsive design

**User Experience:**
- [ ] WebSocket progress updates (or optimized polling)
- [ ] Smooth transitions between states
- [ ] Error state designs
- [ ] Empty state designs
- [ ] 404 / expired video handling

**Performance:**
- [ ] Response time optimization
- [ ] Bundle size optimization
- [ ] Image/asset optimization
- [ ] Caching strategy

**Testing:**
- [ ] API endpoint testing
- [ ] Upload flow testing with various formats
- [ ] Edge case handling (corrupt files, very short videos)
- [ ] Mobile browser testing

**Documentation:**
- [ ] README with setup instructions
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Environment variable reference

**Deployment:**
- [ ] Production build configuration
- [ ] Reverse proxy setup (Caddy)
- [ ] Domain and SSL configuration
- [ ] Monitoring/logging setup

**Launch:**
- [ ] Social media announcement
- [ ] Reddit posts (r/selfhosted, r/homeassistant, r/MachineLearning)
- [ ] YouTube demo video

---

## Part 10: Technology Stack Summary

### Core Application

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14+ (App Router) | Full-stack, TypeScript native, aligns with work stack |
| Language | TypeScript | Type safety, aligns with work stack |
| Database | PostgreSQL 16 | Robust, JSONB support for analysis data |
| ORM | Sequelize | Aligns with work stack, mature ecosystem |
| Styling | Tailwind CSS | Rapid development, utility-first |
| Video Processing | FFmpeg | Industry standard, handles all formats |

### AI/ML Layer

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Inference Server | Ollama | Easy setup, good model support |
| Primary Model | Qwen2.5-VL-7B | Best open-weight video understanding |
| Fallback Model | Phi-3.5-Vision | Smaller, fits RTX 3060 comfortably |
| Object Detection | YOLOv8/YOLO11 | Fast, accurate, pre-processing |
| OCR | Tesseract or EasyOCR | Text extraction from frames |
| Speech-to-Text | Whisper (base/small) | Audio transcription |

### Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Containerization | Docker + Docker Compose | Consistent environments |
| Reverse Proxy | Caddy | Automatic HTTPS, simple config |
| Process Manager | PM2 or systemd | Production reliability |
| File Storage | Local SSD | Simplicity, performance |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Jest or Vitest | Testing |

---

## Part 11: Success Metrics

### Technical Demonstration Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis depth | Multi-layered, comprehensive | Qualitative review |
| Entity accuracy | >90% correct identification | Manual validation |
| Narrative coherence | Logical, chronological, accurate | Qualitative review |
| Q&A relevance | Answers demonstrate understanding | Manual validation |
| Processing time | <3 minutes for 60s video | Automated logging |

### Portfolio Value Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| GitHub stars | 100+ in first 3 months | Indicator of interest |
| Social engagement | Posts reach 10K+ impressions | LinkedIn, Twitter, Reddit |
| Inbound inquiries | 5+ relevant contacts | Business/job opportunities |
| Demo conversations | Memorable in interviews | Qualitative |

### System Health Metrics

| Metric | Target | Alerting |
|--------|--------|----------|
| Uptime | >99% | Notify if down >5 min |
| Error rate | <5% of uploads | Notify if >10% |
| Processing success | >95% | Notify if <90% |
| Storage usage | <80% capacity | Notify at 70%, 80%, 90% |

---

## Part 12: Future Expansion Hooks

Design decisions that enable future growth without major refactoring:

### For Commercial Surveillance Product

- [ ] Abstract video source interface (file upload → RTSP/ONVIF)
- [ ] Event-triggered processing hooks
- [ ] Alert generation framework
- [ ] Multi-camera correlation data model
- [ ] Retention policy configuration

### For Dashcam Product

- [ ] Batch upload support
- [ ] GPS metadata extraction
- [ ] Incident severity scoring
- [ ] Report generation templates

### For API Product

- [ ] Authentication middleware (easily enabled)
- [ ] Rate limiting infrastructure
- [ ] Usage metering hooks
- [ ] Webhook notification system
- [ ] API versioning strategy

### For Multi-tenant SaaS

- [ ] Tenant isolation patterns
- [ ] Per-tenant configuration
- [ ] Billing integration points
- [ ] Admin dashboard hooks

---

## Appendix A: Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://vidiq:localdev@localhost:5432/vidiq
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vidiq
DB_USER=vidiq
DB_PASSWORD=localdev

# Storage
UPLOAD_DIR=/data/uploads
PROCESSED_DIR=/data/processed
MAX_FILE_SIZE_MB=100
VIDEO_RETENTION_HOURS=24

# AI Inference
OLLAMA_HOST=http://localhost:11434
PRIMARY_MODEL=qwen2-vl:7b
FALLBACK_MODEL=phi3.5-vision

# Optional: External Services
WHISPER_MODEL=base
YOLO_MODEL=yolov8n
```

---

## Appendix B: Sample Analysis Output Structure

```json
{
  "videoId": "abc-123-uuid",
  "processingTimeMs": 145000,
  "modelVersion": "qwen2-vl:7b",
  
  "sceneContext": {
    "locationType": "residential_entrance",
    "cameraType": "doorbell_camera",
    "timeOfDay": "afternoon",
    "weather": "overcast",
    "lightingConditions": "natural_daylight"
  },
  
  "entities": {
    "people": [
      {
        "id": "person_1",
        "description": "Adult male, approximately 30-40 years old",
        "clothing": "Purple and orange uniform (FedEx), dark pants, work boots",
        "accessories": "Handheld scanning device, brown cardboard box",
        "role": "Delivery driver",
        "firstAppearance": "0:04",
        "lastAppearance": "0:28"
      }
    ],
    "vehicles": [
      {
        "id": "vehicle_1",
        "type": "delivery_van",
        "description": "White delivery van with purple/orange FedEx branding",
        "visibility": "partial (edge of frame)",
        "position": "street, left side"
      }
    ],
    "animals": [
      {
        "id": "animal_1",
        "species": "cat",
        "description": "Black domestic cat",
        "location": "visible through front window",
        "behavior": "watching scene"
      }
    ],
    "objects": [
      {
        "id": "object_1",
        "type": "package",
        "description": "Medium brown cardboard box, approximately 12x10x8 inches",
        "finalLocation": "front doormat, left side"
      }
    ]
  },
  
  "narrative": [
    {
      "timestamp": "0:00-0:03",
      "event": "Scene establishes residential front porch, no activity"
    },
    {
      "timestamp": "0:04",
      "event": "Delivery driver enters frame from left, carrying package"
    },
    {
      "timestamp": "0:05-0:11",
      "event": "Driver approaches front door, examines doorbell location"
    },
    {
      "timestamp": "0:12",
      "event": "Driver rings doorbell"
    },
    {
      "timestamp": "0:13-0:20",
      "event": "Driver waits for response, no answer"
    },
    {
      "timestamp": "0:21-0:23",
      "event": "Driver places package on doormat"
    },
    {
      "timestamp": "0:24-0:26",
      "event": "Driver photographs package with handheld device"
    },
    {
      "timestamp": "0:27-0:30",
      "event": "Driver exits frame, returns toward vehicle"
    }
  ],
  
  "keyObservations": [
    "Successful package delivery with photo confirmation",
    "No direct human interaction (homeowner not present)",
    "Cat observed watching from window throughout delivery",
    "Standard delivery protocol followed"
  ],
  
  "comprehensiveSummary": "This video captures a routine FedEx package delivery at a residential home. A delivery driver arrives at approximately 0:04 carrying a medium-sized cardboard box. He approaches the front door and rings the doorbell at 0:12. After waiting approximately 8 seconds with no response, he places the package on the left side of the doormat and takes a photo with his handheld device for delivery confirmation. The driver then returns to his vehicle, which is partially visible at the edge of the frame. Throughout the interaction, a black cat can be seen watching from inside the home through the front window. The weather appears overcast with natural afternoon lighting. The entire delivery process takes approximately 26 seconds from the driver's arrival to departure."
}
```

---

## Appendix C: Prompt Engineering Templates

### Pass 1: Entity Inventory

```
You are analyzing surveillance/security camera footage. Examine these frames from a video and identify ALL entities present.

For each entity, provide:
- Type (person, vehicle, animal, object)
- Detailed description
- Distinguishing features
- When they appear/disappear (if determinable)

Be thorough - list everything visible that could be relevant for security or understanding the scene.

Frames are provided in chronological order.
```

### Pass 2: Temporal Narrative

```
You are analyzing surveillance footage. Using the entity list provided and these video frames, construct a detailed chronological narrative of what happens.

Known entities:
{entities_json}

For each significant moment:
- Approximate timestamp or frame reference
- What action occurs
- Who/what is involved
- Any cause-and-effect relationships

Focus on ACTIONS and CHANGES, not static descriptions.
```

### Pass 3: Deep Analysis

```
You are a security analyst reviewing surveillance footage. Given the narrative and frames, provide deeper analysis:

Narrative:
{narrative_json}

Analyze:
1. Scene context (location type, time of day, conditions)
2. Intent and purpose of observed actions
3. Anything unusual or noteworthy
4. Security-relevant observations
5. What might be happening outside the frame
6. Confidence levels for your assessments

Be analytical, not just descriptive.
```

### Pass 4: Synthesis

```
Synthesize all analysis into a comprehensive, readable summary suitable for a human reviewer.

Scene Context:
{scene_context}

Entities:
{entities}

Narrative:
{narrative}

Deep Analysis:
{deep_analysis}

Write a coherent 2-3 paragraph summary that tells the complete story of what happened in this video. Be specific with details but maintain readability. This should give someone who hasn't seen the video a complete understanding of what occurred.
```

### Follow-up Q&A

```
You are answering questions about a video you have analyzed. Use your comprehensive analysis and the video frames to answer accurately.

Video Analysis:
{comprehensive_analysis}

Conversation History:
{chat_history}

User Question: {question}

Answer based on what you observed. If the answer isn't determinable from the video, say so. Be specific and reference details from the video when relevant.
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial comprehensive plan |

---

*This document serves as the complete requirements and architecture reference for the Video Intelligence Platform project.*
