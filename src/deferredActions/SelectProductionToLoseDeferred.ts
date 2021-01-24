import {SelectProductionToLose} from '../inputs/SelectProductionToLose';
import {Player} from '../Player';
import {DeferredAction, Priority} from './DeferredAction';
import {Units} from '../Units';

export class SelectProductionToLoseDeferred implements DeferredAction {
  public priority = Priority.SELECT_PRODUCTION_TO_LOSE;
  constructor(
        public player: Player,
        private unitsToLose: number,
        private title: string = `Choose ${unitsToLose} unit(s) of production to lose`,
  ) {}

  public execute() {
    return new SelectProductionToLose(
      this.title,
      this.unitsToLose,
      this.player,
      (production: Units) => {
        Units.adjustProduction(Units.negative(production), this.player, this.player.game);
        return undefined;
      },
    );
  }
}
