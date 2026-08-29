# ReflectAI - Journal & Reflection Assistant

A user-authenticated journaling and personal reflection web application powered by **Gemini 3.6 Flash** and **Cloud Firestore**, engineered with zero-trust owner data isolation, multi-sector life categorization, multimodal media analysis, and robust server-side architecture.

---

## Architecture Overview

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Secure login via Google Sign-In with zero password storage. |
| **Backend Database** | Cloud Firestore | User-isolated document storage for saving multi-sector journal entries, media attachments, and conversation threads. |
| **AI Processing Engine** | Gemini 3.6 Flash API | Multimodal vision analysis, multi-sector classification, empathetic reflection generation, and executive summaries. |
| **Secret Management** | Secret Manager / Env Vars | Securely stores Gemini API keys and Firebase credentials without browser exposure. |

---

## 1. Threat Modeling Analysis

| Threat Zone | Identified Risk Scenario | Countermeasure & Security Defense |
| :--- | :--- | :--- |
| **Input Surfaces** | Malformed payloads, oversized entries, unsupported media types, or prompt injections. | Strict schema validation, MIME-type verification (JPEG, PNG, GIF, WebP <= 5MB; MP4, WebM <= 25MB), null-safe request deserialization, and stripping of `undefined` values. |
| **Planning & Reasoning** | Indirect prompt injections attempting to bypass system constraints via images or text. | Strict system instructions with role-bound delimiters, treating user reflection texts and vision captions strictly as passive data rather than executable instructions. |
| **Tool Execution** | API rate limits, model quota exhaustion, or client API key leakage. | Server-side Gemini proxy with `@google/genai` (never exposed to browser), resilient model fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`), and lazy initialization. |
| **Memory & State** | Cross-user data leaks, unauthorized reads/writes to reflections. | Strict Zero-Trust Firestore Security Rules (`/users/{userId}/interactions/{interactionId}`), owner-bound `request.auth.uid == userId` authorization gates. |
| **Inter-System Communication** | Token interception, unauthorized backend invocations. | Firebase ID Token verification on private endpoints, secure HTTP headers, and Secret Manager/environment variable isolation. |

---

## 2. Cloud Firestore Security Rules

Deploy the following security rules in `firestore.rules` to enforce strict owner-only read and write permissions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User interactions, reflections, and entries
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User custom categories
    match /users/{userId}/custom_categories/{categoryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User notification delivery channels & preferences
    match /users/{userId}/notification_settings/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User notification dispatch audit history logs
    match /users/{userId}/notification_logs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 3. Secret Manager & Environment Setup

Configure your `GEMINI_API_KEY` using Google Cloud Secret Manager:

```bash
# 1. Enable required Google Cloud APIs
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com

# 2. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Google Cloud Run Deployment

Deploy the containerized full-stack application to Google Cloud Run:

