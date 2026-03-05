"use client";

import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import confetti from "canvas-confetti";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  FaFileCsv,
  FaCloudUploadAlt as FaCloudArrowUp,
  FaLayerGroup,
  FaFlagCheckered,
  FaChevronLeft,
  FaChevronRight,
  FaTimes as FaXmark,
  FaTrophy,
  FaRedo as FaRotateRight,
  FaGoogle,
  FaSave,
  FaList,
  FaPlay,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle as FaCircleExclamation,
  FaBars,
  FaPlus,
  FaDownload,
  FaShareAlt,
  FaLock,
  FaGlobe,
  FaUsers,
  FaCopy,
  FaPencilAlt,
} from "react-icons/fa";
import { Modal, ModalConfig } from "./Modal";

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  userIndex: number | null;
  isCorrect: boolean;
};

type BuilderQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
};

type AppState = "upload" | "quiz" | "results";
type ViewState = "home" | "dashboard" | "builder";

export default function QuizApp() {
  const { data: session } = useSession();
  const [appState, setAppState] = useState<AppState>("upload");
  const [viewState, setViewState] = useState<ViewState>("home");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [quizTitle, setQuizTitle] = useState("Untitled Quiz");
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Builder state
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>([]);
  const [builderForm, setBuilderForm] = useState<BuilderQuestion>({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  });
  const [builderFormError, setBuilderFormError] = useState("");

  // Share panel state
  const [sharePanel, setSharePanel] = useState<string | null>(null);
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showAlert = (title: string, message: string, variant: ModalConfig["variant"] = "info") =>
    setModal({ type: "alert", title, message, variant });
  const showConfirm = (title: string, message: string, onConfirm: () => void) =>
    setModal({ type: "confirm", title, message, variant: "danger", confirmLabel: "Delete", onConfirm });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user && viewState === "dashboard") {
      fetchQuizzes();
    }
  }, [session, viewState]);

  const fetchQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const res = await fetch("/api/quizzes/list");
      const data = await res.json();
      if (data.quizzes) {
        setSavedQuizzes(data.quizzes);
      }
    } catch (e) {
      console.error("Failed to list quizzes", e);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const saveQuiz = async () => {
    if (!session?.user || questions.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentQuizId,
          title: quizTitle,
          questions: questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctText: q.correctText,
            correctIndex: q.correctIndex,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quiz?.id) setCurrentQuizId(data.quiz.id);
        showAlert("Saved! 🎉", "Quiz saved to your library.", "success");
      } else {
        showAlert("Save Failed", "Failed to save quiz. Please try again.", "danger");
      }
    } catch (e) {
      console.error("Save error", e);
      showAlert("Save Failed", "An error occurred while saving.", "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      "Delete Quiz",
      "Are you sure? This cannot be undone.",
      async () => {
        setIsDeleting(id);
        try {
          const res = await fetch(`/api/quizzes/delete?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            setSavedQuizzes((prev) => prev.filter((q) => q.id !== id));
            if (sharePanel === id) setSharePanel(null);
          } else {
            showAlert("Delete Failed", "Failed to delete quiz. Please try again.", "danger");
          }
        } catch (error) {
          console.error("Delete failed", error);
          showAlert("Error", "An error occurred while deleting.", "danger");
        } finally {
          setIsDeleting(null);
        }
      }
    );
  };

  // --- Export Quiz as CSV ---
  const exportQuizAsCSV = (quiz: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const rows = [["Question", "Options", "Answer"]];
    for (const q of quiz.questions as any[]) {
      const optionsStr = Array.isArray(q.options)
        ? q.options
            .map((o: string, i: number) => `${String.fromCharCode(97 + i)}. ${o}`)
            .join("; ")
        : "";
      rows.push([q.question, optionsStr, q.correctText || ""]);
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Share ---
  const handleShareVisibility = async (quizId: string, visibility: string) => {
    setShareLoading(true);
    try {
      const res = await fetch("/api/quizzes/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quizId, visibility }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedQuizzes((prev) =>
          prev.map((q) =>
            q.id === quizId
              ? { ...q, visibility: data.visibility, shareToken: data.shareToken, allowedEmails: data.allowedEmails }
              : q
          )
        );
      }
    } catch (e) {
      console.error("Share update failed", e);
    } finally {
      setShareLoading(false);
    }
  };

  const handleAddEmail = async (quizId: string, currentEmails: string[]) => {
    const email = shareEmailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (currentEmails.includes(email)) { setShareEmailInput(""); return; }
    const updated = [...currentEmails, email];
    setShareLoading(true);
    try {
      const res = await fetch("/api/quizzes/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quizId, emails: updated }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, allowedEmails: data.allowedEmails } : q))
        );
        setShareEmailInput("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRemoveEmail = async (quizId: string, currentEmails: string[], email: string) => {
    const updated = currentEmails.filter((e) => e !== email);
    setShareLoading(true);
    try {
      const res = await fetch("/api/quizzes/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quizId, emails: updated }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, allowedEmails: data.allowedEmails } : q))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/play/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --- Confetti ---
  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };
    function fire(particleRatio: number, opts: any) {
      confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * particleRatio) }));
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  // --- File Handling ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setQuizTitle(file.name.replace(".csv", ""));
    setCurrentQuizId(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function (h) { return h.trim().toLowerCase(); },
      complete: function (results: any) {
        if (results.data && results.data.length > 0) {
          try { processData(results.data); }
          catch (e: any) {
            setErrorMsg("Could not parse quiz data. Ensure headers are 'Question', 'Options', 'Answer'.");
            console.error(e);
          }
        } else { setErrorMsg("File appears empty."); }
      },
      error: function (err) { setErrorMsg("Error reading file: " + err.message); },
    });
  };

  const processData = (data: any[]) => {
    const firstRow = data[0];
    const qKey = Object.keys(firstRow).find((k) => k.includes("question"));
    const optKey = Object.keys(firstRow).find((k) => k.includes("options") || k.includes("choice"));
    const ansKey = Object.keys(firstRow).find((k) => k.includes("answer") || k.includes("correct"));
    if (!qKey || !optKey || !ansKey) throw new Error("Missing required columns");

    const parsedQuestions: Question[] = data
      .filter((row) => row[qKey] && row[optKey] && row[ansKey])
      .map((row, index) => {
        const rawOptions = row[optKey];
        let optionsList = rawOptions.split(/[;\n]+/).map((o: string) => o.trim()).filter((o: string) => o.length > 0);
        if (optionsList.length < 2 && rawOptions.includes(",")) {
          // Comma-delimited fallback not used; options should be semicolon-separated
        }
        const correctText = row[ansKey].trim();
        let correctIndex = optionsList.findIndex((opt: string) => {
          const cleanOpt = opt.replace(/^[a-z]\.\s*/i, "").toLowerCase();
          const cleanAns = correctText.replace(/^[a-z]\.\s*/i, "").toLowerCase();
          return cleanOpt === cleanAns || cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt);
        });
        if (correctIndex === -1 && correctText.length < 3) {
          const charCode = correctText.toLowerCase().charCodeAt(0);
          if (charCode >= 97 && charCode <= 100) correctIndex = charCode - 97;
        }
        return { id: index, question: row[qKey], options: optionsList, correctIndex, correctText, userIndex: null, isCorrect: false };
      })
      .filter((q) => q.options.length > 1);

    if (parsedQuestions.length === 0) throw new Error("No valid questions found.");
    setQuestions(parsedQuestions);
    setAppState("quiz");
    setCurrentQIndex(0);
    setScore(0);
  };

  // --- Builder Logic ---
  const addBuilderQuestion = () => {
    if (!builderForm.question.trim()) { setBuilderFormError("Question text is required."); return; }
    if (builderForm.options.some((o) => !o.trim())) { setBuilderFormError("All 4 options must be filled in."); return; }
    setBuilderFormError("");
    setBuilderQuestions((prev) => [...prev, { ...builderForm }]);
    setBuilderForm({ question: "", options: ["", "", "", ""], correctIndex: 0 });
  };

  const removeBuilderQuestion = (idx: number) => {
    setBuilderQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const startBuilderQuiz = () => {
    if (builderQuestions.length === 0) return;
    const qs: Question[] = builderQuestions.map((bq, i) => ({
      id: i,
      question: bq.question,
      options: [...bq.options],
      correctIndex: bq.correctIndex,
      correctText: bq.options[bq.correctIndex],
      userIndex: null,
      isCorrect: false,
    }));
    setQuestions(qs);
    setQuizTitle(builderTitle || "My Quiz");
    setCurrentQuizId(null);
    setCurrentQIndex(0);
    setScore(0);
    setAppState("quiz");
    setViewState("home");
  };

  const saveBuilderQuiz = async () => {
    if (!session?.user || builderQuestions.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: builderTitle || "My Quiz",
          description: builderDescription || null,
          questions: builderQuestions.map((bq) => ({
            question: bq.question,
            options: [...bq.options],
            correctText: bq.options[bq.correctIndex],
            correctIndex: bq.correctIndex,
          })),
        }),
      });
      if (res.ok) {
        showAlert("Saved! 🎉", "Quiz saved to your library.", "success");
        setViewState("dashboard");
      } else {
        showAlert("Save Failed", "Failed to save quiz. Please try again.", "danger");
      }
    } catch {
      showAlert("Save Failed", "An error occurred while saving.", "danger");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Quiz Logic ---
  const handleAnswer = (selectedIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[currentQIndex];
    if (q.userIndex !== null) return;
    q.userIndex = selectedIndex;
    const isCorrect = q.correctIndex !== -1 ? selectedIndex === q.correctIndex : false;
    q.isCorrect = isCorrect;
    setQuestions(newQuestions);
    if (isCorrect) { setScore((s) => s + 1); triggerConfetti(); }
    else setScore((s) => s - 1);
  };

  const nextQuestion = () => { if (currentQIndex < questions.length - 1) setCurrentQIndex((i) => i + 1); };
  const prevQuestion = () => { if (currentQIndex > 0) setCurrentQIndex((i) => i - 1); };
  const endQuiz = () => setAppState("results");
  const restartApp = () => {
    setAppState("upload");
    setQuestions([]);
    setScore(0);
    setCurrentQIndex(0);
    setErrorMsg("");
  };

  // --- Render Helpers ---

  // Builder View
  if (viewState === "builder") {
    return (
      <>
      <Modal config={modal} onClose={() => setModal(null)} />
      <div className="w-full h-full flex flex-col bg-purple-50">
        {/* Header */}
        <div className="bg-purple-700 text-white p-4 flex items-center gap-4 shadow-md flex-shrink-0">
          <button onClick={() => setViewState("home")} className="p-2 rounded-lg hover:bg-purple-600 transition">
            <FaChevronLeft />
          </button>
          <h1 className="text-lg font-bold flex-1">Build a Quiz</h1>
          <div className="flex gap-2">
            {builderQuestions.length > 0 && (
              <button
                onClick={startBuilderQuiz}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-50 transition"
              >
                <FaPlay /> Play
              </button>
            )}
            {session?.user && builderQuestions.length > 0 && (
              <button
                onClick={saveBuilderQuiz}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900 text-white rounded-lg font-semibold text-sm hover:bg-purple-800 transition disabled:opacity-50"
              >
                <FaSave /> {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
          {/* Quiz Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaPencilAlt className="text-purple-500" /> Quiz Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                  placeholder="e.g. Science Quiz"
                  className="w-full border-2 border-purple-100 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  placeholder="A short description of this quiz"
                  className="w-full border-2 border-purple-100 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Add Question Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaPlus className="text-purple-500" /> Add a Question
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Question</label>
                <textarea
                  value={builderForm.question}
                  onChange={(e) => setBuilderForm((f) => ({ ...f, question: e.target.value }))}
                  placeholder="Enter your question here..."
                  rows={2}
                  className="w-full border-2 border-purple-100 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-purple-400 transition resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["A", "B", "C", "D"].map((letter, i) => (
                  <div key={i} className={`flex items-center gap-2 p-3 rounded-xl border-2 transition ${builderForm.correctIndex === i ? "border-green-400 bg-green-50" : "border-purple-100"}`}>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={builderForm.correctIndex === i}
                      onChange={() => setBuilderForm((f) => ({ ...f, correctIndex: i }))}
                      className="accent-green-500 w-4 h-4 flex-shrink-0"
                      title={`Mark option ${letter} as correct`}
                    />
                    <span className="font-bold text-purple-600 w-5">{letter}</span>
                    <input
                      type="text"
                      value={builderForm.options[i]}
                      onChange={(e) => {
                        const opts = [...builderForm.options] as [string, string, string, string];
                        opts[i] = e.target.value;
                        setBuilderForm((f) => ({ ...f, options: opts }));
                      }}
                      placeholder={`Option ${letter}`}
                      className="flex-1 bg-transparent focus:outline-none text-gray-700 min-w-0"
                    />
                  </div>
                ))}
              </div>
              {builderFormError && <p className="text-red-500 text-sm">{builderFormError}</p>}
              <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
              <button
                onClick={addBuilderQuestion}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                <FaPlus /> Add Question
              </button>
            </div>
          </div>

          {/* Added Questions List */}
          {builderQuestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Questions ({builderQuestions.length})
              </h2>
              <div className="space-y-3">
                {builderQuestions.map((bq, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 leading-snug">{bq.question}</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <FaCheckCircle /> {bq.options[bq.correctIndex]}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBuilderQuestion(idx)}
                      className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 transition"
                    >
                      <FaXmark />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startBuilderQuiz}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <FaPlay /> Start Quiz
                </button>
                {session?.user && (
                  <button
                    onClick={saveBuilderQuiz}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-white border-2 border-purple-300 text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaSave /> {isSaving ? "Saving..." : "Save to Library"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }
  </>
  );
  }
  if (viewState === "dashboard") {
    return (
      <>
      <Modal config={modal} onClose={() => setModal(null)} />
      <div className="w-full h-full flex flex-col bg-purple-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-4 sm:p-8">
          <div className="flex flex-wrap gap-3 items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-900 flex-1">My Library</h1>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setViewState("home")}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-white text-purple-600 rounded-lg shadow hover:bg-purple-50 transition font-semibold"
              >
                Create New
              </button>
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedQuizzes.map((quiz) => {
              const isShareOpen = sharePanel === quiz.id;
              const allowedEmails = Array.isArray(quiz.allowedEmails) ? quiz.allowedEmails as string[] : [];
              const visibility = quiz.visibility || "private";

              return (
                <div key={quiz.id} className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                        <FaLayerGroup className="text-xl" />
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        visibility === "public" ? "bg-green-100 text-green-700" :
                        visibility === "protected" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {visibility === "public" ? "Public" : visibility === "protected" ? "Protected" : "Private"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{quiz.title}</h3>
                    <p className="text-gray-500 text-sm">{quiz.questionCount} Questions</p>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-4 border-t border-purple-50 pt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setQuestions(quiz.questions as any);
                        setQuizTitle(quiz.title);
                        setCurrentQuizId(quiz.id);
                        setCurrentQIndex(0);
                        setScore(0);
                        setAppState("quiz");
                        setViewState("home");
                      }}
                      className="text-purple-600 font-bold text-sm flex items-center gap-1 hover:translate-x-0.5 transition-transform"
                    >
                      <FaPlay className="text-xs" /> Play
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => exportQuizAsCSV(quiz, e)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition"
                        title="Export as CSV"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSharePanel(isShareOpen ? null : quiz.id); setShareEmailInput(""); }}
                        className={`p-2 transition ${isShareOpen ? "text-purple-600" : "text-gray-400 hover:text-purple-600"}`}
                        title="Share"
                      >
                        <FaShareAlt />
                      </button>
                      <button
                        onClick={(e) => deleteQuiz(quiz.id, e)}
                        disabled={isDeleting === quiz.id}
                        className="p-2 text-gray-400 hover:text-red-600 transition"
                        title="Delete Quiz"
                      >
                        {isDeleting === quiz.id ? "..." : <FaTrash />}
                      </button>
                    </div>
                  </div>

                  {/* Share Panel */}
                  {isShareOpen && (
                    <div className="border-t border-purple-100 bg-purple-50 p-4 space-y-3">
                      {/* Visibility Selector */}
                      <div className="flex gap-2">
                        {[
                          { val: "private", label: "Private", Icon: FaLock },
                          { val: "public", label: "Public", Icon: FaGlobe },
                          { val: "protected", label: "Protected", Icon: FaUsers },
                        ].map(({ val, label, Icon }) => (
                          <button
                            key={val}
                            disabled={shareLoading}
                            onClick={() => handleShareVisibility(quiz.id, val)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold border-2 transition ${
                              visibility === val
                                ? "border-purple-500 bg-purple-100 text-purple-700"
                                : "border-transparent bg-white text-gray-500 hover:border-purple-200"
                            }`}
                          >
                            <Icon className="text-base" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Public: share link */}
                      {visibility === "public" && quiz.shareToken && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5">Anyone with this link can play</p>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={`${window.location.origin}/play/${quiz.shareToken}`}
                              className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 truncate"
                            />
                            <button
                              onClick={() => copyShareLink(quiz.shareToken)}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition flex items-center gap-1"
                            >
                              <FaCopy /> {copied ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Protected: share link + email whitelist */}
                      {visibility === "protected" && (
                        <div className="space-y-2">
                          {quiz.shareToken && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1.5">Share this link — invited users must sign in</p>
                              <div className="flex gap-2">
                                <input
                                  readOnly
                                  value={`${window.location.origin}/play/${quiz.shareToken}`}
                                  className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 truncate"
                                />
                                <button
                                  onClick={() => copyShareLink(quiz.shareToken)}
                                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition flex items-center gap-1"
                                >
                                  <FaCopy /> {copied ? "Copied!" : "Copy"}
                                </button>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Allowed emails</p>
                            {allowedEmails.map((email) => (
                              <div key={email} className="flex items-center justify-between py-1 px-2 bg-white rounded-lg mb-1 text-xs text-gray-700 border border-purple-100">
                                {email}
                                <button
                                  onClick={() => handleRemoveEmail(quiz.id, allowedEmails, email)}
                                  className="text-red-400 hover:text-red-600 ml-2"
                                >
                                  <FaXmark />
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-1.5">
                              <input
                                type="email"
                                value={shareEmailInput}
                                onChange={(e) => setShareEmailInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddEmail(quiz.id, allowedEmails)}
                                placeholder="user@email.com"
                                className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-400"
                              />
                              <button
                                onClick={() => handleAddEmail(quiz.id, allowedEmails)}
                                disabled={shareLoading}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {visibility === "private" && (
                        <p className="text-xs text-gray-400 text-center">Only you can play this quiz.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoadingQuizzes ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading your quizzes...</p>
              </div>
            ) : savedQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                You haven&apos;t saved any quizzes yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Upload Screen
  if (appState === "upload") {
    return (
      <>
      <Modal config={modal} onClose={() => setModal(null)} />
      <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-fade-in relative">
        {/* Top Right Auth */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-2 justify-end max-w-[calc(100%-1.5rem)]">
          {session ? (
            <>
              <button onClick={() => setViewState("dashboard")} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-white rounded-full shadow text-purple-700 font-semibold hover:bg-purple-50">
                <FaList /> <span>My Quizzes</span>
              </button>
              <button onClick={() => signOut()} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-red-50 rounded-full shadow text-red-600 font-semibold hover:bg-red-100">
                Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => signIn("google")} className="flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 text-sm sm:text-base bg-white rounded-full shadow-lg text-gray-700 font-bold hover:shadow-xl transition transform hover:-translate-y-0.5">
              <FaGoogle className="text-red-500" /> Sign In
            </button>
          )}
        </div>

        <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-4">
          {/* CSV Upload Card */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center flex-1 border-t-8 border-purple-600">
            <div className="mb-4 text-purple-600 text-5xl flex justify-center"><FaFileCsv /></div>
            <h1 className="text-2xl font-bold mb-2 text-gray-800">Upload CSV</h1>
            <p className="text-gray-500 text-sm mb-6">Upload a CSV with Question, Options, and Answer columns.</p>
            <label
              htmlFor="csv-upload"
              className="cursor-pointer group relative flex flex-col items-center justify-center w-full h-28 border-2 border-purple-300 border-dashed rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FaCloudArrowUp className="text-3xl text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-400">CSV files only</p>
              </div>
              <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} />
            </label>
            {errorMsg && <div className="text-red-500 text-sm mt-4">{errorMsg}</div>}
          </div>

          {/* Build Quiz Card */}
          <div
            onClick={() => setViewState("builder")}
            className="bg-white p-8 rounded-3xl shadow-2xl text-center flex-1 border-t-8 border-indigo-500 cursor-pointer hover:shadow-3xl hover:-translate-y-1 transition-all group"
          >
            <div className="mb-4 text-indigo-500 text-5xl flex justify-center group-hover:scale-110 transition-transform">
              <FaPencilAlt />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Build a Quiz</h2>
            <p className="text-gray-500 text-sm mb-6">Create your quiz from scratch</p>
            <div className="w-full h-12 bg-indigo-600 rounded-lg text-white font-bold flex items-center justify-center gap-2 group-hover:bg-indigo-700 transition-colors">
              <FaPlus /> Start Building
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "results") {
    const correctCount = questions.filter((q) => q.isCorrect).length;
    const wrongCount = questions.filter((q) => q.userIndex !== null && !q.isCorrect).length;
    const wrongQuestions = questions.filter((q) => q.userIndex !== null && !q.isCorrect);

    return (
      <>
      <Modal config={modal} onClose={() => setModal(null)} />
      <div className="fixed inset-0 bg-purple-600 z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-8 md:p-12 relative animate-fade-in">
            <button onClick={restartApp} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition">
              <FaXmark className="text-2xl" />
            </button>

            <div className="text-center mb-10">
              <div className="inline-block p-4 rounded-full bg-purple-100 mb-4">
                <FaTrophy className="text-5xl text-purple-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">Quiz Completed!</h2>
              <p className="text-gray-500 text-lg">Here is how you performed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-purple-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Final Score</div>
                <div className="text-4xl font-bold text-purple-700">{score}</div>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Correct Answers</div>
                <div className="text-4xl font-bold text-green-600">{correctCount}</div>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Incorrect Answers</div>
                <div className="text-4xl font-bold text-red-600">{wrongCount}</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Review Incorrect Answers</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {wrongQuestions.length === 0 ? (
                <div className="text-center text-gray-500 italic py-8">Amazing! No incorrect answers found.</div>
              ) : (
                wrongQuestions.map((q) => (
                  <div key={q.id} className="bg-red-50 border border-red-100 p-4 rounded-xl">
                    <div className="font-bold text-gray-800 mb-2">
                      <span className="text-red-500 mr-2">Q{q.id + 1}.</span> {q.question}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-white rounded border border-red-200 text-red-700">
                        <span className="font-semibold block text-xs uppercase tracking-wide text-red-400">You selected</span>
                        {q.options[q.userIndex!]}
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200 text-green-700">
                        <span className="font-semibold block text-xs uppercase tracking-wide text-green-400">Correct Answer</span>
                        {q.correctText}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 text-center flex justify-center gap-4">
              <button onClick={restartApp} className="px-8 py-3 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition transform flex items-center">
                <FaRotateRight className="mr-2" /> Start New Quiz
              </button>
              {session?.user && (
                <button onClick={saveQuiz} disabled={isSaving} className="px-8 py-3 bg-white text-purple-600 border border-purple-200 rounded-full font-bold shadow-lg hover:bg-purple-50 transition transform flex items-center">
                  {isSaving ? "Saving..." : <><FaSave className="mr-2" /> Save to Library</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Quiz Interface ---
  const currentQ = questions[currentQIndex];
  const isAnswered = currentQ.userIndex !== null;

  return (
    <>
    <Modal config={modal} onClose={() => setModal(null)} />
    <div className="w-full h-full flex flex-col md:flex-row">

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-purple-100 flex flex-col shadow-xl
        transition-transform duration-300 ease-in-out
        md:relative md:w-64 md:translate-x-0 md:z-auto md:shadow-lg
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-4 bg-purple-700 text-white flex justify-between items-center shadow-md">
          <h2 className="font-bold text-lg flex items-center">
            <FaLayerGroup className="mr-2" />
            Questions
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-purple-800 px-2 py-1 rounded-full">
              {questions.filter((q) => q.userIndex !== null).length}/{questions.length}
            </span>
            <button className="md:hidden p-1 rounded hover:bg-purple-600 transition" onClick={() => setIsSidebarOpen(false)}>
              <FaXmark />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              let btnClass = "w-full aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition ";
              if (idx === currentQIndex) btnClass += "bg-purple-600 text-white ring-4 ring-purple-300 shadow-lg scale-110 z-10";
              else if (q.userIndex !== null) {
                if (q.isCorrect) btnClass += "bg-green-500 text-white";
                else btnClass += "bg-red-500 text-white";
              } else btnClass += "bg-gray-200 text-gray-500 hover:bg-purple-200";

              return (
                <button key={idx} onClick={() => { setCurrentQIndex(idx); setIsSidebarOpen(false); }} className={btnClass}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div> Correct</span>
            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div> Wrong</span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">Score: {score}</div>
          </div>
          <button onClick={endQuiz} className="mt-3 w-full py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold text-sm flex items-center justify-center">
            <FaFlagCheckered className="mr-2" /> End Test
          </button>
          {session?.user && (
            <button onClick={saveQuiz} disabled={isSaving} className="mt-2 w-full py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold text-sm flex items-center justify-center disabled:opacity-50">
              {isSaving ? "Saving..." : <><FaSave className="mr-2" /> Save Results</>}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-purple-50 h-full relative overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden p-3 bg-purple-700 text-white flex justify-between items-center shadow-md">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 font-bold text-sm bg-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-900 transition"
          >
            <FaBars /> Questions ({questions.filter((q) => q.userIndex !== null).length}/{questions.length})
          </button>
          <span className="font-mono bg-purple-800 px-3 py-1.5 rounded-lg text-sm font-bold">
            Score: {score}
          </span>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pb-24 pb-24">
          <div className="max-w-3xl mx-auto w-full animate-fade-in">
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6 border-l-4 border-purple-500">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                  Question {currentQ.id + 1}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-2">
                {currentQ.question}
              </h2>
            </div>

            {/* Options */}
            <div className="grid gap-3">
              {currentQ.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                let optClass = "relative p-4 rounded-xl border-2 border-purple-100 bg-white cursor-pointer group flex items-start transition-all ";
                let circleClass = "flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-bold flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors";
                let icon = null;

                if (isAnswered) {
                  optClass += " disabled cursor-default opacity-50";
                  if (i === currentQ.correctIndex) {
                    optClass = optClass.replace("opacity-50", "") + " bg-green-50 !border-green-500 text-green-800";
                    circleClass = "flex-shrink-0 w-8 h-8 rounded-full bg-green-200 text-green-700 font-bold flex items-center justify-center mr-3";
                    icon = <FaCheckCircle className="absolute top-4 right-4 text-2xl text-green-600" />;
                  } else if (i === currentQ.userIndex && !currentQ.isCorrect) {
                    optClass = optClass.replace("opacity-50", "") + " bg-red-50 !border-red-500 text-red-800";
                    circleClass = "flex-shrink-0 w-8 h-8 rounded-full bg-red-200 text-red-700 font-bold flex items-center justify-center mr-3";
                    icon = <FaTimesCircle className="absolute top-4 right-4 text-2xl text-red-600" />;
                  }
                } else {
                  optClass += " hover:bg-purple-50 hover:border-purple-300 transform hover:translate-x-1";
                }

                return (
                  <div key={i} className={optClass} onClick={() => !isAnswered && handleAnswer(i)}>
                    <div className={circleClass}>{letter}</div>
                    <div className="text-gray-700 font-medium pt-1 flex-1">{opt}</div>
                    {icon}
                  </div>
                );
              })}
            </div>

            {/* Feedback */}
            {isAnswered && (
              <div className={`mt-6 rounded-xl p-4 border-l-4 ${currentQ.isCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`}>
                {currentQ.isCorrect ? (
                  <div className="flex items-center">
                    <FaCheckCircle className="mr-2" />
                    <strong>Correct!</strong> <span className="ml-1">+1 Point</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-1">
                      <FaCircleExclamation className="mr-2" />
                      <strong>Incorrect!</strong> <span className="ml-1">-1 Point.</span>
                    </div>
                    <div className="text-sm mt-1 ml-6">Correct Answer: {currentQ.correctText}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-purple-100 p-4 shadow-lg flex justify-between items-center z-10">
          <button
            onClick={prevQuestion}
            disabled={currentQIndex === 0}
            className="px-6 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <FaChevronLeft className="mr-2" /> Prev
          </button>

          <div className="hidden md:block text-gray-400 text-sm font-medium">
            Use sidebar to jump • Answer to see result
          </div>

          <button
            onClick={nextQuestion}
            disabled={currentQIndex === questions.length - 1}
            className="px-6 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            Next <FaChevronRight className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
