import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { CreateStaffDto } from './dto/create-staff.dto';
import { EmailProvider } from '@cgbg/email';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  async createStaff(dto: CreateStaffDto, tenantId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Este usuario ya está registrado.');
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await argon2.hash(tempPassword);
    const activationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        tenantId,
        password: hashedPassword,
        isActive: false,
        activationToken,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, tenantId: true, isActive: true,
      },
    });

    // Send Invitation Email
    const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/activate?token=${activationToken}`;
    
    await this.emailProvider.sendEmail({
      to: user.email,
      subject: 'Te han invitado a CGBG',
      template: 'activation', // Reusing activation template
      context: {
        user_name: user.firstName,
        magic_link: activationUrl,
        tempPassword,
      },
    });

    return user;
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { 
        tenantId,
        role: { in: ['ADMIN', 'STAFF'] }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      }
    });
  }

  async removeStaff(id: string, tenantId: string) {
    return this.prisma.user.deleteMany({
      where: { id, tenantId, role: { in: ['ADMIN', 'STAFF'] } }
    });
  }
}
