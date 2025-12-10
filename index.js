// index.js
// isrServ-Hosting Discord Bot
// ---------------------------
// 1. מערכת כללים + אישור כללים (Member)
// 2. מערכת טיקטים עם פתיחה/סגירה אוטומטית
// 3. Anti-Spam לפתיחת טיקטים (Cooldown למשתמש)

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
  ChannelType,
} = require("discord.js");

// ===== קריאת משתני סביבה =====
let {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  MEMBER_ROLE_ID,
  RULES_CHANNEL_ID,
  LOG_CHANNEL_ID,
  TICKETS_CATEGORY_NAME,
  SUPPORT_ROLE_ID,
} = process.env;

// ניקוי רווחים
function clean(v) {
  return typeof v === "string" ? v.trim() : v;
}

DISCORD_TOKEN = clean(DISCORD_TOKEN);
DISCORD_CLIENT_ID = clean(DISCORD_CLIENT_ID);
DISCORD_GUILD_ID = clean(DISCORD_GUILD_ID);
MEMBER_ROLE_ID = clean(MEMBER_ROLE_ID);
RULES_CHANNEL_ID = clean(RULES_CHANNEL_ID);
LOG_CHANNEL_ID = clean(LOG_CHANNEL_ID);
TICKETS_CATEGORY_NAME = clean(TICKETS_CATEGORY_NAME) || "📩 Tickets";
SUPPORT_ROLE_ID = clean(SUPPORT_ROLE_ID);

// Anti-Spam: כמה זמן צריך לחכות בין פתיחת טיקט לטיקט הבא (בשניות)
const TICKET_COOLDOWN_SECONDS = 120; // 2 דקות
// Map לזיכרון: userId -> timestamp (ms) של פתיחת הטיקט האחרון
const ticketCooldown = new Map();

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

// ===== יצירת קליינט =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // הצטרפות משתמשים + רולים
  ],
});

// ===== רישום פקודות סלאש =====
async function registerCommands() {
  const commands = [
    {
      name: "setup-rules",
      description: "יוצר הודעת כללים עם כפתור אישור בחדר הזה",
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: "setup-tickets",
      description: "יוצר פאנל פתיחת טיקטים בחדר הזה",
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

// ===== כשהבוט מוכן =====
client.once("ready", async () => {
  console.log(`✅ מחובר בתור ${client.user.tag}`);
  await registerCommands();
});

// ===== Embed של כללים =====
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

function buildAcceptButtonRow() {
  const button = new ButtonBuilder()
    .setCustomId("accept_rules")
    .setLabel("מאשר את כללי הקהילה")
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(button);
}

// ===== פאנל טיקטים =====
function buildTicketsPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("📩 מערכת טיקטים – isrServ-Hosting")
    .setDescription(
      [
        "כאן ניתן לפתוח טיקט לקבלת עזרה ותמיכה.",
        "",
        "בחר את סוג הטיקט שמתאים לך:",
        "• 🧩 טיקט כללי – שאלות כלליות, עזרה בסיסית.",
        "• 🎮 טיקט שרתי משחק – בעיות בשרת, לא עולה, לא נכנס, לאגים וכו'.",
        "• 💳 טיקט חיובים ותשלומים – בעיות בתשלום, חשבוניות, חיובים.",
        "• 🚨 טיקט תלונות/דיווחים – הפרות כללים, שימוש לרעה, דיווח על שחקנים.",
      ].join("\n")
    )
    .setColor(0x5865f2);
}

function buildTicketsButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_general")
      .setLabel("🧩 טיקט כללי")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_games")
      .setLabel("🎮 טיקט שרתי משחק")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_billing")
      .setLabel("💳 טיקט חיובים")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_abuse")
      .setLabel("🚨 טיקט תלונות/דיווחים")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCloseTicketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("סגור טיקט")
      .setStyle(ButtonStyle.Danger)
  );
}

