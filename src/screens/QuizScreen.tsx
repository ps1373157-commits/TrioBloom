import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { QUIZ_QUESTIONS, calculateQuizScore, QuizPersona } from '../utils/friendship';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { HelpCircle, CheckCircle2, XCircle, Award, RotateCcw, Sparkles, ChevronRight, Flower2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizScreen: React.FC = () => {
  const { member, activeFriend, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [answeredState, setAnsweredState] = useState<boolean>(false);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [personaResult, setPersonaResult] = useState<QuizPersona | null>(null);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const currentUid = user?.uid || activeFriend.id;
  const currentDisplayName = member?.displayName || activeFriend.name;

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C44780', '#FFE5EF', '#F0E8FF', '#FFB7D5', '#FFD2E4']
    });
  };

  const handleSelectOption = (index: number) => {
    if (answeredState) return;

    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = index;
    setSelectedAnswers(newAnswers);
    setAnsweredState(true);

    if (index === currentQuestion.correctIndex) {
      triggerConfetti();
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnsweredState(false);
    } else {
      // Calculate final score
      const results = calculateQuizScore(selectedAnswers, QUIZ_QUESTIONS);
      setFinalScore({ score: results.score, total: results.total, percentage: results.percentage });
      setPersonaResult(results.persona);
      setQuizFinished(true);
      triggerConfetti();

      // Save score to Firestore
      try {
        const scoreId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'quiz_scores', scoreId), {
          id: scoreId,
          userId: currentUid,
          userName: currentDisplayName,
          score: results.score,
          total: results.total,
          flowerPersona: results.persona.title,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Could not save quiz score (offline or rules):', err);
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setAnsweredState(false);
    setQuizFinished(false);
    setPersonaResult(null);
    setFinalScore(null);
  };

  const progressPercent = ((currentIndex + 1) / QUIZ_QUESTIONS.length) * 100;

  return (
    <div className="space-y-4 pb-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#F0E8FF] via-[#FFF0F6] to-[#FFE5EF] rounded-3xl p-4 border border-[#FFD2E4] shadow-soft">
        <div className="flex items-center space-x-2.5">
          <span className="text-2xl select-none animate-petal">✨</span>
          <div>
            <h2 className="text-base font-bold text-[#493744]">
              Friendship Quiz 🌷
            </h2>
            <p className="text-xs text-[#927F8C]">
              Discover your friendship petal & test how deeply we know each other!
            </p>
          </div>
        </div>
      </div>

      {!quizFinished ? (
        <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-soft space-y-4">
          {/* Progress Header */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-[#C44780]">
                Question {currentIndex + 1} of {QUIZ_QUESTIONS.length}
              </span>
              <span className="text-[#927F8C]">
                {Math.round(progressPercent)}% Bloomed
              </span>
            </div>
            <div className="w-full bg-[#FFF8F5] h-2.5 rounded-full overflow-hidden border border-[#F3E6EE]">
              <div
                className="bg-gradient-to-r from-[#C44780] to-[#E580B2] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Title */}
          <div className="pt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFE5EF] text-[#C44780] mb-2">
              {currentQuestion.flowerTrait}
            </span>
            <h3 className="text-sm font-bold text-[#493744] leading-snug">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-2 pt-1">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentIndex] === idx;
              const isCorrect = idx === currentQuestion.correctIndex;

              let buttonStyle = 'bg-[#FFF8F5] text-[#493744] border-[#F3E6EE] hover:border-[#FFD2E4]';
              let badge = null;

              if (answeredState) {
                if (isCorrect) {
                  buttonStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-xs';
                  badge = <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />;
                } else if (isSelected && !isCorrect) {
                  buttonStyle = 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs';
                  badge = <XCircle size={16} className="text-rose-500 shrink-0" />;
                } else {
                  buttonStyle = 'bg-gray-50 text-gray-400 border-gray-200 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={answeredState}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs transition-all flex items-center justify-between group ${buttonStyle}`}
                >
                  <span className="pr-2">{option}</span>
                  {badge}
                </button>
              );
            })}
          </div>

          {/* Answer Explanation & Next Button */}
          {answeredState && (
            <div className="pt-3 border-t border-[#F7EDF3] space-y-3">
              <div className="p-3 rounded-2xl bg-[#FFE5EF]/60 border border-[#FFD2E4] text-xs text-[#493744]">
                <p className="font-bold text-[#C44780] flex items-center gap-1 mb-0.5">
                  <span>🌸</span> Friendship Note:
                </p>
                <p className="leading-relaxed text-[#493744] text-[11px]">
                  {currentQuestion.explanation}
                </p>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center justify-center space-x-1.5 transition-all"
              >
                <span>{currentIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'View Friendship Results'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results Screen */
        <div className="bg-white rounded-3xl p-6 border border-[#F3E6EE] shadow-card text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#FFE5EF] to-[#F0E8FF] border-2 border-[#FFD2E4] flex items-center justify-center text-4xl shadow-soft animate-bounce">
            {personaResult?.flowerEmoji || '🌸'}
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C44780] bg-[#FFE5EF] px-3 py-1 rounded-full">
              {personaResult?.badge}
            </span>
            <h3 className="text-xl font-bold text-[#493744] mt-2">
              {personaResult?.title}
            </h3>
            <p className="text-xs text-[#927F8C] max-w-xs mx-auto mt-1 leading-relaxed">
              {personaResult?.description}
            </p>
          </div>

          {/* Score Badge */}
          <div className="bg-[#FFF8F5] rounded-2xl p-4 border border-[#F3E6EE] max-w-xs mx-auto">
            <span className="text-2xl font-black text-[#C44780]">
              {finalScore?.score} / {finalScore?.total}
            </span>
            <p className="text-[11px] text-[#493744] font-semibold mt-0.5">
              Friendship Affinity Score: {finalScore?.percentage}%
            </p>
            <p className="text-[10px] text-[#927F8C] mt-1">
              Registered for {currentDisplayName} in TrioBloom Records 🌷
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
            <button
              onClick={handleRestartQuiz}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center justify-center space-x-2 transition-all"
            >
              <RotateCcw size={14} />
              <span>Retake Bestie Quiz</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
