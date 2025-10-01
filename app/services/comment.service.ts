import { CommentRepository } from '../data/repositories/comment.repository';
import database from '../db';
import { supabase } from '../lib/supabase';

class CommentService {
  private commentRepository: CommentRepository;

  constructor() {
    this.commentRepository = new CommentRepository(database);
  }

  async submitComment(episodeId: string, content: string, parentId?: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('CommentService - Submitting comment:', { episodeId, userId: user.id, content });

    const comment = await this.commentRepository.createComment(
      episodeId,
      user.id,
      content,
      parentId
    );

    console.log('CommentService - Comment created:', comment);
    return comment;
  }

  async loadComments(episodeId: string) {
    console.log('CommentService - Loading comments for episode:', episodeId);
    return await this.commentRepository.getEpisodeComments(episodeId);
  }

  async addReaction(commentId: string, emoji: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return await this.commentRepository.addReaction(commentId, user.id, emoji);
  }

  async removeReaction(commentId: string, emoji: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return await this.commentRepository.removeReaction(commentId, user.id, emoji);
  }
}

export const commentService = new CommentService();