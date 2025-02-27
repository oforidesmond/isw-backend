import { MailerService, MailerOptions, MailerTransportFactory } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
const dotenv = require('dotenv');

dotenv.config({ path: 'C:/Users/Admin/Documents/ISW/isw-backend/.env' });

const options: MailerOptions = {
  transport: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
};

const transportFactory: MailerTransportFactory = {
  createTransport(transport) {
    return nodemailer.createTransport(transport) as any;
  },
};

const mailerService = new MailerService(options, transportFactory);

async function testEmail() {
  try {
    await mailerService.sendMail({
      to: 'ads21b00206y@ait.edu.gh',
      subject: 'Test Email',
      text: 'This is a test email',
    });
  } catch (error) {
    console.error('Email failed:', error.message);
  }
}

testEmail();