# SS Packaging

Premium packaging solutions e-commerce platform built with Next.js, Firebase, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth & Database**: Firebase (Auth, Firestore, Storage)
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **State**: Zustand (cart)
- **Toasts**: React Hot Toast

## Getting Started

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Fill in your Firebase project credentials
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

See `.env.example` for all required variables. All Firebase config values are available in your Firebase project settings.

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel project settings
4. Deploy
