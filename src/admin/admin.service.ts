import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
// import * as QRCode from 'qrcode';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private mailerService: MailerService, private jwtService: JwtService,) {}

  async createUser(data: CreateUserDto) {
    const randomPassword = crypto.randomBytes(5).toString('hex'); 
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { name: data.roleName },
    });

    if (!role) {
      throw new Error(`Role "${data.roleName}" does not exist`);
    }

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        staffId: data.staffId,
        name: data.name,
        email: data.email,
        department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
        unit: data.unitId ? { connect: { id: data.unitId } } : undefined, 
        roomNo: data.roomNo,
        password: hashedPassword,
        mustResetPassword: true,
      },
    });

    // Assign role to user
    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

     // Generate one-time login token
     const loginTokenPayload = {
      staffId: data.staffId,
      tempPassword: randomPassword,
      type: 'temp-login', // Differentiate from regular JWTs
      sub: user.id,
    };
    const loginToken = this.jwtService.sign(loginTokenPayload, { expiresIn: '3 days' });
    const loginUrl = `http://localhost:3000/auth/login-with-token?token=${encodeURIComponent(loginToken)}`;

    let emailFailed = false;
     // Send email with temp password
     try {
     await this.mailerService.sendMail({
      to: data.email,
      from: process.env.EMAIL_USER,
      subject: 'Welcome to ISW App',
      html: `
      <p>Hello ${data.name},</p>
      <p>Your account has been created.</p>
      <p>Click <a href="${loginUrl}">here</a> to log in and reset your password immediately. Please note that this link is only valid for the next 3 days.</p>
<p>If you have any issues, please don't hesitate to contact us.</p>
</p>
      <p>Thanks,<br>ISW Team</p>
    `,
    });
  } catch (error){
    console.error(`Failed to send email to ${data.email}:`, error.message);
    emailFailed = true;
  }
    // Generate QR code with staffId and temp password
    // const qrData = `Staff ID: ${data.staffId}\nTemporary Password: ${randomPassword}`;
    // const qrCodeUrl = await QRCode.toDataURL(qrData);

    return {
      message: 'User created' + (emailFailed ? '; email failed to send' : ' and emailed'),
      userId: user.id,
      // qrCodeUrl,
      tempPassword: randomPassword, // remove in prod
    };
  }


  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async findByStaffId(staffId: string) {
    return this.prisma.user.findUnique({
      where: { staffId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
  // import { Injectable } from '@nestjs/common';
// import { CreateAdminDto } from './dto/create-admin.dto';
// import { UpdateAdminDto } from './dto/update-admin.dto';

// @Injectable()
// export class AdminService {
//   create(createAdminDto: CreateAdminDto) {
//     return 'This action adds a new admin';
//   }

//   findAll() {
//     return `This action returns all admin`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} admin`;
//   }

//   update(id: number, updateAdminDto: UpdateAdminDto) {
//     return `This action updates a #${id} admin`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} admin`;
//   }
// }

