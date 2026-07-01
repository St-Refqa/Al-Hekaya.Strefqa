const fs = require('fs');
let c = fs.readFileSync('src/pages/public/PublicAssessment.tsx', 'utf8');

const startMatch = c.indexOf('    try {\n      await runTransaction(db, async (transaction) => {');
const endMatch = c.indexOf('    } finally {\n      setIsEvaluating(false);');

if(startMatch !== -1 && endMatch !== -1) {
  const newCode = `    try {
      const submission: Submission = {
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
      const submission: Submission = {
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
        unansweredCount,
        id: fakeId
      };
      const payload = {
        submission,
        participantPhone,
        userId: targetUserId,
        baseScore
      };
      
      savePendingSubmission(payload);
      
      setFinalSubmission(payload.submission);
      setIsOfflineSaved(true);
      setPhase("RESULTS");
      import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
`;

  c = c.slice(0, startMatch) + newCode + c.slice(endMatch);
  fs.writeFileSync('src/pages/public/PublicAssessment.tsx', c);
  console.log('Fixed Assessment logic');
} else {
  console.log('Match failed: startMatch=', startMatch, ' endMatch=', endMatch);
}