```bash
# Build and deploy service
gcloud run deploy reflect-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

### Verification Binding

Apply the mandatory challenge verification label to your Cloud Run service:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 5. Functional Walkthrough & Step-by-Step Test Guide

### Test Suite 1: Authentication & Zero-Trust State
- **Step 1.1 (Landing Page)**: Navigate to the app. Confirm the unauthenticated landing page loads showing "A quiet space to think, reflect, and converse with Gemini" and security guarantees.
- **Step 1.2 (Google Sign-In)**: Click "Continue with Google". Confirm the OAuth popup appears, completes successfully, and redirects to the user's private dashboard.
- **Step 1.3 (Guest Exploration)**: In sandboxed environments where popups are blocked, click "Try Instant Guest Mode" to verify anonymous Firebase Auth session creation.
- **Step 1.4 (Sign Out)**: Click the sign-out icon in the top navigation bar. Verify user state resets and the landing page is displayed.

### Test Suite 2: Multi-Sector Journal Categorization
- **Step 2.1 (Sector Overview Cards)**: View the 10 Life Sector cards at the top of the dashboard (Health 🏥, Career 💼, Finance 💰, Relationships ❤️, Personal Growth 📚, Creative 🎨, Travel 🌍, Spiritual 🧘, Home 🏠, Leisure 🎮). Verify entry count badges update dynamically.
- **Step 2.2 (Sector Filtering)**: Click on "🏥 Health & Wellness" or "💼 Career & Professional". Confirm the Recent Entries list filters down to only show matching sector items. Click "Show All Sectors" to clear filters.
- **Step 2.3 (Auto-Sector Classification)**: In the Quick Composer, type *"Ran 5km in the morning and ate a healthy salad"*. Verify the sector dropdown automatically switches to "Health & Wellness".
- **Step 2.4 (Manual Override)**: Change the sector dropdown to "Personal Growth" or "Travel". Submit the entry and confirm the manual sector selection is preserved in Firestore.

### Test Suite 3: Multimodal Media & Location Uploads
- **Step 3.1 (Image Upload & Vision Analysis)**: Click the "Photo" button in the composer. Select a JPEG/PNG/GIF/WebP file under 5MB. Observe the live preview thumbnail and Gemini Vision analysis caption.
- **Step 3.2 (Video Upload)**: Click the "Video" button. Select an MP4 or WebM video file. Confirm the video player preview renders with a remove button.
- **Step 3.3 (Location of the Moment)**: Click the "Location" button. Allow geolocation access or enter a custom place name (e.g., *"Central Park, NY"*). Confirm the location badge is saved with the entry.
- **Step 3.4 (Media Zoom Modal)**: In the Recent Entries feed, click on any media thumbnail. Verify the high-resolution media viewer modal opens with vision descriptions.

### Test Suite 4: Quick Composer & Chatbot Navigation
- **Step 4.1 (Mood Rating Slider)**: Toggle the "Mood" button in the Quick Composer. Adjust the slider from 1 to 10 (e.g., 8.0/10 - Energized).
- **Step 4.2 (New Entry Submission & Auto-Navigation)**: Write a journal thought (e.g., *"Reflecting on today's breakthrough meeting with the team"*) and click **"Save & Reflect in Chat"** (or press `Ctrl+Enter` / `Cmd+Enter`).
- **Step 4.3 (Instant Chatbot Workspace)**: Confirm the app immediately navigates to the **Reflect Chatbot** (`'workspace'`) view with the newly created entry active, displaying the user's message, attached media/location, and Gemini's thoughtful response streaming in.
- **Step 4.4 (Recent Entries Stream)**: Return to the Life Journal dashboard to verify the entry appears in the list formatted as `📍 [Location] [Title] - [Sector Badge]` | `[Time Ago]` with media thumbnails.
- **Step 4.5 (This Week's Summary)**: Inspect the "📊 This Week's Summary" widget at the bottom of the dashboard. Confirm the average mood, active days/entries frequency, and exercise goal progress bar update automatically.

### Test Suite 5: Deep Multi-Turn Reflection & Executive Summary
- **Step 5.1 (Deep Reflection Workspace)**: Click "Deep Reflect" or select any past entry from the sidebar. Converse with Gemini across multiple turns.
- **Step 5.2 (Summarize & Takeaways)**: Click the "Summarize" button in the workspace toolbar. Verify the synthesis banner renders an executive summary, bulleted key takeaways, sentiment tone badge, and categorical tags.
- **Step 5.3 (Export Markdown)**: Click the Share/Export button in the workspace toolbar. Verify the modal renders formatted Markdown with copy-to-clipboard and `.md` file download capabilities.

### Test Suite 6: Deletion & Database Management
- **Step 6.1 (Sidebar Deletion)**: Hover over an entry in the Journal History sidebar (or tap on mobile) and click the red trash icon. Confirm the in-app confirmation modal appears displaying the entry's title and sector badge.
- **Step 6.2 (Cancel Deletion)**: Click "Cancel" or press Escape. Confirm the entry remains in the list and database.
- **Step 6.3 (Confirm Deletion)**: Click "Delete Entry". Confirm the entry is removed from Firestore and UI immediately, and an info toast confirms removal.
- **Step 6.4 (Feed Deletion)**: In the Recent Entries feed on the dashboard, click the trash icon on an entry card. Confirm the in-app modal opens and deleting succeeds.
- **Step 6.5 (Workspace Toolbar Deletion)**: In an active reflection workspace, click the trash icon in the top-right toolbar. Confirm deletion redirects cleanly to the next session or dashboard.

### Test Suite 7: Contextual Data Integration (Weather, Health, Calendar & Location)
- **Step 7.1 (Live Context Sync)**: In the Quick Composer or Reflection Workspace, click the "Context" button (cloud/sun icon). Verify the Context Manager Modal displays auto-synced live weather (temperature, condition, humidity, wind) and device geolocation.
- **Step 7.2 (Health Telemetry Enrichment)**: In the Context Manager Modal, enter or adjust sleep hours (e.g. 7.5h restorative), workout type (e.g. "Morning 5km Trail Run", 380 kcal), and step counts. Click "Apply Context to Entry".
- **Step 7.3 (Calendar Schedule Context)**: Add or view scheduled calendar events (e.g. "Project Sprint Review", "Team Sync"). Save and verify the event indicators render in the workspace telemetry header.
- **Step 7.4 (Context-Grounded Gemini Reflection)**: Submit a reflection or click "Summarize". Verify that Gemini's AI response and executive takeaways acknowledge your physical activity, sleep quality, and weather environment.

### Test Suite 8: Advanced Search Filters, AI Tagging & Custom Categories
- **Step 8.1 (Custom Categories Creation)**: Click "+ Custom Categories" on the dashboard or in the category dropdown. Add a new custom category (e.g., 🚀 Side Project, 🎸 Music, 🌿 Gardening) with custom color and emoji. Confirm it saves to Firestore and appears in the sector carousel.
- **Step 8.2 (AI Auto-Tagging)**: Type a journal entry and click "Suggest Tags with AI". Verify contextual hashtags (e.g., `#productivity`, `#trailrun`, `#clarity`) are extracted and populated into the tag manager.
- **Step 8.3 (Search & Filter Query)**: In the Journal Entries feed, use the search input to search by keywords, location names, or thoughts. Confirm real-time filtering.
- **Step 8.4 (Multi-Dimension Filter Panel)**: Click "Filters" to toggle the advanced filter drawer. Test date presets (Today, Yesterday, This Week, This Month, Custom Date Range), tag chips, media filters (With Photos, With Videos, With Context, Text Only), and mood rating thresholds. Confirm active filter count badges and instant clearing.

