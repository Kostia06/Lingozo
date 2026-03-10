'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Trophy,
  RefreshCw,
  ArrowRight,
  Star,
  Loader2,
} from 'lucide-react';

export default function QuizComponent({
  quiz,
  onComplete,
  language,
  onQuizComplete
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Notify parent when quiz is completed
  useEffect(() => {
    if (showResult && !hasNotifiedCompletion && onQuizComplete) {
      const percentage = Math.round((score / quiz.questions.length) * 100);
      const summary = `📊 Quiz Completed!\n\nScore: ${score}/${quiz.questions.length} (${percentage}%)\nQuiz Type: ${quiz.quizType || 'General'}`;

      const quizResults = {
        score,
        totalQuestions: quiz.questions.length,
        percentage,
        quizType: quiz.quizType || 'General',
        answers
      };

      onQuizComplete(summary, quizResults);
      setHasNotifiedCompletion(true);
    }
  }, [showResult, hasNotifiedCompletion, score, quiz.questions.length, quiz.quizType, answers, onQuizComplete]);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl text-center"
      >
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading quiz...</p>
      </motion.div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleAnswer = (answerIndex) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === question.correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([...answers, {
      question: question.question,
      selected: answerIndex,
      correct: question.correctAnswer,
      isCorrect,
    }]);

    setTimeout(() => {
      if (isLastQuestion) {
        setShowResult(true);
      } else {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      }
    }, 1500);
  };

  const getAnswerClassName = (index) => {
    if (selectedAnswer === null) {
      return "bg-white/60 dark:bg-gray-800/60 hover:bg-purple-50/80 dark:hover:bg-purple-900/30 border-white/40 dark:border-gray-700/40 hover:border-purple-300/60";
    }

    if (index === question.correctAnswer) {
      return "bg-green-500/20 border-green-500/60 text-green-900 dark:text-green-100";
    }

    if (index === selectedAnswer && index !== question.correctAnswer) {
      return "bg-red-500/20 border-red-500/60 text-red-900 dark:text-red-100";
    }

    return "bg-gray-300/40 dark:bg-gray-700/40 border-gray-400/40";
  };

  if (showResult) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const isPerfect = percentage === 100;
    const isGood = percentage >= 70;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl mx-2 sm:mx-0"
      >
        <div className="text-center">
          {/* Trophy Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br ${
              isPerfect ? 'from-yellow-400 to-orange-500' :
              isGood ? 'from-green-400 to-emerald-500' :
              'from-blue-400 to-cyan-500'
            } flex items-center justify-center`}
          >
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>

          {/* Score */}
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isPerfect ? '🎉 Perfect Score!' :
             isGood ? '👏 Great Job!' :
             '💪 Keep Practicing!'}
          </h3>
          <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 sm:mb-4">
            {score} / {quiz.questions.length}
          </p>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
            You got {percentage}% correct!
          </p>

          {/* Detailed Results */}
          <div className="space-y-2 mb-4 sm:mb-6 max-h-48 sm:max-h-60 overflow-y-auto">
            {answers.map((answer, index) => (
              <div
                key={index}
                className={`p-2 sm:p-3 rounded-lg text-left ${
                  answer.isCorrect
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {answer.isCorrect ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {answer.question}
                    </p>
                    {!answer.isCorrect && (
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Correct answer: {quiz.questions[index].options[answer.correct]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm sm:text-base"
            >
              Continue Learning
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={currentQuestion}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl mx-2 sm:mx-0"
    >
      {/* Progress Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
            Score: {score}
          </span>
        </div>
        <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
          {question.question}
        </h3>
        {question.hint && (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            💡 {question.hint}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2 sm:space-y-3">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={selectedAnswer === null ? { scale: 1.02, x: 5 } : {}}
            whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
            onClick={() => handleAnswer(index)}
            disabled={selectedAnswer !== null}
            className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 backdrop-blur-lg text-left transition-all ${getAnswerClassName(index)} ${
              selectedAnswer !== null ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm sm:text-base">{option}</span>
              {selectedAnswer !== null && (
                <>
                  {index === question.correctAnswer && (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  {index === selectedAnswer && index !== question.correctAnswer && (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                </>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Explanation */}
      {selectedAnswer !== null && question.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/30"
        >
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <strong>💡 Explanation:</strong> {question.explanation}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
