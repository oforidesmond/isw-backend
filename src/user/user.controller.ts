import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() userData: { name: string; email: string; password: string; role: string }) {
    return this.userService.createUser(userData);
  }

  @Get()
  async findAll() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.getUserById(+id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: { name?: string; email?: string; role?: string }) {
    return this.userService.updateUser(+id, updateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.userService.deleteUser(+id);
  }
}
