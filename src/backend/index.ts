import * as express from 'express';
import "reflect-metadata";
import { UserAuthRouter } from './routes/user-auth';
import { apiMiddleWare } from './middlewares/api';
import { TodoRouter } from './routes/todo';
import { GroupRouter } from './routes/group';
import { createConnection } from 'typeorm';
import { Groups } from './entities/groups';
import { User } from './entities/user';
import { Todo } from './entities/todo';
import { Command } from 'commander';
import { setDB } from './middlewares/database';
import { config } from 'dotenv';
import { join, resolve } from 'path';
import { logger } from './middlewares/logger';

async function startApp(dbPath: string = '') {
  console.log("DB Path: ", process.env.DATABASE || dbPath);

  const app = express();
  app.use(express.json());
  app.use(apiMiddleWare);
  app.use(logger);

  const connection = await createConnection({
    type: "sqlite",
    database: process.env.DATABASE || dbPath,
    entities: [
      User,
      Groups,
      Todo
    ],
    logging: false,
    synchronize: true
  });

  app.use(express.static(resolve(join(__dirname, '../../dist'))));

  app.use(setDB(connection));

  app.use("/api/users", UserAuthRouter);
  app.use("/api/todo", TodoRouter);
  app.use("/api/groups", GroupRouter);
  app.use("*", async (req: express.Request, res: express.Response) => {
    res.sendFile(resolve(join(__dirname, '../../dist/index.html')));
  });

  app.listen(process.env.HTTP_PORT, () => console.log("Server started on port " + process.env.HTTP_PORT));
}

config();

const program = new Command();
program
  .option("-d, --database <path>", "Path to the sqlite database");

program.parse(process.argv);

startApp(program.database);