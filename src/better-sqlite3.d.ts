declare module 'better-sqlite3' {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement<Result = unknown> {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): Result | undefined;
    all(...params: unknown[]): Result[];
  }

  interface Transaction {
    (): void;
  }

  class Database {
    constructor(path: string);
    exec(sql: string): this;
    close(): void;
    prepare<Result = unknown>(sql: string): Statement<Result>;
    transaction(fn: () => void): Transaction;
  }

  export default Database;
}
