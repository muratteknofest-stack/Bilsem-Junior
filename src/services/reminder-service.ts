import { StudyReminderConfig, ReminderAlertEvent, UserProfile } from '../types';
import { sound } from '../lib/sound';

export const DEFAULT_REMINDER_CONFIG: StudyReminderConfig = {
  enabled: true,
  reminderTime: '18:00',
  frequency: 'smart_goal',
  browserPushEnabled: false,
  soundAlert: true,
  weekendIncluded: true,
  customMessage: 'Günün BİLSEM zeka hedefini tamamlamak ve serini korumak için pratik zamanı!',
};

const MOTIVATION_QUOTES = [
  'BİLSEM şampiyonları her gün az da olsa pratik yapar! 🚀',
  'Bugünkü zeka serini kırmamak için sadece birkaç dakikan yeterli! 🔥',
  'Küçük günlük pratikler, büyük zihinsel sıçramalar yaratır! 🧠✨',
  'Hedefine ulaşmana çok az kaldı, zihnini canlandırmaya hazır mısın? 🎯',
  'Yeni bir soru tipi keşfet ve rozetini parlat! ⭐',
];

type AlertListener = (event: ReminderAlertEvent | null) => void;
type ConfigListener = (config: StudyReminderConfig) => void;

class ReminderService {
  private listeners: Set<AlertListener> = new Set();
  private configListeners: Set<ConfigListener> = new Set();
  private activeAlert: ReminderAlertEvent | null = null;
  private intervalId: any = null;

  constructor() {
    // Check periodically in the background
    if (typeof window !== 'undefined') {
      this.intervalId = setInterval(() => {
        this.evaluateBackgroundReminder();
      }, 45000); // Check every 45s
    }
  }

  // Configuration persistence
  getConfig(): StudyReminderConfig {
    if (typeof window === 'undefined') return DEFAULT_REMINDER_CONFIG;
    try {
      const raw = localStorage.getItem('yapyap_reminder_config');
      if (raw) {
        return { ...DEFAULT_REMINDER_CONFIG, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_REMINDER_CONFIG;
  }

  saveConfig(config: Partial<StudyReminderConfig>): StudyReminderConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem('yapyap_reminder_config', JSON.stringify(updated));
    } catch {}
    this.notifyConfigListeners(updated);
    return updated;
  }

  // Subscribe to in-app alerts
  subscribeToAlerts(listener: AlertListener): () => void {
    this.listeners.add(listener);
    if (this.activeAlert) {
      listener(this.activeAlert);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Subscribe to config changes
  subscribeToConfig(listener: ConfigListener): () => void {
    this.configListeners.add(listener);
    listener(this.getConfig());
    return () => {
      this.configListeners.delete(listener);
    };
  }

  private notifyAlertListeners(event: ReminderAlertEvent | null) {
    this.activeAlert = event;
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in reminder listener', e);
      }
    });
  }

  private notifyConfigListeners(config: StudyReminderConfig) {
    this.configListeners.forEach((listener) => {
      try {
        listener(config);
      } catch (e) {
        console.error('Error in config listener', e);
      }
    });
  }

  getActiveAlert(): ReminderAlertEvent | null {
    return this.activeAlert;
  }

