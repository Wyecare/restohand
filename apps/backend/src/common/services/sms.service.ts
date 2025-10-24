import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendStaffInvitation(
    phoneNumber: string,
    staffName: string,
    restaurantName: string,
    role: string,
    invitationLink: string
  ): Promise<void> {
    const message = this.formatInvitationMessage(
      staffName,
      restaurantName,
      role,
      invitationLink
    );

    // For now, just log the message (replace with actual SMS service later)
    this.logger.log(`SMS to ${phoneNumber}: ${message}`);

    // TODO: Integrate with MSG91 or other SMS service
    // Example with MSG91:
    /*
    try {
      await axios.post('https://api.msg91.com/api/v5/flow/', {
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: '1',
        recipients: [
          {
            mobiles: phoneNumber,
            var1: staffName,
            var2: restaurantName,
            var3: role,
            var4: invitationLink
          }
        ]
      }, {
        headers: {
          'authkey': process.env.MSG91_API_KEY,
          'content-type': 'application/json'
        }
      });

      this.logger.log(`SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw new Error('Failed to send invitation SMS');
    }
    */
  }

  private formatInvitationMessage(
    staffName: string,
    restaurantName: string,
    role: string,
    invitationLink: string
  ): string {
    const firstName = staffName.split(' ')[0];

    return [
      `Hi ${firstName},`,
      `You're invited to join ${restaurantName} as ${role}.`,
      `Complete your signup: ${invitationLink}`,
      '',
      'This invitation expires in 24 hours.',
      'Need help? Contact your manager.'
    ].join('\n');
  }
}