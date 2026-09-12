import { z } from 'zod';

/**
 * Regex & Helper Validations
 */
// Password strength: at least 6 characters, at least 1 digit or special character recommended
export const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&._-]{6,}$/;

export const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;

/**
 * Login Schema
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Lütfen e-posta veya kullanıcı adı giriniz.')
    .min(3, 'Giriş bilgisi en az 3 karakter olmalıdır.')
    .refine((val) => {
      // If contains @, must be a valid email
      if (val.includes('@')) {
        return z.string().email().safeParse(val).success;
      }
      // Otherwise student code or username format (alphanumeric, min 3 chars)
      return /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_.-]{3,30}$/.test(val);
    }, {
      message: 'Geçerli bir e-posta adresi veya öğrenci kodu giriniz (Örn: deniz@zekapark.com veya DENIZ2026).',
    }),
  password: z
    .string()
    .min(1, 'Lütfen şifrenizi giriniz.')
    .min(6, 'Şifreniz en az 6 karakter olmalıdır.'),
  role: z.enum(['student', 'parent', 'admin']),
  rememberMe: z.boolean().optional().default(true),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Student Registration Schema
 */
export const registerStudentSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(1, 'Lütfen öğrencinin adını ve soyadını giriniz.')
    .min(2, 'Öğrenci adı en az 2 karakter olmalıdır.')
    .max(50, 'Öğrenci adı en fazla 50 karakter olabilir.')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s.]+$/, 'Öğrenci adı yalnızca harflerden oluşmalıdır.'),
  grade: z
    .number()
    .int()
    .min(1, 'Sınıf 1 ile 4 arasında olmalıdır.')
    .max(4, 'Sınıf 1 ile 4 arasında olmalıdır.'),
  examFocus: z
    .string()
    .min(1, 'Lütfen hedef yetenek alanını seçiniz.'),
  parentEmail: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Lütfen geçerli bir veli e-posta adresi giriniz (Örn: veli@ornek.com).',
    }),
  parentPhone: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\s+/g, '').replace(/[-()]/g, '');
      return phoneRegex.test(cleaned) || /^[0-9]{10,11}$/.test(cleaned);
    }, {
      message: 'Lütfen geçerli bir telefon numarası giriniz (Örn: 0555 123 45 67).',
    }),
  password: z
    .string()
    .min(1, 'Lütfen bir şifre belirleyiniz.')
    .min(6, 'Şifreniz en az 6 karakter olmalıdır.')
    .refine((val) => val.length >= 6, {
      message: 'Şifreniz güvenliğiniz için en az 6 karakter olmalıdır.',
    }),
  kvkkConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'KVKK ve Çocuk Verileri Koruma Aydınlatma Metni\'ni onaylamanız gerekmektedir.',
    }),
});

export type RegisterStudentFormData = z.infer<typeof registerStudentSchema>;

/**
 * Parent Registration Schema
 */
export const registerParentSchema = z.object({
  parentEmail: z
    .string()
    .trim()
    .min(1, 'Lütfen veli e-posta adresinizi giriniz.')
    .email('Lütfen geçerli bir e-posta formatı giriniz (Örn: veli@ornek.com).'),
  parentPhone: z
    .string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\s+/g, '').replace(/[-()]/g, '');
      return phoneRegex.test(cleaned) || /^[0-9]{10,11}$/.test(cleaned);
    }, {
      message: 'Lütfen geçerli bir cep telefonu numarası giriniz.',
    }),
  studentName: z
    .string()
    .trim()
    .min(1, 'Lütfen öğrencinin adını giriniz.')
    .min(2, 'Öğrenci adı en az 2 karakter olmalıdır.')
    .max(50, 'Öğrenci adı en fazla 50 karakter olabilir.'),
  grade: z
    .number()
    .int()
    .min(1, 'Sınıf 1 ile 4 arasında olmalıdır.')
    .max(4, 'Sınıf 1 ile 4 arasında olmalıdır.'),
  examFocus: z.string().min(1, 'Hedef alan seçiniz.'),
  password: z
    .string()
    .min(1, 'Lütfen güvenli bir şifre belirleyiniz.')
    .min(6, 'Şifreniz en az 6 karakter olmalıdır.'),
  kvkkConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'KVKK ve Veli Aydınlatma Sözleşmesi\'ni onaylamanız gerekmektedir.',
    }),
});

export type RegisterParentFormData = z.infer<typeof registerParentSchema>;

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Lütfen kayıtlı veli e-posta adresinizi giriniz.')
    .email('Lütfen geçerli bir e-posta adresi giriniz (Örn: veli@ornek.com).'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * User Profile Update Schema
 */
export const userProfileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'İsim en az 2 karakter olmalıdır.')
    .max(50, 'İsim en fazla 50 karakter olabilir.')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Geçersiz e-posta formatı.')
    .optional(),
  role: z.enum(['student', 'parent', 'admin']).optional(),
  grade: z.number().int().min(1).max(4).optional(),
  avatar: z.string().min(1).optional(),
  dailyGoalMinutes: z.number().int().min(5, 'Günlük hedef en az 5 dakika olmalıdır.').max(180).optional(),
  dailyGoalQuestions: z.number().int().min(5, 'Günlük soru hedefi en az 5 olmalıdır.').max(200).optional(),
  dailyGoalSessions: z.number().int().min(1).max(10).optional(),
  soundEnabled: z.boolean().optional(),
});

export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>;

/**
 * Study Reminder Config Schema
 */
export const studyReminderConfigSchema = z.object({
  enabled: z.boolean(),
  reminderTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Lütfen geçerli bir saat biçimi giriniz (Örn: 17:30).'),
  frequency: z.enum(['daily_fixed', 'interval_3h', 'smart_goal']),
  browserPushEnabled: z.boolean(),
  soundAlert: z.boolean(),
  weekendIncluded: z.boolean(),
  customMessage: z.string().max(120, 'Özel hatırlatma mesajı 120 karakteri geçemez.').optional(),
});

export type StudyReminderConfigData = z.infer<typeof studyReminderConfigSchema>;

/**
 * Password Strength Evaluator (Helper for UI Feedback)
 */
export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Çok Zayıf' | 'Zayıf' | 'Orta' | 'Güçlü' | 'Çok Güçlü';
  color: string;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&._-]/.test(password);

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (hasLetter && hasNumber) score += 1;
  if (hasSpecial) score += 1;

  const labels: PasswordStrength['label'][] = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];
  const colors = [
    'text-rose-500 bg-rose-500',
    'text-orange-500 bg-orange-500',
    'text-amber-500 bg-amber-500',
    'text-emerald-500 bg-emerald-500',
    'text-teal-600 bg-teal-600',
  ];

  return {
    score,
    label: labels[score] || 'Çok Zayıf',
    color: colors[score] || colors[0],
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

/**
 * Format and extract Zod error helper
 */
export function formatZodError(error: z.ZodError<any>): {
  firstMessage: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  const issues = error.issues || [];
  
  issues.forEach((issue) => {
    const field = issue.path.join('.');
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  });

  return {
    firstMessage: issues[0]?.message || 'Lütfen girdiğiniz bilgileri kontrol ediniz.',
    fieldErrors,
  };
}