// ===== עזרה: למצוא/ליצור קטגוריית טיקטים =====
async function getOrCreateTicketsCategory(guild) {
  let category = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildCategory &&
      ch.name === TICKETS_CATEGORY_NAME
  );

  if (!category) {
    category = await guild.channels.create({
      name: TICKETS_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  return category;
}

// ===== אירוע: משתמש חדש נכנס לשרת – הודעת ברוכים הבאים בחדר הכללים =====
client.on("guildMemberAdd", async (member) => {
  try {
    const rulesChannel = member.guild.channels.cache.get(RULES_CHANNEL_ID);
    if (!rulesChannel || !rulesChannel.isTextBased()) return;

    await rulesChannel.send(
      `ברוך הבא <@${member.id}> לשרת של **isrServ-Hosting**!\n` +
        `כדי לקבל גישה לכל החדרים, קרא את כללי הקהילה והקליק על הכפתור **"מאשר את כללי הקהילה"** למטה.`
    );
  } catch (err) {
    console.error("שגיאה בשליחת הודעת ברוכים הבאים:", err);
  }
});

// ===== האזנה לאינטראקציות =====
client.on("interactionCreate", async (interaction) => {
  try {
    // ----- פקודות סלאש -----
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-rules") {
        // לוודא שהפקודה רצה בחדר הכללים
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

      if (interaction.commandName === "setup-tickets") {
        const embed = buildTicketsPanelEmbed();
        const row = buildTicketsButtonsRow();

        await interaction.reply({
          content: "פאנל הטיקטים נשלח לחדר.",
          ephemeral: true,
        });

        await interaction.channel.send({
          embeds: [embed],
          components: [row],
        });
      }

      return;
    }

    // ----- כפתורים -----
    if (interaction.isButton()) {
      // ===== כפתור: אישור כללים =====
      if (interaction.customId === "accept_rules") {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({
            content: "לא ניתן לזהות את השרת. נסה שוב מתוך השרת ולא מהודעת DM.",
            ephemeral: true,
          });
          return;
        }

        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
          await interaction.reply({
            content: "לא הצלחתי לטעון את הפרופיל שלך בשרת. נסה שוב בעוד כמה שניות.",
            ephemeral: true,
          });
          return;
        }

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

        try {
          await member.roles.add(role);
        } catch (err) {
          console.error("שגיאה בהוספת רול Member:", err);
          let msg =
            "אירעה שגיאה בהוספת רול ה-Member. ודא שלבוט יש Manage Roles ושהרול שלו מעל Member בהיררכיית הרולים.";
          await interaction.reply({ content: msg, ephemeral: true });
          return;
        }

        await interaction.reply({
          content: "תודה! אישרת את הכללים וקיבלת רול Member.",
          ephemeral: true,
        });

        if (LOG_CHANNEL_ID) {
          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel && logChannel.isTextBased()) {
            logChannel.send(
              `✅ **${interaction.user.tag}** (${interaction.user.id}) אישר את הכללים וקיבל רול <@&${MEMBER_ROLE_ID}>.`
            );
          }
        }

        return;
      }

      // ===== כפתורי פתיחת טיקטים =====
      if (
        interaction.customId === "ticket_general" ||
        interaction.customId === "ticket_games" ||
        interaction.customId === "ticket_billing" ||
        interaction.customId === "ticket_abuse"
      ) {
        const typeMap = {
          ticket_general: "טיקט כללי",
          ticket_games: "טיקט שרתי משחק",
          ticket_billing: "טיקט חיובים ותשלומים",
          ticket_abuse: "טיקט תלונות/דיווחים",
        };

        const ticketType = typeMap[interaction.customId] || "טיקט";

        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({
            content: "לא ניתן ליצור טיקט מחוץ לשרת.",
            ephemeral: true,
          });
          return;
        }

        // בדיקה אם כבר יש למשתמש טיקט פתוח
        const existing = guild.channels.cache.find(
          (ch) =>
            ch.type === ChannelType.GuildText &&
            ch.topic &&
            ch.topic.startsWith(`TICKET_OWNER:${interaction.user.id}`)
        );

        if (existing) {
          await interaction.reply({
            content: `כבר יש לך טיקט פתוח: ${existing}.`,
            ephemeral: true,
          });
          return;
        }

        // Anti-Spam: בדיקת Cooldown
        const now = Date.now();
        const last = ticketCooldown.get(interaction.user.id) || 0;
        const diffSeconds = (now - last) / 1000;

        if (diffSeconds < TICKET_COOLDOWN_SECONDS) {
          const remaining = Math.ceil(TICKET_COOLDOWN_SECONDS - diffSeconds);
          const remainingText =
            remaining > 60
              ? `${Math.ceil(remaining / 60)} דקות`
              : `${remaining} שניות`;

          await interaction.reply({
            content:
              `פתחת טיקט לפני זמן קצר. ניתן לפתוח טיקט חדש רק בעוד ${remainingText}.` +
              `\nאם יש בעיה דחופה – אפשר לכתוב בטיקט הקיים או לפנות לצוות.`,
            ephemeral: true,
          });
          return;
        }

        const category = await getOrCreateTicketsCategory(guild);

        const channelName =
          `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 90) || `ticket-${interaction.user.id}`;

        // יצירת טיקט עם הרשאות מתאימות
        const overwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ];

        if (SUPPORT_ROLE_ID) {
          overwrites.push({
            id: SUPPORT_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages,
            ],
          });
        }

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id,
          topic: `TICKET_OWNER:${interaction.user.id} | TYPE:${ticketType}`,
          permissionOverwrites: overwrites,
        });

        // עדכון Anti-Spam – שומרים זמן פתיחת טיקט אחרון
        ticketCooldown.set(interaction.user.id, now);

        const ticketEmbed = new EmbedBuilder()
          .setTitle(`📩 ${ticketType}`)
          .setDescription(
            [
              `שלום <@${interaction.user.id}>,`,
              "",
              "תודה שפתחת טיקט. אנא פרט כאן את הבעיה/הבקשה שלך בצורה ברורה:",
              "- עבור שרתי משחק – כתוב IP / שם שרת / משחק.",
              "- עבור חיובים – ציין מספר הזמנה / אימייל / תאריך החיוב.",
              "",
              "לאחר סיום הטיפול, ניתן לסגור את הטיקט באמצעות הכפתור למטה.",
            ].join("\n")
          )
          .setColor(0x5865f2);

        await ticketChannel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [ticketEmbed],
          components: [buildCloseTicketRow()],
        });

        await interaction.reply({
          content: `נפתח עבורך ${ticketType}: ${ticketChannel}`,
          ephemeral: true,
        });

        if (LOG_CHANNEL_ID) {
          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel && logChannel.isTextBased()) {
            logChannel.send(
              `📩 נפתח טיקט חדש מסוג **${ticketType}** ע"י **${interaction.user.tag}** (${interaction.user.id}) בחדר ${ticketChannel}.`
            );
          }
        }

        return;
      }

      // ===== כפתור סגירת טיקט =====
      if (interaction.customId === "close_ticket") {
        const channel = interaction.channel;
        if (!channel || channel.type !== ChannelType.GuildText) {
          await interaction.reply({
            content: "לא ניתן לסגור טיקט כאן.",
            ephemeral: true,
          });
          return;
        }

        const topic = channel.topic || "";
        const ownerId = topic.startsWith("TICKET_OWNER:")
          ? topic.split("TICKET_OWNER:")[1].split(" ")[0].split("|")[0]
          : null;

        // רק בעל הטיקט או צוות עם ManageChannels יכול לסגור
        const member = await channel.guild.members.fetch(interaction.user.id).catch(() => null);
        const isStaff = member?.permissions.has(PermissionFlagsBits.ManageChannels);

        if (ownerId !== interaction.user.id && !isStaff) {
          await interaction.reply({
            content: "רק בעל הטיקט או צוות מורשה יכולים לסגור את הטיקט.",
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          content: "הטיקט ייסגר ויימחק בעוד 5 שניות...",
          ephemeral: true,
        });

        if (LOG_CHANNEL_ID) {
          const logChannel = channel.guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel && logChannel.isTextBased()) {
            logChannel.send(
              `🔒 הטיקט ${channel} נסגר ע"י **${interaction.user.tag}** (${interaction.user.id}).`
            );
          }
        }

        setTimeout(() => {
          channel.delete().catch((err) =>
            console.error("שגיאה במחיקת טיקט:", err)
          );
        }, 5000);

        return;
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
      } catch (_) {}
    }
  }
});

// ===== התחברות =====
client.login(DISCORD_TOKEN);
