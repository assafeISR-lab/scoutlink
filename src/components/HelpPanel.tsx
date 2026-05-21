'use client'
import { useMemo, useState } from 'react'

type Lang = 'en' | 'he'

type LocaleContent = {
  category: string
  title: string
  steps: string[]
  tip?: string
}

type Topic = {
  id: string
  keywords: string[]
  en: LocaleContent
  he: LocaleContent
}

const TOPICS: Topic[] = [
  // ── Getting Started ──────────────────────────────────────────────
  {
    id: 'what-is-scoutlink',
    keywords: ['what', 'scoutlink', 'intro', 'start', 'begin', 'מה', 'התחלה'],
    en: {
      category: 'Getting Started',
      title: 'What is ScoutLink?',
      steps: [
        'ScoutLink is your personal football scouting app.',
        'You can create lists of players you want to track — like "My Wingers" or "Under-21 Strikers".',
        'For each player you can store stats, notes, a heat map, and contact info.',
        'You can also search the internet for players and pull their data automatically.',
      ],
    },
    he: {
      category: 'התחלה',
      title: 'מה זה ScoutLink?',
      steps: [
        'ScoutLink היא אפליקציית סקאוטינג כדורגל אישית שלך.',
        'אפשר ליצור רשימות של שחקנים שרוצים לעקוב אחריהם — למשל "הכנפיים שלי" או "תוקפים מתחת לגיל 21".',
        'לכל שחקן אפשר לשמור סטטיסטיקות, הערות, מפת חום ופרטי קשר.',
        'אפשר גם לחפש שחקנים באינטרנט ולמשוך את הנתונים שלהם אוטומטית.',
      ],
    },
  },
  {
    id: 'navigate',
    keywords: ['navigate', 'sidebar', 'menu', 'where', 'find', 'ניווט', 'תפריט'],
    en: {
      category: 'Getting Started',
      title: 'How to navigate the app',
      steps: [
        'The sidebar on the left is your main menu.',
        '"Databases" shows all your player lists.',
        '"Scout Board" is your personal tracking board — like a whiteboard for players.',
        '"Search All Lists" lets you filter players across every list you have.',
        '"Reports" lets you create printable player reports.',
        '"Settings" is where you connect scouting websites and manage your account.',
      ],
    },
    he: {
      category: 'התחלה',
      title: 'איך להתמצא באפליקציה',
      steps: [
        'סרגל הצד משמאל הוא התפריט הראשי שלך.',
        '"Databases" מציג את כל רשימות השחקנים שלך.',
        '"Scout Board" הוא לוח המעקב האישי שלך — כמו לוח לבן לשחקנים.',
        '"Search All Lists" מאפשר לסנן שחקנים מכל הרשימות שלך.',
        '"Reports" מאפשר ליצור דוחות שחקנים להדפסה.',
        '"Settings" הוא המקום לחבר אתרי סקאוטינג ולנהל את החשבון.',
      ],
    },
  },

  // ── Lists ────────────────────────────────────────────────────────
  {
    id: 'what-is-list',
    keywords: ['list', 'database', 'what', 'group', 'רשימה', 'מה'],
    en: {
      category: 'Lists',
      title: 'What is a list?',
      steps: [
        'A list (also called a "database") is a folder of players you group together.',
        'For example: "Defenders Under 23" or "Midfielders - January Window".',
        'Each list has its own table of players with the columns you choose.',
        'You can have as many lists as you want.',
      ],
    },
    he: {
      category: 'רשימות',
      title: 'מה זה רשימה?',
      steps: [
        'רשימה (נקראת גם "database") היא תיקייה של שחקנים שמקבצים יחד.',
        'לדוגמה: "סנטרבקים מתחת לגיל 23" או "קשרים — חלון ינואר".',
        'לכל רשימה יש טבלת שחקנים משלה עם עמודות שאתה בוחר.',
        'אפשר ליצור כמה רשימות שרוצים.',
      ],
    },
  },
  {
    id: 'create-list',
    keywords: ['create', 'new', 'list', 'add', 'database', 'ליצור', 'חדש', 'רשימה'],
    en: {
      category: 'Lists',
      title: 'How to create a new list',
      steps: [
        'Click "Databases" in the left sidebar.',
        'Click the "+ New List" button at the top right.',
        'Type a name for your list (e.g. "Left Backs").',
        'Click "Create" and your new empty list will open.',
      ],
    },
    he: {
      category: 'רשימות',
      title: 'איך ליצור רשימה חדשה',
      steps: [
        'לחץ על "Databases" בסרגל הצד.',
        'לחץ על הכפתור "+ New List" בפינה.',
        'הקלד שם לרשימה שלך (לדוגמה "מגנים שמאליים").',
        'לחץ "Create" והרשימה החדשה הריקה תיפתח.',
      ],
    },
  },
  {
    id: 'delete-list',
    keywords: ['delete', 'remove', 'list', 'database', 'למחוק', 'רשימה'],
    en: {
      category: 'Lists',
      title: 'How to delete a list',
      steps: [
        'Open the list you want to delete.',
        'Click the three-dot menu (⋯) near the list name.',
        'Choose "Delete List" and confirm.',
        'Warning: this deletes all players in that list permanently.',
      ],
      tip: 'You cannot undo a list deletion, so double-check before confirming.',
    },
    he: {
      category: 'רשימות',
      title: 'איך למחוק רשימה',
      steps: [
        'פתח את הרשימה שברצונך למחוק.',
        'לחץ על תפריט שלוש הנקודות (⋯) ליד שם הרשימה.',
        'בחר "Delete List" ואשר.',
        'שים לב: פעולה זו מוחקת לצמיתות את כל השחקנים ברשימה.',
      ],
      tip: 'לא ניתן לבטל מחיקת רשימה — כדאי לוודא לפני האישור.',
    },
  },

  // ── Players ──────────────────────────────────────────────────────
  {
    id: 'add-player-manual',
    keywords: ['add', 'player', 'manual', 'new', 'create', 'להוסיף', 'שחקן', 'ידנית'],
    en: {
      category: 'Players',
      title: 'How to add a player manually',
      steps: [
        'Open the list where you want to add the player.',
        'Click the "+ Add Player" button.',
        'Fill in the player\'s name (required) and any other details you know.',
        'Click "Add Player" to save.',
      ],
      tip: 'You can always edit or add more details later by clicking the player\'s name.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך להוסיף שחקן ידנית',
      steps: [
        'פתח את הרשימה שאליה רוצים להוסיף שחקן.',
        'לחץ על הכפתור "+ Add Player".',
        'מלא את שם השחקן (שדה חובה) וכל פרט נוסף שאתה יודע.',
        'לחץ "Add Player" לשמירה.',
      ],
      tip: 'אפשר תמיד לערוך ולהוסיף פרטים נוספים מאוחר יותר על ידי לחיצה על שם השחקן.',
    },
  },
  {
    id: 'web-scout',
    keywords: ['web scout', 'search', 'scrape', 'find', 'sofascore', 'transfermarkt', 'חיפוש', 'לחפש'],
    en: {
      category: 'Players',
      title: 'How to search for a player (Web Scout)',
      steps: [
        'Click "Web Scout" in the left sidebar.',
        'Type the player\'s name in the search box and press Enter.',
        'ScoutLink will search Transfermarkt, Sofascore, and FMInside for you.',
        'You\'ll see a card for each player found with stats, position, club, and more.',
        'To save a player to a list, click "Import to List" on their card and choose which list.',
      ],
      tip: 'If the player has a common name you may see multiple results — check the photo and club to pick the right one.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך לחפש שחקן (Web Scout)',
      steps: [
        'לחץ על "Web Scout" בסרגל הצד.',
        'הקלד את שם השחקן בתיבת החיפוש ולחץ Enter.',
        'ScoutLink יחפש עבורך ב-Transfermarkt, Sofascore ו-FMInside.',
        'תראה כרטיס לכל שחקן שנמצא עם סטטיסטיקות, עמדה, מועדון ועוד.',
        'כדי לשמור שחקן לרשימה, לחץ "Import to List" על הכרטיס שלו ובחר לאיזו רשימה.',
      ],
      tip: 'אם לשחקן יש שם נפוץ ייתכן שתראה כמה תוצאות — בדוק את התמונה והמועדון כדי לבחור את הנכון.',
    },
  },
  {
    id: 'scout-by-url',
    keywords: ['url', 'link', 'paste', 'sofascore', 'transfermarkt', 'fminside', 'scout', 'קישור', 'לינק'],
    en: {
      category: 'Players',
      title: 'How to scout a player by URL',
      steps: [
        'Find the player\'s profile page on Sofascore, Transfermarkt, or FMInside in your browser.',
        'Copy the full URL (web address) from the top of your browser.',
        'Go to "Web Scout" in ScoutLink.',
        'Paste the URL into the search box and press Enter.',
        'ScoutLink will read the player\'s name from the link and search all 3 sites automatically.',
      ],
      tip: 'The URL must go to a specific player page, not a team page or search results page.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך לאתר שחקן לפי קישור (URL)',
      steps: [
        'מצא את דף הפרופיל של השחקן ב-Sofascore, Transfermarkt או FMInside בדפדפן שלך.',
        'העתק את ה-URL המלא (כתובת האתר) מלמעלה בדפדפן.',
        'עבור ל-"Web Scout" ב-ScoutLink.',
        'הדבק את ה-URL בתיבת החיפוש ולחץ Enter.',
        'ScoutLink יקרא את שם השחקן מהקישור ויחפש בכל 3 האתרים אוטומטית.',
      ],
      tip: 'ה-URL חייב להוביל לדף שחקן ספציפי, לא לדף מועדון או תוצאות חיפוש.',
    },
  },
  {
    id: 'import-excel',
    keywords: ['import', 'excel', 'csv', 'upload', 'bulk', 'spreadsheet', 'ייבוא', 'אקסל'],
    en: {
      category: 'Players',
      title: 'How to import players from Excel / CSV',
      steps: [
        'Open the list you want to import players into.',
        'Click the "Import" button (arrow icon) near the top right.',
        'Upload your Excel (.xlsx) or CSV file.',
        'ScoutLink will try to match your column names to player fields automatically.',
        'Fix any columns that didn\'t match, then click "Import".',
      ],
      tip: 'The column "Name" or "Player Name" is required. Everything else is optional.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך לייבא שחקנים מאקסל / CSV',
      steps: [
        'פתח את הרשימה שאליה רוצים לייבא שחקנים.',
        'לחץ על כפתור "Import" (אייקון חץ) בפינה.',
        'העלה את קובץ האקסל (.xlsx) או CSV שלך.',
        'ScoutLink ינסה להתאים אוטומטית את שמות העמודות לשדות השחקן.',
        'תקן עמודות שלא הותאמו, ואז לחץ "Import".',
      ],
      tip: 'העמודה "Name" או "Player Name" היא חובה. כל השאר אופציונלי.',
    },
  },

  // ── Player Profile ───────────────────────────────────────────────
  {
    id: 'view-profile',
    keywords: ['profile', 'view', 'open', 'details', 'player', 'פרופיל', 'לפתוח'],
    en: {
      category: 'Player Profile',
      title: 'How to view a player\'s full profile',
      steps: [
        'Open any list and find the player in the table.',
        'Click the player\'s name (it\'s a blue link).',
        'This opens the full profile card with all their info, stats, and heat map.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך לצפות בפרופיל מלא של שחקן',
      steps: [
        'פתח רשימה כלשהי ומצא את השחקן בטבלה.',
        'לחץ על שם השחקן (קישור כחול).',
        'זה יפתח את כרטיס הפרופיל המלא עם כל המידע, הסטטיסטיקות ומפת החום.',
      ],
    },
  },
  {
    id: 'edit-profile',
    keywords: ['edit', 'update', 'change', 'profile', 'details', 'save', 'לערוך', 'לשנות'],
    en: {
      category: 'Player Profile',
      title: 'How to edit a player\'s details',
      steps: [
        'Open the player\'s profile by clicking their name.',
        'Click the pencil icon (✏️) or click directly on any field to edit it.',
        'Type the new value.',
        'Click "Save" at the bottom of the card, or click outside the field to auto-save.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך לערוך פרטי שחקן',
      steps: [
        'פתח את פרופיל השחקן על ידי לחיצה על שמו.',
        'לחץ על אייקון העיפרון (✏️) או לחץ ישירות על כל שדה לעריכה.',
        'הקלד את הערך החדש.',
        'לחץ "Save" בתחתית הכרטיס, או לחץ מחוץ לשדה לשמירה אוטומטית.',
      ],
    },
  },
  {
    id: 'availability-toggle',
    keywords: ['available', 'unavailable', 'toggle', 'status', 'transfer', 'זמין', 'סטטוס'],
    en: {
      category: 'Player Profile',
      title: 'How to mark a player as Available / Not Available',
      steps: [
        'In the player list table, find the "Status" column.',
        'Click the green "Available" or grey "Not Available" badge to toggle it.',
        'You can also toggle it from inside the player\'s profile card.',
        'Use the Status filter in the filter bar to show only available players.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך לסמן שחקן כזמין / לא זמין',
      steps: [
        'בטבלת השחקנים, מצא את עמודת "Status".',
        'לחץ על התג הירוק "Available" או האפור "Not Available" כדי לשנות.',
        'אפשר לשנות גם מתוך כרטיס הפרופיל של השחקן.',
        'השתמש בפילטר Status כדי להציג רק שחקנים זמינים.',
      ],
    },
  },
  {
    id: 'heatmap',
    keywords: ['heat map', 'heatmap', 'position', 'movement', 'sofascore', 'מפת חום'],
    en: {
      category: 'Player Profile',
      title: 'What is the Heat Map?',
      steps: [
        'The heat map shows where on the pitch the player was most active last season.',
        'Darker/denser areas mean the player spent more time there.',
        'The data comes from Sofascore.',
        'If the heat map is missing, click the refresh button (↺) next to "Heat Map" to fetch it.',
      ],
      tip: 'The heat map only works for players that have a Sofascore profile URL saved.',
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'מה זה מפת החום?',
      steps: [
        'מפת החום מציגה היכן במגרש השחקן היה הכי פעיל בעונה האחרונה.',
        'אזורים כהים/צפופים יותר אומרים שהשחקן בילה יותר זמן שם.',
        'הנתונים מגיעים מ-Sofascore.',
        'אם מפת החום חסרה, לחץ על כפתור הרענון (↺) ליד "Heat Map" כדי לאחזר אותה.',
      ],
      tip: 'מפת החום עובדת רק לשחקנים שיש להם URL של Sofascore שמור.',
    },
  },
  {
    id: 'season-stats',
    keywords: ['season stats', 'stats', 'statistics', 'goals', 'assists', 'table', 'סטטיסטיקות', 'עונה'],
    en: {
      category: 'Player Profile',
      title: 'What are Season Stats?',
      steps: [
        'Season Stats is a table showing the player\'s performance numbers over the last 3 seasons.',
        'Rows are stats (Goals, Assists, Appearances, etc.). Columns are the 3 most recent seasons.',
        'Stats are pulled automatically from Sofascore when you import or scout a player.',
        'You can click any number to edit it manually if needed.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'מה זה סטטיסטיקות עונה?',
      steps: [
        'Season Stats היא טבלה שמציגה את נתוני הביצועים של השחקן ב-3 העונות האחרונות.',
        'שורות הן סטטיסטיקות (גולים, בישולים, הופעות וכו׳). עמודות הן 3 העונות האחרונות.',
        'הסטטיסטיקות נשלפות אוטומטית מ-Sofascore כשמייבאים או מחפשים שחקן.',
        'ניתן ללחוץ על כל מספר כדי לערוך אותו ידנית במידת הצורך.',
      ],
    },
  },

  // ── Scout Board ──────────────────────────────────────────────────
  {
    id: 'scout-board',
    keywords: ['scout board', 'board', 'kanban', 'track', 'pipeline', 'לוח', 'סקאוטינג'],
    en: {
      category: 'Scout Board',
      title: 'What is the Scout Board?',
      steps: [
        'The Scout Board is like a sticky-note board for tracking players through a scouting process.',
        'You can create columns (stages) like "Watch List", "Contacted", "Recommended".',
        'Players from any of your lists can be added to the board.',
        'Drag players between columns as their status changes.',
      ],
    },
    he: {
      category: 'לוח הסקאוטינג',
      title: 'מה זה לוח הסקאוטינג?',
      steps: [
        'לוח הסקאוטינג הוא כמו לוח פתקיות למעקב אחר שחקנים בתהליך הסקאוטינג.',
        'ניתן ליצור עמודות (שלבים) כמו "רשימת צפייה", "יצרנו קשר", "מומלץ".',
        'שחקנים מכל הרשימות שלך יכולים להתווסף ללוח.',
        'גרור שחקנים בין עמודות כאשר הסטטוס שלהם משתנה.',
      ],
    },
  },

  // ── Search All Lists ─────────────────────────────────────────────
  {
    id: 'search-all-lists',
    keywords: ['search', 'all', 'lists', 'filter', 'cross', 'find', 'חיפוש', 'כל הרשימות'],
    en: {
      category: 'Search All Lists',
      title: 'How to search across all your lists',
      steps: [
        'Click "Search All Lists" in the left sidebar.',
        'Use the filters (age, position, nationality, etc.) to narrow down players.',
        'Results show players from all your lists that match the filters.',
        'Click a player\'s name to open their full profile.',
      ],
    },
    he: {
      category: 'חיפוש בכל הרשימות',
      title: 'איך לחפש בכל הרשימות שלך',
      steps: [
        'לחץ על "Search All Lists" בסרגל הצד.',
        'השתמש בפילטרים (גיל, עמדה, לאום וכו׳) כדי לצמצם את התוצאות.',
        'התוצאות מציגות שחקנים מכל הרשימות שלך שעומדים בתנאי הפילטר.',
        'לחץ על שם שחקן כדי לפתוח את הפרופיל המלא שלו.',
      ],
    },
  },

  // ── Calendar ─────────────────────────────────────────────────────
  {
    id: 'what-is-calendar',
    keywords: ['calendar', 'event', 'schedule', 'reminder', 'meeting', 'יומן', 'אירוע', 'תזכורת'],
    en: {
      category: 'Calendar',
      title: 'What is the Calendar?',
      steps: [
        'The Calendar is your scouting schedule — a place to log meetings, calls, reminders, and deadlines.',
        'You can view it by day, week, month, or year using the buttons at the top.',
        'Player notes you write also appear on the calendar automatically, so everything is in one place.',
        'Use the arrows or the "Today" button to move between dates.',
      ],
    },
    he: {
      category: 'יומן',
      title: 'מה זה היומן?',
      steps: [
        'היומן הוא לוח הזמנים שלך לסקאוטינג — מקום לרשום פגישות, שיחות, תזכורות ומועדי יעד.',
        'ניתן לצפות בו לפי יום, שבוע, חודש או שנה באמצעות הכפתורים בחלק העליון.',
        'הערות שחקן שאתה כותב מופיעות ביומן אוטומטית, כך שהכל במקום אחד.',
        'השתמש בחצים או בכפתור "Today" כדי לנוע בין תאריכים.',
      ],
    },
  },
  {
    id: 'add-event',
    keywords: ['add', 'event', 'create', 'reminder', 'meeting', 'call', 'deadline', 'task', 'להוסיף', 'אירוע', 'תזכורת'],
    en: {
      category: 'Calendar',
      title: 'How to add an event',
      steps: [
        'Click "Calendar" in the left sidebar.',
        'Click the green "+ Add Event" button.',
        'Fill in the title (required) and choose the event type: Task, Reminder, Meeting, Call, or Deadline — each has its own colour.',
        'Set the date and time, and optionally add a note.',
        'Click "Save" and the event will appear on the calendar.',
      ],
      tip: 'You can link an event to a specific player so it shows up on their profile too.',
    },
    he: {
      category: 'יומן',
      title: 'איך להוסיף אירוע',
      steps: [
        'לחץ על "Calendar" בסרגל הצד.',
        'לחץ על הכפתור הירוק "+ Add Event".',
        'מלא כותרת (שדה חובה) ובחר סוג אירוע: משימה, תזכורת, פגישה, שיחה או מועד יעד — לכל אחד צבע משלו.',
        'קבע תאריך ושעה, ובאופן אופציונלי הוסף הערה.',
        'לחץ "Save" והאירוע יופיע ביומן.',
      ],
      tip: 'ניתן לקשר אירוע לשחקן ספציפי כך שיופיע גם בפרופיל שלו.',
    },
  },

  // ── Notes ─────────────────────────────────────────────────────────
  {
    id: 'add-note',
    keywords: ['note', 'notes', 'add', 'write', 'observation', 'player', 'הערה', 'הוסף', 'כתוב'],
    en: {
      category: 'Notes',
      title: 'How to add a note to a player',
      steps: [
        'Open a player\'s profile by clicking their name in any list.',
        'Scroll down to the Notes section.',
        'Click "Add Note" to open the text box.',
        'Type your scouting observation, then click "Save".',
        'The note is saved with your name and the date automatically.',
      ],
      tip: 'Notes you write appear on the Calendar too — useful for tracking when you scouted a player.',
    },
    he: {
      category: 'הערות',
      title: 'איך להוסיף הערה לשחקן',
      steps: [
        'פתח את פרופיל השחקן על ידי לחיצה על שמו בכל רשימה.',
        'גלול למטה לאזור ה-Notes.',
        'לחץ "Add Note" כדי לפתוח את תיבת הטקסט.',
        'הקלד את ההתרשמות שלך מהשחקן, ואז לחץ "Save".',
        'ההערה נשמרת עם שמך והתאריך אוטומטית.',
      ],
      tip: 'הערות שאתה כותב מופיעות ביומן גם כן — שימושי למעקב אחר מתי עשית סקאוטינג לשחקן.',
    },
  },
  {
    id: 'view-edit-notes',
    keywords: ['note', 'notes', 'view', 'edit', 'delete', 'timeline', 'list', 'הערה', 'לערוך', 'למחוק'],
    en: {
      category: 'Notes',
      title: 'How to view and edit player notes',
      steps: [
        'Open the player\'s profile — all notes are shown in the Notes section at the bottom.',
        'Switch between "List" and "Timeline" views using the buttons at the top of the Notes section.',
        'To edit a note you wrote, hover over it and click "Edit", make your changes, then save.',
        'To delete a note, hover over it and click "Delete".',
        'You can only edit or delete your own notes — notes from other scouts are read-only.',
      ],
    },
    he: {
      category: 'הערות',
      title: 'איך לצפות ולערוך הערות שחקן',
      steps: [
        'פתח את פרופיל השחקן — כל ההערות מוצגות בחלק התחתון באזור Notes.',
        'עבור בין תצוגת "רשימה" ו"ציר זמן" באמצעות הכפתורים בראש אזור ה-Notes.',
        'לעריכת הערה שכתבת, העבר את העכבר מעליה ולחץ "Edit", בצע את השינויים ואז שמור.',
        'למחיקת הערה, העבר את העכבר מעליה ולחץ "Delete".',
        'ניתן לערוך או למחוק רק הערות שכתבת בעצמך — הערות של סקאוטים אחרים הן לקריאה בלבד.',
      ],
    },
  },

  // ── Reports ──────────────────────────────────────────────────────
  {
    id: 'create-report',
    keywords: ['report', 'create', 'print', 'pdf', 'export', 'דוח', 'ליצור'],
    en: {
      category: 'Reports',
      title: 'How to create a player report',
      steps: [
        'Click "Reports" in the left sidebar.',
        'Click "+ New Report".',
        'Choose which list and which players to include.',
        'Select which columns/stats to show.',
        'Click "Preview" to see how it looks, then "Export" to download as PDF or CSV.',
      ],
    },
    he: {
      category: 'דוחות',
      title: 'איך ליצור דוח שחקן',
      steps: [
        'לחץ על "Reports" בסרגל הצד.',
        'לחץ על "+ New Report".',
        'בחר מאיזו רשימה ואילו שחקנים לכלול.',
        'בחר אילו עמודות/סטטיסטיקות להציג.',
        'לחץ "Preview" לתצוגה מקדימה, ואז "Export" להורדה כ-PDF או CSV.',
      ],
    },
  },

]

interface HelpPanelProps {
  open: boolean
  onClose: () => void
}

export default function HelpPanel({ open, onClose }: HelpPanelProps) {
  const [lang, setLang] = useState<Lang>('en')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Topic | null>(null)

  const isHe = lang === 'he'

  // Unique category names for current language
  const categories = useMemo(
    () => [...new Set(TOPICS.map(t => t[lang].category))],
    [lang]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TOPICS
    return TOPICS.filter(t =>
      t[lang].title.toLowerCase().includes(q) ||
      t[lang].category.toLowerCase().includes(q) ||
      t.keywords.some(k => k.includes(q))
    )
  }, [query, lang])

  const grouped = useMemo(() => {
    const map = new Map<string, Topic[]>()
    for (const cat of categories) {
      const items = filtered.filter(t => t[lang].category === cat)
      if (items.length > 0) map.set(cat, items)
    }
    return map
  }, [filtered, categories, lang])

  function handleClose() {
    onClose()
    setSelected(null)
    setQuery('')
  }

  function switchLang(l: Lang) {
    setLang(l)
    setSelected(null)
    setQuery('')
  }

  const content = selected ? selected[lang] : null

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={handleClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          width: 420,
          maxWidth: '100vw',
          background: 'var(--card-bg)',
          borderLeft: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Left slot: back button or title */}
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 text-sm font-medium flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <span style={{ fontSize: 18 }}>{isHe ? '→' : '←'}</span>
              {isHe ? 'חזרה' : 'Back'}
            </button>
          ) : (
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {isHe ? 'עזרה ומדריך' : 'Help & Guide'}
            </span>
          )}

          {/* Right slot: lang toggle + close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* EN / עב pill toggle */}
            <div
              className="flex rounded-lg overflow-hidden text-xs font-semibold"
              style={{ border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => switchLang('en')}
                className="px-2.5 py-1 transition-colors"
                style={{
                  background: lang === 'en' ? 'var(--accent, #3b82f6)' : 'transparent',
                  color: lang === 'en' ? '#fff' : 'var(--text-muted)',
                }}
              >
                EN
              </button>
              <button
                onClick={() => switchLang('he')}
                className="px-2.5 py-1 transition-colors"
                style={{
                  background: lang === 'he' ? 'var(--accent, #3b82f6)' : 'transparent',
                  color: lang === 'he' ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'inherit',
                }}
              >
                עב
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              style={{ color: 'var(--text-muted)', background: 'var(--hover-bg)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        {content ? (
          /* ── Topic detail view ── */
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {content.category}
            </div>
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
              {content.title}
            </h2>
            <ol className="space-y-4">
              {content.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: 'var(--accent, #3b82f6)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{step}</span>
                </li>
              ))}
            </ol>
            {content.tip && (
              <div
                className="mt-6 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isHe ? 'טיפ: ' : 'Tip: '}
                </span>
                {content.tip}
              </div>
            )}
          </div>
        ) : (
          /* ── Topic list view ── */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Search bar */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="relative">
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-base select-none pointer-events-none"
                  style={{ color: 'var(--text-muted)', [isHe ? 'right' : 'left']: 12 }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={isHe ? '?איך אני...' : 'How do I...'}
                  className="w-full py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    paddingLeft: isHe ? 12 : 36,
                    paddingRight: isHe ? 36 : 12,
                    textAlign: isHe ? 'right' : 'left',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Topic groups */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {grouped.size === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {isHe ? `לא נמצאו נושאים עבור "${query}"` : `No help topics match "${query}"`}
                </p>
              )}
              {[...grouped.entries()].map(([cat, topics]) => (
                <div key={cat}>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {cat}
                  </div>
                  <div className="space-y-1">
                    {topics.map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => setSelected(topic)}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                        style={{
                          color: 'var(--text-primary)',
                          textAlign: isHe ? 'right' : 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {topic[lang].title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
