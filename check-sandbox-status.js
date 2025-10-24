const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

console.log('🏖️ Checking WhatsApp Sandbox Status...\n');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkSandboxStatus() {
    try {
        // Check recent messages to see delivery status
        console.log('📨 Checking recent message delivery status...');
        
        const messages = await client.messages.list({
            limit: 5,
            dateSentAfter: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        });

        if (messages.length === 0) {
            console.log('❌ No recent messages found');
        } else {
            console.log('\n📋 Recent Messages:');
            messages.forEach((msg, index) => {
                console.log(`${index + 1}. SID: ${msg.sid}`);
                console.log(`   To: ${msg.to}`);
                console.log(`   Status: ${msg.status}`);
                console.log(`   Error: ${msg.errorCode || 'None'}`);
                console.log(`   Date: ${msg.dateSent}`);
                console.log('');
            });
        }

        // Provide sandbox join instructions
        console.log('🎯 WhatsApp Sandbox Setup Instructions:');
        console.log('');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Send a message to: +1 415 523 8886');
        console.log('3. Message content: "join <keyword>"');
        console.log('');
        console.log('📍 To find the exact keyword:');
        console.log('   • Go to: console.twilio.com');
        console.log('   • Navigate: Messaging > Try it out > Send a WhatsApp message');
        console.log('   • Look for instructions like "join shadow-thumb"');
        console.log('');
        console.log('4. Wait for confirmation message from Twilio');
        console.log('5. Then test again with: node test-whatsapp.js');
        console.log('');
        
        // Check if we can get sandbox info
        console.log('💡 Common sandbox keywords to try:');
        const commonKeywords = [
            'join shadow-thumb',
            'join code-geek', 
            'join happy-lion',
            'join clever-moon',
            'join brave-tiger'
        ];
        
        commonKeywords.forEach(keyword => {
            console.log(`   • ${keyword}`);
        });
        
        console.log('');
        console.log('⚠️ Note: The exact keyword is shown in your Twilio Console');
        console.log('   Each account may have a different keyword.');

    } catch (error) {
        console.log('❌ Error checking sandbox status:', error.message);
    }
}

async function testMessageStatus() {
    try {
        console.log('🔍 Checking last message status...');
        
        const messages = await client.messages.list({ limit: 1 });
        
        if (messages.length > 0) {
            const lastMessage = messages[0];
            console.log(`Last message SID: ${lastMessage.sid}`);
            console.log(`Status: ${lastMessage.status}`);
            console.log(`To: ${lastMessage.to}`);
            console.log(`Error Code: ${lastMessage.errorCode || 'None'}`);
            
            if (lastMessage.status === 'failed') {
                console.log('❌ Message failed to deliver');
                console.log('💡 This usually means the recipient hasn\'t joined the sandbox');
            } else if (lastMessage.status === 'delivered') {
                console.log('✅ Message delivered successfully!');
            } else if (lastMessage.status === 'queued' || lastMessage.status === 'sent') {
                console.log('⏳ Message is being processed...');
                console.log('💡 If it doesn\'t arrive, recipient may not have joined sandbox');
            }
        }
        
    } catch (error) {
        console.log('❌ Error checking message status:', error.message);
    }
}

// Run checks
async function runChecks() {
    await testMessageStatus();
    console.log('\n' + '='.repeat(50) + '\n');
    await checkSandboxStatus();
}

runChecks();