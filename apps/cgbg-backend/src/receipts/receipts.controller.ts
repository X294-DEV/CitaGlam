import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../config/rate-limits';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MAX_UPLOAD_BYTES, PrivateFileHeaders } from './stored-files';

@Controller('receipts')
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Throttle(RATE_LIMITS.enumeration)
  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.receiptsService.validateToken(token);
  }

  @Throttle(RATE_LIMITS.publicUpload)
  @Post('upload/:token')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.receiptsService.upload(token, file);
  }

  /** Comprobante de pago de una cita, solo para el panel del negocio dueño de la cita. */
  @Get(':appointmentId/file')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  @PrivateFileHeaders()
  getFile(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: { tenantId: string },
  ) {
    return this.receiptsService.getReceiptFile(appointmentId, user.tenantId);
  }
}
