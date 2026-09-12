const fs = require('fs');
let code = fs.readFileSync('src/components/ParentPortalView.tsx', 'utf8');

// Add imports
code = code.replace(
  "import { dataService } from '../services/data-service';",
  "import { dataService } from '../services/data-service';\nimport { db } from '../lib/firebase';\nimport { doc, getDoc } from 'firebase/firestore';"
);

// Replace component start
const oldCompStart = `export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ student, masteries }) => {
  const currentStudent = student || {
    name: 'Demir Yılmaz',
    level: 4,
    avatar: '🦊',
    role: 'student'
  };
  const [reminderConfig, setReminderConfig] = useState<StudyReminderConfig>(() => reminderService.getConfig());`;

const newCompStart = `export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ student: parentOrStudent, masteries }) => {
  const [currentStudent, setCurrentStudent] = useState<UserProfile>({
    id: 'demo',
    name: 'Demir Yılmaz',
    level: 4,
    avatar: '🦊',
    role: 'student',
    xp: 0,
    streak: 0,
    dailyGoalMinutes: 15,
    todayMinutesSpent: 0,
    soundEnabled: true,
    lastActiveDate: new Date().toISOString()
  });

  const [isLoadingStudent, setIsLoadingStudent] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!parentOrStudent) return;
      
      if (parentOrStudent.role === 'parent' && parentOrStudent.linkedStudentIds && parentOrStudent.linkedStudentIds.length > 0) {
        setIsLoadingStudent(true);
        try {
          const docRef = doc(db, 'users', parentOrStudent.linkedStudentIds[0]);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setCurrentStudent(snap.data() as UserProfile);
          }
        } catch(e) {
          console.error(e);
        } finally {
          setIsLoadingStudent(false);
        }
      } else if (parentOrStudent.role === 'student') {
        setCurrentStudent(parentOrStudent as UserProfile);
      }
    };
    fetchStudent();
  }, [parentOrStudent]);

  const [reminderConfig, setReminderConfig] = useState<StudyReminderConfig>(() => reminderService.getConfig());`;

code = code.replace(oldCompStart, newCompStart);

// Now find where name is displayed and add the student code
const oldHeader = `              <h1 className="text-2xl sm:text-3xl font-bold">Veli Portalı</h1>
              <p className="text-parent-100 mt-1 flex items-center gap-2">
                <span>Öğrenci: <strong>{currentStudent.name}</strong></span>
                <span className="w-1.5 h-1.5 rounded-full bg-parent-300" />
                <span>Seviye {currentStudent.level || 1}</span>
              </p>`;

const newHeader = `              <h1 className="text-2xl sm:text-3xl font-bold">Veli Portalı</h1>
              {isLoadingStudent ? (
                <div className="text-parent-100 mt-2 text-sm animate-pulse">Öğrenci bilgileri yükleniyor...</div>
              ) : (
                <div className="space-y-1 mt-1">
                  <p className="text-parent-100 flex items-center gap-2">
                    <span>Öğrenci: <strong>{currentStudent.name}</strong></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-parent-300" />
                    <span>Seviye {currentStudent.level || 1}</span>
                  </p>
                  {currentStudent.studentCode && (
                    <div className="inline-flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-md text-xs font-medium text-parent-50">
                      Giriş Kodu: <span className="font-bold tracking-wider">{currentStudent.studentCode}</span>
                    </div>
                  )}
                </div>
              )}`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/components/ParentPortalView.tsx', code);
