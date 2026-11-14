import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../config/rate-limits';
import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';

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
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.receiptsService.upload(token, file);
  }
}
