# Contributing to OpenCut

Thank you for your interest in contributing to OpenCut! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Navigate to the web app directory: `cd apps/web`
4. Install dependencies: `bun install`
5. Start the development server: `bun run dev`

## Development Setup

### Prerequisites

- Node.js 18+
- Bun (latest version)
- Docker (for local database)

### Local Development

1. Start the database and Redis services:

   ```bash
   # From project root
   docker-compose up -d
   ```

2. Navigate to the web app directory:

   ```bash
   cd apps/web
   ```

3. Copy `.env.example` to `.env.local`:

   ```bash
   # Unix/Linux/Mac
   cp .env.example .env.local

   # Windows Command Prompt
   copy .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

4. Configure required environment variables in `.env.local`:

   **Required Variables for Core Features:**

   ```bash
   # FilCDN Integration (Core hackathon feature)
   NEXT_PUBLIC_FILECOIN_PRIVATE_KEY="your-filecoin-private-key"
   NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS="0xYourWalletAddress"
   
   # Zora Coins Trading
   NEXT_PUBLIC_ZORA_API_KEY="your-zora-api-key"
   ```

   **Optional Variables for Enhanced Features:**

   ```bash
   # Rate limiting (production)
   UPSTASH_REDIS_REST_URL="http://localhost:8079"
   UPSTASH_REDIS_REST_TOKEN="example_token"
   
   # AI voice generation
   ELEVENLABS_API_KEY="your-elevenlabs-key"
   
   # Development
   NODE_ENV="development"
   ```

   **Note:** This app uses Web3 wallet authentication (MetaMask, WalletConnect) - no traditional database auth needed!

5. Run database migrations: `bun run db:migrate`
6. Start the development server: `bun run dev`

## How to Contribute

### Reporting Bugs

- Use the bug report template
- Include steps to reproduce
- Provide screenshots if applicable

### Suggesting Features

- Use the feature request template
- Explain the use case
- Consider implementation details

### Code Contributions

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Navigate to the web app directory: `cd apps/web`
4. Run the linter: `bun run lint`
5. Format your code: `bunx biome format --write .`
6. Commit your changes with a descriptive message
7. Push to your fork and create a pull request

## Code Style

- We use Biome for code formatting and linting
- Run `bunx biome format --write .` from the `apps/web` directory to format code
- Run `bun run lint` from the `apps/web` directory to check for linting issues
- Follow the existing code patterns

## Pull Request Process

1. Fill out the pull request template completely
2. Link any related issues
3. Ensure CI passes
4. Request review from maintainers
5. Address any feedback

## Community

- Be respectful and inclusive
- Follow our Code of Conduct
- Help others in discussions and issues

Thank you for contributing!
