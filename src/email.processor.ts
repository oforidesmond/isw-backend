// import { Processor, Process } from '@nestjs/bull';
// import { Job } from 'bull';
// import { MailerService } from '@nestjs-modules/mailer';

// @Processor('email-queue')
// export class EmailProcessor {
//   constructor(private readonly mailerService: MailerService) {}

//   @Process('send-email')
//   async handleEmailJob(job: Job) {
//     const { to, subject, html } = job.data;

//     try {
//       await this.mailerService.sendMail({
//         to,
//         from: process.env.EMAIL_USER,
//         subject,
//         html,
//       });
//       console.log(`Email sent to ${to}`);
//     } catch (error) {
//       console.error(`Failed to send email to ${to}:`, error);
//       throw error;
//     }
//   }
// }