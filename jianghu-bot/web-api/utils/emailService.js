const nodemailer = require('nodemailer');

/**
 * Service Pengiriman Email Verifikasi OTP Wuxia
 */
async function sendOtpEmail(email, characterName, otp) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

  // Jika kredensial SMTP belum diatur (Mode Pengembang / Simulasi)
  if (!smtpUser || !smtpPass) {
    console.log('\n============================================================');
    console.log('📜 [DEV-MODE EMAIL SIMULATION - IMMORTAL X]');
    console.log(`✉️  Penerima: ${email} (${characterName})`);
    console.log(`🔑  KODE VERIFIKASI 6-DIGIT (OTP): [ ${otp} ]`);
    console.log('⏰  Masa Berlaku: 10 Menit');
    console.log('ℹ️  Tips: Salin kode di atas ke formulir verifikasi browser.');
    console.log('============================================================\n');

    return {
      success: true,
      isDevSimulated: true,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : null,
      message: 'Kode verifikasi dicetak di terminal konsol (Mode Simulasi Pengembang).'
    };
  }

  // Jika kredensial SMTP sudah dikonfigurasi di .env
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true untuk port 465 SSL
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kode Otorisasi Jianghu</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #080b12; font-family: 'Georgia', serif; color: #e6dfcf;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #080b12; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="560px" style="max-width: 560px; background-color: #111624; border: 2px solid #826b48; border-radius: 12px; padding: 35px 25px; box-shadow: 0 0 35px rgba(0,0,0,0.8);">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <div style="font-size: 28px; font-weight: bold; color: #f5ebd7; letter-spacing: 4px;">江湖八荒</div>
                  <div style="font-size: 13px; color: #c5a880; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">IMMORTAL X • VERIFIKASI IDENTITAS PENDEKAR</div>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #3d3323; padding-top: 25px;">
                  <p style="font-size: 15px; line-height: 1.6; color: #d6ccba; margin: 0 0 15px 0;">
                    Salam sejahtera, Pendekar <strong>${characterName}</strong>.
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; color: #a89f8d; margin: 0 0 25px 0;">
                    Gerbang sembilan benua Jianghu telah menerima pendaftaran jiwamu. Gunakan segel mantra otorisasi di bawah ini untuk memverifikasi akun dan melangkah ke Studio Penampilan Karakter:
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #241d13, #382c1b); border: 2px dashed #c5a880; border-radius: 10px; padding: 16px 40px; letter-spacing: 12px; font-size: 32px; font-weight: bold; color: #f59e0b; text-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">
                    ${otp}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 25px;">
                  <p style="font-size: 12px; color: #78716c; margin: 0;">
                    *Kode ini hanya berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada pendekar lain.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #262016; padding-top: 20px;" align="center">
                  <p style="font-size: 11px; color: #57534e; margin: 0;">
                    Jianghu Bot • Immortal X (v1.2.0) • Dunia Terbuka 5000x5000 Tile
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Jianghu Immortal X" <${smtpUser}>`,
      to: email,
      subject: `[${otp}] Segel Otorisasi Pendekar: ${characterName} - Jianghu Immortal X`,
      html: htmlContent
    });

    console.log(`[EMAIL-SERVICE] OTP berhasil dikirim ke ${email}. MessageId: ${info.messageId}`);
    return {
      success: true,
      isDevSimulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    console.error('[EMAIL-SERVICE] Gagal mengirim email SMTP:', err);
    // Fallback: Jika SMTP gagal, cetak di konsol agar pendaftaran tidak macet
    console.log(`[DEV-FALLBACK] Kode OTP cadangan untuk ${email}: ${otp}`);
    return {
      success: true,
      isDevSimulated: true,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : null,
      message: 'Layanan email gagal, kode dicetak di konsol server.'
    };
  }
}

module.exports = { sendOtpEmail };
