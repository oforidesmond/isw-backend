import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

//   @Post()
//   async create(@Body() userData: { name: string; email: string; password: string; role: string }) {
//     return this.userService.createUser(userData);
//   }

//   @Get()
//   async findAll() {
//     return this.userService.getAllUsers();
//   }

//   @Get(':id')
//   async findOne(@Param('id') id: string) {
//     return this.userService.getUserById(+id);
//   }

//   @Put(':id')
//   async update(@Param('id') id: string, @Body() updateData: { name?: string; email?: string; role?: string }) {
//     return this.userService.updateUser(+id, updateData);
//   }

//   @Delete(':id')
//   async delete(@Param('id') id: string) {
//     return this.userService.deleteUser(+id);
//   }
}
