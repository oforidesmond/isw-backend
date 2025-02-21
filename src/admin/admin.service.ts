import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    const randomPassword = crypto.randomBytes(5).toString('hex'); // Generate a 10-char random password
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

    console.log(`User created. Send this password to them securely: ${randomPassword}`);

    return user;
  }


  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
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

