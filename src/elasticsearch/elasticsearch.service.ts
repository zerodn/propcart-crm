import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService as BaseElasticsearchService } from '@nestjs/elasticsearch';

interface MemberDocument {
  userId: string;
  workspaceId: string;
  phone?: string;
  email?: string;
  name?: string;
  searchText?: string; // Unified search field: "phone email name"
}

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly MEMBERS_INDEX = 'workspace-members';

  constructor(private readonly baseService: BaseElasticsearchService) {}

  async indexMember(workspaceId: string, member: MemberDocument) {
    try {
      const documentId = `${workspaceId}-${member.userId}`;

      // Generate searchText from phone, email, name
      const searchParts = [member.phone || '', member.email || '', member.name || ''].filter(
        (part) => part.length > 0,
      );

      const searchText = searchParts.join(' ').trim();

      await this.baseService.index({
        index: this.MEMBERS_INDEX,
        id: documentId,
        body: {
          ...member,
          searchText,
          indexedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to index member: ${error.message}`);
      // Don't throw - allow graceful degradation
    }
  }

  async deleteMember(workspaceId: string, userId: string) {
    try {
      const documentId = `${workspaceId}-${userId}`;
      await this.baseService.delete({
        index: this.MEMBERS_INDEX,
        id: documentId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete member: ${error.message}`);
    }
  }

  async searchMembers(
    workspaceId: string,
    query: string,
  ): Promise<(MemberDocument & { score: number })[]> {
    try {
      if (!query || !query.trim()) {
        return [];
      }

      const response: any = await this.baseService.search({
        index: this.MEMBERS_INDEX,
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    searchText: {
                      query: query.trim(),
                      fuzziness: 'AUTO',
                      operator: 'or',
                    },
                  },
                },
              ],
              filter: [
                {
                  term: {
                    workspaceId: workspaceId,
                  },
                },
              ],
            },
          },
          size: 50,
        },
      });

      return (response.hits.hits || []).map((hit) => ({
        ...hit._source,
        score: hit._score || 0,
      }));
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      // Return empty results on error - graceful degradation
      return [];
    }
  }

  async initializeIndex() {
    try {
      const exists = await this.baseService.indices.exists({ index: this.MEMBERS_INDEX });

      if (!exists) {
        await this.baseService.indices.create({
          index: this.MEMBERS_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  ngram_analyzer: {
                    type: 'custom',
                    tokenizer: 'ngram_tokenizer',
                    filter: ['lowercase'],
                  },
                },
                tokenizer: {
                  ngram_tokenizer: {
                    type: 'ngram',
                    min_gram: 2,
                    max_gram: 20,
                    token_chars: ['letter', 'digit', 'symbol'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                workspaceId: { type: 'keyword' },
                phone: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                email: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                name: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                searchText: {
                  type: 'text',
                  analyzer: 'ngram_analyzer',
                  search_analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                indexedAt: { type: 'date' },
              },
            },
          },
        });

        this.logger.log(`Created index: ${this.MEMBERS_INDEX}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize index: ${error.message}`);
    }
  }

  async bulkIndexMembers(workspaceId: string, members: MemberDocument[]) {
    try {
      const operations: any[] = [];

      members.forEach((member) => {
        const documentId = `${workspaceId}-${member.userId}`;

        // Generate searchText from phone, email, name
        const searchParts = [member.phone || '', member.email || '', member.name || ''].filter(
          (part) => part.length > 0,
        );

        const searchText = searchParts.join(' ').trim();

        operations.push({
          index: { _index: this.MEMBERS_INDEX, _id: documentId },
        });
        operations.push({
          ...member,
          searchText,
          indexedAt: new Date(),
        });
      });

      if (operations.length > 0) {
        await this.baseService.bulk({
          body: operations,
        });
        this.logger.log(`Indexed ${members.length} members`);
      }
    } catch (error) {
      this.logger.error(`Bulk indexing failed: ${error.message}`);
    }
  }
}
