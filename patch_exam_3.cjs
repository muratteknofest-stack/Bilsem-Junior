const fs = require('fs');
let examView = fs.readFileSync('src/components/ExamSessionView.tsx', 'utf8');

const optionsSearch = `          {/* Answer Options Grid (CONFIDENTIAL: No immediate feedback!) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currentQ.options.map((opt) => (
              <OptionRenderer
                key={opt.id}
                option={opt}
                isSelected={answers[currentQ.id] === opt.id}
                onSelect={() => handleSelectOption(opt.id)}
                disabled={false}
              />
            ))}`;

const optionsReplace = `          {/* Answer Options Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currentQ.options.map((opt) => (
              <OptionRenderer
                key={opt.id}
                option={opt}
                isSelected={answers[currentQ.id] === opt.id}
                onSelect={() => handleSelectOption(opt.id)}
                disabled={!!answers[currentQ.id] && !isRestrictedMode}
                showCorrect={!!answers[currentQ.id] && !isRestrictedMode}
                isCorrectOption={opt.id === currentQ.correctOptionId}
                questionType={currentQ.type}
              />
            ))}`;

examView = examView.replace(optionsSearch, optionsReplace);

const handleSelectSearch2 = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id]) return; // Already answered this question

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));

    // If we're on the last question, we don't automatically finish anymore.
    // The user must click the "Sınavı Bitir" button.
  };`;

const handleSelectReplace2 = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id] && !isRestrictedMode) return; // In non-restricted mode, lock after answer.

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));

    if (!isRestrictedMode && currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1500); // Wait 1.5s to see the feedback before auto-advancing
    }
  };`;

examView = examView.replace(handleSelectSearch2, handleSelectReplace2);

fs.writeFileSync('src/components/ExamSessionView.tsx', examView);
