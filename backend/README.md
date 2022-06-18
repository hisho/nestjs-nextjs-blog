# NestとPrismaを連携したgraphql server

## Nestを初期化する

https://docs.nestjs.com/

nest commandで新規プロジェクトを作成する

```shell
$ nest new project-name
```

作成した新規プロジェクトに移動する

```shell
$ cd project-name
```

## Prismaの設定をする

https://docs.nestjs.com/recipes/prisma#prisma

docker-compose.ymlを作成し下記の内容を記述する   
dockerについては詳しくないので雰囲気でコピペしてる

### docker-compose.yml

```yaml
version: '3'
services:
  mysql:
    image: mysql/mysql-server:8.0.27
    ports:
      - '3306:3306'
    environment:
      MYSQL_ROOT_PASSWORD: 'password'
      MYSQL_ROOT_HOST: '%'
      MYSQL_DATABASE: 'nest'
```

prismaをインストールする

```shell
$ yarn add -D prisma
```

prismaを初期化する

```shell
$ npx prisma init
```

prismaを初期化すると`prisma/schema.prisma`が生成されるので、DBの設定を書き換える

### prisma/schema.prisma

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

`.env`にもDBの情報を追記する

```text
DATABASE_URL="mysql://root:password@localhost:3306/nest?schema=public"
```

`prisma/schema.prisma`にmodelの情報を追記する   
https://www.prisma.io/docs/concepts/components/prisma-schema/data-model

### prisma/schema.prisma

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Todo {
 id          String    @id @default(cuid())
 uid         String    @unique
 name        String
 description String?
 isDone      Boolean
 createdAt   DateTime  @default(now()) @map("created_at")
 updatedAt   DateTime  @updatedAt @map("updated_at")

 @@map("todos")
}
```

dockerを起動する

```shell
$ docker-compose up
```

prismaのmigrateを実行する
今回は初期化なので`--name`を`init`にしている

```shell
$ npx prisma migrate dev --name init
```

`@prisma/client`をインストールする

```shell
$ yarn add @prisma/client
```

Serviceを作成するnestのcommandを使用し、`src/prisma/prisma.service.ts`を作成する

```shell
$ nest g s prisma
```

nestの公式に従いprismaのserviceを編集する   
https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services

### src/prisma/prisma.service.ts

```ts
import {INestApplication, Injectable, OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

prismaの型を生成する

```shell
$ npx prisma generate
```

毎回prismaの型を生成するcommandを打つのはめんどくさいのでstart時にprisma generateも実行するようにnpm scriptを書き換える

### package.json

```diff
  "scripts": {
-    "start:dev": "nest start --watch",
+    "start:dev": "prisma generate && nest start --watch",
  },
```

## graphqlの設定をする

nest公式のgraphqlの設定をする   
https://docs.nestjs.com/graphql/quick-start#getting-started-with-graphql--typescript

```shell
$ yarn add @nestjs/graphql @nestjs/apollo graphql apollo-server-express
```

app.module.tsを編集する   
code firstで記述するのでschemaを自動生成する設定を書く`autoSchemaFile`   
https://docs.nestjs.com/graphql/quick-start#getting-started-with-graphql--typescript

### src/app.module.tsを書き換える

```ts
import {Module} from '@nestjs/common';
import {GraphQLModule} from '@nestjs/graphql';
import {ApolloDriver, ApolloDriverConfig} from '@nestjs/apollo';
import {join} from 'path';
import {PrismaService} from './prisma/prisma.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
  ],
  providers: [PrismaService],
})
export class AppModule {
}
```

## moduleの作成

nestのresourceのgenerateをする   
https://docs.nestjs.com/recipes/crud-generator

```shell
$ nest g res module/todos
```

```shell
? What transport layer do you use? GraphQL (code first)
? Would you like to generate CRUD entry points? Yes
CREATE src/module/todos/todos.module.ts (224 bytes)
CREATE src/module/todos/todos.resolver.spec.ts (525 bytes)
CREATE src/module/todos/todos.resolver.ts (1109 bytes)
CREATE src/module/todos/todos.service.spec.ts (453 bytes)
CREATE src/module/todos/todos.service.ts (625 bytes)
CREATE src/module/todos/dto/create-todo.input.ts (196 bytes)
CREATE src/module/todos/dto/update-todo.input.ts (243 bytes)
CREATE src/module/todos/entities/todo.entity.ts (187 bytes)
UPDATE src/app.module.ts (576 bytes)
```

### module

prismaのserviceをimportする

### service

実際にDBから取得などを処理を書く(prismaの設定を書く)

### resolver

graphqlのquery,mutationを書く   
serviceのメソッドを呼び出す

### dto

fetch時のバリデーションなどを書く

### entity

Modelを書く

### src/module/todos/entities/todo.entity.ts

```ts
import {ObjectType, Field, GraphQLISODateTime} from '@nestjs/graphql';

@ObjectType()
export class Todo {
  @Field(() => String)
  id: string;

  @Field(() => String)
  uid: string;

  @Field(() => String)
  name: string;

  @Field(() => String, {nullable: true})
  description?: string;

  @Field(() => Boolean)
  isDone: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

```

### src/module/todos/todos.service.ts

```ts
import {Injectable} from '@nestjs/common';
import {PrismaService} from '../../prisma/prisma.service';

@Injectable()
export class TodosService {
  constructor(private prisma: PrismaService) {
  }

  findAll() {
    return this.prisma.todo.findMany();
  }
}
```

### src/module/todos/todos.module.ts

```ts
import {Module} from '@nestjs/common';
import {TodosService} from './todos.service';
import {TodosResolver} from './todos.resolver';
import {PrismaService} from '../../prisma/prisma.service';

@Module({
  providers: [TodosResolver, TodosService, PrismaService],
})
export class TodosModule {
}
```

### src/module/todos/todos.resolver.ts

```ts
import {Query, Resolver} from '@nestjs/graphql';
import {TodosService} from './todos.service';
import {Todo} from './entities/todo.entity';

@Resolver(() => Todo)
export class TodosResolver {
  constructor(private readonly postsService: TodosService) {
  }

  @Query(() => [Todo], {name: 'todos'})
  findAll() {
    return this.postsService.findAll();
  }
}
```