const { SlashCommandBuilder } = require('discord.js');
const cmd = new SlashCommandBuilder()
  .setName('give-currency')
  .setDescription('Give currency')
  .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
  .addStringOption(opt => opt.setName('type').setDescription('Type'));

console.log(JSON.stringify(cmd.toJSON(), null, 2));
