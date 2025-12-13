# Quizzer App

A modern, interactive quiz application built with Next.js 14, featuring CSV data upload, persistent cloud storage, and Google Authentication.

## 🚀 Features

*   **CSV Upload**: Instantly generate quizzes by uploading simple CSV files.
*   **Google Authentication**: Secure sign-in to save and manage your progress.
*   **Cloud Library**: Save your favorite quizzes to your personal dashboard using Neon PostgreSQL.
*   **Smart Saving**: Updates existing quizzes to prevent duplicates.
*   **Dashboard**: Manage your quiz library with options to Play or Delete quizzes.
*   **Responsive Design**: A premium, mobile-friendly UI with smooth animations and confetti effects.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Database**: [Neon](https://neon.tech/) (PostgreSQL)
*   **ORM**: Prisma
*   **Auth**: [NextAuth.js](https://authjs.dev/) (Google Provider)
*   **CSV Parsing**: PapaParse

## ⚙️ Getting Started

### Prerequisites

*   Node.js 18+ installed.
*   A Google Cloud Project (for OAuth credentials).
*   A Neon Database project (or any PostgreSQL database).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/aravind-sagar/quizzer-app.git
    cd quizzer-app/web
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # Ensure Prisma is at a stable version if needed
    npm install prisma@5 @prisma/client@5
    ```

3.  **Environment Setup**:
    Create a `.env` or `.env.local` file in the `web` directory:
    ```env
    # Database (Neon Postgres)
    DATABASE_URL="postgresql://user:password@ep-host.aws.neon.tech/neondb?sslmode=require"

    # NextAuth
    AUTH_SECRET="your-super-secret-key" # Generate with: openssl rand -base64 32

    # Google OAuth
    AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
    AUTH_GOOGLE_SECRET="your-client-secret"
    ```

4.  **Database Setup**:
    Push the schema to your database:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run the App**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Usage Guide

### 1. File Format (CSV)
To create a quiz, upload a CSV file with the following columns (headers are case-insensitive):

*   `Question`: The text of the question.
*   `Options`: Multiple-choice options separated by **semicolons** (`;`). You can include prefixes like "a.", "b.", etc.
*   `Answer`: The full text of the correct option (must match exactly one of the options).

**Example CSV:**
```csv
Question,Options,Answer
"According to Philip Kotler, marketing involves:","a. Marketing goods exclusively; b. Social and managerial processes that others value through exchange; c. Financial management","b. Social and managerial processes that others value through exchange"
What is the capital of France?,"a. Paris; b. London; c. Berlin","a. Paris"
```

### 2. 🤖 Generate Quizzes with AI
You can use ChatGPT, Claude, or Gemini to convert your study notes into a compatible CSV. Copy and paste this prompt:

**Prompt:**
> "Create a CSV file for a multiple-choice quiz based on the text below.
> The columns should be: **Question, Options, Answer**.
> - **Question**: The question text.
> - **Options**: 4 options separated by semicolons (;), labeled a. b. c. d. (e.g., "a. Option 1; b. Option 2").
> - **Answer**: The full text of the correct option (e.g., "b. Option 2").
> Ensure strictly valid CSV format, and wrap fields in quotes if they contain commas."

### 3. Playing & Saving
1.  **Upload**: Drag & drop your CSV file on the home screen.
2.  **Play**: Answer questions and get instant feedback.
3.  **Save**: Log in with Google and click **"Save to Library"** on the results screen (or sidebar).
4.  **Dashboard**: Access "My Quizzes" to see your saved collection. Click **"Play Now"** to re-take a quiz or the **Trash icon** to delete it.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
