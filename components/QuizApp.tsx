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
} from "react-icons/fa";

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  userIndex: number | null;
  isCorrect: boolean;
};

type AppState = "upload" | "quiz" | "results";
type ViewState = "home" | "dashboard";

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user && viewState === "dashboard") {
      fetchQuizzes();
    }
  }, [session, viewState]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch("/api/quizzes/list");
      const data = await res.json();
      if (data.quizzes) {
        setSavedQuizzes(data.quizzes);
      }
    } catch (e) {
      console.error("Failed to list quizzes", e);
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
          id: currentQuizId, // Send ID if updating
          title: quizTitle,
          questions: questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctText: q.correctText,
            correctIndex: q.correctIndex, // Optional, can re-derive
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quiz && data.quiz.id) {
            setCurrentQuizId(data.quiz.id); // Update ID for future saves
        }
        alert("Quiz saved to your library!");
      } else {
        alert("Failed to save quiz.");
      }
    } catch (e) {
      console.error("Save error", e);
      alert("Error saving quiz");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    
    setIsDeleting(id);
    try {
        const res = await fetch(`/api/quizzes/delete?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setSavedQuizzes(prev => prev.filter(q => q.id !== id));
        } else {
            alert("Failed to delete quiz");
        }
    } catch (error) {
        console.error("Delete failed", error);
        alert("Error deleting quiz");
    } finally {
        setIsDeleting(null);
    }
  };

  // --- Confetti ---
  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: any) {
      confetti(
        Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio),
        })
      );
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

    // Use filename as default title
    setQuizTitle(file.name.replace(".csv", ""));
    setCurrentQuizId(null); // Reset when uploading new

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function (h) {
        return h.trim().toLowerCase();
      },
      complete: function (results: any) {
        if (results.data && results.data.length > 0) {
          try {
            processData(results.data);
          } catch (e: any) {
            setErrorMsg(
              "Could not parse quiz data. Ensure headers are 'Question', 'Options', 'Answer'."
            );
            console.error(e);
          }
        } else {
          setErrorMsg("File appears empty.");
        }
      },
      error: function (err) {
        setErrorMsg("Error reading file: " + err.message);
      },
    });
  };

  const processData = (data: any[]) => {
    const firstRow = data[0];
    const qKey = Object.keys(firstRow).find((k) => k.includes("question"));
    const optKey = Object.keys(firstRow).find(
      (k) => k.includes("options") || k.includes("choice")
    );
    const ansKey = Object.keys(firstRow).find(
      (k) => k.includes("answer") || k.includes("correct")
    );

    if (!qKey || !optKey || !ansKey) {
        throw new Error("Missing required columns");
    }

    const parsedQuestions: Question[] = data
      .filter((row) => row[qKey] && row[optKey] && row[ansKey])
      .map((row, index) => {
        const rawOptions = row[optKey];
        // Split options by semicolon (;) or newline
        let optionsList = rawOptions
          .split(/[;\n]+/)
          .map((o: string) => o.trim())
          .filter((o: string) => o.length > 0);

        if (optionsList.length < 2 && rawOptions.includes(",")) {
            // Fallback for commas if not split by ;
            // optionsList = rawOptions.split(',').map(o => o.trim());
        }

        const correctText = row[ansKey].trim();
        let correctIndex = -1;

        // Find correct index
        correctIndex = optionsList.findIndex((opt: string) => {
          const cleanOpt = opt.replace(/^[a-z]\.\s*/i, "").toLowerCase();
          const cleanAns = correctText.replace(/^[a-z]\.\s*/i, "").toLowerCase();
          return (
            cleanOpt === cleanAns ||
            cleanOpt.includes(cleanAns) ||
            cleanAns.includes(cleanOpt)
          );
        });

        // Fallback a-d check
        if (correctIndex === -1 && correctText.length < 3) {
          const charCode = correctText.toLowerCase().charCodeAt(0);
          if (charCode >= 97 && charCode <= 100) {
            correctIndex = charCode - 97;
          }
        }

        return {
          id: index,
          question: row[qKey],
          options: optionsList,
          correctIndex: correctIndex,
          correctText: correctText,
          userIndex: null,
          isCorrect: false,
        };
      })
      .filter((q) => q.options.length > 1);

    if (parsedQuestions.length === 0) {
      throw new Error("No valid questions found.");
    }

    setQuestions(parsedQuestions);
    setAppState("quiz");
    setCurrentQIndex(0);
    setScore(0);
  };

  // --- Quiz Logic ---
  const handleAnswer = (selectedIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[currentQIndex];

    if (q.userIndex !== null) return; // Already answered

    q.userIndex = selectedIndex;

    let isCorrect = false;
    if (q.correctIndex !== -1) {
      isCorrect = selectedIndex === q.correctIndex;
    }

    q.isCorrect = isCorrect;
    setQuestions(newQuestions);

    if (isCorrect) {
      setScore((s) => s + 1);
      triggerConfetti();
    } else {
      setScore((s) => s - 1);
    }
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((i) => i + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((i) => i - 1);
    }
  };

  const endQuiz = () => {
    setAppState("results");
  };

  const restartApp = () => {
    // window.location.reload(); 
    // Soft reset
    setAppState("upload");
    setQuestions([]);
    setScore(0);
    setCurrentQIndex(0);
    setErrorMsg("");
  };

  // --- Render Helpers ---

  // Dashboard View
  if (viewState === "dashboard") {
    return (
      <div className="w-full min-h-screen bg-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-purple-900">My Library</h1>
            <div className="flex gap-4">
                 <button
                onClick={() => setViewState("home")}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg shadow hover:bg-purple-50 transition font-semibold"
              >
                Create New
              </button>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <FaLayerGroup className="text-xl"/>
                    </div>
                    {/* <div className="text-xs text-gray-400">{new Date(quiz.createdAt).toLocaleDateString()}</div> */}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{quiz.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{quiz.questionCount} Questions</p>
                <div className="pt-4 border-t border-purple-50 flex justify-between items-center">
                    <button 
                        onClick={() => {
                            setQuestions(quiz.questions as any);
                            setQuizTitle(quiz.title);
                            setCurrentQuizId(quiz.id); // Track ID
                            setCurrentQIndex(0);
                            setScore(0);
                            setAppState('quiz');
                            setViewState('home');
                        }}
                        className="text-purple-600 font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform">
                        Play Now <FaChevronRight className="ml-1 text-xs"/>
                    </button>
                    <button 
                        onClick={(e) => deleteQuiz(quiz.id, e)}
                        disabled={isDeleting === quiz.id}
                        className="text-red-400 hover:text-red-600 p-2 transition-colors"
                        title="Delete Quiz"
                    >
                        {isDeleting === quiz.id ? '...' : <FaTrash />}
                    </button>
                </div>
              </div>
            ))}
            {savedQuizzes.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    You haven't saved any quizzes yet.
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Upload Screen
  if (appState === "upload") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-fade-in relative">
        {/* Top Right Auth */}
        <div className="absolute top-4 right-4 flex gap-4">
             {session ? (
                 <>
                   <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow text-purple-700 font-semibold hover:bg-purple-50">
                        <FaList /> My Quizzes
                   </button>
                    <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full shadow text-red-600 font-semibold hover:bg-red-100">
                        Sign Out
                   </button>
                 </>
             ) : (
                <button onClick={() => signIn("google")} className="flex items-center gap-2 px-6 py-2 bg-white rounded-full shadow-lg text-gray-700 font-bold hover:shadow-xl transition transform hover:-translate-y-0.5">
                    <FaGoogle className="text-red-500" /> Sign In
                </button>
             )}
        </div>

        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border-t-8 border-purple-600">
          <div className="mb-6 text-purple-600 text-6xl flex justify-center">
            <FaFileCsv />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Upload Quiz Data
          </h1>
          <p className="text-gray-500 mb-8">
            Upload your CSV file to start the quiz. Ensure it has Question,
            Options, and Answer columns.
          </p>

          <label
            htmlFor="csv-upload"
            className="cursor-pointer group relative flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FaCloudArrowUp className="text-3xl text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-400">CSV files only</p>
            </div>
            <input
              id="csv-upload"
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
          </label>
          {errorMsg && (
            <div className="text-red-500 text-sm mt-4">{errorMsg}</div>
          )}
        </div>
      </div>
    );
  }

  if (appState === "results") {
    const correctCount = questions.filter((q) => q.isCorrect).length;
    const wrongCount = questions.filter(
      (q) => q.userIndex !== null && !q.isCorrect
    ).length;
    const wrongQuestions = questions.filter(
      (q) => q.userIndex !== null && !q.isCorrect
    );

    return (
      <div className="fixed inset-0 bg-purple-600 z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-8 md:p-12 relative animate-fade-in">
            <button
              onClick={restartApp}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition"
            >
              <FaXmark className="text-2xl" />
            </button>

            <div className="text-center mb-10">
              <div className="inline-block p-4 rounded-full bg-purple-100 mb-4">
                <FaTrophy className="text-5xl text-purple-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">
                Quiz Completed!
              </h2>
              <p className="text-gray-500 text-lg">Here is how you performed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-purple-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Final Score</div>
                <div className="text-4xl font-bold text-purple-700">
                  {score}
                </div>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Correct Answers</div>
                <div className="text-4xl font-bold text-green-600">
                  {correctCount}
                </div>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl text-center">
                <div className="text-gray-500 mb-1">Incorrect Answers</div>
                <div className="text-4xl font-bold text-red-600">
                  {wrongCount}
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
              Review Incorrect Answers
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {wrongQuestions.length === 0 ? (
                <div className="text-center text-gray-500 italic py-8">
                  Amazing! No incorrect answers found.
                </div>
              ) : (
                wrongQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-red-50 border border-red-100 p-4 rounded-xl"
                  >
                    <div className="font-bold text-gray-800 mb-2">
                      <span className="text-red-500 mr-2">Q{q.id + 1}.</span>{" "}
                      {q.question}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-white rounded border border-red-200 text-red-700">
                        <span className="font-semibold block text-xs uppercase tracking-wide text-red-400">
                          You selected
                        </span>
                        {q.options[q.userIndex!]}
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200 text-green-700">
                        <span className="font-semibold block text-xs uppercase tracking-wide text-green-400">
                          Correct Answer
                        </span>
                        {q.correctText}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 text-center flex justify-center gap-4">
              <button
                onClick={restartApp}
                className="px-8 py-3 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition transform flex items-center"
              >
                <FaRotateRight className="mr-2" /> Start New Quiz
              </button>

               {session?.user && (
                <button
                    onClick={saveQuiz}
                    disabled={isSaving}
                    className="px-8 py-3 bg-white text-purple-600 border border-purple-200 rounded-full font-bold shadow-lg hover:bg-purple-50 transition transform flex items-center"
                >
                     {isSaving ? 'Saving...' : <><FaSave className="mr-2" /> Save to Library</>}
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
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-purple-100 flex flex-col shadow-lg z-20">
        <div className="p-4 bg-purple-700 text-white flex justify-between items-center shadow-md">
          <h2 className="font-bold text-lg flex items-center">
            <FaLayerGroup className="mr-2" />
            Questions
          </h2>
          <span className="text-sm bg-purple-800 px-2 py-1 rounded-full">
            {questions.filter((q) => q.userIndex !== null).length}/
            {questions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              let btnClass =
                "w-full aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition ";
              if (idx === currentQIndex) {
                 // Active
                btnClass += "bg-purple-600 text-white ring-4 ring-purple-300 shadow-lg scale-110 z-10";
              } else if (q.userIndex !== null) {
                if (q.isCorrect) btnClass += "bg-green-500 text-white";
                else btnClass += "bg-red-500 text-white";
              } else {
                btnClass += "bg-gray-200 text-gray-500 hover:bg-purple-200";
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={btnClass}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>{" "}
              Correct
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div> Wrong
            </span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">
              Score: {score}
            </div>
          </div>
          <button
            onClick={endQuiz}
            className="mt-3 w-full py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold text-sm flex items-center justify-center"
          >
            <FaFlagCheckered className="mr-2" />
            End Test
          </button>
          
          {session?.user && (
            <button
                onClick={saveQuiz}
                disabled={isSaving}
                className="mt-2 w-full py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold text-sm flex items-center justify-center disabled:opacity-50"
            >
                {isSaving ? 'Saving...' : <><FaSave className="mr-2" /> Save Results</>}
            </button>
          )}

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-purple-50 h-full relative overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-purple-600 text-white flex justify-between items-center shadow-md">
          <span className="font-bold">Quiz App</span>
          <span className="font-mono bg-purple-800 px-2 py-1 rounded">
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
                let optClass =
                  "relative p-4 rounded-xl border-2 border-purple-100 bg-white cursor-pointer group flex items-start transition-all ";
                let circleClass =
                  "flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-bold flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors";
                
                let icon = null;

                if (isAnswered) {
                  optClass += " disabled cursor-default opacity-50"; 
                  if (i === currentQ.correctIndex) {
                    optClass = optClass.replace('opacity-50', '') + " bg-green-50 !border-green-500 text-green-800";
                    circleClass = "flex-shrink-0 w-8 h-8 rounded-full bg-green-200 text-green-700 font-bold flex items-center justify-center mr-3";
                    icon = <FaCheckCircle className="absolute top-4 right-4 text-2xl text-green-600"/>;
                  } else if (i === currentQ.userIndex && !currentQ.isCorrect) {
                     optClass = optClass.replace('opacity-50', '') + " bg-red-50 !border-red-500 text-red-800";
                     circleClass = "flex-shrink-0 w-8 h-8 rounded-full bg-red-200 text-red-700 font-bold flex items-center justify-center mr-3";
                     icon = <FaTimesCircle className="absolute top-4 right-4 text-2xl text-red-600"/>;
                  }
                } else {
                    optClass += " hover:bg-purple-50 hover:border-purple-300 transform hover:translate-x-1";
                }

                return (
                  <div
                    key={i}
                    className={optClass}
                    onClick={() => !isAnswered && handleAnswer(i)}
                  >
                    <div className={circleClass}>{letter}</div>
                    <div className="text-gray-700 font-medium pt-1 flex-1">
                      {opt}
                    </div>
                    {icon}
                  </div>
                );
              })}
            </div>

            {/* Feedback */}
            {isAnswered && (
              <div
                className={`mt-6 rounded-xl p-4 border-l-4 ${
                  currentQ.isCorrect
                    ? "border-green-500 bg-green-50 text-green-800"
                    : "border-red-500 bg-red-50 text-red-800"
                }`}
              >
                {currentQ.isCorrect ? (
                  <div className="flex items-center">
                    <FaCheckCircle className="mr-2" />
                    <strong>Correct!</strong> <span className="ml-1">+1 Point</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-1">
                        <FaCircleExclamation className="mr-2"/>
                        <strong>Incorrect!</strong> <span className="ml-1">-1 Point.</span>
                    </div>
                    <div className="text-sm mt-1 ml-6">
                      Correct Answer: {currentQ.correctText}
                    </div>
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
            <FaChevronLeft className="mr-2" />
            Prev
          </button>

          <div className="hidden md:block text-gray-400 text-sm font-medium">
            Use sidebar to jump • Answer to see result
          </div>

          <button
            onClick={nextQuestion}
            disabled={currentQIndex === questions.length - 1}
            className="px-6 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            Next
            <FaChevronRight className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
