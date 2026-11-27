import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Mantiene la lectura pública; si se manda Authorization, exige un JWT válido. */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }
}
