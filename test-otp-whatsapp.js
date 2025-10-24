require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

console.log('📱 Testing WhatsApp OTP Function...\n');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Format phone number function (from whatsapp.ts)
function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indonesian phone numbers
    if (cleaned.startsWith('0')) {
        // Remove leading 0 and add 62 (Indonesia country code)
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
        // If no country code, assume Indonesia
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

// Create OTP message function (from whatsapp.ts)
function createOTPMessage(otp) {
    return `Kode OTP Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.\n\n- Otp Gateway System`;
}

// Send OTP function
async function sendOTP(phoneNumber, otp) {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const message = createOTPMessage(otp);
        
        console.log(`📱 Sending OTP to: whatsapp:+${formattedPhone}`);
        console.log(`🔢 OTP Code: ${otp}`);
        console.log(`📝 Message preview:\n${message}\n`);
        
        const result = await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: `whatsapp:+${formattedPhone}`
        });
        
        return {
            success: true,
            messageId: result.sid,
            status: result.status
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

async function testOTP() {
    try {
        // Test data
        const phoneNumber = '081234567890'; // Nomor yang sudah join sandbox
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP

        console.log('📋 Test Data:');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`Generated OTP: ${otp}\n`);

        console.log('📤 Sending OTP...');
        
        const result = await sendOTP(phoneNumber, otp);
        
        if (result.success) {
            console.log('✅ OTP sent successfully!');
            console.log(`Message ID: ${result.messageId}`);
            console.log(`Status: ${result.status}`);
        } else {
            console.log('❌ Failed to send OTP');
            console.log(`Error: ${result.error}`);
            if (result.code) {
                console.log(`Error Code: ${result.code}`);
            }
        }

        // Test dengan format nomor berbeda
        console.log('\n🔄 Testing with different phone format...');
        const result2 = await sendOTP('6281234567890', otp);
        
        if (result2.success) {
            console.log('✅ Second test successful!');
            console.log(`Message ID: ${result2.messageId}`);
            console.log(`Status: ${result2.status}`);
        } else {
            console.log('❌ Second test failed');
            console.log(`Error: ${result2.error}`);
            if (result2.code) {
                console.log(`Error Code: ${result2.code}`);
            }
        }

    } catch (error) {
        console.log('❌ Test error:', error.message);
        
        if (error.code === 21910) {
            console.log('\n💡 Error 21910 Solutions:');
            console.log('1. Make sure both from and to numbers use whatsapp: prefix');
            console.log('2. Verify WhatsApp Sandbox is properly configured');
            console.log('3. Check that recipient number joined the sandbox');
        }
    }
}

async function checkEnvironment() {
    console.log('🔧 Environment Check:');
    console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || '❌ Missing'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);
}

async function runTest() {
    await checkEnvironment();
    await testOTP();
    
    console.log('\n📋 Troubleshooting Tips:');
    console.log('1. Pastikan nomor sudah join WhatsApp Sandbox');
    console.log('2. Cek format nomor from dan to harus konsisten');
    console.log('3. Pastikan menggunakan prefix whatsapp: untuk kedua nomor');
    console.log('4. Verifikasi konfigurasi Twilio di console');
}

runTest();