"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaTrophy,
  FaRedo,
} from "react-icons/fa";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  userIndex: number | null;
  isCorrect: boolean;
};

export default function PlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string>("");
  const [quiz, setQuiz] = useState<{ title: string; questions: Question[] } | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [appState, setAppState] = useState<"quiz" | "results">("quiz");

  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    if (needsAuth && status === "loading") return;

    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/quizzes/${token}`);
        const data = await res.json();

        if (res.status === 401) {
          setNeedsAuth(true);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError(data.error || "Could not load quiz");
          setLoading(false);
          return;
        }

        const qs = (data.questions as any[]).map((q, idx) => ({
          ...q,
          id: idx,
          userIndex: null,
          isCorrect: false,
        }));
        setQuiz({ title: data.title, questions: qs });
        setQuestions(qs);
      } catch {
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [token, needsAuth, status, session]);

  const handleAnswer = (selectedIndex: number) => {
    const newQ = [...questions];
    const q = newQ[currentQIndex];
    if (q.userIndex !== null) return;
    q.userIndex = selectedIndex;
    const isCorrect = selectedIndex === q.correctIndex;
    q.isCorrect = isCorrect;
    setQuestions(newQ);
    if (isCorrect) setScore((s) => s + 1);
    else setScore((s) => s - 1);
  };

  const restart = () => {
    const reset = questions.map((q) => ({ ...q, userIndex: null, isCorrect: false }));
    setQuestions(reset);
    setCurrentQIndex(0);
    setScore(0);
    setAppState("quiz");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (needsAuth && !session) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border-t-8 border-purple-600">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in Required</h1>
          <p className="text-gray-500 mb-6">This quiz is protected. Sign in to check if you have access.</p>
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-purple-600 text-white rounded-full font-bold shadow hover:bg-purple-700 transition"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border-t-8 border-red-500">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  if (appState === "results") {
    const correct = questions.filter((q) => q.isCorrect).length;
    const wrong = questions.filter((q) => q.userIndex !== null && !q.isCorrect).length;
    return (
      <div className="min-h-screen bg-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-purple-100 mb-3">
              <FaTrophy className="text-5xl text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">{quiz.title}</h2>
            <p className="text-gray-500 mt-1">Quiz Completed!</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 p-5 rounded-2xl text-center">
              <div className="text-gray-500 text-sm mb-1">Score</div>
              <div className="text-3xl font-bold text-purple-700">{score}</div>
            </div>
            <div className="bg-green-50 p-5 rounded-2xl text-center">
              <div className="text-gray-500 text-sm mb-1">Correct</div>
              <div className="text-3xl font-bold text-green-600">{correct}</div>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl text-center">
              <div className="text-gray-500 text-sm mb-1">Wrong</div>
              <div className="text-3xl font-bold text-red-600">{wrong}</div>
            </div>
          </div>
          <button
            onClick={restart}
            className="w-full py-3 bg-purple-600 text-white rounded-full font-bold shadow hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <FaRedo /> Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const isAnswered = currentQ.userIndex !== null;

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-purple-700 text-white p-4 shadow-md flex justify-between items-center">
        <span className="font-bold text-lg truncate">{quiz.title}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-purple-800 px-3 py-1 rounded-full">
            {currentQIndex + 1}/{questions.length}
          </span>
          <span className="text-sm bg-purple-800 px-3 py-1 rounded-full font-mono">
            Score: {score}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-4 border-l-4 border-purple-500">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
            Question {currentQIndex + 1}
          </span>
          <h2 className="text-xl font-bold text-gray-800 mt-3 leading-relaxed">{currentQ.question}</h2>
        </div>

        {/* Options */}
        <div className="grid gap-3 mb-4">
          {currentQ.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            let cls = "relative p-4 rounded-xl border-2 border-purple-100 bg-white flex items-start transition-all cursor-pointer ";
            if (isAnswered) {
              cls += "cursor-default opacity-50 ";
              if (i === currentQ.correctIndex) cls = cls.replace("opacity-50 ", "") + "bg-green-50 !border-green-500 ";
              else if (i === currentQ.userIndex) cls = cls.replace("opacity-50 ", "") + "bg-red-50 !border-red-500 ";
            } else {
              cls += "hover:bg-purple-50 hover:border-purple-300 hover:translate-x-1 ";
            }
            return (
              <div key={i} className={cls} onClick={() => !isAnswered && handleAnswer(i)}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-bold flex items-center justify-center mr-3">
                  {letter}
                </div>
                <div className="text-gray-700 font-medium pt-1 flex-1">{opt}</div>
                {isAnswered && i === currentQ.correctIndex && <FaCheckCircle className="absolute top-4 right-4 text-xl text-green-600" />}
                {isAnswered && i === currentQ.userIndex && !currentQ.isCorrect && <FaTimesCircle className="absolute top-4 right-4 text-xl text-red-600" />}
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {isAnswered && (
          <div className={`rounded-xl p-4 border-l-4 mb-4 ${currentQ.isCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`}>
            {currentQ.isCorrect ? (
              <div className="flex items-center"><FaCheckCircle className="mr-2" /><strong>Correct! +1</strong></div>
            ) : (
              <div>
                <div className="flex items-center mb-1"><FaExclamationCircle className="mr-2" /><strong>Incorrect! -1</strong></div>
                <div className="text-sm ml-6">Correct: {currentQ.correctText}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="sticky bottom-0 bg-white border-t border-purple-100 p-4 flex justify-between items-center shadow-lg">
        <button
          onClick={() => setCurrentQIndex((i) => Math.max(i - 1, 0))}
          disabled={currentQIndex === 0}
          className="px-5 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold transition disabled:opacity-50 flex items-center gap-2"
        >
          <FaChevronLeft /> Prev
        </button>
        {currentQIndex === questions.length - 1 ? (
          <button
            onClick={() => setAppState("results")}
            className="px-5 py-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 font-semibold transition"
          >
            Finish
          </button>
        ) : (
          <button
            onClick={() => setCurrentQIndex((i) => i + 1)}
            className="px-5 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 font-semibold transition flex items-center gap-2"
          >
            Next <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}
