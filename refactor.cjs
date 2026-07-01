const fs = require('fs');

let content = fs.readFileSync('src/pages/public/PublicAssessment.tsx', 'utf8');

const hookImport = `import { useOfflineSync } from "../../hooks/useOfflineSync";\nimport { processSubmissionTransaction } from "../../lib/submissionHelper";\n`;
content = content.replace(
  'import { evaluateShortAnswer, getAIHint } from "../../lib/gemini";',
  'import { evaluateShortAnswer, getAIHint } from "../../lib/gemini";\n' + hookImport
);

content = content.replace(
  'const [showExitConfirm, setShowExitConfirm] = useState(false);',
  `const [showExitConfirm, setShowExitConfirm] = useState(false);\n  const [isOfflineSaved, setIsOfflineSaved] = useState(false);\n  const { savePendingSubmission } = useOfflineSync();`
);

const tryBlockStart = content.indexOf('    try {\n      await runTransaction(db, async (transaction) => {');
const catchBlockEnd = content.indexOf('    } finally {\n      setIsEvaluating(false);');

if (tryBlockStart !== -1 && catchBlockEnd !== -1) {
  const newLogic = `    const submission: Submission = {
      participantId: targetUserId || participantPhone,
      assessmentId: id!,
      participantName,
      participantPhoneOrId: participantPhone,
      participantPhotoUrl: authUser?.photoUrl || undefined,
      assessmentTitle: assessment!.title,
      assessmentVersion: assessment!.version || 1,
      date: new Date().toISOString(),
      readingTimeSeconds: totalReadingTime || (assessment!.readingDuration * 60),
      answeringTimeSeconds: ansTotalTime,
      answers: finalAnswers,
      baseScore,
      maxScore: finalAnswers.reduce((a,c) => a+c.maxPoints, 0),
      bonusPoints: 0,
      finalScore: baseScore,
      streakCount: 1, // Will be updated by helper
      status: "completed",
      submittedManually: !auto,
      unansweredCount
    };

    const payload = {
      submission,
      participantPhone,
      userId: targetUserId,
      baseScore
    };

    try {
      if (!navigator.onLine) {
        throw new Error("Offline mode");
      }
      const finalSub = await processSubmissionTransaction(payload);
      setFinalSubmission(finalSub);
      setPhase("RESULTS");
      import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
    } catch (err: any) {
      console.warn("Falling back to offline save due to error:", err);
      const fakeId = "offline_" + Date.now();
      payload.submission.id = fakeId;
      savePendingSubmission(payload);
      
      setFinalSubmission(payload.submission);
      setIsOfflineSaved(true);
      setPhase("RESULTS");
      import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
`;
  content = content.slice(0, tryBlockStart) + newLogic + content.slice(catchBlockEnd);
}

const depArrStr = '  }, [assessment, answeringTimeLeft, authUser, participantPhone, participantName, id, totalReadingTime]);';
content = content.replace(depArrStr, '  }, [assessment, answeringTimeLeft, authUser, participantPhone, participantName, id, totalReadingTime, savePendingSubmission]);');

const resultBanner = `          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
            {isOfflineSaved && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center gap-3 text-amber-800 text-sm font-bold text-center animate-pulse">
                <span>⚠️</span> النت ضعيف أو قطع! تم حفظ نتيجتك على الجهاز وهتترفع تلقائياً أول ما النت يرجع، متقلقش!
              </div>
            )}
            <div className="flex flex-col md:flex-row items-center gap-8">`;

content = content.replace(
  '<div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">\n            <div className="flex flex-col md:flex-row items-center gap-8">',
  resultBanner
);

fs.writeFileSync('src/pages/public/PublicAssessment.tsx', content);
console.log('Replacement done');
