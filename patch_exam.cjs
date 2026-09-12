const fs = require('fs');

let examView = fs.readFileSync('src/components/ExamSessionView.tsx', 'utf8');

// 1. Add `isRestrictedMode` to state
const stateSearch = `  // Duration & Strict Mode settings
  const [isStrictMode, setIsStrictMode] = useState<boolean>(true);`;
const stateReplace = `  // Duration & Strict Mode settings
  const [isStrictMode, setIsStrictMode] = useState<boolean>(true);
  const [isRestrictedMode, setIsRestrictedMode] = useState<boolean>(false);`;
examView = examView.replace(stateSearch, stateReplace);

// 2. Add Restricted Mode toggle to settings menu
const toggleSearch = `          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Katı Süre Modu (Strict Mode)</span>`;

const toggleReplace = `          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Kısıtlı Sınav Modu</span>
                <span className={\`text-[10px] font-extrabold px-2 py-0.5 rounded-full \${
                  isRestrictedMode ? 'bg-indigo-500 text-white' : 'bg-white/20 text-slate-300'
                }\`}>
                  {isRestrictedMode ? 'AKTİF' : 'PASİF'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                {isRestrictedMode
                  ? 'Geri bildirim yok: Doğru/yanlış sonuçları ve açıklamalar sadece sınav sonunda gösterilir.'
                  : 'Serbest mod: Seçim yaptıktan sonra anında doğru/yanlış bildirimi gösterilir.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsRestrictedMode(!isRestrictedMode);
              }}
              className={\`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden \${
                isRestrictedMode ? 'bg-indigo-500' : 'bg-white/30'
              }\`}
            >
              <span className={\`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out \${
                isRestrictedMode ? 'translate-x-7' : 'translate-x-0'
              }\`} />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Katı Süre Modu (Strict Mode)</span>`;
examView = examView.replace(toggleSearch, toggleReplace);

// 3. Modify rendering of options and navigation during the exam
// Find handleSelectOption
const handleSelectSearch = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id]) return; // Already answered this question

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));

    // If we're on the last question, we don't automatically finish anymore.
    // The user must click the "Sınavı Bitir" button.
  };`;
const handleSelectReplace = `  const handleSelectOption = (optId: string) => {
    if (answers[currentQ.id] && !isRestrictedMode) return; // In non-restricted mode, lock after answer.

    sound.playSelect();
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  };`;
examView = examView.replace(handleSelectSearch, handleSelectReplace);

// 4. Modify the options rendering inside the JSX
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
            ))}
          </div>`;

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
            ))}
          </div>`;
examView = examView.replace(optionsSearch, optionsReplace);

// 5. Add next/prev navigation changes based on isRestrictedMode
const navigationSearch = `          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 mt-6 border-t border-zinc-200">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Önceki
            </button>`;

const navigationReplace = `          {/* Navigation Tips */}
          {isRestrictedMode && (
            <div className="p-3 mt-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <strong>Kısıtlı Mod Açık:</strong> Anında sonuç verilmez. Önceki veya sonraki sorulara dilediğin gibi geçebilir, verdiğin yanıtları sınavı bitirene kadar değiştirebilirsin.
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 mt-6 border-t border-zinc-200">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Önceki
            </button>`;
examView = examView.replace(navigationSearch, navigationReplace);

// Save the file
fs.writeFileSync('src/components/ExamSessionView.tsx', examView);

