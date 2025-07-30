import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { AcknowledgeReceiptDto, CreateRequisitionDto } from './dto/create-requisition.dto';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  // @Roles('user')
  async getProfile(@Req() req) {
    return this.userService.getProfile(req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Post('requisitions')
  // @Roles('user')
  async createRequisition(@Body() createRequisitionDto: CreateRequisitionDto, @Req() req) {
    return this.userService.createRequisition(req.user.userId, createRequisitionDto, req.ip, req.headers['user-agent']);
  }

  @Get('requisitions')
  // @Roles('user')
  async getUserRequisitions(@Req() req) {
    return this.userService.getUserRequisitions(req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Post('reqs/acknowledge/:stockIssuedId')
  @UseGuards(JwtAuthGuard)
  async acknowledgeReceipt(
    @Param('stockIssuedId') stockIssuedId: string,
    @Body() dto: AcknowledgeReceiptDto,
    @Request() req,
  ) {
    return this.userService.acknowledgeReceipt(req.user.userId, stockIssuedId, dto, req.ip, req.headers['user-agent']);
  }

  // Acknowledgements
   @Get('reqs/pending-acknowledgments')
  @UseGuards(JwtAuthGuard)
  async getPendingAcknowledgments(@Request() req) {
    return this.userService.getPendingAcknowledgments(req.user.userId);
  }
}
