const fs = require('fs');
const file = 'jianghu-bot/commands/admin/admin.js';
let content = fs.readFileSync(file, 'utf8');

// Insert the handler logic for 'set-image'
const searchLogic = "if (subcommand === 'remove') {";
const insertLogic = `
    if (subcommand === 'set-image') {
      const nama = interaction.options.getString('nama-item');
      const imageUrl = interaction.options.getString('image-url');
      const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp('^' + nama + '$', 'i') });

      if (!item) return interaction.editReply({ content: '❌ Item tidak ditemukan.' });

      item.imageUrl = imageUrl;
      await item.save();

      return interaction.editReply({ content: \`✅ Gambar untuk item **\${item.name}** berhasil diatur.\` });
    }
`;
if (content.includes("if (subcommand === 'remove') {")) {
  content = content.replace("if (subcommand === 'remove') {", insertLogic + "\n    if (subcommand === 'remove') {");
} else {
    console.log("Could not find remove logic");
}

fs.writeFileSync(file, content);
