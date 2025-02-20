import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: { name: string; email: string; password: string; role: string }) {
    return this.prisma.user.create({
      data,
    });
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

