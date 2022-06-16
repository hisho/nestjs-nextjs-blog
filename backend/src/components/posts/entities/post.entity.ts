import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;
}
