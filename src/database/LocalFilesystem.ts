import {GameIdLedger, IDatabase} from './IDatabase';
import {Game, GameOptions, Score} from '../Game';
import {GameId, isGameId} from '../common/Types';
import {SerializedGame} from '../SerializedGame';
import {Dirent} from 'fs';

const path = require('path');
const fs = require('fs');
const defaultDbFolder = path.resolve(process.cwd(), './db/files');

export class LocalFilesystem implements IDatabase {
  protected readonly dbFolder: string;
  private readonly historyFolder: string;
  constructor(dbFolder: string = defaultDbFolder) {
    this.dbFolder = dbFolder;
    this.historyFolder = path.resolve(dbFolder, 'history');
  }

  public initialize(): Promise<void> {
    console.log(`Starting local database at ${this.dbFolder}`);
    if (!fs.existsSync(this.dbFolder)) {
      fs.mkdirSync(this.dbFolder);
    }
    if (!fs.existsSync(this.historyFolder)) {
      fs.mkdirSync(this.historyFolder);
    }
    return Promise.resolve();
  }

  _filename(gameId: string): string {
    return path.resolve(this.dbFolder, `${gameId}.json`);
  }

  _historyFilename(gameId: string, saveId: number) {
    const saveIdString = saveId.toString().padStart(5, '0');
    return path.resolve(this.historyFolder, `${gameId}-${saveIdString}.json`);
  }

  saveGame(game: Game): Promise<void> {
    console.log(`saving ${game.id} at position ${game.lastSaveId}`);
    this.saveSerializedGame(game.serialize());
    game.lastSaveId++;
    return Promise.resolve();
  }

  saveSerializedGame(serializedGame: SerializedGame): void {
    const text = JSON.stringify(serializedGame, null, 2);
    fs.writeFileSync(this._filename(serializedGame.id), text);
    fs.writeFileSync(this._historyFilename(serializedGame.id, serializedGame.lastSaveId), text);
  }

  getGame(game_id: GameId): Promise<SerializedGame> {
    try {
      console.log(`Loading ${game_id}`);
      const text = fs.readFileSync(this._filename(game_id));
      const serializedGame = JSON.parse(text);
      return Promise.resolve(serializedGame);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      throw error;
    }
  }

  getGameId(_playerId: string): Promise<GameId> {
    throw new Error('Not implemented');
  }

  getSaveIds(gameId: GameId): Promise<Array<number>> {
    const re = /(.*)-(.*).json/;
    const results: Array<number> = fs.readdirSync(this.historyFolder, {withFileTypes: true})
      .filter((dirent: Dirent) => dirent.name.startsWith(gameId + '-'))
      .filter((dirent: Dirent) => dirent.isFile())
      .map((dirent: Dirent) => dirent.name.match(re))
      .filter((result: RegExpMatchArray) => result !== null)
      .map((result: RegExpMatchArray) => result[2])
      .map((result: string) => Number(result));
    return Promise.resolve(results);
  }

  getGameVersion(gameId: GameId, saveId: number): Promise<SerializedGame> {
    try {
      console.log(`Loading ${gameId} at ${saveId}`);
      const text = fs.readFileSync(this._historyFilename(gameId, saveId));
      const serializedGame = JSON.parse(text);
      return Promise.resolve(serializedGame);
    } catch (e) {
      console.log(e);
      return Promise.reject(new Error(`Game ${gameId} not found at save_id ${saveId}`));
    }
  }

  async getPlayerCount(gameId: GameId): Promise<number> {
    const gameIds = await this.getGameIds();
    const found = gameIds.find((gId) => gId === gameId && fs.existsSync(this._historyFilename(gameId, 0)));
    if (found === undefined) {
      throw new Error(`${gameId} not found`);
    }
    const text = fs.readFileSync(this._historyFilename(gameId, 0));
    const serializedGame = JSON.parse(text) as SerializedGame;
    return serializedGame.players.length;
  }

  loadCloneableGame(gameId: GameId): Promise<SerializedGame> {
    return this.getGameVersion(gameId, 0);
  }

  getGameIds(): Promise<Array<GameId>> {
    const gameIds: Array<GameId> = [];

    // TODO(kberg): use readdir since this is expected to be async anyway.
    fs.readdirSync(this.dbFolder, {withFileTypes: true}).forEach((dirent: Dirent) => {
      if (!dirent.isFile()) {
        return;
      }
      const re = /(.*).json/;
      const result = dirent.name.match(re);
      if (result === null) {
        return;
      }
      if (isGameId(result[1])) {
        gameIds.push(result[1]);
      }
    });
    return Promise.resolve(gameIds);
  }

  restoreReferenceGame(_gameId: GameId): Promise<Game> {
    throw new Error('Does not work');
  }

  saveGameResults(_gameId: GameId, _players: number, _generations: number, _gameOptions: GameOptions, _scores: Array<Score>): void {
    // Not implemented
  }

  cleanGame(_gameId: GameId): Promise<void> {
    // Not implemented here.
    return Promise.resolve();
  }

  purgeUnfinishedGames(): Promise<void> {
    // Not implemented.
    return Promise.resolve();
  }

  async restoreGame(gameId: GameId, saveId: number): Promise<SerializedGame> {
    await fs.copyFile(this._historyFilename(gameId, saveId), this._filename(gameId));
    return this.getGame(gameId);
  }

  deleteGameNbrSaves(_gameId: GameId, _rollbackCount: number): void {
    console.error('deleting old saves not implemented.');
  }

  public stats(): Promise<{[key: string]: string | number}> {
    return Promise.resolve({
      type: 'Local Filesystem',
      path: this.dbFolder.toString(),
      history_path: this.historyFolder.toString(),
    });
  }

  public storeParticipants(_entry: GameIdLedger): Promise<void> {
    throw new Error('Not implemented');
  }

  public getParticipants(): Promise<Array<GameIdLedger>> {
    throw new Error('Not implemented');
  }
}