  // Web Browser Push Notification Support
  isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isNotificationSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.saveConfig({ browserPushEnabled: granted });
      return granted;
    } catch (e) {
      console.warn('Notification permission request failed or denied:', e);
      return false;
    }
  }

  // Send native browser desktop/mobile push notification
  sendBrowserNotification(title: string, body: string) {
    if (!this.isNotificationSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'yapyap-study-reminder',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn('Native notification dispatch error:', err);
      return false;
    }
  }

  // Trigger an alert (both In-App + Browser Push + Sound)
  triggerAlert(event: ReminderAlertEvent) {
    const config = this.getConfig();

    // 1. Play auditory reminder if sound enabled
    if (config.soundAlert) {
      sound.playReminderChime();
    }

    // 2. Send Browser Push Notification if granted
    if (config.browserPushEnabled && this.getNotificationPermission() === 'granted') {
      this.sendBrowserNotification(
        event.title,
        `${event.message} • ${event.motivationQuote}`
      );
    }

    // 3. Dispatch In-App Banner/Modal
    this.notifyAlertListeners(event);
  }

  // Immediate Test Trigger for user / parent demo
  testReminderNow(user: UserProfile) {
    const remainingMinutes = Math.max(1, user.dailyGoalMinutes - user.todayMinutesSpent);
    const randomQuote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];

    const testEvent: ReminderAlertEvent = {
      id: `test-reminder-${Date.now()}`,
      title: '🎯 yapyap Günlük Çalışma Zamanı!',
      message: `Bugünkü hedefini tamamlamana yalnızca ${remainingMinutes} dakika kaldı!`,
      motivationQuote: randomQuote,
      remainingMinutes,
      dailyGoalMinutes: user.dailyGoalMinutes,
      currentStreak: user.streak,
      suggestedAction: user.todayMinutesSpent === 0 ? 'adaptive' : 'practice',
      timestamp: Date.now(),
    };

    this.triggerAlert(testEvent);
  }

  // Dismiss / Close active alert
  dismissAlert() {
    this.notifyAlertListeners(null);
  }

  // Snooze alert for N minutes (e.g. 15 minutes)
  snoozeAlert(minutes: number = 15) {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    this.saveConfig({ snoozeUntil });
    this.dismissAlert();
  }

  // Background Evaluation
  private evaluateBackgroundReminder() {
    const config = this.getConfig();
    if (!config.enabled) return;

    // Check if snooze is active
    if (config.snoozeUntil && Date.now() < config.snoozeUntil) {
      return;
    }

    // Weekend filter
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && !config.weekendIncluded) {
      return;
    }

    // Retrieve currentUser from localStorage directly to avoid circular dependency
    try {
      const rawUser = localStorage.getItem('yapyap_user');
      if (!rawUser) return;
      const user: UserProfile = JSON.parse(rawUser);

      // If user already accomplished daily goal, no reminder needed!
      if (user.todayMinutesSpent >= user.dailyGoalMinutes) {
        return;
      }

      const todayStr = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [targetHour, targetMinute] = config.reminderTime.split(':').map(Number);

      // Prevent re-triggering multiple times in same hour
      if (config.lastNotifiedDate === todayStr && config.lastNotifiedHour === currentHour) {
        return;
      }

      let shouldTrigger = false;

      if (config.frequency === 'daily_fixed') {
        // Trigger if current time matches configured hour and minute (with 5 min window)
        if (
          currentHour === targetHour &&
          Math.abs(currentMinute - (targetMinute || 0)) <= 2
        ) {
          shouldTrigger = true;
        }
      } else if (config.frequency === 'interval_3h') {
        // Trigger during active study hours (14:00 - 21:00) every ~3 hours if goal unfinished
        if (currentHour >= 14 && currentHour <= 21 && currentHour % 3 === 0 && currentMinute <= 2) {
          shouldTrigger = true;
        }
      } else if (config.frequency === 'smart_goal') {
        // Smart Goal: Trigger at target time OR in the evening (18:00 or 19:30) if user hasn't practiced yet
        if (
          (currentHour === targetHour && Math.abs(currentMinute - (targetMinute || 0)) <= 2) ||
          (currentHour >= 18 && currentHour <= 20 && user.todayMinutesSpent === 0 && config.lastNotifiedDate !== todayStr)
        ) {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        this.saveConfig({
          lastNotifiedDate: todayStr,
          lastNotifiedHour: currentHour,
        });

        const remainingMinutes = Math.max(1, user.dailyGoalMinutes - user.todayMinutesSpent);
        const randomQuote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];

        const alertEvent: ReminderAlertEvent = {
          id: `reminder-${Date.now()}`,
          title: '🎯 BİLSEM Zeka Antrenmanı Zamanı!',
          message: `Bugün ${user.todayMinutesSpent} / ${user.dailyGoalMinutes} dk çalıştın. Hedefine ${remainingMinutes} dk kaldı!`,
          motivationQuote: randomQuote,
          remainingMinutes,
          dailyGoalMinutes: user.dailyGoalMinutes,
          currentStreak: user.streak,
          suggestedAction: 'practice',
          timestamp: Date.now(),
        };

        this.triggerAlert(alertEvent);
      }
    } catch {}
  }
}

export const reminderService = new ReminderService();
