require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

console.log('📱 Testing WhatsApp Template Message...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function testTemplateMessage() {
    try {
        console.log('Environment Variables:');
        console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? '✅ Set' : '❌ Missing'}`);
        console.log(`TWILIO_AUTH_TOKEN: ${authToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM}\n`);

        // Test 1: Send simple text message first
        console.log('🧪 Test 1: Sending simple text message...');
        const simpleMessage = await client.messages.create({
            from: 'whatsapp:+14155238886',
            body: 'Hello! This is a test message from your payment gateway app.',
            to: 'whatsapp:+6281234567890'
        });
        
        console.log('✅ Simple message sent!');
        console.log(`Message SID: ${simpleMessage.sid}`);
        console.log(`Status: ${simpleMessage.status}\n`);

        // Test 2: Send template message (like your example)
        console.log('🧪 Test 2: Sending template message...');
        const templateMessage = await client.messages.create({
            from: 'whatsapp:+14155238886',
            contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
            contentVariables: '{"1":"12/1","2":"3pm"}',
            to: 'whatsapp:+6281234567890'
        });

        console.log('✅ Template message sent!');
        console.log(`Message SID: ${templateMessage.sid}`);
        console.log(`Status: ${templateMessage.status}\n`);

    } catch (error) {
        console.log('❌ Error sending message:', error.message);
        console.log('Error Code:', error.code);
        
        if (error.code === 63007) {
            console.log('\n💡 Error 63007 Solutions:');
            console.log('1. Make sure you joined WhatsApp Sandbox');
            console.log('2. Send "join <keyword>" to +1 415 523 8886');
            console.log('3. Wait for confirmation message');
        } else if (error.code === 21211) {
            console.log('\n💡 Error 21211: Invalid phone number format');
            console.log('Make sure the number is in format: whatsapp:+6281234567890');
        } else if (error.code === 21408) {
            console.log('\n💡 Error 21408: Permission denied');
            console.log('This number may not be verified for WhatsApp sandbox');
        }
    }
}

async function checkSandboxParticipants() {
    try {
        console.log('👥 Checking sandbox participants...');
        
        // Get recent messages to see which numbers are active
        const messages = await client.messages.list({
            limit: 10,
            dateSentAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        });

        console.log(`Found ${messages.length} recent messages:`);
        
        const whatsappMessages = messages.filter(msg => 
            msg.from.includes('whatsapp:') || msg.to.includes('whatsapp:')
        );
        
        if (whatsappMessages.length === 0) {
            console.log('❌ No WhatsApp messages found in recent history');
            console.log('💡 This suggests the sandbox might not be properly set up');
        } else {
            console.log(`✅ Found ${whatsappMessages.length} WhatsApp messages`);
            whatsappMessages.forEach((msg, index) => {
                console.log(`${index + 1}. ${msg.to} - Status: ${msg.status} - Date: ${msg.dateSent}`);
            });
        }

    } catch (error) {
        console.log('❌ Error checking participants:', error.message);
    }
}

async function runTests() {
    await testTemplateMessage();
    console.log('\n' + '='.repeat(50) + '\n');
    await checkSandboxParticipants();
    
    console.log('\n📋 Next Steps if messages don\'t arrive:');
    console.log('1. Open WhatsApp on phone +6281234567890');
    console.log('2. Send message to: +1 415 523 8886');
    console.log('3. Message: "join <your-sandbox-keyword>"');
    console.log('4. Wait for Twilio confirmation');
    console.log('5. Run this script again');
    console.log('\n🔍 To find your sandbox keyword:');
    console.log('   Go to: console.twilio.com > Messaging > Try it out > Send a WhatsApp message');
}

runTests();