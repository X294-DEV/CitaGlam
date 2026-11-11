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

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.receiptsService.validateToken(token);
  }

  @Post('upload/:token')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.receiptsService.upload(token, file);
  }
}
