# Nexus Career AI

AI-powered career development platform built with Next.js 16, React 19, and TypeScript.

## Features

- Career mentoring with AI
- Roadmap generation
- Interview preparation
- Resume building
- Job market insights
- And more...

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for required environment variables:

- `NEXTAUTH_URL` - NextAuth URL (default: http://localhost:3000)
- `NEXTAUTH_SECRET` - NextAuth secret for session signing
- `GEMINI_API_KEY` - Google Generative AI API key
- `OPENROUTER_API_KEY` - OpenRouter API key (optional)
- `NVIDIA_API_KEY` - Nvidia API key (optional)

## Deployment

### Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

```bash
npm install -g vercel
vercel
```

## Technologies

- **Next.js** - React framework for production
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Google Generative AI** - AI model integration
- **NextAuth** - Authentication

## License

MIT
