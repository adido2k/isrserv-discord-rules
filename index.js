// index.js
// isrServ-Hosting Rules Bot
// -------------------------
// בוט שמחייב אישור כללים לקבלת רול Member

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
const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  MEMBER_ROLE_ID,
  RULES_CHANNEL_ID,
  LOG_CHANNEL_ID,
} = process.env;

if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !DISCORD_GUILD_ID ||
  !MEMBER_ROLE_ID ||
  !RULES_CHANNEL_ID
) {
  console.error("חסר אחד או יותר ממשתני הסביבה (.env). ודא שהכל מוגדר.");
  process.exit(1);
}

// יצירת קליינט
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // חובה כדי להוסיף רול
  ],
});

// רישום פקודות סלאש (רק לשרת אחד – GUILD)
async function registerCommands() {
  const commands = [
    {
      name: "setup-rules",
      description: "יוצר הודעת כללים עם כפתור אישור בחדר הזה",
      // כאן הייתה הבעיה – PermissionFlagsBits.Administrator הוא BigInt
      // אפשר או להסיר לגמרי את השורה, או להפוך ל-string.
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

// האזנה לאינטראקציות (פקודות סלאש + כפתורים)
client.on("interactionCreate", async (interaction) => {
  try {
    // פקודת סלאש
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-rules") {
        // לוודא שהפקודה רצה בחדר הכללים המתאים
        if (interaction.channelId !== RULES_CHANNEL_ID) {
          await interaction.reply({
            content: "הפקודה הזו צריכה לרוץ בחדר הכללים בלבד.",
            ephemeral: true,
          });
          return;
        }

        const embed = buildRulesEmbed();
        const row = buildAcceptButtonRow();

        await interaction.reply({
          content: "הודעת הכללים נשלחה לחדר.",
          ephemeral: true,
        });

        await interaction.channel.send({
          embeds: [embed],
          components: [row],
        });
      }
    }

    // כפתור
    if (interaction.isButton()) {
      if (interaction.customId === "accept_rules") {
        const guild = interaction.guild;
        const member = await guild.members.fetch(interaction.user.id);

        const role = guild.roles.cache.get(MEMBER_ROLE_ID);
        if (!role) {
          await interaction.reply({
            content: "שגיאה: רול ה-Member לא נמצא. פנה למנהל השרת.",
            ephemeral: true,
          });
          return;
        }

        if (member.roles.cache.has(MEMBER_ROLE_ID)) {
          await interaction.reply({
            content: "כבר אישרת את הכללים ויש לך גישה מלאה.",
            ephemeral: true,
          });
          return;
        }

        await member.roles.add(role);

        await interaction.reply({
          content: "תודה! אישרת את הכללים וקיבלת רול Member.",
          ephemeral: true,
        });

        // לוג לחדר לוגים אם קיים
        if (LOG_CHANNEL_ID) {
          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel && logChannel.isTextBased()) {
            logChannel.send(
              `✅ **${interaction.user.tag}** (${interaction.user.id}) אישר את הכללים וקיבל רול <@&${MEMBER_ROLE_ID}>.`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("שגיאה בטיפול באינטראקציה:", error);
    if (interaction.isRepliable()) {
      try {
        await interaction.reply({
          content: "אירעה שגיאה בעת העיבוד. נסה שוב או פנה למנהל.",
          ephemeral: true,
        });
      } catch (_) {
        // מתעלמים משגיאה משנית
      }
    }
  }
});

// התחברות
client.login(DISCORD_TOKEN);
