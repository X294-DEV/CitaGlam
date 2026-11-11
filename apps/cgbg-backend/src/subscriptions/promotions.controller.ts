import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async create(@Body() dto: CreatePromotionDto) {
    return this.subscriptionsService.createPromotion(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.subscriptionsService.updatePromotion(id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async findAll() {
    return this.subscriptionsService.findAllPromotions();
  }

  @Get('validate/:code')
  @UseGuards(JwtAuthGuard)
  async validate(@Param('code') code: string) {
    return this.subscriptionsService.validatePromotion(code);
  }
}
