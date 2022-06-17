import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  emoji?: string;

  @Field(() => String)
  type: string;

  @Field(() => String, { nullable: true })
  thumbNailUrl: string;

  @Field(() => String, { nullable: true })
  excerpt?: string;

  @Field(() => String)
  contentPath: string;

  @Field(() => Boolean, { nullable: true })
  published: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  publishDate?: Date;
}
