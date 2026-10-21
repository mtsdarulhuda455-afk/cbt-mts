import { Exam, Question, QuestionOption, StudentExamSession } from '../types/cbt';

/**
 * Fisher-Yates Shuffle algorithm for randomized questions and options
 */
export function shuffleArray<T>(array: T[]): T[] {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function prepareRandomizedExam(exam: Exam, targetDate?: string): Question[] {
  let questions = [...exam.questions];

  // If specific targetDate or exam.examDate is configured, filter questions whose examDate matches
  const activeDate = targetDate || exam.examDate;
  if (activeDate) {
    const matchingQuestions = questions.filter(q => !q.examDate || q.examDate === activeDate);
    if (matchingQuestions.length > 0) {
      questions = matchingQuestions;
    }
  }

  if (exam.randomizeQuestions) {
    questions = shuffleArray(questions);
  }

  return questions.map((q, idx) => {
    let options: QuestionOption[] = [...q.options];
    if (exam.randomizeOptions && (q.type === 'multiple_choice' || q.type === 'multiple_choice_complex')) {
      options = shuffleArray(options);
    }
    return {
      ...q,
      number: idx + 1,
      options,
      examDate: q.examDate || exam.examDate
    };
  });
}

/**
 * Calculates grade and performance statistics automatically for:
 * - Single choice (multiple_choice)
 * - Multiple choice with >1 answer (multiple_choice_complex)
 * - Matching (matching)
 * - Essay (essay)
 */
export function calculateExamScore(session: StudentExamSession, exam: Exam) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const targetQuestions = session.randomizedQuestions && session.randomizedQuestions.length > 0
    ? session.randomizedQuestions
    : exam.questions;

  targetQuestions.forEach((q) => {
    maxPossibleScore += q.points;
    const studentAnswer = session.answers[q.id];

    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '' || (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
      unansweredCount++;
      return;
    }

    if (q.type === 'multiple_choice') {
      if (studentAnswer === q.correctOptionId) {
        correctCount++;
        totalScore += q.points;
      } else {
        wrongCount++;
      }
    } else if (q.type === 'multiple_choice_complex') {
      const correctIds = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
      const selectedIds: string[] = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];

      const correctlySelected = selectedIds.filter(id => correctIds.includes(id));
      const wronglySelected = selectedIds.filter(id => !correctIds.includes(id));

      if (correctlySelected.length === correctIds.length && wronglySelected.length === 0) {
        correctCount++;
        totalScore += q.points;
      } else if (correctlySelected.length > 0 && wronglySelected.length === 0) {
        // Partial credit
        const partialRatio = correctlySelected.length / Math.max(1, correctIds.length);
        totalScore += Math.round(q.points * partialRatio);
        correctCount++;
      } else {
        wrongCount++;
      }
    } else if (q.type === 'matching') {
      const pairs = q.matchingPairs || [];
      if (pairs.length === 0) {
        correctCount++;
        totalScore += q.points;
      } else {
        const studentMatches: Record<string, string> = typeof studentAnswer === 'object' ? studentAnswer : {};
        let matchesCount = 0;
        pairs.forEach(p => {
          if (studentMatches[p.id] === p.rightAnswer) {
            matchesCount++;
          }
        });

        if (matchesCount === pairs.length) {
          correctCount++;
          totalScore += q.points;
        } else if (matchesCount > 0) {
          totalScore += Math.round((matchesCount / pairs.length) * q.points);
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    } else if (q.type === 'essay') {
      const textAnswer = String(studentAnswer).trim();
      if (textAnswer.length > 0) {
        // Essay evaluation: check keywords if present, or mark completed with baseline score
        let earnedPoints = q.points;
        if (q.keywords && q.keywords.length > 0) {
          const matchedKeywords = q.keywords.filter(kw => textAnswer.toLowerCase().includes(kw.toLowerCase()));
          const ratio = matchedKeywords.length / q.keywords.length;
          earnedPoints = Math.max(Math.round(q.points * 0.5), Math.round(q.points * ratio));
        }
        totalScore += earnedPoints;
        correctCount++;
      } else {
        unansweredCount++;
      }
    }
  });

  const normalizedScore = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 100) 
    : 0;

  return {
    score: normalizedScore,
    correctCount,
    wrongCount,
    unansweredCount,
    isPassed: normalizedScore >= exam.passingGrade,
  };
}

/**
 * Web Audio API synthesizer for instant alert sound during cheat attempts
 */
export function playAlertSound(type: 'warning' | 'lock' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'lock') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // success chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // AudioContext blocked by browser policy without user interaction
  }
}

/**
 * Detects if the browser window indicates a split-screen layout or window docking
 */
export function isSplitScreenDetected(): boolean {
  if (typeof window === 'undefined') return false;
  // If window is smaller than 70% of total screen width on desktop
  const isDesktop = window.screen.width >= 1024;
  if (isDesktop && window.innerWidth < window.screen.width * 0.7) {
    return true;
  }
  // Mobile / Tablet split screen check: height abnormal or window width less than 85% of screen width
  if (!isDesktop && window.innerWidth < window.screen.width * 0.85) {
    return true;
  }
  return false;
}
