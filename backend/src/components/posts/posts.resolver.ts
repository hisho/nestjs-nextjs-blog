import { Query, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => [Post], { name: 'posts' })
  findAll() {
    return this.postsService.findAll();
  }
}
