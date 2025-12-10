// index.js
// isrServ-Hosting Rules Bot
// -------------------------
// בוט שמחייב אישור כללים לקבלת רול Member
// + הודעת ברוכים הבאים בחדר הכללים לכל משתמש חדש

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} = require("discord.js");

// קריאת משתני סביבה
let {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  MEMBER_ROLE_ID,
  RULES_CHANNEL_ID,
  LOG_CHANNEL_ID,
} = process.env;

// מנקה רווחים בטעות
if (DISCORD_CLIENT_ID) DISCORD_CLIENT_ID = DISCORD_CLIENT_ID.trim();
if (DISCORD_GUILD_ID) DISCORD_GUILD_ID = DISCORD_GUILD_ID.trim();
if (MEMBER_ROLE_ID) MEMBER_ROLE_ID = MEMBER_ROLE_ID.trim();
if (RULES_CHANNEL_ID) RULES_CHANNEL_ID = RULES_CHANNEL_ID.trim();
if (LOG_CHANNEL_ID) LOG_CHANNEL_ID = LOG_CHANNEL_ID.trim();

if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !DISCORD_GUILD_ID ||
  !MEMBER_ROLE_ID ||
  !RULES_CHANNEL_ID
) {
  console.error("חסר אחד או יותר ממשתני הסביבה (.env / Railway Variables). ודא שהכל מוגדר.");
  process.exit(1);
}

// יצירת קליינט
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // חובה כדי להוסיף רול ולקלוט הצטרפויות חדשות
  ],
});

// רישום פקודות סלאש (רק לשרת אחד – GUILD)
async function registerCommands() {
  const commands = [
    {
      name: "setup-rules",
      description: "יוצר הודעת כללים עם כפתור אישור בחדר הזה",
      // PermissionFlagsBits.Administrator הוא BigInt, לכן toString()
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
  ];

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("🔄 רושם פקודות סלאש לשרת...");
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log("✅ פקודות סלאש נרשמו בהצלחה.");
  } catch (error) {
    console.error("❌ שגיאה ברישום פקודות:", error);
  }
}

// כש הבוט מוכן
client.once("ready", async () => {
  console.log(`✅ מחובר בתור ${client.user.tag}`);
  await registerCommands();
});

// פונקציה שמחזירה את ה-Embed של הכללים
function buildRulesEmbed() {
  return new EmbedBuilder()
    .setTitle("כללי הקהילה – isrServ-Hosting")
    .setDescription(
      [
        "**ברוכים הבאים לקהילת isrServ-Hosting!**",
        "",
        "כדי להיכנס לשאר החדרים בשרת, חובה לקרוא את הכללים ולאשר אותם:",
        "",
        "1. **כבוד הדדי והתנהגות הולמת**",
        "• אין לקלל, להעליב, להשפיל או לפגוע במשתמשים אחרים.",
        "• אין פרובוקציות, ויכוחים מיותרים או שיח אלים.",
        "• דעות שונות מתקבלות – חוסר כבוד לא.",
        "",
        "2. **אין פרסום עצמי ללא אישור**",
        "• אין לפרסם שרתים, אתרים, קבוצות או שירותים מסחריים ללא אישור מצוות isrServ.",
        "• כל ספאם / פרסום לא מאושר – יימחק ועלול להביא להרחקה.",
        "",
        "3. **שמירה על סדר בחדרים**",
        "• כל חדר נועד לנושא מסוים (תמיכה, שאלות, הצעות וכו').",
        "• יש לכתוב בכל חדר רק את התוכן המתאים.",
        "",
        "4. **אין תמיכה בפרטי**",
        "• תמיכה וטיפול בתקלות נעשים רק בחדרי התמיכה או בטיקטים.",
        "• צוות התמיכה לא מחויב לענות בהודעות פרטיות.",
        "",
        "5. **איסור תוכן אסור**",
        "• אין לשתף תוכן לא חוקי, פיראטי, שיטות פריצה או קבצים חשודים.",
        "• אין להעלות תוכן בוטה, גזעני, מפלה או פוגעני.",
        "",
        "6. **שמירה על פרטיות**",
        "• אין לפרסם פרטים אישיים שלך או של אחרים.",
        "• אין לבקש סיסמאות, משתמשים או גישה לחשבונות.",
        "",
        "7. **נאמנות למערכת**",
        "• אסור לנסות לעקוף רולים, הרשאות, אוטומציות או מנגנוני אבטחה.",
        "",
        "8. **ציות לצוות isrServ-Hosting**",
        "• החלטות הנהלת הקהילה הן סופיות.",
        "• הפרת כללים תגרור אזהרה, השתקה או הרחקה מהשרת.",
        "",
        "9. **תמיכה ללקוחות isrServ**",
        "• לקוחות isrServ מקבלים קדימות בתמיכה.",
        "• לפתיחת קריאת שירות – יש לפתוח טיקט עם כל הפרטים הרלוונטיים.",
        "",
        "בלחיצה על הכפתור למטה אתה מאשר שקראת והסכמת לכללי הקהילה.",
      ].join("\n")
    )
    .setColor(0x2b2d31);
}

// כפתור אישור הכללים
function buildAcceptButtonRow() {
  const button = new ButtonBuilder()
    .setCustomId("accept_rules")
    .setLabel("מאשר את כללי הקהילה")
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(button);
}

// אירוע: משתמש חדש נכנס לשרת
client.on("guildMemberAdd", async (member) => {
  try {
    const rulesChannel = member.guild.channels.cache.get(RULES_CHANNEL_ID);
    if (!rulesChannel || !rulesChannel.isTextB
