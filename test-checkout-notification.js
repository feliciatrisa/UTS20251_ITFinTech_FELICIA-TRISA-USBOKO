require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

console.log('🛒 Testing WhatsApp Checkout Notification...\n');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Format phone number function (from whatsapp.ts)
function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indonesian numbers
    if (cleaned.startsWith('0')) {
        // Replace leading 0 with 62 for Indonesian numbers
        return '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62') && cleaned.length >= 10) {
        // Assume it's Indonesian if no country code and reasonable length
        return '62' + cleaned;
    }
    
    return cleaned;
}

// Create checkout message function (from whatsapp.ts)
function createCheckoutMessage(items, total) {
    let message = '🛒 *Checkout Confirmation*\n\n';
    message += '*Items:*\n';
    
    items.forEach((item, index) => {
        const itemTotal = item.qty * item.price;
        message += `${index + 1}. ${item.name}\n`;
        message += `   Qty: ${item.qty} x Rp ${item.price.toLocaleString('id-ID')}\n`;
        message += `   Subtotal: Rp ${itemTotal.toLocaleString('id-ID')}\n\n`;
    });
    
    message += `*Total: Rp ${total.toLocaleString('id-ID')}*\n\n`;
    message += 'Thank you for your order! 🙏';
    
    return message;
}

// Send checkout notification function
async function sendCheckoutNotification(phoneNumber, items, total) {
    try {
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        const message = createCheckoutMessage(items, total);
        
        console.log(`📱 Sending to: whatsapp:+${formattedPhoneNumber}`);
        console.log(`📝 Message preview:\n${message}\n`);
        
        const result = await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: `whatsapp:+${formattedPhoneNumber}`
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

async function testCheckoutNotification() {
    try {
        // Test data - simulasi checkout
        const phoneNumber = '081234567890'; // Nomor yang sudah join sandbox
        const items = [
            {
                name: 'Americano',
                qty: 2,
                price: 25000
            },
            {
                name: 'Latte',
                qty: 1,
                price: 30000
            },
            {
                name: 'Donut',
                qty: 3,
                price: 15000
            }
        ];
        const total = (25000 * 2) + (30000 * 1) + (15000 * 3); // 125000

        console.log('📱 Test Data:');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`Items: ${items.length} items`);
        console.log(`Total: Rp ${total.toLocaleString('id-ID')}\n`);

        console.log('📤 Sending checkout notification...');
        
        const result = await sendCheckoutNotification(phoneNumber, items, total);
        
        if (result.success) {
            console.log('✅ Checkout notification sent successfully!');
            console.log(`Message ID: ${result.messageId}`);
            console.log(`Status: ${result.status}`);
        } else {
            console.log('❌ Failed to send checkout notification');
            console.log(`Error: ${result.error}`);
            if (result.code) {
                console.log(`Error Code: ${result.code}`);
            }
        }

        // Test dengan format nomor berbeda
        console.log('\n🔄 Testing with different phone format...');
        const result2 = await sendCheckoutNotification('6281234567890', items, total);
        
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
        
        if (error.code === 63007) {
            console.log('\n💡 Error 63007 Solutions:');
            console.log('1. Make sure you joined WhatsApp Sandbox');
            console.log('2. Send "join <keyword>" to +1 415 523 8886');
            console.log('3. Wait for confirmation message');
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
    await testCheckoutNotification();
    
    console.log('\n📋 Troubleshooting Tips:');
    console.log('1. Pastikan nomor sudah join WhatsApp Sandbox');
    console.log('2. Cek log aplikasi saat melakukan checkout');
    console.log('3. Pastikan user memiliki nomor telepon di database');
    console.log('4. Cek apakah ada error di console browser');
}

runTest();