const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

// Test Twilio Configuration
console.log('🔍 Testing Twilio WhatsApp Configuration...\n');

console.log('Environment Variables:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('TWILIO_WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('❌ Twilio credentials missing!');
    process.exit(1);
}

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testWhatsApp() {
    try {
        console.log('📱 Testing WhatsApp message...');
        
        // Test phone number (ganti dengan nomor Anda yang sudah join sandbox)
        const testPhoneNumber = 'whatsapp:+6281234567890'; // Ganti dengan nomor Anda yang SUDAH JOIN SANDBOX
        
        const message = await client.messages.create({
            body: '🔐 Test OTP: 123456\n\nIni adalah test message dari aplikasi payment gateway.\n\n⚠️ Jangan bagikan kode ini kepada siapapun!',
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: testPhoneNumber
        });

        console.log('✅ Message sent successfully!');
        console.log('Message SID:', message.sid);
        console.log('Status:', message.status);
        console.log('To:', message.to);
        console.log('From:', message.from);
        
    } catch (error) {
        console.log('❌ Error sending WhatsApp message:');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        console.log('More Info:', error.moreInfo);
        
        // Common error solutions
        if (error.code === 21211) {
            console.log('\n💡 Solution: Invalid phone number format');
            console.log('   - Make sure phone number starts with whatsapp:+');
            console.log('   - Example: whatsapp:+6281234567890');
        }
        
        if (error.code === 21614) {
            console.log('\n💡 Solution: Phone number not verified in sandbox');
            console.log('   - Send "join <sandbox-keyword>" to Twilio WhatsApp number');
            console.log('   - Check Twilio Console > Messaging > Try it out > WhatsApp');
        }
        
        if (error.code === 20003) {
            console.log('\n💡 Solution: Authentication failed');
            console.log('   - Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
            console.log('   - Make sure credentials are correct');
        }
    }
}

// Test account info
async function testAccount() {
    try {
        console.log('🔍 Testing Twilio account...');
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Account Status:', account.status);
        console.log('Account Name:', account.friendlyName);
        console.log('');
    } catch (error) {
        console.log('❌ Account test failed:', error.message);
        console.log('');
    }
}

// Run tests
async function runTests() {
    await testAccount();
    await testWhatsApp();
}

runTests();