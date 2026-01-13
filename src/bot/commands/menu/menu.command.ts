import { sessionService } from '../../../shared/services/session.service';
import { BotContext } from '../../interface/context';

export class MenuCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands: {
    menu: string;
    liquidity: string;
    swap: string;
    trade: string;
  };

  constructor() {
    this.commands = {
      menu: 'menu',
      liquidity: 'liquidity',
      swap: 'swap',
      trade: 'trade',
    };
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.menu, this.onMenu);
    this.map.set(this.commands.liquidity, this.onLiquidity);
    this.map.set(this.commands.swap, this.onSwap);
    this.map.set(this.commands.trade, this.onTrade);
    return this.map;
  }

  private async onSwap(ctx: BotContext) {
    const session = await sessionService.getSession(ctx);

    await sessionService.setSession(ctx, session);
  }

  private async onLiquidity(ctx: BotContext) {
    const session = await sessionService.getSession(ctx);
    await sessionService.setSession(ctx, session);
  }

  private async onMenu(ctx: BotContext) {
    const session = await sessionService.getSession(ctx);
    await sessionService.setSession(ctx, session);
  }

  private async onTrade(ctx: BotContext) {
    const session = await sessionService.getSession(ctx);
    await sessionService.setSession(ctx, session);
  }
}

export const menuCommand = new MenuCommand();