### Test Suite 9: Email & Slack Notifications & AI Weekly Digest
- **Step 9.1 (Notification Bell & Quick Status)**: Look at the top navigation bar. Click the Notification Bell icon. Verify the quick-access status popover displays the active delivery channels (Email/Slack status badges) and recent dispatch audit logs.
- **Step 9.2 (Configure Email Channel)**: In the Notification Settings Modal (or Bell popover "Manage Channels"), click the "Email Digest" tab. Enter your recipient email address (e.g. `user@example.com`), toggle "Enable Email Delivery", and select trigger frequencies (e.g. "Weekly Digest", "Reflection Summary Generated"). Click "Save Channel Settings" and verify settings persist in Firestore.
- **Step 9.3 (Test Email Dispatch)**: Click "Send Test Email". Confirm simulated email delivery preview with HTML structure, sector badges, and key insights renders successfully and creates a log entry.
- **Step 9.4 (Configure Slack Webhook Channel)**: Switch to the "Slack Webhook" tab. Enter a test webhook URL (`https://hooks.slack.com/services/...` or any valid HTTPS URL), channel name (e.g. `#reflections`), and bot name (`ReflectAI Bot`). Toggle "Enable Slack Integration" and save.
- **Step 9.5 (Test Slack Dispatch)**: Click "Send Test Slack Alert". Confirm rich Block Kit payload structure with emoji badges, divider, and insight fields is dispatched with 200 OK.
- **Step 9.6 (Manual Sharing in Reflection Workspace)**: In any active reflection workspace with a generated summary, click the "Share to Slack" or "Email Summary" buttons located inside the Executive Summary banner. Confirm instant dispatch toast and log creation.
- **Step 9.7 (Weekly Digest Synthesis & One-Click Dispatch)**: On the dashboard's "📊 This Week's Summary" widget, click the "Send Weekly Digest" button. Observe the loader as Gemini synthesizes all reflections from the past 7 days and dispatches the digest to all configured channels.
- **Step 9.8 (Audit Logs & Clear History)**: Open the "Delivery History" tab in Notification Settings. Verify all test and automated dispatches are listed with timestamps, channel badges, and status. Click "Clear History" and confirm the log list clears in Firestore.

