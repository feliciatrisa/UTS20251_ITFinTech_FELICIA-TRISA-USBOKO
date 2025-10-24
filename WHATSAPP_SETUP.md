# WhatsApp Integration Setup Guide

## Overview
Aplikasi ini telah diintegrasikan dengan Twilio untuk mengirim notifikasi WhatsApp pada:
1. **Login OTP** - Kode OTP dikirim via WhatsApp saat login
2. **Checkout Notification** - Notifikasi saat berhasil menambahkan item ke checkout
3. **Payment Confirmation** - Konfirmasi pembayaran berhasil

## Setup Twilio

### 1. Buat Akun Twilio
1. Daftar di [Twilio Console](https://console.twilio.com/)
2. Verifikasi nomor telepon Anda
3. Dapatkan Account SID dan Auth Token dari dashboard

### 2. Setup WhatsApp Sandbox (Development)
1. Di Twilio Console, buka **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Ikuti instruksi untuk join WhatsApp Sandbox
3. Kirim pesan "join <alone-fur>" ke nomor Twilio WhatsApp
4. Catat nomor WhatsApp Sandbox (biasanya +1 415 523 8886)

### 3. Konfigurasi Environment Variables
Buat file `.env.local` dan tambahkan:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Other existing variables...
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

## Fitur WhatsApp yang Diimplementasi

### 1. OTP Login
- **File**: `lib/whatsapp.ts` - method `sendOTP()`
- **Trigger**: Saat user login (bukan admin)
- **Template**: Mengirim kode OTP 6 digit dengan pesan keamanan

### 2. Checkout Notification
- **File**: `pages/api/checkout/index.ts`
- **Trigger**: Saat berhasil membuat checkout/order
- **Template**: Daftar item yang dibeli dan total harga

### 3. Payment Confirmation
- **File**: `pages/api/webhooks/xendit.ts`
- **Trigger**: Saat webhook Xendit konfirmasi pembayaran berhasil
- **Template**: Konfirmasi pembayaran dengan Order ID dan jumlah

## Testing

### Development Mode
Dalam mode development (`NODE_ENV=development`), pesan WhatsApp akan:
- Ditampilkan di console log
- Tidak benar-benar dikirim ke WhatsApp
- Return success response untuk testing

### Production Mode
Dalam mode production:
- Pesan akan dikirim ke WhatsApp melalui Twilio
- Memerlukan konfigurasi Twilio yang valid
- Error handling untuk kasus gagal kirim

## Format Nomor Telepon
- Input: `081234567890` atau `+6281234567890`
- Dikonversi ke: `6281234567890` (format internasional Indonesia)
- Dikirim ke Twilio sebagai: `whatsapp:+6281234567890`

## Error Handling
- Jika Twilio tidak dikonfigurasi: Log error, lanjutkan proses
- Jika gagal kirim WhatsApp: Log error, tidak mengganggu flow utama
- Validasi nomor telepon Indonesia (08xxx atau 628xxx)

## Troubleshooting

### WhatsApp tidak terkirim
1. Pastikan TWILIO_ACCOUNT_SID dan TWILIO_AUTH_TOKEN benar
2. Pastikan nomor tujuan sudah join WhatsApp Sandbox
3. Cek console log untuk error message
4. Pastikan format nomor telepon benar

### Sandbox Limitations
- Hanya bisa kirim ke nomor yang sudah join sandbox
- Untuk production, perlu WhatsApp Business API approval
- Rate limiting berlaku untuk sandbox

## Production Deployment
Untuk production:
1. Apply untuk WhatsApp Business API di Twilio
2. Dapatkan approved WhatsApp Business number
3. Update `TWILIO_WHATSAPP_FROM` dengan nomor bisnis
4. Set `NODE_ENV=production`