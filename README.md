# VidSense

**AI-powered video understanding platform** - Upload any short video and get comprehensive AI analysis with follow-up Q&A.

## Overview

VidSense deeply analyzes video content using vision-language models to provide:
- Scene context (location, time of day, camera type)
- Entity detection (people, vehicles, animals, objects)
- Temporal narrative of events
- Key observations and insights
- Conversational Q&A about the video

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL 16 |
| ORM | Sequelize |
| Styling | Tailwind CSS |
| Video Processing | FFmpeg |
| AI Inference | Ollama (with vision models like Qwen2-VL) |

## Prerequisites

- Node.js 18+
- PostgreSQL 16
- FFmpeg (installed and in PATH)
- Ollama (with a vision model)
- ~100GB free disk space for video storage

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/foyzulkarim/vidsense.git
cd vidsense
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://vidsense:localdev@localhost:5432/vidsense

# Storage
UPLOAD_DIR=./data/uploads
PROCESSED_DIR=./data/processed
MAX_FILE_SIZE_MB=100
VIDEO_RETENTION_HOURS=24

# AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2-vl:7b

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Set Up Database

Using Docker (recommended):

```bash
docker-compose up -d db
```

Or manually create a PostgreSQL database:

```sql
CREATE DATABASE vidsense;
CREATE USER vidsense WITH PASSWORD 'localdev';
GRANT ALL PRIVILEGES ON DATABASE vidsense TO vidsense;
```

Run migrations:

```bash
npm run db:migrate
```

### 4. Set Up Ollama

Install Ollama and pull a vision model:

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama
ollama serve

# Pull a vision model (in another terminal)
ollama pull qwen2-vl:7b
```

### 5. Create Data Directories

```bash
mkdir -p data/uploads data/processed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
vidsense/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── health/        # Health check
│   │   │   └── videos/        # Video endpoints
│   │   ├── video/[id]/        # Video analysis page
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── features/          # Feature components
│   │   └── ui/               # UI primitives
│   ├── lib/                   # Utilities
│   │   ├── ai/               # Ollama client & prompts
│   │   ├── db/               # Sequelize models
│   │   ├── storage/          # File handling
│   │   ├── validation/       # Input validation
│   │   └── video/            # FFmpeg processing
│   ├── types/                 # TypeScript types
│   └── config/               # Configuration
├── scripts/                   # Utility scripts
├── data/                      # Local storage (gitignored)
└── docker-compose.yml         # Docker services
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload a video file |
| GET | `/api/videos/:id` | Get video status |
| GET | `/api/videos/:id/stream` | Stream video for playback |
| GET | `/api/videos/:id/analysis` | Get AI analysis results |
| POST | `/api/videos/:id/analysis` | Trigger analysis |
| POST | `/api/videos/:id/chat` | Send chat message |
| GET | `/api/videos/:id/chat/history` | Get chat history |
| DELETE | `/api/videos/:id/chat/history` | Clear chat history |
| GET | `/api/health` | Health check |

## Video Processing Pipeline

1. **Upload** - Accept multipart upload, validate file type/size
2. **Convert** - FFmpeg converts to WebM (VP9)
3. **Extract** - Extract frames at 1fps with scene detection
4. **Analyze** - Vision model analyzes frames
5. **Ready** - Results stored, available for Q&A

## Configuration

### Video Constraints

| Constraint | Default |
|------------|---------|
| Max duration | 60 seconds |
| Max file size | 100MB |
| Retention | 24 hours |
| Supported formats | MP4, MOV, AVI, MKV, WebM, M4V |

### AI Models

Recommended models for Ollama:
- `qwen2-vl:7b` - Best balance of capability and speed
- `llava:7b` - Alternative vision model
- `phi3.5-vision` - Smaller, faster option

## Development

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run migrations
npm run cleanup      # Run expired video cleanup
```

### Database Migrations

```bash
# Create migration
npx sequelize-cli migration:generate --name migration-name

# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo
```

### Cleanup Job

Run manually:
```bash
npm run cleanup
```

Run as daemon (hourly):
```bash
node scripts/cleanup.js --daemon
```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run with PM2 or similar:
   ```bash
   pm2 start npm --name "vidsense" -- start
   ```

4. Set up reverse proxy (Caddy/nginx) for HTTPS

5. Configure cleanup job as cron:
   ```cron
   0 * * * * cd /path/to/vidsense && npm run cleanup
   ```

## Privacy

- Videos automatically deleted after 24 hours
- No user accounts or authentication
- No data shared with third parties
- All processing happens locally

## License

MIT

## Author

Built by [Foyzul Karim](https://github.com/foyzulkarim)
