export const UI_TEXT = {
  appName: "SkyShield",
  lobby: {
    title: "ניהול חדר",
    subtitle: "צרו או הצטרפו לחדר, ואז עברו למרכז הפיקוד החי.",
    playerNameLabel: "שם שחקן",
    playerNamePlaceholder: "2-16 תווים",
    characterLabel: "דמות",
    roomCodeLabel: "קוד חדר",
    roomCodePlaceholder: "AB12",
    createRoom: "יצירת חדר",
    joinRoom: "הצטרפות לחדר",
    offlineMode: "שחקן יחיד (אופליין)",
    snapshotTitle: "תמונת מצב חדר",
    noRoomData: "אין עדיין נתוני חדר.",
    roomPrefix: "חדר",
    scoreUnit: "נק'"
  },
  room: {
    eyebrow: "חדר",
    playersTitle: "שחקנים",
    waitingForSync: "ממתינים לסנכרון חדר.",
    waitingForMatchTitle: "ממתינים לתחילת משחק",
    waitingForMatchSubtitle: "המארח יכול להתחיל כשהשחקנים מוכנים.",
    backToLobby: "חזרה ללובי",
    startGame: "התחל משחק",
    hostOnly: "למארח בלבד",
    playAgain: "שחקו שוב"
  },
  offline: {
    eyebrow: "שחקן יחיד",
    title: "הגנה לא מקוונת",
    start: "התחל משחק אופליין",
    retry: "נסה שוב",
    profileTitle: "פרופיל טייס",
    defaultPilotName: "טייס",
    profileCopy: "רץ מקומית בדפדפן ללא אירועי משחק דרך Socket.",
    readyTitle: "מוכנים לשיגור",
    readySubtitle: "התחילו סשן הגנה מלא של 10 דקות עם אותם חוקי סימולציה כמו במולטיפלייר."
  },
  match: {
    hudTime: "זמן",
    hudCityHp: "חיי עיר",
    hudTopScore: "שיא ניקוד",
    countdownPrefix: "המשחק מתחיל בעוד",
    hitPrefix: "פגיעה",
    leaderboardTitle: "לוח תוצאות",
    leaderboardEmpty: "אין עדיין ניקוד.",
    resultPanelTitle: "סיכום משחק",
    win: "ניצחון",
    lose: "הפסד",
    reasonTimer: "הזמן הסתיים",
    reasonCityDestroyed: "העיר הושמדה",
    finalLeaderboardTitle: "דירוג סופי",
    accuracyLabel: "דיוק"
  },
  audio: {
    on: "שמע: פעיל",
    off: "שמע: כבוי"
  },
  status: {
    disconnected: "מנותק",
    connectedPrefix: "מחובר",
    errorPrefix: "שגיאה",
    invalidProfile: "יש להזין שם שחקן ודמות תקינים",
    missingRoomCode: "חסר קוד חדר",
    offlineActive: "מצב אופליין פעיל"
  }
} as const;

export type UiText = typeof UI_TEXT;
export type UiTextSection = keyof UiText;

export function uiText(): UiText {
  return UI_TEXT;
}
