const fs = require('fs');
let examView = fs.readFileSync('src/components/ExamSessionView.tsx', 'utf8');

const handleSelectSearch = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id] && !isRestrictedMode) return; // In non-restricted mode, lock after answer.

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  };`;

const handleSelectReplace = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id] && !isRestrictedMode) return; // In non-restricted mode, lock after answer.

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));

    if (!isRestrictedMode && currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1500); // Wait 1.5s to see the feedback before auto-advancing
    }
  };`;

examView = examView.replace(handleSelectSearch, handleSelectReplace);
fs.writeFileSync('src/components/ExamSessionView.tsx', examView);
