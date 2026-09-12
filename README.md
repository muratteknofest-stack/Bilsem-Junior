# Educational App Platform

A production-ready EdTech application built with React, TypeScript, Vite, and Firebase.

## Setup Instructions

1. **Create a Firebase Project**: Go to the Firebase Console and create a new project.
2. **Enable Services**:
   - Authentication (Email/Password)
   - Cloud Firestore
3. **Environment Variables**:
   Create a `.env.local` file based on `.env.example`:
   \`\`\`
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   \`\`\`
4. **Install Dependencies**:
   \`\`\`
   npm install
   \`\`\`
5. **Run Locally**:
   \`\`\`
   npm run dev
   \`\`\`

## Deployment

To deploy to Firebase Hosting:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize (if not done): `firebase init`
4. Deploy rules and hosting:
   \`\`\`
   npm run build
   firebase deploy
   \`\`\`

## Features
- Real-time data sync with Firestore
- Role-based Access Control (Student, Parent, Admin)
- Secure Authentication
- Cloud-persisted XP, Points, and Streaks
