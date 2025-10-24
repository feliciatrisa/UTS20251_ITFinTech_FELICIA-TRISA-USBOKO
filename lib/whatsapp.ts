// WhatsApp Service using Twilio
import { Twilio } from 'twilio';

export interface WhatsAppConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private client: Twilio | null = null;

  constructor(config: WhatsAppConfig = {}) {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || config.accountSid,
      authToken: process.env.TWILIO_AUTH_TOKEN || config.authToken,
      fromNumber: process.env.TWILIO_WHATSAPP_FROM || config.fromNumber || 'whatsapp:+14155238886', // Twilio Sandbox number
    };

    // Initialize Twilio client if credentials are available
    if (this.config.accountSid && this.config.authToken) {
      this.client = new Twilio(this.config.accountSid, this.config.authToken);
    }
  }

  /**
   * Send OTP via WhatsApp using Twilio
   * @param phoneNumber - Phone number in international format (e.g., 6281234567890)
   * @param otp - 6-digit OTP code
   * @returns Promise<SendOTPResult>
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<SendOTPResult> {
    try {
      // Format phone number (remove leading 0 and add 62 for Indonesia)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Create OTP message
      const message = this.createOTPMessage(otp);

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`[WhatsApp OTP] Sending to ${formattedPhone}: ${otp}`);
        console.log(`[WhatsApp OTP] Message: ${message}`);
      }

      // Production implementation with Twilio
      if (!this.client) {
        console.error('Twilio client not initialized. Check your credentials.');
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.config.fromNumber!}`,
        to: `whatsapp:+${formattedPhone}`
      });

      return {
        success: true,
        messageId: twilioMessage.sid
      };

    } catch (error) {
      console.error('WhatsApp OTP send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format phone number for WhatsApp API
   * Converts Indonesian phone numbers to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
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

  /**
   * Create OTP message template
   */
  private createOTPMessage(otp: string): string {
    return `Kode OTP Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.\n\n- Otp Gateway System`;
  }

  /**
   * Create checkout notification message template
   */
  private createCheckoutMessage(items: any[], total: number): string {
    let itemsList = '';
    items.forEach((item, index) => {
      itemsList += `${index + 1}. ${item.name} - Qty: ${item.qty} - Rp ${item.price.toLocaleString('id-ID')}\n`;
    });

    return `🛒 *Checkout Berhasil!*\n\nItem yang dibeli:\n${itemsList}\n💰 *Total: Rp ${total.toLocaleString('id-ID')}*\n\nTerima kasih telah berbelanja! Silakan lakukan pembayaran untuk menyelesaikan pesanan Anda.\n\n- Payment Gateway System`;
  }

  /**
   * Create payment confirmation message template
   */
  private createPaymentMessage(orderId: string, amount: number): string {
    return `✅ *Pembayaran Berhasil!*\n\nOrder ID: ${orderId}\n💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n\nTerima kasih! Pembayaran Anda telah berhasil diproses. Pesanan Anda akan segera diproses.\n\n- Payment Gateway System`;
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for Indonesian phone numbers
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Should be 10-13 digits for Indonesian numbers
    if (cleaned.length < 10 || cleaned.length > 13) {
      return false;
    }
    
    // Should start with 08 (local) or 628 (international)
    return cleaned.startsWith('08') || cleaned.startsWith('628');
  }

  /**
   * Send checkout notification via WhatsApp
   * @param phoneNumber - Phone number in international format
   * @param items - Array of checkout items
   * @param total - Total amount
   * @returns Promise<SendOTPResult>
   */
  async sendCheckoutNotification(phoneNumber: string, items: any[], total: number): Promise<SendOTPResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const message = this.createCheckoutMessage(items, total);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[WhatsApp Checkout] Sending to ${formattedPhone}`);
        console.log(`[WhatsApp Checkout] Message: ${message}`);
      }

      if (!this.client) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.config.fromNumber!}`,
        to: `whatsapp:+${formattedPhone}`
      });

      return {
        success: true,
        messageId: twilioMessage.sid
      };

    } catch (error) {
      console.error('WhatsApp checkout notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send payment confirmation via WhatsApp
   * @param phoneNumber - Phone number in international format
   * @param orderId - Order ID
   * @param amount - Payment amount
   * @returns Promise<SendOTPResult>
   */
  async sendPaymentConfirmation(phoneNumber: string, orderId: string, amount: number): Promise<SendOTPResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const message = this.createPaymentMessage(orderId, amount);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[WhatsApp Payment] Sending to ${formattedPhone}`);
        console.log(`[WhatsApp Payment] Message: ${message}`);
      }

      if (!this.client) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.config.fromNumber!}`,
        to: `whatsapp:+${formattedPhone}`
      });

      return {
        success: true,
        messageId: twilioMessage.sid
      };

    } catch (error) {
      console.error('WhatsApp payment confirmation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

// Export class for custom configurations
export { WhatsAppService };