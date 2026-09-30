import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class SaudeController {
  @Get()
  status() {
    return { status: 'ok' };
  }
}
