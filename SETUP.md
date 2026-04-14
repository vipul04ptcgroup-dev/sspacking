# Full Setup Guide — SS Packaging

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Firebase (Firestore + Auth + Storage)
- Zustand (cart state)
- React Hook Form + Zod (validation)

## Directory Structure
app/
  page.tsx              → Home
  products/             → Product listing + category + detail
  cart/                 → Cart page
  checkout/             → Checkout
  auth/login|register/  → Auth pages
  account/orders/       → Customer account
  admin/                → Admin panel (role-protected)
    products/           → CRUD products + variants
    categories/         → CRUD categories
    orders/             → Manage orders
    users/              → View customers
    quotes/             → Quote requests

## Firebase Setup
1. console.firebase.google.com → new project
2. Enable: Authentication (Email+Google), Firestore, Storage
3. Copy config to .env.local

## Firestore Rules (paste in Firebase console)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /categories/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /users/{doc} { allow read, write: if request.auth != null; }
    match /orders/{doc} { allow read, write: if request.auth != null; }
    match /quotes/{doc} { allow create: if true; allow read, write: if request.auth != null; }
  }
}

## Deploy to Vercel
vercel --prod
(add all NEXT_PUBLIC_* env vars in Vercel dashboard)
