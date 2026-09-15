module.exports = {
  permissions: {
    'Anggota': ['view_hall', 'read_sect_manual_basic', 'deposit_sect_warehouse'],
    'Tetua': ['view_hall', 'learn_sect_manual', 'deposit_sect_warehouse', 'use_sect_warehouse', 'manage_asset'],
    'Wakil Ketua': ['view_hall', 'learn_sect_manual', 'deposit_sect_warehouse', 'use_sect_warehouse', 'manage_asset', 'manage_low'],
    'Ketua': ['*']
  }
};
