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
        'ScoutLink is your personal football agent platform.',
        'You can create lists of players you want to track — like "My Wingers" or "Under-21 Strikers".',
        'For each player you can store stats, notes, a heat map, and contact info.',
        'You can also search the internet for players and pull their data automatically.',
      ],
    },
    he: {
      category: 'התחלה',
      title: 'מה זה ScoutLink?',
      steps: [
        'ScoutLink היא הפלטפורמה האישית שלך לניהול ייצוג שחקני כדורגל.',
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
        '"Dashboard" is your analytics and tracking overview for the agent pipeline.',
        '"Search All Lists" lets you filter players across every list you have.',
        '"Reports" lets you create printable player reports.',
        '"Settings" is where you manage your branding and account details.',
      ],
    },
    he: {
      category: 'התחלה',
      title: 'איך להתמצא באפליקציה',
      steps: [
        'סרגל הצד משמאל הוא התפריט הראשי שלך.',
        '"Databases" מציג את כל רשימות השחקנים שלך.',
        '"Dashboard" הוא לוח האנליטיקה והמעקב האישי שלך לצינור הסוכן.',
        '"Search All Lists" מאפשר לסנן שחקנים מכל הרשימות שלך.',
        '"Reports" מאפשר ליצור דוחות שחקנים להדפסה.',
        '"Settings" הוא המקום לנהל את המיתוג ופרטי החשבון שלך.',
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
        'Click the list pill at the top of the Databases page to select it.',
        'Click the "Delete List" button that appears in the top toolbar.',
        'A confirmation dialog will appear showing the list name and how many players are in it.',
        'Click "Yes, Delete" to permanently remove the list and all its players.',
      ],
      tip: 'You cannot undo a list deletion. The confirmation dialog shows the player count so you know exactly what will be removed.',
    },
    he: {
      category: 'רשימות',
      title: 'איך למחוק רשימה',
      steps: [
        'לחץ על תג הרשימה בחלק העליון של עמוד Databases כדי לבחור אותה.',
        'לחץ על כפתור "Delete List" שמופיע בסרגל הכלים העליון.',
        'יופיע חלון אישור שמציג את שם הרשימה ומספר השחקנים בה.',
        'לחץ "Yes, Delete" כדי להסיר לצמיתות את הרשימה וכל השחקנים בה.',
      ],
      tip: 'לא ניתן לבטל מחיקת רשימה. חלון האישור מציג את מספר השחקנים כך שתדע בדיוק מה יוסר.',
    },
  },
  {
    id: 'share-list',
    keywords: ['share', 'invite', 'collaborate', 'permission', 'access', 'viewer', 'contributor', 'שיתוף', 'להזמין', 'גישה'],
    en: {
      category: 'Lists',
      title: 'How to share a list',
      steps: [
        'Select a list by clicking its pill at the top of the Databases page.',
        'Click the "Share" button in the toolbar (person icon with a +).',
        'Type the email address of the person you want to invite.',
        'Choose their permission level: "Viewer" (read-only) or "Contributor" (can add and edit players).',
        'Click "Share" — they will have access immediately.',
        'To remove someone\'s access, open Share again and click "Remove" next to their name.',
      ],
      tip: 'You must be the list owner to share it. Contributors can add and edit players but cannot delete the list.',
    },
    he: {
      category: 'רשימות',
      title: 'איך לשתף רשימה',
      steps: [
        'בחר רשימה על ידי לחיצה על התג שלה בחלק העליון של עמוד Databases.',
        'לחץ על כפתור "Share" בסרגל הכלים (אייקון אדם עם +).',
        'הקלד את כתובת האימייל של האדם שרוצים להזמין.',
        'בחר רמת הרשאה: "Viewer" (קריאה בלבד) או "Contributor" (יכול להוסיף ולערוך שחקנים).',
        'לחץ "Share" — תהיה להם גישה מיד.',
        'להסרת גישה, פתח שוב את Share ולחץ "Remove" ליד שמם.',
      ],
      tip: 'רק בעל הרשימה יכול לשתף אותה. Contributors יכולים להוסיף ולערוך שחקנים אך לא למחוק את הרשימה.',
    },
  },
  {
    id: 'configure-columns',
    keywords: ['columns', 'configure', 'show', 'hide', 'table', 'fields', 'עמודות', 'הגדרה', 'להסתיר'],
    en: {
      category: 'Lists',
      title: 'How to configure table columns',
      steps: [
        'Select a single list, then click the "Columns" button in the toolbar.',
        'A panel slides in from the right showing all available player fields grouped by category.',
        'Fields with a green checkbox can be toggled on or off — these appear as columns in the player table.',
        'Fields marked "Profile only" cannot be shown as table columns — they are visible only on the individual player profile page.',
        'Use "Select All" or "Clear All" to quickly toggle everything.',
        'Click "Save" to apply. Your column choices are saved for that list.',
      ],
      tip: 'If you close the panel without saving, you will be asked whether to discard your changes or keep editing.',
    },
    he: {
      category: 'רשימות',
      title: 'איך להגדיר עמודות טבלה',
      steps: [
        'בחר רשימה בודדת, ואז לחץ על כפתור "Columns" בסרגל הכלים.',
        'פאנל נפתח מהצד הימני ומציג את כל שדות השחקן הזמינים, מקובצים לפי קטגוריה.',
        'שדות עם תיבת סימון ירוקה ניתנים להפעלה/כיבוי — אלה מופיעים כעמודות בטבלת השחקנים.',
        'שדות המסומנים "Profile only" לא ניתנים לתצוגה כעמודות — הם גלויים רק בדף הפרופיל האישי של השחקן.',
        'השתמש ב-"Select All" או "Clear All" כדי להחליף הכל במהירות.',
        'לחץ "Save" להחלה. בחירת העמודות שלך נשמרת לאותה רשימה.',
      ],
      tip: 'אם תסגור את הפאנל ללא שמירה, תישאל אם לבטל את השינויים או להמשיך לערוך.',
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
      title: 'How to search for a player (Web Search)',
      steps: [
        'Click "Web Search" in the player list toolbar.',
        'Type the player\'s name in the search box and press Enter.',
        'ScoutLink will search Transfermarkt, Sofascore, and FMInside for you.',
        'You\'ll see a card for each player found with stats, position, club, and more.',
        'To save a player to a list, click "Import to List" on their card and choose which list.',
      ],
      tip: 'If the player has a common name you may see multiple results — check the photo and club to pick the right one.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך לחפש שחקן (Web Search)',
      steps: [
        'לחץ על "Web Search" בסרגל הכלים של רשימת השחקנים.',
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
      title: 'How to add a player by URL',
      steps: [
        'Find the player\'s profile page on Sofascore, Transfermarkt, or FMInside in your browser.',
        'Copy the full URL (web address) from the top of your browser.',
        'Go to "Web Search" in ScoutLink.',
        'Paste the URL into the search box and press Enter.',
        'ScoutLink will read the player\'s name from the link and search all 3 sites automatically.',
      ],
      tip: 'The URL must go to a specific player page, not a team page or search results page.',
    },
    he: {
      category: 'שחקנים',
      title: 'איך להוסיף שחקן לפי קישור (URL)',
      steps: [
        'מצא את דף הפרופיל של השחקן ב-Sofascore, Transfermarkt או FMInside בדפדפן שלך.',
        'העתק את ה-URL המלא (כתובת האתר) מלמעלה בדפדפן.',
        'עבור ל-"Web Search" ב-ScoutLink.',
        'הדבק את ה-URL בתיבת החיפוש ולחץ Enter.',
        'ScoutLink יקרא את שם השחקן מהקישור ויחפש בכל 3 האתרים אוטומטית.',
      ],
      tip: 'ה-URL חייב להוביל לדף שחקן ספציפי, לא לדף מועדון או תוצאות חיפוש.',
    },
  },
  {
    id: 'duplicate-warning',
    keywords: ['duplicate', 'exists', 'already', 'warning', 'same', 'player', 'twice', 'כפילות', 'קיים', 'אזהרה'],
    en: {
      category: 'Players',
      title: 'What happens when a player already exists in a list?',
      steps: [
        'When you try to add or import a player whose name matches someone already in the list, an amber warning appears.',
        'The warning shows the existing player\'s name and club so you can confirm it\'s the same person.',
        'The list name is shown in the warning so you know exactly which list has the duplicate.',
        'Choose "Cancel" to go back without creating a duplicate.',
        'Choose "Add Anyway" if you intentionally want two separate records (e.g. two players with the same name).',
      ],
      tip: 'The check also catches switched first/last names — for example, entering "Messi Lionel" will match an existing "Lionel Messi".',
    },
    he: {
      category: 'שחקנים',
      title: 'מה קורה כשהשחקן כבר קיים ברשימה?',
      steps: [
        'כשמנסים להוסיף או לייבא שחקן ששמו תואם מישהו שכבר ברשימה, מופיעה אזהרה בצבע כתום.',
        'האזהרה מציגה את שם ומועדון השחקן הקיים כדי שתוכל לאשר שמדובר באותו אדם.',
        'שם הרשימה מוצג באזהרה כדי שתדע בדיוק איזה רשימה מכילה את הכפילות.',
        'בחר "Cancel" כדי לחזור מבלי ליצור כפילות.',
        'בחר "Add Anyway" אם אתה מתכוון להוסיף שני רשומות נפרדות (לדוגמה, שני שחקנים עם אותו שם).',
      ],
      tip: 'הבדיקה מזהה גם שמות פרטיים ומשפחה הפוכים — לדוגמה, הקלדת "מסי ליאונל" תתאים לשחקן קיים "ליאונל מסי".',
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
        'Use the three tabs at the top — "Profile" for all player data, "Evaluations" for match observations, and "AI Report" to generate a professional player report.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך לצפות בפרופיל מלא של שחקן',
      steps: [
        'פתח רשימה כלשהי ומצא את השחקן בטבלה.',
        'לחץ על שם השחקן (קישור כחול).',
        'זה יפתח את כרטיס הפרופיל המלא עם כל המידע, הסטטיסטיקות ומפת החום.',
        'השתמש בשלוש הלשוניות בחלק העליון — "Profile" לכל נתוני השחקן, "Evaluations" לצפיות במשחקים, ו-"AI Report" ליצירת דוח סקאוטינג מקצועי.',
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
        'Stats are pulled automatically from Sofascore when you import or search for a player.',
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
      category: 'Dashboard',
      title: 'What is the Dashboard?',
      steps: [
        'The Dashboard is your analytics overview — total players, notes, reports generated, and upcoming calendar events.',
        'It shows your recent player notes so you can quickly pick up where you left off.',
        'The CRM Pipeline is on each individual player\'s profile — open any player and scroll to the pipeline stepper at the top of the panel.',
        'Pipeline stages: Spotted → Approached → Represented → In Market → Placed / Passed. Click a stage to update it instantly.',
      ],
    },
    he: {
      category: 'לוח מחוונים',
      title: 'מה זה הדשבורד?',
      steps: [
        'הדשבורד הוא לוח האנליטיקה שלך — ספירת שחקנים, הערות, דוחות שנוצרו ואירועי יומן קרובים.',
        'הוא מציג הערות שחקן אחרונות כדי שתוכל להמשיך מהמקום שעצרת.',
        'צינור ה-CRM נמצא בפרופיל האישי של כל שחקן — פתח שחקן כלשהו וגלול לסטפר הצינור בחלק העליון של הפאנל.',
        'שלבי הצינור: Spotted → Approached → Represented → In Market → Placed / Passed. לחץ על שלב לעדכון מיידי.',
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
        'The Calendar is your schedule — a place to log meetings, calls, reminders, and deadlines.',
        'You can view it by day, week, month, or year using the buttons at the top.',
        'Player notes you write also appear on the calendar automatically, so everything is in one place.',
        'Use the arrows or the "Today" button to move between dates.',
      ],
    },
    he: {
      category: 'יומן',
      title: 'מה זה היומן?',
      steps: [
        'היומן הוא לוח הזמנים שלך — מקום לרשום פגישות, שיחות, תזכורות ומועדי יעד.',
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

  // ── Evaluations ──────────────────────────────────────────────────
  {
    id: 'add-evaluation',
    keywords: ['evaluation', 'evaluate', 'rating', 'scout', 'observation', 'report', 'הערכה', 'דירוג', 'סקאוטינג'],
    en: {
      category: 'Evaluations',
      title: 'How to add a player evaluation',
      steps: [
        'Open a player\'s profile and scroll down to the "Evaluations" section.',
        'Click "+ New Evaluation" to open the evaluation form.',
        'Fill in the match context: date observed, stadium, competition, opponent, and match result.',
        'Rate the player 1–5 across Technical, Tactical, Physical, Mentality, and Potential. Add a comment next to each rating.',
        'Choose a recommendation: Top Talent, Monitor, or Reject.',
        'Set your confidence level (1–5) and tick any risk flags that apply.',
        'Click "Save Evaluation". The card collapses and your evaluation is listed below.',
      ],
      tip: 'You can add multiple evaluations for the same player — one per match observation. Each evaluation is dated and shown as a separate card.',
    },
    he: {
      category: 'הערכות',
      title: 'איך להוסיף הערכת שחקן',
      steps: [
        'פתח את פרופיל השחקן וגלול למטה לאזור "Evaluations".',
        'לחץ "+ New Evaluation" לפתיחת טופס ההערכה.',
        'מלא את הקשר המשחק: תאריך, אצטדיון, תחרות, יריב ותוצאת משחק.',
        'דרג את השחקן 1–5 בטכני, טקטי, פיזי, מנטליות ופוטנציאל. הוסף הערה ליד כל דירוג.',
        'בחר המלצה: Top Talent, Monitor, או Reject.',
        'קבע רמת ביטחון (1–5) וסמן דגלי סיכון רלוונטיים.',
        'לחץ "Save Evaluation". הכרטיס מתכווץ וההערכה מופיעה ברשימה.',
      ],
      tip: 'ניתן להוסיף מספר הערכות לאותו שחקן — אחת לכל צפייה במשחק. כל הערכה מתוארכת ומוצגת כרטיס נפרד.',
    },
  },
  {
    id: 'evaluation-risk-flags',
    keywords: ['risk', 'flag', 'attitude', 'injury', 'age', 'competition', 'סיכון', 'דגל'],
    en: {
      category: 'Evaluations',
      title: 'What are the risk flags?',
      steps: [
        'Risk flags are warning signs you can mark on a player during an evaluation.',
        '"Relative Age" — player may benefit from being older than most teammates.',
        '"Weak Competition" — the league or opponents may not reflect true ability.',
        '"Physical Advantage" — performance relies heavily on physical strength over skill.',
        '"Attitude / Discipline" — concerns about behavior, professionalism, or coachability.',
        '"Off-field Influences" — family, agent, or surroundings may affect the player\'s career decisions.',
        '"Injury History" — player has a significant or recurring injury record.',
      ],
      tip: 'Risk flags are informational — they don\'t change the recommendation, but they help clubs make informed decisions.',
    },
    he: {
      category: 'הערכות',
      title: 'מה הם דגלי הסיכון?',
      steps: [
        'דגלי סיכון הם אותות אזהרה שניתן לסמן על שחקן בזמן הערכה.',
        '"גיל יחסי" — השחקן עשוי ליהנות מכך שהוא מבוגר מרוב חבריו לקבוצה.',
        '"תחרות חלשה" — הליגה או היריבים לא בהכרח משקפים יכולת אמיתית.',
        '"יתרון פיזי" — הביצועים מסתמכים מאוד על כוח פיזי ולא על כישרון.',
        '"גישה / משמעת" — חששות לגבי התנהגות, מקצועיות או יכולת קבלת הדרכה.',
        '"השפעות מחוץ למגרש" — משפחה, סוכן או סביבה עלולים להשפיע על קריירת השחקן.',
        '"היסטוריית פציעות" — לשחקן יש תיעוד פציעות משמעותי או חוזר.',
      ],
      tip: 'דגלי הסיכון הם מידע — הם לא משנים את ההמלצה, אך עוזרים למועדונים לקבל החלטות מושכלות.',
    },
  },

  // ── Scout Info & Agent Info ──────────────────────────────────────
  {
    id: 'represent-player',
    keywords: ['represent', 'agent', 'mandate', 'client', 'מנדט', 'מייצג', 'סוכן'],
    en: {
      category: 'Player Profile',
      title: 'How to mark a player you represent',
      steps: [
        'Open a player\'s profile and find the "Agent Info" section (below Tracking Info in the third column).',
        'Toggle "I Represent the Player" to Yes.',
        'Optionally set a "Mandate Since" date — the date you started representing them.',
        'Click "Save Profile" — a green ★ badge appears in the player\'s header.',
        'Use the "I Represent the Player" filter in the filter bar to see all your represented players at once.',
        'Enable the "I Represent the Player" column in the Columns picker to see representation status in the player table.',
      ],
      tip: 'The Agent Info section also holds the agent name, agent phone, and your mandate date — keeping all representation details separate from tracking observations.',
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך לסמן שחקן שאתה מייצג',
      steps: [
        'פתח את פרופיל השחקן ומצא את קטע "Agent Info" (מתחת ל-Tracking Info בעמודה השלישית).',
        'הפעל את הכפתור "I Represent the Player" לכן.',
        'בחר באופן אופציונלי תאריך "Mandate Since" — התאריך שבו התחלת לייצג אותם.',
        'לחץ "Save Profile" — תג ירוק ★ יופיע בכותרת השחקן.',
        'השתמש בפילטר "I Represent the Player" בסרגל הפילטרים לראות את כל השחקנים שאתה מייצג.',
        'הפעל את עמודת "I Represent the Player" בבורר העמודות לראות סטטוס ייצוג בטבלת השחקנים.',
      ],
      tip: 'קטע Agent Info מכיל גם את שם הסוכן, טלפון הסוכן ותאריך המנדט — שומר את כל פרטי הייצוג נפרדים מנתוני המעקב.',
    },
  },
  {
    id: 'agent-referral-autocomplete',
    keywords: ['agent', 'referral', 'phone', 'autocomplete', 'dropdown', 'scout info', 'סוכן', 'הפניה', 'טלפון'],
    en: {
      category: 'Player Profile',
      title: 'Agent & Referral smart dropdowns',
      steps: [
        'In the Tracking Info section of a player profile, click the "Agent" or "Referral" field.',
        'A dropdown appears with all agent or referral names you have used before across all your lists.',
        'Select a name from the list — no need to retype it each time.',
        'For agents: if a phone number is stored for that agent, the "Agent Phone" field fills automatically.',
        'If you type a new name and save, it is added to the list for future use.',
        'The agent\'s phone number is also updated automatically whenever you save a player with that agent name and a new phone number.',
      ],
      tip: 'The agent and referral name lists are shared across all your player lists — any name entered anywhere is available everywhere.',
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'רשימות חכמות לסוכן ולהפניה',
      steps: [
        'בקטע Tracking Info בפרופיל שחקן, לחץ על שדה "Agent" או "Referral".',
        'מופיעה רשימה נפתחת עם כל שמות הסוכנים וההפניות שהשתמשת בהם קודם בכל הרשימות שלך.',
        'בחר שם מהרשימה — אין צורך להקליד מחדש בכל פעם.',
        'לסוכנים: אם מספר הטלפון שלהם שמור, שדה "Agent Phone" מתמלא אוטומטית.',
        'אם מקלידים שם חדש ושומרים, הוא מתווסף לרשימה לשימוש עתידי.',
        'מספר הטלפון של הסוכן מתעדכן אוטומטית כאשר שומרים שחקן עם שם הסוכן ומספר טלפון חדש.',
      ],
      tip: 'רשימות השמות של הסוכנים וההפניות משותפות לכל הרשימות שלך — כל שם שהוזן בכל מקום זמין בכל מקום.',
    },
  },
  {
    id: 'source-chips',
    keywords: ['source', 'chip', 'link', 'transfermarkt', 'sofascore', 'fminside', 'url', 'edit', 'open', 'מקור', 'קישור'],
    en: {
      category: 'Player Profile',
      title: 'How to use source chips (TM / Sofascore / FMInside)',
      steps: [
        'Source chips appear in the player profile for Transfermarkt, Sofascore, and FMInside.',
        'If a URL is saved, clicking the chip label opens the player\'s page on that website in a new tab.',
        'To edit or update the URL, click the small pencil icon (✏) next to the chip.',
        'If no URL is saved yet, the chip appears as a dashed outline — click it to add a URL.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך להשתמש בצ\'יפים של מקורות (TM / Sofascore / FMInside)',
      steps: [
        'צ\'יפים של מקורות מופיעים בפרופיל השחקן עבור Transfermarkt, Sofascore ו-FMInside.',
        'אם כתובת URL שמורה, לחיצה על תווית הצ\'יפ פותחת את דף השחקן באתר בלשונית חדשה.',
        'לעריכה או עדכון ה-URL, לחץ על אייקון העיפרון הקטן (✏) ליד הצ\'יפ.',
        'אם עדיין אין URL, הצ\'יפ מופיע עם מתאר מקווקו — לחץ עליו להוספת URL.',
      ],
    },
  },
  {
    id: 'highlights',
    keywords: ['highlight', 'video', 'url', 'link', 'clips', 'multiple', 'הייליט', 'וידאו', 'קישור'],
    en: {
      category: 'Player Profile',
      title: 'How to add highlight videos',
      steps: [
        'In the Tracking Info section, find the "Highlights" area.',
        'Click "+ Add highlight" to add a video URL (YouTube, Wyscout, Vimeo, etc.).',
        'Type or paste the URL and press Enter or click away to save.',
        'You can add multiple video links — each appears as a numbered chip (Video 1, Video 2…).',
        'Click a chip to open the video in a new tab.',
        'Click the × on a chip to remove that video.',
      ],
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך להוסיף סרטוני הייליט',
      steps: [
        'בקטע Tracking Info, מצא את אזור "Highlights".',
        'לחץ "+ Add highlight" להוספת כתובת URL (YouTube, Wyscout, Vimeo וכו\').',
        'הקלד או הדבק את ה-URL ולחץ Enter או לחץ מחוץ לשמירה.',
        'ניתן להוסיף מספר קישורי וידאו — כל אחד מופיע כצ\'יפ ממוספר (Video 1, Video 2…).',
        'לחץ על צ\'יפ כדי לפתוח את הסרטון בלשונית חדשה.',
        'לחץ × על צ\'יפ להסרת אותו וידאו.',
      ],
    },
  },

  // ── AI Report ────────────────────────────────────────────────────
  {
    id: 'ai-report',
    keywords: ['ai', 'report', 'generate', 'draft', 'finalize', 'scouting report', 'claude', 'בינה', 'דוח', 'ליצור', 'טיוטה'],
    en: {
      category: 'Player Profile',
      title: 'How to generate an AI player report',
      steps: [
        'Open a player\'s profile by clicking their name in the list.',
        'Click the "AI Report" tab at the top of the profile card.',
        'Choose which sections to include — Physical, Contract & Value, Season Stats, FM Attributes, Evaluations, and more.',
        'Click "Generate Report" — Claude AI writes a professional player report draft based on all the player\'s saved data.',
        'Review and edit the draft text directly in the text area.',
        'Click "Save Draft" to keep your edits, or "Finalize Report" when the report is ready to send.',
        'Once finalized, click "Save PDF" to download a formatted PDF report to your device.',
      ],
      tip: 'The more data the player has — especially evaluations with ratings and match context — the richer the AI report will be.',
    },
    he: {
      category: 'פרופיל שחקן',
      title: 'איך ליצור דוח שחקן עם AI',
      steps: [
        'פתח את פרופיל השחקן על ידי לחיצה על שמו ברשימה.',
        'לחץ על לשונית "AI Report" בחלק העליון של כרטיס הפרופיל.',
        'בחר אילו סעיפים לכלול — פיזי, חוזה, סטטיסטיקות עונה, מאפייני FM, הערכות ועוד.',
        'לחץ "Generate Report" — Claude AI כותב טיוטת דוח שחקן מקצועית על בסיס כל הנתונים השמורים של השחקן.',
        'סקור וערוך את טיוטת הטקסט ישירות בתיבת הטקסט.',
        'לחץ "Save Draft" לשמירת עריכותיך, או "Finalize Report" כשהדוח מוכן לשליחה.',
        'לאחר הסיום, לחץ "Save PDF" להורדת דוח PDF מעוצב למכשיר שלך.',
      ],
      tip: 'ככל שיש לשחקן יותר נתונים — במיוחד הערכות עם דירוגים והקשר משחק — כך דוח ה-AI יהיה עשיר ומפורט יותר.',
    },
  },

  // ── Settings ─────────────────────────────────────────────────────
  {
    id: 'my-branding',
    keywords: ['branding', 'logo', 'agency', 'signature', 'pdf', 'settings', 'מיתוג', 'לוגו', 'סוכנות'],
    en: {
      category: 'Settings',
      title: 'How to set up My Branding',
      steps: [
        'Go to Settings in the left sidebar.',
        'Enter your agency or club name, and optionally a signature line (e.g. "Football Agent, Agency Name").',
        'Click "Upload Logo" and choose an image file — a preview appears immediately.',
        'Add your phone, email, and website if you want them on reports.',
        'Click "Save Branding" — your details are saved once and used on every exported PDF report automatically.',
      ],
      tip: 'You only need to do this once. Every AI report you export as PDF will include your logo and contact details automatically.',
    },
    he: {
      category: 'הגדרות',
      title: 'איך להגדיר את המיתוג שלי',
      steps: [
        'עבור ל-Settings בסרגל הצד.',
        'הזן את שם הסוכנות או המועדון שלך, ובאופן אופציונלי שורת חתימה (למשל "סוכן כדורגל, שם הסוכנות").',
        'לחץ "Upload Logo" ובחר קובץ תמונה — תצוגה מקדימה מופיעה מיד.',
        'הוסף טלפון, אימייל ואתר אם ברצונך שיופיעו בדוחות.',
        'לחץ "Save Branding" — הפרטים שלך נשמרים פעם אחת ומשמשים בכל דוח PDF שתייצא אוטומטית.',
      ],
      tip: 'צריך לעשות זאת פעם אחת בלבד. כל דוח AI שתייצא כ-PDF יכלול אוטומטית את הלוגו ופרטי הקשר שלך.',
    },
  },

  // ── Reports ──────────────────────────────────────────────────────
  {
    id: 'create-report',
    keywords: ['report', 'snapshot', 'create', 'print', 'pdf', 'export', 'דוח', 'ליצור', 'סנאפשוט'],
    en: {
      category: 'Reports',
      title: 'How to create a player report (snapshot)',
      steps: [
        'Open a list and select the players you want to include by ticking their checkboxes in the table.',
        'Click the "Create Report" button that appears in the toolbar once players are selected.',
        'Give the report a name and click "Create" — a snapshot of the selected players is saved.',
        'Click "Reports" in the left sidebar to find all your saved snapshots.',
        'Open a snapshot to view it, then use the "Print / Export PDF" or "Export CSV" buttons to download.',
      ],
      tip: 'A report is a snapshot — it captures player data at the moment you create it. If a player\'s stats update later, the report stays as it was.',
    },
    he: {
      category: 'דוחות',
      title: 'איך ליצור דוח שחקן (סנאפשוט)',
      steps: [
        'פתח רשימה ובחר את השחקנים שרוצים לכלול על ידי סימון תיבות הסימון שלהם בטבלה.',
        'לחץ על כפתור "Create Report" שמופיע בסרגל הכלים לאחר בחירת שחקנים.',
        'תן שם לדוח ולחץ "Create" — נשמר סנאפשוט של השחקנים שנבחרו.',
        'לחץ על "Reports" בסרגל הצד כדי למצוא את כל הסנאפשוטים השמורים שלך.',
        'פתח סנאפשוט לצפייה, ואז השתמש בכפתורים "Print / Export PDF" או "Export CSV" להורדה.',
      ],
      tip: 'דוח הוא סנאפשוט — הוא לוכד את נתוני השחקן ברגע יצירתו. אם הסטטיסטיקות של שחקן יתעדכנו מאוחר יותר, הדוח יישאר כפי שהיה.',
    },
  },
  {
    id: 'delete-report',
    keywords: ['delete', 'remove', 'report', 'snapshot', 'למחוק', 'דוח', 'סנאפשוט'],
    en: {
      category: 'Reports',
      title: 'How to delete a report or snapshot',
      steps: [
        'To delete from the Reports list: click "Reports" in the sidebar, find the snapshot, and click the trash icon on its card.',
        'A confirmation dialog will appear showing the snapshot name and how many players it contains.',
        'Click "Yes, Delete" to permanently remove it.',
        'To delete while viewing a report: open the report, click the "Delete Report" button at the top right, and confirm.',
        'Deleting a snapshot does not affect the original players in your lists.',
      ],
      tip: 'Deletion is permanent and cannot be undone. The original player data in your lists is never affected.',
    },
    he: {
      category: 'דוחות',
      title: 'איך למחוק דוח או סנאפשוט',
      steps: [
        'למחיקה מרשימת הדוחות: לחץ על "Reports" בסרגל, מצא את הסנאפשוט, ולחץ על אייקון הפח בכרטיס שלו.',
        'יופיע חלון אישור המציג את שם הסנאפשוט ומספר השחקנים שהוא מכיל.',
        'לחץ "Yes, Delete" להסרה לצמיתות.',
        'למחיקה בזמן צפייה בדוח: פתח את הדוח, לחץ על כפתור "Delete Report" בפינה הימנית העליונה, ואשר.',
        'מחיקת סנאפשוט לא משפיעה על השחקנים המקוריים ברשימות שלך.',
      ],
      tip: 'המחיקה היא לצמיתות ולא ניתן לבטלה. נתוני השחקן המקוריים ברשימות שלך לעולם אינם מושפעים.',
    },
  },

  // ── Clubs ────────────────────────────────────────────────────────
  {
    id: 'clubs-overview',
    keywords: ['clubs', 'club', 'request', 'proposal', 'age group', 'team', 'מועדון', 'בקשה', 'הצעה'],
    en: {
      category: 'Clubs',
      title: 'How Clubs works',
      steps: [
        'Click "Clubs" in the left sidebar to open the Clubs workspace.',
        'Add clubs you work with using the "Add Club" button. In the "Teams - Age Group" section, First Team is always enabled. Click + on any other age group to enable it, or ✕ to disable. Custom teams can be typed and toggled the same way.',
        'The right panel has two tabs at the top: "Club Requests" (one club at a time) and "All Clubs Requests" (across all clubs).',
        'In Club Requests: select a team tab to filter by age group. Use the Requests filter row to narrow by Position, Transfer type, Nationality, Age, and Budget. Use the Proposals row to filter by proposal status.',
        'In All Clubs Requests: the same filter bars appear, with an additional Status pill (Open / Closed) to show or hide closed requests.',
        'For each request, click "Find Matching Players" to run an AI search across your lists, or "Add Manually" to search by name.',
        'Propose a player to a request — then track the status (Proposed → In Discussion → Offer → Signed / Rejected).',
      ],
      tip: 'Use the age group filter pills in the left panel to see only clubs that have open requests for a specific team level.',
    },
    he: {
      category: 'מועדונים',
      title: 'איך עובד מסך המועדונים',
      steps: [
        'לחץ על "Clubs" בסרגל הצד לפתיחת סביבת המועדונים.',
        'הוסף מועדונים איתם אתה עובד בעזרת כפתור "Add Club". בחלק "Teams - Age Group", קבוצה ראשונה תמיד מופעלת. לחץ + על קבוצת גיל אחרת להפעלה, או ✕ לביטול. קבוצות מותאמות ניתן להקליד ולהחליף באותה צורה.',
        'לפנל הימני יש שתי לשוניות בחלק העליון: "Club Requests" (מועדון אחד בכל פעם) ו-"All Clubs Requests" (על פני כל המועדונים).',
        'ב-Club Requests: בחר לשונית קבוצה לסינון לפי קבוצת גיל. השתמש בשורת פילטר Requests לצמצום לפי עמדה, סוג העברה, לאום, גיל ותקציב. השתמש בשורת Proposals לסינון לפי סטטוס הצעה.',
        'ב-All Clubs Requests: אותם פילטרים מופיעים, עם פיל Status נוסף (Open / Closed) להצגה או הסתרה של בקשות סגורות.',
        'לכל בקשה, לחץ "Find Matching Players" להרצת חיפוש AI ברשימות שלך, או "Add Manually" לחיפוש לפי שם.',
        'הצע שחקן לבקשה — ואז עקוב אחר הסטטוס (Proposed → In Discussion → Offer → Signed / Rejected).',
      ],
      tip: 'השתמש בפילטר קבוצות הגיל בפנל השמאלי לראות רק מועדונים עם בקשות פתוחות לרמת קבוצה מסוימת.',
    },
  },
  {
    id: 'clubs-teams',
    keywords: ['team', 'age group', 'u18', 'u19', 'first team', 'manage teams', 'contact', 'קבוצה', 'גיל', 'ניהול'],
    en: {
      category: 'Clubs',
      title: 'How to manage team age groups',
      steps: [
        'Every club starts with default age groups: First Team, U23, U21, U20, U19, U18, U17, U16, U15, U14.',
        'Click "Manage Teams" (gear icon) in the team pills row to open the team settings.',
        'In the modal: remove any teams the club doesn\'t have, add back removed ones, or type a custom name (e.g. "B Team", "Reserves").',
        'Click Save — changes apply immediately.',
        'For each team, you can add a separate contact person. Select the team pill, then click "+ Add Contact".',
        'To change the age group on an existing request: click "Edit" on the request card, then pick a different team from the "Team - Age Group" pills.',
      ],
      tip: 'Each team can have its own contact — useful when the U19 coach and First Team director are different people.',
    },
    he: {
      category: 'מועדונים',
      title: 'איך לנהל קבוצות גיל',
      steps: [
        'כל מועדון מתחיל עם קבוצות גיל ברירת מחדל: קבוצה ראשונה, U23, U21, U20, U19, U18, U17, U16, U15, U14.',
        'לחץ "Manage Teams" (אייקון גלגל שיניים) בשורת לשוניות הקבוצה לפתיחת הגדרות הקבוצה.',
        'במודל: הסר קבוצות שאין למועדון, הוסף בחזרה שהוסרו, או הקלד שם מותאם אישית (למשל "B Team", "Reserves").',
        'לחץ Save — השינויים מיושמים מיד.',
        'לכל קבוצה ניתן להוסיף איש קשר נפרד. בחר את לשונית הקבוצה, ולחץ "+ Add Contact".',
        'לשינוי קבוצת הגיל על בקשה קיימת: לחץ "Edit" על כרטיס הבקשה, ובחר קבוצה אחרת מלשוניות "Team - Age Group".',
      ],
      tip: 'לכל קבוצה יכול להיות איש קשר משלה — שימושי כאשר מאמן ה-U19 ומנהל הקבוצה הראשונה הם אנשים שונים.',
    },
  },
  {
    id: 'clubs-proposals',
    keywords: ['proposal', 'propose', 'status', 'signed', 'offer', 'rejected', 'manually', 'הצעה', 'הצע', 'סטטוס', 'חתם'],
    en: {
      category: 'Clubs',
      title: 'How to propose and track players',
      steps: [
        'Open a club request and click "Find Matching Players" — ScoutLink AI searches your lists and scores each match.',
        'Click "+ Propose" on any result to add the player to this request.',
        'Or click "Add Manually" to search your lists by name and propose a specific player directly.',
        'Each proposed player has a status dropdown: Proposed → In Discussion → Offer → Signed / Rejected.',
        'Click "Go to Player Profile" on any proposed player to jump to their card in Studio with the Proposals tab open.',
        'From the player\'s profile, the Proposals tab shows every club they\'ve been pitched to and the current status.',
      ],
      tip: 'Changing the status here and from the player\'s Proposals tab both update the same record — they stay in sync.',
    },
    he: {
      category: 'מועדונים',
      title: 'איך להציע ולעקוב אחר שחקנים',
      steps: [
        'פתח בקשת מועדון ולחץ "Find Matching Players" — AI של ScoutLink מחפש ברשימות שלך ומדרג כל התאמה.',
        'לחץ "+ Propose" על כל תוצאה להוסיף את השחקן לבקשה זו.',
        'או לחץ "Add Manually" לחיפוש ברשימות שלך לפי שם ולהצעת שחקן ספציפי ישירות.',
        'לכל שחקן מוצע יש תפריט סטטוס: Proposed → In Discussion → Offer → Signed / Rejected.',
        'לחץ "Go to Player Profile" על כל שחקן מוצע לקפוץ לכרטיס שלו ב-Studio עם לשונית Proposals פתוחה.',
        'מפרופיל השחקן, לשונית Proposals מציגה כל מועדון שהוצג לו ואת הסטטוס הנוכחי.',
      ],
      tip: 'שינוי הסטטוס כאן ומלשונית Proposals של השחקן שניהם מעדכנים את אותו רשומה — הם נשארים מסונכרנים.',
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
