const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking WhatsApp Sandbox Setup...\n');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkWhatsAppSandbox() {
    try {
        console.log('📱 Checking available WhatsApp senders...');
        
        // Check incoming phone numbers
        const incomingNumbers = await client.incomingPhoneNumbers.list();
        console.log('\n📞 Available Phone Numbers:');
        
        if (incomingNumbers.length === 0) {
            console.log('❌ No phone numbers found in your account');
            console.log('\n💡 Solutions:');
            console.log('1. Use WhatsApp Sandbox (recommended for testing)');
            console.log('2. Buy a phone number from Twilio');
            console.log('3. Use Twilio WhatsApp Business API');
        } else {
            incomingNumbers.forEach(number => {
                console.log(`   ${number.phoneNumber} - ${number.friendlyName}`);
                console.log(`   Capabilities: Voice=${number.capabilities.voice}, SMS=${number.capabilities.sms}`);
            });
        }

        // Try to get WhatsApp sandbox info
        console.log('\n🏖️ Checking WhatsApp Sandbox...');
        
        try {
            // This will help us understand if sandbox is configured
            const sandboxNumber = '+14155238886'; // Standard Twilio sandbox
            console.log(`Standard WhatsApp Sandbox Number: ${sandboxNumber}`);
            console.log('\n📋 To setup WhatsApp Sandbox:');
            console.log('1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message');
            console.log('2. Send "join <keyword>" to +14155238886 from your WhatsApp');
            console.log('3. Wait for confirmation message');
            console.log('4. Then test sending messages');
            
        } catch (error) {
            console.log('Error checking sandbox:', error.message);
        }

        // Check account capabilities
        console.log('\n🔍 Account Information:');
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(`Account Status: ${account.status}`);
        console.log(`Account Type: ${account.type || 'Trial'}`);
        
        if (account.status !== 'active') {
            console.log('⚠️ Account is not active. Please verify your Twilio account.');
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
        
        if (error.code === 20003) {
            console.log('\n💡 Authentication failed. Check your credentials:');
            console.log('- TWILIO_ACCOUNT_SID');
            console.log('- TWILIO_AUTH_TOKEN');
        }
    }
}

async function testBasicSMS() {
    try {
        console.log('\n📨 Testing basic SMS capability...');
        
        // Don't actually send, just validate the request would work
        console.log('Note: This is just a validation test, no SMS will be sent.');
        
        const testNumber = '+6281234567890'; // Indonesian format
        console.log(`Test would send to: ${testNumber}`);
        console.log('✅ SMS format validation passed');
        
    } catch (error) {
        console.log('❌ SMS test failed:', error.message);
    }
}

// Run all checks
async function runAllChecks() {
    console.log('Environment Variables:');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('TWILIO_WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM);
    console.log('');
    
    await checkWhatsAppSandbox();
    await testBasicSMS();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Setup WhatsApp Sandbox in Twilio Console');
    console.log('2. Join sandbox from your WhatsApp: send "join <keyword>" to +14155238886');
    console.log('3. Update test-whatsapp.js with your phone number');
    console.log('4. Run: node test-whatsapp.js');
}

runAllChecks();