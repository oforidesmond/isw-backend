import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: { staffId: string; name: string; email: string; password: string; role: string }) {
    return this.prisma.user.create({
      data,
    });
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


  // async getUserById(id: number) {
  //   return this.prisma.user.findUnique({
  //     where: { id },
  //   });
  // }

  // async updateUser(id: number, data: { name?: string; email?: string; role?: string }) {
  //   return this.prisma.user.update({
  //     where: { id },
  //     data,
  //   });
  // }

  // async deleteUser(id: number) {
  //   return this.prisma.user.delete({
  //     where: { id },
  //   });
  // }
}
