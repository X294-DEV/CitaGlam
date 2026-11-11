import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@cgbg/prisma';
import { NodemailerProvider } from './providers/nodemailer.provider';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'EmailProvider',
      useClass: NodemailerProvider,
    },
  ],
  exports: ['EmailProvider'],
})
export class EmailModule {}
