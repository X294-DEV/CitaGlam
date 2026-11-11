import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('registration')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterBusinessDto) {
    return this.tenantsService.registerBusiness(dto);
  }

  @Get('config/:slug')
  @HttpCode(HttpStatus.OK)
  async getConfig(@Param('slug') slug: string) {
    return this.tenantsService.getPublicConfig(slug);
  }

  @Get('public/:slug/branches')
  @HttpCode(HttpStatus.OK)
  async getPublicBranches(@Param('slug') slug: string) {
    return this.tenantsService.getPublicBranches(slug);
  }

  @Get('public/:slug/services')
  @HttpCode(HttpStatus.OK)
  async getPublicServices(@Param('slug') slug: string) {
    return this.tenantsService.getPublicServices(slug);
  }
}
