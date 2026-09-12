const fs = require('fs');

let parentView = fs.readFileSync('src/components/ParentPortalView.tsx', 'utf8');

// Add import for StudentSettingsModal
parentView = parentView.replace(
  "import { StudyReminderSettingsModal } from './StudyReminderSettingsModal';",
  "import { StudyReminderSettingsModal } from './StudyReminderSettingsModal';\nimport { StudentSettingsModal } from './StudentSettingsModal';\nimport { useAuth } from '../contexts/AuthContext';"
);

// Add state for modal
parentView = parentView.replace(
  "const [showReminderModal, setShowReminderModal] = useState(false);",
  "const [showReminderModal, setShowReminderModal] = useState(false);\n  const [showStudentSettingsModal, setShowStudentSettingsModal] = useState(false);\n  const { userProfile: parentProfile, sendPasswordResetEmail } = useAuth();"
);

// Add button to open modal
const oldBtnContainer = `<button 
            onClick={() => {
              sound.playClick();
              setShowReminderModal(true);
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 transition-all font-medium flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Bildirim & Çalışma Ayarları
          </button>`;

const newBtnContainer = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button 
              onClick={() => {
                sound.playClick();
                setShowStudentSettingsModal(true);
              }}
              className="px-4 py-2 bg-white text-parent-700 hover:bg-parent-50 rounded-xl transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              Öğrenci Giriş Bilgileri
            </button>
            <button 
              onClick={() => {
                sound.playClick();
                setShowReminderModal(true);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 transition-all font-medium flex items-center justify-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              Ayarlar
            </button>
          </div>`;

parentView = parentView.replace(oldBtnContainer, newBtnContainer);

// Add icon import for KeyRound
parentView = parentView.replace(
  "import {\n  Brain,\n  TrendingUp,",
  "import {\n  Brain,\n  TrendingUp,\n  KeyRound,"
);

// Add modal component
const oldReturnEnd = `        />
      )}
    </div>
  );
};`;

const newReturnEnd = `        />
      )}

      {currentStudent && (
        <StudentSettingsModal
          isOpen={showStudentSettingsModal}
          onClose={() => setShowStudentSettingsModal(false)}
          student={currentStudent}
          parentEmail={parentProfile?.email}
          onSendResetEmail={sendPasswordResetEmail}
        />
      )}
    </div>
  );
};`;

parentView = parentView.replace(oldReturnEnd, newReturnEnd);

fs.writeFileSync('src/components/ParentPortalView.tsx', parentView);
